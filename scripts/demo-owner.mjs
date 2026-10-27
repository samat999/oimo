// Creates (or re-keys) a demo owner for a quick local/Docker showing. The password is generated now, never stored in source:
// it is printed once and written to DEMO_CREDENTIALS.txt (git- and docker-ignored). Change it after the first login
// via «Пароль и безопасность». Requires the app to be running.
//   npm run demo:owner                     → owner + empty store «OIMO Technology»
//   npm run demo:owner -- --with-demo      → plus fictional demo team and sales
//   docker compose exec oimo node scripts/demo-owner.mjs --with-demo
import Database from 'better-sqlite3';
import {randomInt,scrypt,randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
if(existsSync('.env.local')){const {config}=await import('dotenv');config({path:'.env.local',quiet:true})}
const args=process.argv.slice(2),withDemo=args.includes('--with-demo');
const email=(args.find(a=>a.includes('@'))||process.env.OIMO_DEMO_EMAIL||'owner@oimo.local').toLowerCase();
const origin=new URL(process.env.BETTER_AUTH_URL||'http://localhost:5188').origin;
// Talk to the server on loopback but present the configured public origin, which the server requires for writes.
const target=`http://127.0.0.1:${process.env.PORT||new URL(origin).port||5188}`;
const alphabet='abcdefghjkmnpqrstuvwxyz23456789',group=()=>Array.from({length:4},()=>alphabet[randomInt(alphabet.length)]).join('');
const password=`oimo-${group()}-${group()}-${group()}`;
const headers=extra=>({'Content-Type':'application/json',Origin:origin,...extra});
const call=async(path,body,cookie)=>{const r=await fetch(target+path,{method:'POST',headers:headers(cookie?{Cookie:cookie}:{}),body:JSON.stringify(body)});let data={};try{data=await r.json()}catch{}return {status:r.status,data,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}};
try{await fetch(target+'/api/auth-config')}catch{console.error(`Приложение не отвечает на ${target}. Сначала запустите его (npm start или docker compose up -d).`);process.exit(1)}
const dbFile=resolve(process.env.OIMO_DATA_DIR||'data','oimo.sqlite');
const known=existsSync(dbFile)&&(()=>{const db=new Database(dbFile,{readonly:true});try{return !!db.prepare('SELECT 1 FROM "user" WHERE lower(email)=?').get(email)}finally{db.close()}})();
let session=known?{status:0}:await call('/api/auth/sign-up/email',{name:'Владелец OIMO',email,password});
if(session.status!==200){
 // Account exists already: issue a fresh temporary password (same scrypt format as Better Auth 1.7) and end its sessions.
 const db=new Database(dbFile);db.pragma('busy_timeout = 5000');
 const user=db.prepare('SELECT id FROM "user" WHERE lower(email)=?').get(email);
 if(!user){console.error('Не удалось создать аккаунт: '+(session.data?.message||session.status));process.exit(1)}
 const salt=randomBytes(16).toString('hex');const key=await new Promise((ok,fail)=>scrypt(password.normalize('NFKC'),salt,64,{N:16384,r:16,p:1,maxmem:128*16384*16*2},(e,k)=>e?fail(e):ok(k)));
 db.transaction(()=>{db.prepare('UPDATE account SET password=?,updatedAt=? WHERE userId=? AND providerId=\'credential\'').run(salt+':'+key.toString('hex'),new Date().toISOString(),user.id);db.prepare('DELETE FROM session WHERE userId=?').run(user.id)})();db.close();
 session=await call('/api/auth/sign-in/email',{email,password});
 if(session.status!==200){console.error('Вход с новым паролем не удался: '+session.status);process.exit(1)}
}
const state=await fetch(target+'/api/oimo',{headers:{Cookie:session.cookie}}).then(r=>r.json());
if(state.setup){const w=await call('/api/oimo',{action:'workspace',name:'OIMO Technology',ownerName:'Владелец OIMO'},session.cookie);if(w.status!==200){console.error('Магазин не создан: '+(w.data.error||w.status));process.exit(1)}}
else if(state.me?.role!=='owner'){console.error('Этот аккаунт уже состоит в магазине как продавец. Укажите другой email: npm run demo:owner -- other@oimo.local');process.exit(1)}
if(withDemo){const d=await call('/api/oimo',{action:'demo'},session.cookie);console.log(d.status===200?'Демо-данные загружены (вымышленные).':'Демо не загружено: '+(d.data.error||d.status))}
const text=`OIMO — демо-вход владельца (временный пароль, смените после входа)\nАдрес: ${origin}\nEmail: ${email}\nПароль: ${password}\nСоздано: ${new Date().toISOString()}\n`;
const out=process.env.OIMO_DEMO_CREDENTIALS_FILE||'DEMO_CREDENTIALS.txt';try{writeFileSync(out,text,{mode:0o600});console.log('Записано в DEMO_CREDENTIALS.txt (не попадает в git и архив).')}catch{console.log('Файл DEMO_CREDENTIALS.txt записать не удалось; сохраните данные ниже.')}
console.log(text);

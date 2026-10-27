// Runs the integration suite against the production standalone build with a throwaway database and photo folder,
// so tests never touch ./data. Requires `npm run build` first. Usage: npm run test:isolated
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {migrate} from '../scripts/migrate.mjs';
const server='.next/standalone/server.js';
if(!existsSync(server))throw Error('Build first: npm run build');
const port=Number(process.env.OIMO_TEST_PORT||5199),origin=`http://localhost:${port}`,dataDir=mkdtempSync(join(tmpdir(),'oimo-test-'));
const env={...process.env,NODE_ENV:'production',PORT:String(port),HOSTNAME:'127.0.0.1',BETTER_AUTH_URL:origin,BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),OIMO_DATA_DIR:dataDir,SMTP_HOST:'',SMTP_FROM:'',TRUSTED_PROXIES:'',OIMO_SINGLE_STORE:'',OIMO_OPEN_TEST_ACCESS:'',OIMO_TRUST_LAN:'true',OIMO_TRUSTED_ORIGINS:`http://192.168.77.10:${port}`};
migrate({dataDir});
const child=spawn(process.execPath,[server],{env,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
const stop=()=>{child.kill('SIGTERM');rmSync(dataDir,{recursive:true,force:true})};
try{
 for(let i=0;;i++){try{if((await fetch(origin+'/api/auth-config')).ok)break}catch{}if(i>100)throw Error('Server did not start:\n'+log);await new Promise(r=>setTimeout(r,200))}
 execFileSync(process.execPath,['--experimental-strip-types','tests/integration.mjs'],{env:{...env,OIMO_TEST_ORIGIN:origin},stdio:'inherit'});
 // Operator recovery script: temporary password works, old password and all sessions stop working. Output is parsed, not printed.
 const email=`recover-${randomUUID().slice(0,8)}@example.test`,password='QA-'+randomUUID();
 const up=await fetch(origin+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Forwarded-For':'198.51.100.10'},body:JSON.stringify({name:'QA Recover',email,password})});assert.equal(up.status,200);const cookie=up.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const out=execFileSync(process.execPath,['scripts/admin-reset-password.mjs',email],{env,encoding:'utf8'});const temporary=out.match(/: (\S+)\n/)?.[1];assert.ok(temporary&&temporary.length>=20);
 const signIn=pw=>fetch(origin+'/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email,password:pw})}).then(r=>r.status);
 assert.equal((await fetch(origin+'/api/oimo',{headers:{Cookie:cookie}})).status,401);assert.equal(await signIn(password),401);assert.equal(await signIn(temporary),200);
 console.log('PASS Admin password recovery script: temporary password works, old password and sessions revoked');
 // Expiry is enforced server-side: age a fresh invitation in the database and confirm it can no longer be accepted.
 const register=async name=>{const e=`${name}-${randomUUID().slice(0,8)}@example.test`;const r=await fetch(origin+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Forwarded-For':'198.51.100.'+(20+Math.floor(Math.random()*200))},body:JSON.stringify({name,email:e,password:'QA-'+randomUUID()})});assert.equal(r.status,200);return {email:e,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}};
 const act=(u,action,body)=>fetch(origin+'/api/oimo',{method:'POST',headers:{Cookie:u.cookie,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action,...body})}).then(async r=>({status:r.status,body:await r.json()}));
 const boss=await register('boss'),late=await register('late');assert.equal((await act(boss,'workspace',{name:'QA expiry shop',ownerName:'Boss'})).status,200);const invite=await act(boss,'member',{name:'Late',email:late.email});assert.equal(invite.status,200);
 const Database=(await import('better-sqlite3')).default;const db=new Database(join(dataDir,'oimo.sqlite'));db.prepare("UPDATE member_invitations SET expires_at='2000-01-01T00:00:00.000Z' WHERE used_at IS NULL AND member_id=(SELECT id FROM members WHERE email=?)").run(late.email);db.close();
 assert.equal((await act(late,'join',{token:invite.body.invitationToken})).status,403);console.log('PASS Expired invitation is rejected');
 assert.equal((await act(boss,'demo',{})).status,200);const demo=await fetch(origin+'/api/oimo',{headers:{Cookie:boss.cookie}}).then(r=>r.json());assert.equal(demo.sales.length,34);assert.ok(demo.sales.every(x=>x.demo===1));assert.equal(demo.members.filter(m=>m.demo===1).length,3);assert.equal((await act(boss,'demo',{})).status,409);
 const sheet=await fetch(origin+'/api/oimo?export=sales',{headers:{Cookie:boss.cookie}});assert.equal(sheet.status,200);assert.match(sheet.headers.get('content-disposition')||'',/oimo-sales-/);assert.equal(new Uint8Array(await sheet.arrayBuffer())[0],80);
 console.log('PASS Optional fictional demo loads once into an empty store; sales XLSX export works');
 // Demo owner seed: random password per run, file output, works for sign-in; re-run re-keys the same owner.
 const credFile=join(dataDir,'demo.txt'),demoEnv={...env,OIMO_DEMO_CREDENTIALS_FILE:credFile};
 const seed=()=>{const o=execFileSync(process.execPath,['scripts/demo-owner.mjs','--with-demo'],{env:demoEnv,encoding:'utf8'});return {email:o.match(/Email: (\S+)/)[1],password:o.match(/Пароль: (\S+)/)[1],out:o}};
 const first=seed();assert.equal(first.email,'owner@oimo.local');assert.match(first.password,/^oimo-[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);assert.ok(first.out.includes('Демо-данные загружены'));
 const login=pw=>fetch(origin+'/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:first.email,password:pw})});
 const ownerLogin=await login(first.password);assert.equal(ownerLogin.status,200);const oc=ownerLogin.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');const os=await fetch(origin+'/api/oimo',{headers:{Cookie:oc}}).then(r=>r.json());assert.equal(os.me.role,'owner');assert.equal(os.sales.length,34);
 const second=seed();assert.notEqual(second.password,first.password);assert.equal((await login(first.password)).status,401);assert.equal((await login(second.password)).status,200);
 const {readFileSync}=await import('node:fs');assert.ok(readFileSync(credFile,'utf8').includes(second.password));
 console.log('PASS Demo owner seed: generated password signs in as owner with demo data; re-run issues a new password and revokes the old one');
 // Default single-store mode on a second throwaway server: the first account creates the store, later ones can only join.
 {const port2=port+1,origin2=`http://localhost:${port2}`,dir2=mkdtempSync(join(tmpdir(),'oimo-single-'));migrate({dataDir:dir2});
  const s2=spawn(process.execPath,[server],{env:{...env,PORT:String(port2),BETTER_AUTH_URL:origin2,OIMO_DATA_DIR:dir2,OIMO_SINGLE_STORE:'true'},stdio:'ignore'});
  try{for(let i=0;;i++){try{if((await fetch(origin2+'/api/auth-config')).ok)break}catch{}if(i>100)throw Error('single-store server did not start');await new Promise(r=>setTimeout(r,200))}
   const reg2=async n=>{const r=await fetch(origin2+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin2},body:JSON.stringify({name:n,email:n+'@example.test',password:'QA-'+randomUUID()})});return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};
   const act2=(c,b)=>fetch(origin2+'/api/oimo',{method:'POST',headers:{Cookie:c,'Content-Type':'application/json',Origin:origin2},body:JSON.stringify(b)}).then(r=>r.status);
   const st2=c=>fetch(origin2+'/api/oimo',{headers:{Cookie:c}}).then(r=>r.json());
   const a=await reg2('first'),b=await reg2('second'),c=await reg2('third');assert.equal((await st2(a)).canCreateStore,true);
   const raced=await Promise.all([act2(a,{action:'workspace',name:'One'}),act2(b,{action:'workspace',name:'Two'})]);assert.deepEqual(raced.sort(),[200,403]);
   assert.equal((await st2(c)).canCreateStore,false);assert.equal(await act2(c,{action:'workspace',name:'Three'}),403);
  }finally{s2.kill();rmSync(dir2,{recursive:true,force:true})}
  console.log('PASS OIMO_SINGLE_STORE=true: exactly one of two simultaneous first sign-ups creates the store; later accounts can only join by invitation');}

 // LAN origins (regression for the phone defect): raw HTTP so Host and Origin can be set exactly as a phone on the Wi-Fi sends them.
 const http=await import('node:http');const {networkInterfaces}=await import('node:os');
 const raw=(p,path,{host,origin,cookie,body,method='POST'})=>new Promise((ok,fail)=>{const data=body?JSON.stringify(body):undefined;const r=http.request({host:'127.0.0.1',port:p,path,method,headers:{Host:host,'X-Forwarded-For':'203.0.113.'+(1+Math.floor(Math.random()*250)),...(origin?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}},res=>{let t='';res.on('data',c=>t+=c);res.on('end',()=>ok({status:res.statusCode,cookie:(res.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; '),text:t}))});r.on('error',fail);if(data)r.write(data);r.end()});
 const signUpVia=(p,host,origin,email)=>raw(p,'/api/auth/sign-up/email',{host,origin,body:{name:'QA LAN',email,password:'QA-'+randomUUID()}});
 const myIp=Object.values(networkInterfaces()).flat().find(n=>n&&n.family==='IPv4'&&!n.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address))?.address;
 {const listed=`192.168.77.10:${port}`,lan1=await signUpVia(port,listed,'http://'+listed,`lan-${randomUUID().slice(0,6)}@example.test`);assert.equal(lan1.status,200,lan1.text);
  const w=await raw(port,'/api/oimo',{host:listed,origin:'http://'+listed,cookie:lan1.cookie,body:{action:'workspace',name:'QA LAN shop'}});assert.equal(w.status,200,w.text);
  const loop=await raw(port,'/api/oimo',{host:`127.0.0.1:${port}`,origin:`http://127.0.0.1:${port}`,cookie:lan1.cookie,body:{action:'product',model:'LAN laptop',specs:'16/512',category:'laptop',price:'50000'}});assert.equal(loop.status,200,loop.text);
  if(myIp){const own=await raw(port,'/api/oimo',{host:`${myIp}:${port}`,origin:`http://${myIp}:${port}`,cookie:lan1.cookie,body:{action:'product',model:'Own IP laptop',specs:'8/256',category:'laptop',price:'40000'}});assert.equal(own.status,200,own.text)}
  for(const bad of [`http://192.168.77.11:${port}`,'https://evil.example',`http://${listed}.evil.example`]){assert.equal((await signUpVia(port,listed,bad,`bad-${randomUUID().slice(0,6)}@example.test`)).status,403,bad);assert.equal((await raw(port,'/api/oimo',{host:listed,origin:bad,cookie:lan1.cookie,body:{action:'product'}})).status,403,bad)}
  console.log(`PASS LAN origins: listed LAN IP, loopback alias${myIp?', this Mac’s own IP':''} accepted for sign-up and writes; unlisted IP and foreign sites get 403`)}
 // OIMO_OPEN_TEST_ACCESS=true on a third throwaway server: any local-network Host works when Origin matches it; foreign or mismatched origins do not; auth still required.
 {const port3=port+2,dir3=mkdtempSync(join(tmpdir(),'oimo-open-'));migrate({dataDir:dir3});
  const s3=spawn(process.execPath,[server],{env:{...env,PORT:String(port3),BETTER_AUTH_URL:`http://localhost:${port3}`,OIMO_DATA_DIR:dir3,OIMO_OPEN_TEST_ACCESS:'true',OIMO_TRUST_LAN:'',OIMO_TRUSTED_ORIGINS:''},stdio:'ignore'});
  try{for(let i=0;;i++){try{if((await fetch(`http://localhost:${port3}/api/auth-config`)).ok)break}catch{}if(i>100)throw Error('open-mode server did not start');await new Promise(r=>setTimeout(r,200))}
   const h=`10.9.8.7:${port3}`,ok1=await signUpVia(port3,h,'http://'+h,`open-${randomUUID().slice(0,6)}@example.test`);assert.equal(ok1.status,200,ok1.text);
   const dotLocal=`shop-mac.local:${port3}`;assert.equal((await raw(port3,'/api/oimo',{host:dotLocal,origin:'http://'+dotLocal,cookie:ok1.cookie,body:{action:'workspace',name:'QA open shop'}})).status,200);
   assert.equal((await raw(port3,'/api/oimo',{host:h,origin:'http://'+h,body:{action:'workspace',name:'x'}})).status,401);
   assert.equal((await signUpVia(port3,`evil.example:${port3}`,`http://evil.example:${port3}`,`evil-${randomUUID().slice(0,6)}@example.test`)).status,403);
   assert.equal((await signUpVia(port3,`10.9.8.8:${port3}`,'http://'+h,`mismatch-${randomUUID().slice(0,6)}@example.test`)).status,403);
   assert.equal((await raw(port3,'/api/oimo',{host:h,origin:`http://evil.example:${port3}`,cookie:ok1.cookie,body:{action:'product'}})).status,403);
  }finally{s3.kill();rmSync(dir3,{recursive:true,force:true})}
  const off=await signUpVia(port,`10.9.8.7:${port}`,`http://10.9.8.7:${port}`,`off-${randomUUID().slice(0,6)}@example.test`);assert.equal(off.status,403);
  console.log('PASS OIMO_OPEN_TEST_ACCESS: any local-network Host/IP works when Origin matches it, foreign or mismatched origins get 403, login still required; off by default')}
 const page=await fetch(origin+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);const html=await page.text();assert.ok(html.includes('/oimo-logo.jpg'));assert.ok(!html.includes('favicon.svg'));
 const logo=await fetch(origin+'/oimo-logo.jpg');assert.equal(logo.status,200);assert.match(logo.headers.get('content-type')||'',/jpeg/);
 for(const path of ['/','/join','/reset-password']){const r=await fetch(origin+path);assert.equal(r.status,200,path);assert.ok(!/ChatGPT|Claude|Codex|OpenAI|аккаунт OIMO/i.test(await r.text()),'forbidden wording on '+path)}
 console.log('PASS Production pages render with the supplied logo; join and reset pages respond');
}finally{stop()}

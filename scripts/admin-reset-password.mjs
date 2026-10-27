// Server-operator recovery when SMTP is not configured: sets a one-time temporary password for an existing account,
// ends all of its sessions and prints the temporary password once to this terminal only. Usage:
//   npm run admin:reset-password -- user@example.com            (local)
//   docker compose exec oimo node scripts/admin-reset-password.mjs user@example.com
import Database from 'better-sqlite3';
import {randomBytes,scrypt} from 'node:crypto';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
// Same scrypt format as Better Auth 1.7 (@better-auth/utils password.node): hex salt, NFKC password, N=16384 r=16 p=1, 64-byte key.
// Kept dependency-free because the Docker standalone image bundles Better Auth into server chunks.
const hashPassword=password=>{const salt=randomBytes(16).toString('hex');return new Promise((ok,fail)=>scrypt(password.normalize('NFKC'),salt,64,{N:16384,r:16,p:1,maxmem:128*16384*16*2},(e,key)=>e?fail(e):ok(salt+':'+key.toString('hex'))))};
if(existsSync('.env.local')){const {config}=await import('dotenv');config({path:'.env.local',quiet:true})}
const email=(process.argv[2]||'').trim().toLowerCase();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){console.error('Укажите email существующего аккаунта: npm run admin:reset-password -- user@example.com');process.exit(2)}
const file=resolve(process.env.OIMO_DATA_DIR||'data','oimo.sqlite');
if(!existsSync(file)){console.error('База данных не найдена: '+file);process.exit(2)}
const database=new Database(file);database.pragma('busy_timeout = 5000');database.pragma('foreign_keys = ON');
const user=database.prepare('SELECT id FROM "user" WHERE lower(email)=?').get(email);
const account=user&&database.prepare('SELECT id FROM account WHERE userId=? AND providerId=\'credential\'').get(user.id);
if(!account){console.error('Аккаунт с таким email и паролем не найден.');process.exit(1)}
const temporary=randomBytes(18).toString('base64url'),hash=await hashPassword(temporary),t=new Date().toISOString();
const sessions=database.transaction(()=>{database.prepare('UPDATE account SET password=?,updatedAt=? WHERE id=?').run(hash,t,account.id);return database.prepare('DELETE FROM session WHERE userId=?').run(user.id).changes})();
database.close();
console.log(`Временный пароль для ${email}: ${temporary}`);
console.log(`Завершено сеансов: ${sessions}. Передайте пароль владельцу аккаунта лично; после входа его нужно сменить в разделе «Пароль и безопасность».`);

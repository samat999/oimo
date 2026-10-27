// Consistent copy of the live database (SQLite online backup, safe while the app runs) plus the private photo folder.
//   npm run backup                      → ./backups/oimo-YYYYMMDD-HHMMSS/
//   docker compose exec oimo node scripts/backup.mjs /data/backups   (then copy out with `docker compose cp`)
import Database from 'better-sqlite3';
import {cpSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
if(existsSync('.env.local')){const {config}=await import('dotenv');config({path:'.env.local',quiet:true})}
const dataDir=resolve(process.env.OIMO_DATA_DIR||'data'),stamp=new Date().toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);
const target=join(resolve(process.argv[2]||'backups'),'oimo-'+stamp);
if(!existsSync(join(dataDir,'oimo.sqlite'))){console.error('База данных не найдена в '+dataDir);process.exit(2)}
mkdirSync(target,{recursive:true,mode:0o700});
const database=new Database(join(dataDir,'oimo.sqlite'),{readonly:true});await database.backup(join(target,'oimo.sqlite'));database.close();
if(existsSync(join(dataDir,'photos')))cpSync(join(dataDir,'photos'),join(target,'photos'),{recursive:true});
console.log('Резервная копия: '+target+'\nХраните её вне этого компьютера и вместе с BETTER_AUTH_SECRET из .env.local / .env.docker.');

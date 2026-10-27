// Applies migrations/*.sql once each, in name order, inside a transaction per file. Plain Node so the Docker image needs no tsx.
import Database from 'better-sqlite3';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function migrate({dataDir=resolve(process.env.OIMO_DATA_DIR||'data'),dir=fileURLToPath(new URL('../migrations/',import.meta.url))}={}){
 mkdirSync(dataDir,{recursive:true,mode:0o700});const database=new Database(resolve(dataDir,'oimo.sqlite'));
 try{database.pragma('journal_mode = WAL');database.pragma('foreign_keys = ON');database.pragma('busy_timeout = 5000');
  database.exec('CREATE TABLE IF NOT EXISTS _oimo_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort())if(!database.prepare('SELECT name FROM _oimo_migrations WHERE name=?').get(name)){database.transaction(()=>{database.exec(readFileSync(resolve(dir,name),'utf8'));database.prepare('INSERT INTO _oimo_migrations VALUES (?,?)').run(name,new Date().toISOString())})();console.log('Applied migration:',name)}
 }finally{database.close()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){migrate();console.log('OIMO database is up to date.')}

import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export const dataDir=resolve(process.env.OIMO_DATA_DIR||'data');
const globalDb=globalThis as unknown as {oimoSqlite?:Database.Database};
export function sqlite(){if(!globalDb.oimoSqlite){mkdirSync(dataDir,{recursive:true,mode:0o700});const connection=new Database(resolve(dataDir,'oimo.sqlite'));connection.pragma('journal_mode = WAL');connection.pragma('foreign_keys = ON');connection.pragma('busy_timeout = 5000');globalDb.oimoSqlite=connection}return globalDb.oimoSqlite}

import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {config} from 'dotenv';
if(!existsSync('.env.local')&&!process.env.BETTER_AUTH_SECRET)writeFileSync('.env.local','BETTER_AUTH_URL=http://localhost:5188\nBETTER_AUTH_SECRET='+randomBytes(48).toString('base64url')+'\nOIMO_DATA_DIR=./data\n',{mode:0o600});
config({path:'.env.local',quiet:true});
const {migrate}=await import('./migrate.mjs');migrate();
// Safety net after a Better Auth upgrade: adds any auth columns that migrations/0003_better_auth.sql does not have yet.
const {auth}=await import('../lib/auth');const {getMigrations}=await import('better-auth/db/migration');const {toBeCreated,toBeAdded,toBeAddedIndexes,runMigrations}=await getMigrations(auth.options);
if(toBeCreated.length||toBeAdded.length||toBeAddedIndexes.length){console.log('Better Auth schema changes:',[...toBeCreated,...toBeAdded,...toBeAddedIndexes].map(t=>t.table).join(', '));await runMigrations()}
console.log('OIMO database and authentication are ready. No user passwords were created. Start the app and register your account.');
// Better Auth keeps timers alive; exit explicitly once all awaited work is done.
process.exit(0);

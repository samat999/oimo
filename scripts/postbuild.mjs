// `output: 'standalone'` leaves public/ and .next/static out of .next/standalone; copy them so `node .next/standalone/server.js` serves the logo and client assets.
import {cpSync,existsSync,rmSync} from 'node:fs';
if(!existsSync('.next/standalone/server.js'))throw Error('Standalone build missing');
for(const [from,to] of [['public','.next/standalone/public'],['.next/static','.next/standalone/.next/static']]){rmSync(to,{recursive:true,force:true});cpSync(from,to,{recursive:true})}
// Never ship local secrets or data inside the build folder.
for(const f of ['.env','.env.local','.env.production','.env.production.local'])rmSync('.next/standalone/'+f,{recursive:true,force:true});
// Guard: a deployable bundle must never contain a database, backup, credentials file or local env.
import {readdirSync,statSync} from 'node:fs';import {join} from 'node:path';
const bad=[];const walk=d=>{for(const n of readdirSync(d)){const f=join(d,n);if(n==='node_modules')continue;if(statSync(f).isDirectory()){if(['data','outputs','backups'].includes(n)&&d==='.next/standalone')bad.push(f);walk(f)}else if(/\.sqlite(-|$)|^\.env|DEMO_CREDENTIALS/.test(n))bad.push(f)}};walk('.next/standalone');
if(bad.length){console.error('Build contains private files:\n'+bad.join('\n'));process.exit(1)}

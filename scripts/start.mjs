// Local production start: `npm run build` once, then `npm start`. The standalone server chdir()s into .next/standalone,
// so OIMO_DATA_DIR is made absolute here first; otherwise ./data would silently point inside the build folder.
import {config} from 'dotenv';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {networkInterfaces,hostname} from 'node:os';
import {execFileSync} from 'node:child_process';
config({path:'.env.local',quiet:true});
if(!process.env.BETTER_AUTH_SECRET){console.error('Сначала выполните: npm run setup');process.exit(1)}
if(!existsSync('.next/standalone/server.js')){console.error('Сначала выполните: npm run build');process.exit(1)}
const url=new URL(process.env.BETTER_AUTH_URL||'http://localhost:5188');
process.env.OIMO_DATA_DIR=resolve(process.env.OIMO_DATA_DIR||'data');
process.env.PORT=process.env.PORT||url.port||'5188';
process.env.HOSTNAME=process.env.OIMO_HOST||'127.0.0.1';
process.env.NODE_ENV='production';
// Listening on every interface means phones on the LAN are expected: trust this Mac's own LAN addresses too.
if(process.env.HOSTNAME==='0.0.0.0'&&!process.env.OIMO_TRUST_LAN)process.env.OIMO_TRUST_LAN='true';
const {migrate}=await import('./migrate.mjs');migrate();
let bonjour='';if(process.platform==='darwin')try{bonjour=execFileSync('scutil',['--get','LocalHostName'],{encoding:'utf8'}).trim()}catch{}
if(!bonjour)bonjour=hostname().replace(/\.local$/,'');
const lan=process.env.HOSTNAME==='0.0.0.0'?[...Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)).map(n=>n.address),...(/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(bonjour)?[bonjour+'.local']:[])].map(h=>`http://${h}:${process.env.PORT}`):[];
console.log(`OIMO: ${[`http://localhost:${process.env.PORT}`,...lan].join('  ')}  (данные: ${process.env.OIMO_DATA_DIR})`);
if(process.env.OIMO_OPEN_TEST_ACCESS==='true')console.warn('ВНИМАНИЕ: OIMO_OPEN_TEST_ACCESS=true — тестовый режим сетевого доступа. Не используйте его с реальными данными.');
await import(resolve('.next/standalone/server.js'));

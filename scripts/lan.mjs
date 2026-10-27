// LAN helper: makes the app reachable from phones on the shop Wi-Fi and prints the addresses to open.
//   npm run lan              → listen on all interfaces, trust this Mac's own LAN addresses (re-read automatically when the IP changes)
//   npm run lan -- --test    → additionally OIMO_OPEN_TEST_ACCESS=true (test data only!)
// Restart afterwards: launchctl kickstart -k gui/$(id -u)/com.oimo.sales   (or stop and run `npm start` again)
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {networkInterfaces,hostname} from 'node:os';
import {execFileSync} from 'node:child_process';
if(!existsSync('.env.local')){console.error('Сначала выполните: npm run setup');process.exit(1)}
const test=process.argv.includes('--test');
const set={OIMO_HOST:'0.0.0.0',OIMO_TRUST_LAN:'true',...(test?{OIMO_OPEN_TEST_ACCESS:'true'}:{})};
let lines=readFileSync('.env.local','utf8').split('\n').filter(l=>l.trim()&&!Object.keys(set).some(k=>l.startsWith(k+'=')));
lines.push(...Object.entries(set).map(([k,v])=>`${k}=${v}`));
writeFileSync('.env.local',lines.join('\n')+'\n',{mode:0o600});
const port=(lines.find(l=>l.startsWith('BETTER_AUTH_URL='))||'').match(/:(\d+)/g)?.pop()?.slice(1)||'5188';
const ips=Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)).map(n=>n.address);
let name='';if(process.platform==='darwin')try{name=execFileSync('scutil',['--get','LocalHostName'],{encoding:'utf8'}).trim()}catch{}
if(!name)name=hostname();name=name.replace(/\.local$/,'');const names=/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(name)?[name+'.local']:[];
console.log('Готово. Перезапустите приложение и откройте на телефоне (та же сеть Wi-Fi):');
for(const h of [...ips,...names])console.log(`  http://${h}:${port}`);
console.log('Адрес по IP работает на всех телефонах; имя .local — на iPhone и большинстве Android 12+.');
if(test)console.warn('Включён OIMO_OPEN_TEST_ACCESS=true: только для тестовых данных. Выключить: удалите строку из .env.local и перезапустите.');
console.log('Без HTTPS пароли передаются по Wi-Fi открытым текстом — для реальной работы нужен HTTPS (см. README).');

// Optional browser E2E through the real UI, meant for LAN origins (catches insecure-context and origin bugs that localhost hides).
// Needs Google Chrome and: npm i --no-save puppeteer-core   Then: npm run test:e2e -- http://192.168.1.100:5188 [screenshotDir]
// Creates synthetic e2e-*@example.test accounts and a test store in the target server's database — never run it against real data.
// CHROME_PATH overrides the browser location.
import puppeteer from 'puppeteer-core';
import {writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const base=process.argv[2],shots=process.argv[3];if(shots)mkdirSync(shots,{recursive:true});
const png=(await import('node:os')).tmpdir()+'/oimo-e2e-photo.png';writeFileSync(png,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=','base64'));
const tag=randomUUID().slice(0,6),ownerEmail=`e2e-owner-${tag}@example.test`,sellerEmail=`e2e-seller-${tag}@example.test`,pw='E2E-'+randomUUID();
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
const problems=[],steps=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function phone(label){const ctx=await browser.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 p.on('console',m=>{if(m.type()==='error')problems.push(`[${label} console] ${m.text().slice(0,200)}`)});p.on('pageerror',e=>problems.push(`[${label} pageerror] ${e.message.slice(0,200)}`));
 p.on('response',async r=>{if(r.status()>=400){let t='';try{t=(await r.text()).slice(0,160)}catch{}problems.push(`[${label} HTTP ${r.status()}] ${r.request().method()} ${r.url().replace(base,'')} ${t}`)}});return {ctx,p}}
const byText=async(p,text,sel='button,a')=>{const ok=await p.evaluate((t,s)=>{const el=[...document.querySelectorAll(s)].filter(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed').find(b=>b.textContent.trim().includes(t)||b.getAttribute('aria-label')===t);if(el){el.click();return true}return false},text,sel);if(!ok)throw Error('Not found: '+text);await wait(700)};
const fill=async(p,sel,v)=>{await p.waitForSelector(sel,{visible:true,timeout:8000});await p.click(sel,{clickCount:3});await p.type(sel,v)};
const submitModal=async p=>{await p.evaluate(()=>document.querySelector('.modal form button[type=submit]').click());await wait(1200)};
const step=async(name,fn,p)=>{try{await fn();steps.push('PASS '+name)}catch(e){steps.push('FAIL '+name+': '+e.message.slice(0,200));if(shots&&p)await p.screenshot({path:`${shots}/fail-${name.replace(/\W+/g,'-')}.png`});throw e}finally{if(shots&&p)await p.screenshot({path:`${shots}/${String(steps.length).padStart(2,'0')}-${name.replace(/[^\wа-яё]+/gi,'-')}.png`}).catch(()=>{})}};
let inviteUrl='';
try{
 const O=await phone('owner'),o=O.p;
 await step('owner opens LAN URL',async()=>{await o.goto(base+'/',{waitUntil:'networkidle0'});await o.waitForSelector('input[name=email]')},o);
 await step('owner registers',async()=>{await byText(o,'Создать аккаунт');await fill(o,'input[name=name]','E2E Владелец');await fill(o,'input[name=email]',ownerEmail);await fill(o,'input[name=password]',pw);await o.evaluate(()=>document.querySelector('form.auth-form button.primary').click());await o.waitForNavigation({waitUntil:'networkidle0',timeout:15000}).catch(()=>{});await wait(1200);const t=await o.evaluate(()=>document.body.innerText);if(/Неверный|Не удалось/.test(t))throw Error(t.slice(0,160))},o);
 await step('owner creates first store',async()=>{await o.waitForSelector('.setup-card',{timeout:10000});await byText(o,'Создать магазин');await o.waitForSelector('.bottom-nav',{timeout:10000})},o);
 await step('owner adds catalog product',async()=>{await byText(o,'Ещё');await byText(o,'Каталог товаров','.more-sheet button');await byText(o,'Добавить товар');await fill(o,'.modal input[name=model]','E2E Ноутбук 15');await fill(o,'.modal input[name=specs]','Ryzen 5 · 16/512');await fill(o,'.modal input[name=price]','55000');await submitModal(o);const n=await o.evaluate(()=>document.body.innerText.includes('E2E Ноутбук 15'));if(!n)throw Error('product not visible')},o);
 const addSale=async(p,serial)=>{await p.evaluate(()=>document.querySelector('.bottom-add').click());await wait(700);const input=await p.waitForSelector('.modal input[type=file]',{timeout:8000});await input.uploadFile(png);await p.waitForFunction(()=>/Фото загружено|загружен/i.test(document.querySelector('.modal')?.innerText||'')||document.querySelector('.upload-zone.uploaded'),{timeout:10000});await fill(p,'.modal input[name=serial]',serial);await submitModal(p);await wait(800);const open=await p.evaluate(()=>!!document.querySelector('.modal'));if(open)throw Error('sale modal still open: '+(await p.evaluate(()=>document.querySelector('.toast')?.innerText||'')))};
 await step('owner uploads photo and adds sale',()=>addSale(o,'E2E-O-'+tag),o);
 await step('owner approves sale',async()=>{await byText(o,'Продажи','.bottom-nav button');await o.evaluate(()=>document.querySelector('.table-link').click());await wait(700);await byText(o,'Подтвердить','.modal button');const t=await o.evaluate(()=>document.body.innerText);if(!t.includes('Подтверждена'))throw Error('no approved badge')},o);
 await step('owner invites seller',async()=>{await byText(o,'Ещё');await byText(o,'Команда','.more-sheet button');await byText(o,'Пригласить сотрудника');await fill(o,'.modal input[name=name]','E2E Продавец');await fill(o,'.modal input[name=email]',sellerEmail);await submitModal(o);inviteUrl=await o.evaluate(()=>[...document.querySelectorAll('.modal input')].map(i=>i.value).find(v=>v.includes('/join#token=')));if(!inviteUrl)throw Error('no invite link shown');steps.push('  invite link origin: '+new URL(inviteUrl).origin)},o);
 const S=await phone('seller'),s=S.p;
 await step('seller opens invitation link (clean context)',async()=>{await s.goto(inviteUrl,{waitUntil:'networkidle0'});await s.waitForSelector('input[name=email]',{timeout:10000})},s);
 await step('seller registers from invitation',async()=>{await byText(s,'Создать аккаунт');await fill(s,'input[name=name]','E2E Продавец');await fill(s,'input[name=email]',sellerEmail);await fill(s,'input[name=password]',pw);await s.evaluate(()=>document.querySelector('form.auth-form button.primary').click());await wait(2500);await s.waitForFunction(()=>document.body.innerText.includes('Принять приглашение'),{timeout:10000})},s);
 await step('seller accepts invitation',async()=>{await byText(s,'Принять приглашение');await s.waitForSelector('.bottom-nav',{timeout:12000});const t=await s.evaluate(()=>document.body.innerText);if(!t.includes('КАБИНЕТ ПРОДАВЦА'))throw Error('not seller dashboard')},s);
 await step('seller uploads photo and adds sale',()=>addSale(s,'E2E-S-'+tag),s);
 await step('owner rejects seller sale with reason',async()=>{await o.reload({waitUntil:'networkidle0'});await wait(800);await byText(o,'Продажи','.bottom-nav button');await o.evaluate(t=>{const rows=[...document.querySelectorAll('.sales-table tbody tr')];const r=rows.find(x=>x.innerText.includes(('E2E-S-'+t).toUpperCase()));r.querySelector('.table-link').click()},tag);await wait(700);await byText(o,'Отклонить','.modal button');await fill(o,'.modal textarea[name=reason],.modal input[name=reason]','E2E: проверка отклонения');await submitModal(o);const t=await o.evaluate(()=>document.body.innerText);if(!t.includes('Отклонена'))throw Error('no rejected badge')},o);
 await step('seller sees rejection',async()=>{await s.reload({waitUntil:'networkidle0'});await wait(800);await byText(s,'Продажи','.bottom-nav button');const t=await s.evaluate(()=>document.body.innerText);if(!t.includes('Отклонена'))throw Error('seller does not see rejection')},s);
}catch{}
await browser.close();
console.log(steps.join('\n'));console.log(problems.length?'PROBLEMS:\n'+problems.join('\n'):'PROBLEMS: none');
process.exit(steps.some(x=>x.startsWith('FAIL'))||problems.length?1:0);

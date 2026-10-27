export type Tier={min:number;max:number;rate:number;bonus:number};
export const DEFAULT_TIERS:Tier[]=[{min:1,max:5,rate:500,bonus:0},{min:6,max:10,rate:700,bonus:2000},{min:11,max:15,rate:900,bonus:3000},{min:16,max:20,rate:1100,bonus:4000},{min:21,max:25,rate:1300,bonus:5000},{min:26,max:30,rate:1500,bonus:6000},{min:31,max:35,rate:1700,bonus:10000}];
export function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bishkek',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}
export function addDays(day:string,n:number){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function weekOf(day:string){if(!validDate(day))throw new Error('Некорректная дата');const d=new Date(day+'T00:00:00Z');return addDays(day,-((d.getUTCDay()+6)%7))}
export function normalizeSerial(s:string){return s.normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'')}
export function moneyToMinor(value:string|number){const s=String(value).trim().replace(',','.');if(!/^-?\d{1,8}(\.\d{1,2})?$/.test(s))throw new Error('Укажите сумму с точностью до тыйынов');const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n))throw new Error('Некорректная сумма');return n}
export function calculate(count:number,tiers:Tier[]=DEFAULT_TIERS,mode='per_sale'){
 if(!Number.isInteger(count)||count<0)throw new Error('Некорректное число продаж');
 if(!count)return {count,base:0,bonus:0,total:0,rate:0,next:tiers[0]?.min??null,remaining:tiers[0]?.min??0};
 const tier=tiers.find(t=>count>=t.min&&count<=t.max)||tiers[tiers.length-1];
 const base=moneyToMinor(tier.rate)*(mode==='fixed_tier'?tier.max:count);const bonus=moneyToMinor(tier.bonus);const next=tiers.find(t=>t.min>count)?.min??null;
 return {count,base,bonus,total:base+bonus,rate:tier.rate,next,remaining:next?next-count:0};
}
export function canReadSale(member:{id:string;role:string},sale:{member_id:string}){return member.role==='owner'||member.id===sale.member_id}
export function transitionAllowed(status:string,next:string){return status==='pending'&&['approved','rejected'].includes(next)||status==='approved'&&next==='returned'}
export function validateTiers(tiers:Tier[]){let end=0;if(!Array.isArray(tiers)||!tiers.length||tiers.length>20)throw new Error('Нужны 1–20 ступеней');for(const t of tiers){if(!t||typeof t!=='object'||!Number.isInteger(t.min)||!Number.isInteger(t.max)||t.min!==end+1||t.max<t.min||t.max>10000||![t.rate,t.bonus].every(n=>Number.isFinite(n)&&n>=0&&n<=1000000))throw new Error('Ступени должны идти подряд с 1; ставки и бонусы неотрицательны');moneyToMinor(t.rate);moneyToMinor(t.bonus);end=t.max}return tiers}
export const PAYMENT_LABELS:Record<string,string>={cash:'Наличные',transfer:'Перевод',bank:'Банковская рассрочка',murabaha:'Мурабаха',online:'Онлайн-рассрочка'};
export const STATUS_LABELS:Record<string,string>={pending:'На проверке',approved:'Подтверждена',rejected:'Отклонена',returned:'Возврат'};

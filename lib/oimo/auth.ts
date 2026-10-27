import {getUser} from '@/lib/identity';
import {isTrustedRequest} from '@/lib/origins';
import {one,statement,fail} from './db';
export type Member={id:string;workspace_id:string;user_id:string|null;email:string;name:string;role:'owner'|'staff';active:number};
export async function identity(){const user=await getUser();if(!user)fail(401,'Войдите в аккаунт');return user}
export async function membership(){const user=await identity();const m=await one<Member>('SELECT * FROM members WHERE user_id=? ORDER BY created_at LIMIT 1',user.userId);if(!m)fail(403,'Откройте персональную ссылку приглашения владельца или создайте свой магазин.');if(!m.active)fail(403,'Доступ отключён владельцем');return m}
export function owner(m:Member){if(m.role!=='owner')fail(403,'Доступно только владельцу')}
// CSRF guard for every write: the browser-set Origin must be on the exact allowlist (lib/origins.ts) and the request not cross-site.
export function sameOrigin(req:Request){if(!isTrustedRequest(req)||req.headers.get('sec-fetch-site')==='cross-site')fail(403,'Недопустимый источник запроса')}
const slot=(key:string,windowSec:number)=>`${key}:${windowSec}:${Math.floor(Date.now()/1000/windowSec)}`;
const expiresMinute=(windowSec:number)=>Math.floor(Date.now()/60000)+Math.ceil(windowSec/60)+1;
// Fixed-window counters in the shared `limits` table. hit() counts atomically; attempts() only reads, for failure-only counting.
export async function hit(key:string,windowSec:number){const r=await one<{count:number}>('INSERT INTO limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',slot(key,windowSec),expiresMinute(windowSec));if(Math.random()<.02)await statement('DELETE FROM limits WHERE expires < ?',Math.floor(Date.now()/60000)).run();return r?.count??0}
export async function attempts(key:string,windowSec:number){return (await one<{count:number}>('SELECT count FROM limits WHERE key=?',slot(key,windowSec)))?.count??0}
export async function rateLimit(key:string,max=120){if(await hit(key,60)>max)fail(429,'Слишком много запросов. Повторите через минуту.')}

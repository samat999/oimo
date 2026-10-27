import {createHash} from 'node:crypto';
import {auth} from '@/lib/auth';
import {boundedBody} from '@/lib/oimo/request';
import {hit,attempts} from '@/lib/oimo/auth';
import {fail} from '@/lib/oimo/db';
import {error} from '../../oimo/route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const FAILED_SIGNIN_MAX=10,FAILED_SIGNIN_WINDOW=15*60,SIGNUP_GLOBAL_MAX=30,RESET_EMAIL_MAX=3,RESET_GLOBAL_MAX=30,HOUR=3600;
function emailKey(bytes:Uint8Array){try{const email=JSON.parse(new TextDecoder().decode(bytes))?.email;return typeof email==='string'&&email.trim()?createHash('sha256').update(email.trim().toLowerCase()).digest('hex'):null}catch{return null}}
export const GET=(req:Request)=>auth.handler(req);
export async function POST(req:Request){try{
 const bytes=await boundedBody(req,50_000),path=new URL(req.url).pathname,email=emailKey(bytes);
 // These limits do not depend on the client IP, so they hold even when X-Forwarded-For is spoofed.
 if(path.endsWith('/sign-in/email')&&email&&await attempts('signin-fail:'+email,FAILED_SIGNIN_WINDOW)>=FAILED_SIGNIN_MAX)fail(429,'Слишком много неудачных попыток входа. Повторите через 15 минут.');
 if(path.endsWith('/sign-up/email')&&await hit('signup:global',HOUR)>SIGNUP_GLOBAL_MAX)fail(429,'Слишком много регистраций. Повторите позже.');
 if(path.endsWith('/request-password-reset')&&(await hit('reset:global',HOUR)>RESET_GLOBAL_MAX||email&&await hit('reset:'+email,HOUR)>RESET_EMAIL_MAX))fail(429,'Слишком много запросов на восстановление. Повторите позже.');
 const response=await auth.handler(new Request(req.url,{method:'POST',headers:req.headers,body:bytes as BodyInit}));
 if(path.endsWith('/sign-in/email')&&email&&response.status===401)await hit('signin-fail:'+email,FAILED_SIGNIN_WINDOW);
 return response;
}catch(e){return error(e)}}

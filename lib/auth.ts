import {betterAuth} from 'better-auth';
import nodemailer from 'nodemailer';
import {sqlite} from './oimo/database';
import {baseURL,trustedOrigins,sameHostLocalOrigin} from './origins';
const secret=process.env.BETTER_AUTH_SECRET;
if(!secret||secret.length<32)throw new Error('Run npm run setup or configure BETTER_AUTH_SECRET (32+ random characters).');
export const smtpEnabled=!!(process.env.SMTP_HOST&&process.env.SMTP_FROM);
// X-Forwarded-For is filled by Next from the socket when the client sends none. Without TRUSTED_PROXIES a client can still spoof it,
// so per-IP limits are best effort; per-email and global limits in app/api/auth/[...all]/route.ts do not depend on the IP.
const trustedProxies=(process.env.TRUSTED_PROXIES||'').split(',').map(s=>s.trim()).filter(Boolean);
async function mail(to:string,subject:string,text:string){const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});await transport.sendMail({from:process.env.SMTP_FROM,to,subject,text})}
export const auth=betterAuth({
 appName:'OIMO Technology',baseURL,secret,database:sqlite(),trustedOrigins:(request?:Request)=>[...trustedOrigins(),request?sameHostLocalOrigin(request):null],
 emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,revokeSessionsOnPasswordReset:true,...(smtpEnabled?{sendResetPassword:async({user,url}:{user:{email:string};url:string})=>mail(user.email,'OIMO — восстановление доступа','Для смены пароля откройте ссылку. Если вы не запрашивали смену, проигнорируйте письмо.\n\n'+url)}:{})},
 ...(smtpEnabled?{emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:true,sendVerificationEmail:async({user,url}:{user:{email:string};url:string})=>mail(user.email,'OIMO — подтверждение email','Чтобы подтвердить адрес и принимать приглашения в команду, откройте ссылку.\n\n'+url)}}:{}),
 session:{expiresIn:60*60*24*7,updateAge:60*60*24,freshAge:60*60,cookieCache:{enabled:false}},
 rateLimit:{enabled:true,storage:'database',window:60,max:100,customRules:{'/sign-in/email':{window:60,max:20},'/sign-up/email':{window:60,max:10},'/request-password-reset':{window:60,max:5},'/change-password':{window:60,max:10}}},
 advanced:{useSecureCookies:baseURL.startsWith('https://'),defaultCookieAttributes:{httpOnly:true,sameSite:'lax'},ipAddress:{ipAddressHeaders:['x-forwarded-for'],trustedProxies}},
});

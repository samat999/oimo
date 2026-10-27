import {networkInterfaces,hostname} from 'node:os';
import {execFileSync} from 'node:child_process';
// Origins allowed to send state-changing requests (shared by Better Auth and the app's own CSRF check).
// Exact origins only, never wildcards: BETTER_AUTH_URL, loopback aliases on the same port, OIMO_TRUSTED_ORIGINS, and with
// OIMO_TRUST_LAN=true this machine's own private IPv4 addresses and <name>.local, re-read so a DHCP change needs no restart.
export const baseURL=process.env.BETTER_AUTH_URL||'http://localhost:5188';
export function normalizeOrigin(value:string|null|undefined):string|null{
 if(!value)return null;try{const u=new URL(value.trim());if(!/^https?:$/.test(u.protocol)||u.username||u.password)return null;return u.origin}catch{return null}
}
const base=new URL(baseURL),scheme=base.protocol,port=base.port||process.env.PORT||(scheme==='https:'?'443':'80');
const at=(host:string)=>normalizeOrigin(`${scheme}//${host}:${port}`);
const privateIPv4=(ip:string)=>/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
let cache:{at:number;list:string[]}|null=null;
// Bonjour name for <name>.local. On macOS os.hostname() can be the DHCP address, so ask scutil first.
let bonjour:string|null|undefined;
export function localHostName():string|null{
 if(bonjour!==undefined)return bonjour;let name='';
 if(process.platform==='darwin')try{name=execFileSync('scutil',['--get','LocalHostName'],{encoding:'utf8',timeout:2000}).trim()}catch{}
 if(!name)name=hostname();name=name.toLowerCase().replace(/\.local$/,'');
 return bonjour=/^[a-z0-9][a-z0-9-]*$/.test(name)?name:null;
}
function lanOrigins():string[]{
 if(process.env.OIMO_TRUST_LAN!=='true'&&process.env.OIMO_OPEN_TEST_ACCESS!=='true')return [];
 const hosts=new Set<string>();
 for(const list of Object.values(networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal&&privateIPv4(n.address))hosts.add(n.address);
 const name=localHostName();if(name)hosts.add(name+'.local');
 return [...hosts].map(at).filter((o):o is string=>!!o);
}
export function trustedOrigins():string[]{
 if(cache&&Date.now()-cache.at<30_000)return cache.list;
 const configured=(process.env.OIMO_TRUSTED_ORIGINS||'').split(',').map(normalizeOrigin).filter((o):o is string=>!!o);
 const list=[...new Set([normalizeOrigin(baseURL)!,...['localhost','127.0.0.1','[::1]'].map(at).filter((o):o is string=>!!o),...configured,...lanOrigins()])];
 cache={at:Date.now(),list};return list;
}
export const isTrustedOrigin=(origin:string|null)=>{const o=normalizeOrigin(origin);return !!o&&trustedOrigins().includes(o)};
// Address to put into invitation links when the owner is on the Mac itself (localhost is useless on a phone).
export function shareOrigin():string{
 const explicit=normalizeOrigin(process.env.OIMO_SHARE_URL);if(explicit)return explicit;
 const list=trustedOrigins(),loop=/\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/;
 return list.find(o=>/\/\/\d+\.\d+\.\d+\.\d+(:|$)/.test(o)&&!loop.test(o))||list.find(o=>!loop.test(o))||list[0];
}
// OIMO_OPEN_TEST_ACCESS=true — temporary test mode WITHOUT real data. Accepts a write when its Origin is exactly the request's own
// Host (true same-origin, whatever the current IP) and that host is a local-network name. Internet origins, including DNS-rebinding
// domains, stay rejected. Authentication, sessions and role checks are unchanged.
export const openTestAccess=()=>process.env.OIMO_OPEN_TEST_ACCESS==='true';
const localNetworkHost=(h:string)=>h==='localhost'||h==='[::1]'||/^127\./.test(h)||privateIPv4(h)||/^169\.254\./.test(h)||/^[a-z0-9-]+(\.local)?$/.test(h);
export function sameHostLocalOrigin(req:Request):string|null{
 if(!openTestAccess())return null;const o=normalizeOrigin(req.headers.get('origin')),host=req.headers.get('host')?.toLowerCase();if(!o||!host)return null;
 const u=new URL(o);return u.host===host&&localNetworkHost(u.hostname)?o:null;
}
export const isTrustedRequest=(req:Request)=>isTrustedOrigin(req.headers.get('origin'))||!!sameHostLocalOrigin(req);

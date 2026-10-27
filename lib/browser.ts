// Browser helpers that also work on plain-HTTP LAN addresses (http://192.168.x.x), which are not "secure contexts":
// there crypto.randomUUID and navigator.clipboard are undefined, while crypto.getRandomValues still works.
export function uuid():string{
 const c=globalThis.crypto;if(typeof c?.randomUUID==='function')return c.randomUUID();
 const b=c.getRandomValues(new Uint8Array(16));b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;
 const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export async function copyText(text:string):Promise<boolean>{
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}}catch{}
 const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();
 try{return document.execCommand('copy')}catch{return false}finally{area.remove()}
}

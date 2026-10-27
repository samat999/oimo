import {fail} from './db';
export async function boundedBody(req:Request,max:number){
 if(Number(req.headers.get('content-length')||0)>max){await req.body?.cancel();fail(413,'Запрос слишком большой')}
 const reader=req.body?.getReader();if(!reader)return new Uint8Array();let total=0;const chunks:Uint8Array[]=[];
 while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();fail(413,'Запрос слишком большой')}chunks.push(value)}
 const out=new Uint8Array(total);let pos=0;for(const c of chunks){out.set(c,pos);pos+=c.length}return out;
}

import {sqlite} from './database';
class Statement{
 constructor(readonly sql:string,readonly args:unknown[]=[]){}
 bind(...args:unknown[]){return new Statement(this.sql,args)}
 async all<T=Record<string,any>>(){return {results:sqlite().prepare(this.sql).all(...this.args) as T[]}}
 async first<T=Record<string,any>>():Promise<T|null>{return (sqlite().prepare(this.sql).get(...this.args) as T)||null}
 syncRun(){const r=sqlite().prepare(this.sql).run(...this.args);return {meta:{changes:r.changes}}}
 async run(){return this.syncRun()}
}
export const db=()=>({prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>sqlite().transaction(()=>statements.map(s=>s.syncRun()))()});
export function statement(sql:string,...args:unknown[]){return db().prepare(sql).bind(...args)}
export async function all<T=Record<string,any>>(sql:string,...args:unknown[]):Promise<T[]>{return (await statement(sql,...args).all<T>()).results}
export async function one<T=Record<string,any>>(sql:string,...args:unknown[]):Promise<T|null>{return await statement(sql,...args).first<T>()}
export const id=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export function auditStatement(ctx:{workspace_id:string;id:string;name:string},action:string,entity:string,detail:unknown){return statement('INSERT INTO audit (id,workspace_id,actor_id,actor_name,action,entity_id,detail,created_at) VALUES (?,?,?,?,?,?,?,?)',id(),ctx.workspace_id,ctx.id,ctx.name,action,entity,JSON.stringify(detail),now())}
export class AppError extends Error {constructor(public status:number,message:string){super(message)}}
export function fail(status:number,message:string):never{throw new AppError(status,message)}

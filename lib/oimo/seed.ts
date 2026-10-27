import {db,statement,one,id,now,auditStatement,fail} from './db';
import type {Member} from './auth';
import {today,weekOf,addDays} from './domain';
export async function seedDemo(m:Member){
 if(await one('SELECT id FROM sales WHERE workspace_id=? LIMIT 1',m.workspace_id)||await one('SELECT id FROM products WHERE workspace_id=? LIMIT 1',m.workspace_id))fail(409,'Демо можно загрузить только в пустой магазин');
 const t=now(),week=weekOf(today());const people=[{id:m.id,name:m.name},...['Азамат Токтосунов','Айпери Садыкова','Нурсултан Алиев'].map(name=>({id:id(),name}))];
 const goods=[['HP Victus 15','Ryzen 7 · RTX 4060 · 16 / 512 ГБ',92500,'laptop'],['HP OmniBook 14','Ryzen 5 · OLED Touch · 16 / 512 ГБ',78000,'laptop'],['Lenovo IdeaPad','Ryzen 5 · FHD · 8 / 512 ГБ',50000,'laptop'],['HP Laptop 15','Ryzen 5 · FHD IPS · 16 / 512 ГБ',56500,'laptop'],['ASUS Zenbook 14','Core Ultra 5 · OLED · 16 / 512 ГБ',84000,'laptop'],['Logitech M240','Bluetooth · беспроводная мышь',2500,'accessory']].map(x=>({id:id(),model:x[0],specs:x[1],price:Number(x[2])*100,category:x[3]}));
 const commands=[statement('UPDATE workspaces SET demo=1,revision=revision+1 WHERE id=?',m.workspace_id)];
 for(const [i,p] of people.entries())if(i)commands.push(statement('INSERT INTO members(id,workspace_id,user_id,email,name,role,active,demo,created_at) VALUES (?,?,NULL,?,?,\'staff\',1,1,?)',p.id,m.workspace_id,`demo-${i}@example.invalid`,p.name,t));
 for(const p of goods)commands.push(statement('INSERT INTO products(id,workspace_id,model,specs,category,price,active,created_at) VALUES (?,?,?,?,?,?,1,?)',p.id,m.workspace_id,p.model,p.specs,p.category,p.price,t));
 const dayCount=Math.min(6,Math.round((Date.parse(today())-Date.parse(week))/86400000));
 for(let i=0;i<34;i++){const p=goods[i%goods.length],person=people[(i%3)+1],sid=id(),sold=i<24?addDays(week,i%(dayCount+1)):addDays(week,-7+(i%7)),status=i<4?'pending':i===6?'rejected':'approved';commands.push(statement('INSERT INTO sales(id,workspace_id,member_id,product_id,model,specs,category,serial,price,payment,payment_status,note,photo_id,status,sold_on,week,created_at,updated_at,reason,operation_id,version,demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,1,1)',sid,m.workspace_id,person.id,p.id,p.model,p.specs,p.category,`DEMO-${String(i+1).padStart(5,'0')}`,p.price,['cash','transfer','bank','murabaha'][i%4],i%4===2?'awaiting':'received','Пример продажи. Все данные вымышлены.',status,sold,weekOf(sold),new Date(sold+'T08:30:00Z').toISOString(),t,status==='rejected'?'Нужно уточнить серийный номер':'',sid))}
 for(const p of people){commands.push(statement('INSERT INTO plans(id,workspace_id,member_id,kind,start,end,target,revenue) VALUES (?,?,?,\'week\',?,?,12,0)',id(),m.workspace_id,p.id,week,addDays(week,6)))}
 commands.push(statement('INSERT INTO plans(id,workspace_id,member_id,kind,start,end,target,revenue) VALUES (?,?,\'team\',\'week\',?,?,40,250000000)',id(),m.workspace_id,week,addDays(week,6)),auditStatement(m,'demo.loaded',m.workspace_id,{note:'Вымышленные сотрудники и продажи; цены иллюстративные, не актуальный прайс'}));
 await db().batch(commands);return {ok:true};
}

import {admin,database,detail,listing,legacy,save} from '@/lib/cms/server';
import {sameOrigin,validSlug} from '@/lib/cms/policy';
export const dynamic='force-dynamic';
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function GET(request:Request){
 if(!await admin())return json({error:'אין הרשאת ניהול'},403);
 const url=new URL(request.url),id=url.searchParams.get('id');
 if(url.searchParams.get('export')==='1'){
  const docs=(await database().prepare('SELECT * FROM cms_documents').all()).results;
  const revisions=(await database().prepare('SELECT * FROM cms_revisions').all()).results;
  return new Response(JSON.stringify({format:1,exportedAt:new Date().toISOString(),documents:docs,revisions},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="elia-content-backup.json"','Cache-Control':'no-store'}});
 }
 if(id){const doc=await detail(id);if(!doc)return json({error:'לא נמצא'},404);const history=(await database().prepare('SELECT id,version,action,created_at FROM cms_revisions WHERE document_id=? ORDER BY version DESC LIMIT 40').bind(id).all()).results;return json({doc,history});}
 return json({documents:await listing()});
}
export async function POST(request:Request){
 const user=await admin();if(!user)return json({error:'אין הרשאת ניהול'},403);
 if(!sameOrigin(request)||request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'הבקשה אינה מורשית'},403);
 const raw=await request.text();if(raw.length>200000)return json({error:'התוכן גדול מדי'},413);
 try{
  const input=JSON.parse(raw);const {id,action,version}=input;
  if(typeof id!=='string'||(!Object.hasOwn(legacy,id)&&!validSlug(id)))return json({error:'כתובת המאמר אינה תקינה'},400);
  if(action==='create'){
   if(Object.hasOwn(legacy,id)||await detail(id))return json({error:'הכתובת כבר קיימת'},409);
   const title=typeof input.title==='string'?input.title.trim():'';if(!title||title.length>180)return json({error:'יש להזין כותרת עד 180 תווים'},400);
   await database().prepare('INSERT INTO cms_documents (id,title,kind,draft,published,version,updated_at,updated_by) VALUES (?,?,?,?,NULL,0,?,?)').bind(id,title,'article',JSON.stringify({title,summary:'',category:'מאמרים להורים',body:''}),new Date().toISOString(),user.userId).run();
   return json({doc:await detail(id)});
  }
  if(!['save','publish','unpublish','restore'].includes(action)||!Number.isInteger(version)||version<0)return json({error:'פעולה לא תקינה'},400);
  if(action==='unpublish'&&Object.hasOwn(legacy,id))return json({error:'עמוד קבוע אינו ניתן להסרה מפרסום'},400);
  let values=input.values;
  if(action==='restore'){
   const revision=await database().prepare('SELECT payload FROM cms_revisions WHERE id=? AND document_id=?').bind(String(input.revisionId),id).first<{payload:string}>();
   if(!revision)return json({error:'הגרסה לא נמצאה'},404);values=JSON.parse(revision.payload);
  }
  return json({doc:await save(id,values,version,action,user.userId)});
 }catch(error){const message=error instanceof Error?error.message:'';if(message==='CONFLICT')return json({error:'התוכן השתנה בחלון אחר. טען מחדש לפני שמירה.'},409);
  if(message.startsWith('יש ')||message.startsWith('אחד ')||message.startsWith('מבנה ')||message.startsWith('חסרים ')||message.startsWith('כותרת'))return json({error:message},400);
  console.error('CMS operation failed',error instanceof Error?error.name:'unknown');return json({error:'הפעולה לא הושלמה. נסו שוב; התוכן בעורך נשמר.'},500);}
}

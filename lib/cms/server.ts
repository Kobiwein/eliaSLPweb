import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import legacyData from './legacy.json';
import {authorized,escapeHtml,validateValues} from './policy';
export type Field={key:string;label:string;group:string;value?:string};
export type Values=Record<string,string>;
type Legacy={id:string;title:string;kind:string;template:string;fields:Field[];values:Values};
export const legacy=Object.assign(Object.create(null),legacyData) as Record<string,Legacy>;
export type Row={id:string;title:string;kind:string;draft:string;published:string|null;version:number;updated_at:string;updated_by:string};
export const articleFields:Field[]=[{key:'title',label:'כותרת המאמר',group:'פרטי המאמר'},{key:'summary',label:'תקציר שיופיע ברשימת המאמרים',group:'פרטי המאמר'},{key:'category',label:'קטגוריה',group:'פרטי המאמר'},{key:'body',label:'תוכן המאמר — שורה ריקה מפרידה בין פסקאות. התחילו כותרת משנה ב־##',group:'תוכן המאמר'}];
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export async function admin(){const user=await getChatGPTUser();const config=env as unknown as Record<string,string>;return user&&authorized(user.email,config.CMS_ADMIN_EMAIL)?user:null;}
export async function row(id:string){return database().prepare('SELECT * FROM cms_documents WHERE id=?').bind(id).first<Row>();}
export function fallback(id:string):Row|null{const p=legacy[id];return p?{id,title:p.title,kind:'page',draft:JSON.stringify(p.values),published:JSON.stringify(p.values),version:0,updated_at:'',updated_by:''}:null;}
export async function detail(id:string){const doc=await row(id)||fallback(id);if(!doc)return null;return {...doc,draft:JSON.parse(doc.draft),published:doc.published?JSON.parse(doc.published):null,fields:legacy[id]?.fields||articleFields};}
export async function listing(){const stored=(await database().prepare('SELECT * FROM cms_documents ORDER BY updated_at DESC').all<Row>()).results;const map=new Map(stored.map(d=>[d.id,d]));for(const id of Object.keys(legacy))if(!map.has(id))map.set(id,fallback(id)!);return [...map.values()].map(d=>({id:d.id,title:d.title,kind:d.kind,version:d.version,published:!!d.published,hasDraft:d.draft!==d.published,updatedAt:d.updated_at}));}
export async function save(id:string,values:unknown,version:number,action:string,actor:string){
 const base=legacy[id];const clean=validateValues(values,(base?.fields||articleFields).map(f=>f.key));
 if(!base&&(!clean.title.trim()||!clean.body.trim()))throw new Error('יש למלא כותרת ותוכן');
 if(!base&&(clean.title.length>180||clean.summary.length>500||clean.category.length>80))throw new Error('כותרת, תקציר או קטגוריה ארוכים מדי');
 const db=database(),now=new Date().toISOString(),payload=JSON.stringify(clean);
 if(base)await db.prepare('INSERT OR IGNORE INTO cms_documents (id,title,kind,draft,published,version,updated_at,updated_by) VALUES (?,?,?,?,?,0,?,?)').bind(id,base.title,'page',JSON.stringify(base.values),JSON.stringify(base.values),now,actor).run();
 const prior=await row(id);if(!prior)throw new Error('המסמך לא נמצא');
 const published=action==='publish'?payload:action==='unpublish'?null:prior.published;
 const result=await db.batch([
 db.prepare('INSERT INTO cms_revisions (id,document_id,version,payload,action,created_at,actor) SELECT ?,id,version,draft,?,?,? FROM cms_documents WHERE id=? AND version=?').bind(crypto.randomUUID(),action,now,actor,id,version),
 db.prepare('UPDATE cms_documents SET draft=?,published=?,title=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND version=? RETURNING id').bind(payload,published,base?.title||clean.title,now,actor,id,version)
 ]);
 if(!result[1].results.length)throw new Error('CONFLICT');
 return detail(id);
}
export async function publishedArticles(){return (await database().prepare("SELECT id,published FROM cms_documents WHERE kind='article' AND published IS NOT NULL ORDER BY updated_at DESC").all<{id:string;published:string}>()).results.map(d=>({id:d.id,...JSON.parse(d.published) as {title:string;summary:string;category:string;body:string}}));}
export async function render(id:string,preview=false){
 const stored=await row(id);const p=legacy[id];if(!stored&&!p)return null;
 const json=preview?stored?.draft:stored?.published;
 if(stored&&!preview&&!stored.published)return null;
 const values:Values=json?JSON.parse(json):p.values;
 let html:string;
 if(p)html=p.template.replace(/\{\{cms:(text_\d+)\}\}/g,(_,key)=>escapeHtml(values[key]??p.values[key]??''));
 else {
  const shell=legacy.index.template.replace(/\{\{cms:(text_\d+)\}\}/g,(_,key)=>escapeHtml(legacy.index.values[key]||''));
  const body=values.body.split(/\r?\n\s*\r?\n/).map(s=>s.startsWith('## ')?'<h2>'+escapeHtml(s.slice(3))+'</h2>':'<p>'+escapeHtml(s).replace(/\n/g,'<br>')+'</p>').join('');
  html=shell.replace(/<main\b[\s\S]*?<\/main>/,'<main id="main"><section class="section"><article class="container narrow"><a href="/articles.html">← כל המאמרים</a><p class="eyebrow">'+escapeHtml(values.category)+'</p><h1>'+escapeHtml(values.title)+'</h1><p class="lead">'+escapeHtml(values.summary)+'</p><div class="article-content">'+body+'</div></article></section></main>').replace(/<title>[\s\S]*?<\/title>/,'<title>'+escapeHtml(values.title)+' | אליה וינשטיין</title>');
 }
 if(id==='articles'||id==='index'){
  const articles=await publishedArticles();if(articles.length){const cards=articles.map(a=>'<a class="card hover" style="padding:28px" href="/'+a.id+'.html"><span class="eyebrow">'+escapeHtml(a.category||'מאמרים')+'</span><h3>'+escapeHtml(a.title)+'</h3><p>'+escapeHtml(a.summary)+'</p><span>לקריאת המאמר ←</span></a>').join('');html=html.replace('</main>','<section class="section bg-sand"><div class="container"><h2 style="margin-bottom:28px">מאמרים חדשים</h2><div class="grid g-2">'+cards+'</div></div></section></main>');}
 }
 html=html.replace(/href="(index|about|accessibility|articles|guidance|individual|social|article-[a-z-]+)\.html/g,'href="/$1.html');
 html=html.replace('</head>','<style>.article-content{margin-top:40px}.article-content p{white-space:normal}.article-content h2{margin:32px 0 16px}</style></head>');
 html=html.replace('</body>','<a href="/admin" style="display:block;text-align:center;padding:16px;color:#5b6f72;font:14px sans-serif">כניסת מנהל</a></body>');
 if(preview)html=html.replace('<body>','<body><div style="background:#f9e4ba;padding:12px;text-align:center;position:sticky;top:0;z-index:9999">תצוגה מקדימה של טיוטה — אינה גלויה למבקרים</div>');
 return html;
}
export function htmlResponse(html:string,status=200){return new Response(html,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"}});}


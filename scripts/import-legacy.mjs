import fs from 'node:fs';
import path from 'node:path';
const source=process.argv[2];
if(!source) throw new Error('Provide the legacy site directory');
const labels={'index':'דף הבית','about':'אודות','accessibility':'נגישות','articles':'רשימת המאמרים','guidance':'הדרכות','individual':'טיפול פרטני','social':'קבוצות חברתיות'};
const documents={};
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
for(const name of fs.readdirSync(source).filter(n=>n.endsWith('.html'))){
 let html=fs.readFileSync(path.join(source,name),'utf8'); const id=name.slice(0,-5); const fields=[]; let group='פרטי העמוד'; let count=0;
 // Script/style/SVG blocks remain trusted, immutable templates. Only plain text is editable.
 const tokens=html.match(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<svg\b[\s\S]*?<\/svg>|<!--[\s\S]*?-->|<[^>]+>|[^<]+/gi)||[];
 let heading=false;
 html=tokens.map(t=>{
  if(t.startsWith('<')){heading=/^<h[1-6]\b/i.test(t);return t;}
  if(!t.trim())return t;
  const value=decode(t.trim()); if(heading)group=value; heading=false;
  const key='text_'+(++count); fields.push({key,label:value.slice(0,70),group,value});return t.replace(t.trim(),'{{cms:'+key+'}}');
 }).join('');
 const title=labels[id]||decode((fs.readFileSync(path.join(source,name),'utf8').match(/<title>(.*?)<\/title>/s)||[])[1]||id).split('|')[0].trim();
 documents[id]={id,title,kind:'page',template:html,fields,values:Object.fromEntries(fields.map(f=>[f.key,f.value]))};
}
fs.mkdirSync('lib/cms',{recursive:true});fs.writeFileSync('lib/cms/legacy.json',JSON.stringify(documents));
console.log('Imported '+Object.keys(documents).length+' pages');

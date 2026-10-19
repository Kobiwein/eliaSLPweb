export function authorized(email:string|undefined, configured:string|undefined){return !!email&&!!configured&&email.toLowerCase()===configured.trim().toLowerCase();}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !!origin&&origin===new URL(request.url).origin;}
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function validSlug(value:unknown):value is string{return typeof value==='string'&&/^article-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=100;}
export function validateValues(values:unknown,allowed:string[]){
 if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('מבנה התוכן אינו תקין');
 const out:Record<string,string>={}; const data=values as Record<string,unknown>;
 if(Object.keys(data).length!==allowed.length||allowed.some(k=>!(k in data)))throw new Error('חסרים שדות או שנוספו שדות לא מוכרים');
 for(const key of allowed){const value=data[key];if(typeof value!=='string'||value.length>30000)throw new Error('אחד השדות ארוך מדי או אינו תקין');out[key]=value;}
 return out;
}

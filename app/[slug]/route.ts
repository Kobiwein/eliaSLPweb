import {render,htmlResponse,admin} from '@/lib/cms/server';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{slug:string}>}){
 const {slug}=await context.params;const id=slug.replace(/\.html$/,'');
 if(!/^[a-z0-9-]+$/.test(id))return new Response('Not found',{status:404});
 const preview=new URL(request.url).searchParams.get('preview')==='1';
 if(preview&&!await admin())return new Response('Forbidden',{status:403,headers:{'Cache-Control':'no-store'}});
 const html=await render(id,preview);return html?htmlResponse(html):htmlResponse('<html lang="he" dir="rtl"><h1>העמוד לא נמצא</h1><a href="/">חזרה לדף הבית</a></html>',404);
}

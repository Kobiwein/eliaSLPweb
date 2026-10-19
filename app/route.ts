import {render,htmlResponse} from '@/lib/cms/server';
export const dynamic='force-dynamic';
export async function GET(){return htmlResponse((await render('index'))!);}

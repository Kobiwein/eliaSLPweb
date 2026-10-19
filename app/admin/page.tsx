import {admin} from '@/lib/cms/server';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '@/app/chatgpt-auth';
import Editor from './editor';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Admin(){
 const user=await admin();if(!user){const signed=await getChatGPTUser();return <main className="login"><div className="monogram">או</div><p className="eyebrow">אליה וינשטיין · מערכת ניהול</p><h1>{signed?'החשבון הזה אינו מורשה לניהול':'מקום אחד לכל התוכן שלך'}</h1><p>עריכת עמודים, כתיבת מאמרים ופרסום — בצורה פשוטה ובטוחה.</p><a className="primary" target="_top" href={signed?chatGPTSignOutPath('/admin'):chatGPTSignInPath('/admin')}>{signed?'החלפת חשבון':'כניסה מאובטחת עם ChatGPT'}</a><a href="/">חזרה לאתר</a></main>;}
 return <Editor name={user.displayName}/>;
}

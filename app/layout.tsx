import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'אליה וינשטיין | ניהול האתר',description:'ניהול תוכן האתר והמאמרים של אליה וינשטיין'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>;}

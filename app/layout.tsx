import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'OIMO · Продажи и команда',description:'Продажи, планы и прозрачные начисления для OIMO Technology',icons:{icon:'/oimo-logo.jpg',apple:'/oimo-logo.jpg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}

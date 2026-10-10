import './globals.css';
import './design-v9.css';
import './design-v10.css';
import './design-v11.css';
import Fx from './Fx';
export const metadata={title:'Säljdashboard',description:'Privat säljuppföljning – Stille & Affe',icons:{icon:'/icon.svg',apple:'/icon.svg'},appleWebApp:{capable:true,title:'Sälj'}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover'as const,themeColor:'#06080b'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return<html lang="sv"style={{colorScheme:'dark'}}><body>
    <Fx/>
    <div className="halo"aria-hidden/>
    <div className="aurora"aria-hidden><i/><i/><i/></div>
    {children}
  </body></html>;
}

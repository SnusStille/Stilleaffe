import './globals.css';
import './design-v9.css';
import './design-v10.css';
import './design-v11.css';
import './design-v12.css';
import Words from './Words';
import './design-v13.css';
import './design-v15.css';
import './design-v16.css';
import './design-v17.css';
import FocusMode from './FocusMode';
import Fx from './Fx';
export const metadata={title:'Säljdashboard',description:'Privat säljuppföljning – Stille & Affe',icons:{icon:'/icon.svg',apple:'/icon.svg'},appleWebApp:{capable:true,title:'Sälj'}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover'as const,themeColor:'#07080f'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return<html lang="sv"style={{colorScheme:'dark'}}><body>
    <Fx/>
    <div className="halo"aria-hidden/>
    <div className="aurora"aria-hidden><i/><i/><i/></div>
    <div className="scene"aria-hidden><i className="sc-orb o1"/><i className="sc-orb o2"/><i className="sc-orb o3"/><div className="sc-floor"/><div className="sc-s s1"><div className="sc-cube"><b/><b/><b/><b/><b/><b/></div></div><div className="sc-s s2"><div className="sc-cube"><b/><b/><b/><b/><b/><b/></div></div><div className="sc-s s3"><div className="sc-cube"><b/><b/><b/><b/><b/><b/></div></div><div className="sc-s s4"><div className="sc-cube"><b/><b/><b/><b/><b/><b/></div></div></div>
    <Words/>
    <FocusMode/>
    {children}
  </body></html>;
}

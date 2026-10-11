import './globals.css';
import './design-v9.css';
import './design-v10.css';
import './design-v12.css';
import './design-v13.css';
import './design-v16.css';
import './design-v17.css';
// Keep the Deep Carbon skin as the final base layer over GitHub's feature styles.
import './design-v11.css';
import './design-v18.css';
import './design-v19.css';
import FocusMode from './FocusMode';
import Fx from './Fx';

export const metadata = {
  title: 'Säljdashboard',
  description: 'Privat säljuppföljning – Stille & Affe',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Sälj' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#06080b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" style={{ colorScheme: 'dark' }}>
      <body>
        <Fx />
        <FocusMode />
        {children}
      </body>
    </html>
  );
}

import './globals.css';
export const metadata = { title: 'Säljdashboard', description: 'Privat säljuppföljning', icons: { icon: '/icon.svg', apple: '/icon.svg' }, appleWebApp: { capable: true, title: 'Sälj' } };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' as const, themeColor: '#07090c' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="sv"><body><div className="aurora"><i /><i /><i /></div>{children}</body></html>;
}

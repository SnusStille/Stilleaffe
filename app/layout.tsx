import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Label Lab — Sales Performance', template: '%s · Label Lab' },
  description:
    'Label Lab är teamets interna sales performance-system: månadsresultat, takt, prognoser, teamjämförelse och spelguide.',
  applicationName: 'Label Lab',
  keywords: ['Label Lab', 'sales performance', 'ViPo', 'Brandkollen', 'Konsumentkollen'],
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Label Lab — Sales Performance',
    description: 'Internt sales performance-system för teamet bakom ViPo Säkerhetstjänster.',
    type: 'website',
    siteName: 'Label Lab',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07090c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" style={{ colorScheme: 'dark' }}>
      <body>
        <div className="bg-ambient" aria-hidden="true">
          <span className="bg_glow bg_glow-a" />
          <span className="bg_glow bg_glow-b" />
          <span className="bg_glow bg_glow-c" />
          <span className="bg_grid" />
          <span className="bg_noise" />
        </div>
        {children}
      </body>
    </html>
  );
}

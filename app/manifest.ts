import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Label Lab — Sales Performance',
    short_name: 'Label Lab',
    description: 'Internt sales performance-system för teamet bakom ViPo Säkerhetstjänster.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07090c',
    theme_color: '#07090c',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}

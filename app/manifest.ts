import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Säljdashboard v7', short_name: 'Sälj', start_url: '/', display: 'standalone', background_color: '#06080b', theme_color: '#06080b', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] };
}

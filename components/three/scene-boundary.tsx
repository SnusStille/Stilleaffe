'use client';

import React from 'react';

/**
 * 3D scenes are decorative. If WebGL is missing or the renderer throws, we
 * fall back to the static CSS object instead of breaking the page.
 */
export class SceneBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[3d] scene disabled:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function webglAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

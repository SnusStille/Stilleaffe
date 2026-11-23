'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { canSpeak, isSpeaking, speak, stopSpeaking } from '@/lib/speech';
import { useApp } from './app-provider';

/** Reads a manuscript aloud with the browser's Swedish voice. Hidden entirely when unsupported. */
export function ListenButton({ text, label = 'Lyssna', className = '' }: { text: string; label?: string; className?: string }) {
  const { toast } = useApp();
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => setSupported(canSpeak()), []);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`copy-btn listen ${active ? 'on' : ''} ${className}`}
      aria-pressed={active}
      title={active ? 'Stoppa uppläsning' : 'Läs upp med webbläsarens svenska röst'}
      onClick={() => {
        if (active || isSpeaking()) {
          stopSpeaking();
          setActive(false);
          return;
        }
        const started = speak(text, { onEnd: () => setActive(false) });
        if (!started) return toast('Uppläsning kunde inte startas.', 'err');
        setActive(true);
      }}
    >
      <Icon name={active ? 'square' : 'volume'} size={12} />
      {active ? 'Stoppa' : label}
    </button>
  );
}

import { describe, expect, it } from 'vitest';
import { stripForSpeech } from '@/lib/speech';

describe('stripForSpeech', () => {
  it('removes markdown but keeps placeholders readable', () => {
    const md = `**Behöver jag en app?**\n"Nej." [Källa](https://vipo.se) · _betona_ [UPPGIFTER]`;
    const out = stripForSpeech(md);
    expect(out).toBe('Behöver jag en app? "Nej." Källa · betona uppgifter');
  });
  it('flattens bullets and repeated newlines into pauses', () => {
    expect(stripForSpeech('- Punkt ett\n- Punkt två\n\nPunkt tre')).toBe('Punkt ett. Punkt två. Punkt tre');
  });
});

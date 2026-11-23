/**
 * Read-aloud support for sales manuscripts, built on the browser's SpeechSynthesis API.
 * Everything degrades silently when the API or a Swedish voice is missing.
 */
let supported: boolean | null = null;

export function canSpeak(): boolean {
  if (supported !== null) return supported;
  supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  return supported;
}

export function isSpeaking(): boolean {
  return canSpeak() && window.speechSynthesis.speaking;
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}

/** Markdown-ish guide text → spoken text. Keeps placeholders like [UPPGIFTER] readable. */
export function stripForSpeech(md: string): string {
  return md
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/[*_]{1,3}(.+?)[*_]{1,3}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\[UPPGIFTER\]/gi, 'uppgifter')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/([!?])\./g, '$1')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0];
  return (
    voices.find((v) => v.lang === lang && /natural|online|premium|ehob| e /i.test(v.name)) ||
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.startsWith(base)) ||
    null
  );
}

/** Starts speaking; returns false when speech is unavailable. */
export function speak(text: string, opts: { lang?: string; rate?: number; onEnd?: () => void } = {}): boolean {
  if (!canSpeak()) return false;
  stopSpeaking();
  const lang = opts.lang || 'sv-SE';
  const u = new SpeechSynthesisUtterance(stripForSpeech(text));
  u.lang = lang;
  u.rate = opts.rate ?? 1;
  u.pitch = 1;
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}

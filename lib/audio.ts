let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

export function beep(freq = 660, duration = 0.11, type: OscillatorType = 'sine', volume = 0.06) {
  const ac = getCtx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.stop(ac.currentTime + duration);
  } catch {}
}

export function chime() {
  beep(523, 0.1, 'triangle', 0.05);
  window.setTimeout(() => beep(784, 0.12, 'triangle', 0.05), 120);
  window.setTimeout(() => beep(1046, 0.2, 'triangle', 0.06), 260);
}

export function haptic(pattern: number | number[] = 18) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate(pattern);
  } catch {}
}

export function confetti(big = false) {
  if (typeof document === 'undefined') return;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  if (big) wrap.classList.add('mega');
  const count = big ? 160 : 90;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    const hue = Math.random() * 360;
    const size = big ? 6 + Math.random() * 6 : 4 + Math.random() * 5;
    el.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size * 1.5}px;background:hsl(${hue},85%,60%);animation-delay:${Math.random() * 0.5}s;--x:${(Math.random() - 0.5) * 400}px;--r:${Math.random() * 1080 - 540}deg;border-radius:${Math.random() > 0.5 ? '2px' : '50%'}`;
    wrap.appendChild(el);
  }
  document.body.appendChild(wrap);
  window.setTimeout(() => wrap.remove(), big ? 4200 : 2700);
}

'use client';

import { Modal } from './ui';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

export const SHORTCUTS: { keys: string[]; label: string; where?: string; sellerOnly?: boolean }[] = [
  { keys: ['mod', 'K'], label: 'Öppna kommandopaletten', where: 'Överallt' },
  { keys: ['N'], label: 'Registrera dagens siffror', where: 'Överallt (säljare)', sellerOnly: true },
  { keys: ['R'], label: 'Uppdatera siffrorna', where: 'Överallt' },
  { keys: ['?'], label: 'Visa kortkommandon', where: 'Överallt' },
  { keys: ['/'], label: 'Sök i Spelguiden', where: 'Spelguiden' },
  { keys: ['mod', 'Enter'], label: 'Spara registreringen (trycks samtidigt)', where: 'Registreringsdialogen', sellerOnly: true },
  { keys: ['Esc'], label: 'Stäng dialog eller palett', where: 'Överallt' },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Kortkommandon" width={560}>
      <p className="card-note" style={{ marginBottom: 14 }}>Tangenter trycks en i taget (inte samtidigt) om inget annat anges. Textfält fångar alltid tangenterna först.</p>
      <div className="kbd-list">
        {SHORTCUTS.map((s) => (
          <div className="kbd-row" key={s.label}>
            <span className="kbd-keys">
              {s.keys.map((k, i) => (
                <kbd className="kbd" key={i}>{k === 'mod' ? (isMac() ? '⌘' : 'Ctrl') : k}</kbd>
              ))}
            </span>
            <span className="kbd-label">{s.label}</span>
            <span className="kbd-where">{s.where}</span>
          </div>
        ))}
      </div>
      <div className="note mint" style={{ marginTop: 16 }}>
        <span>Kommandopaletten ({isMac() ? '⌘' : 'Ctrl'}+K) söker även i Spelguiden — skriv “brandkollen”, “invändning” eller “mål”.</span>
      </div>
    </Modal>
  );
}

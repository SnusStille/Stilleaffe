'use client';

import { useApp } from '@/components/app-provider';
import { Icon } from '@/components/icons';
import { Badge, Card } from '@/components/ui';
import { CommentsThread } from '@/components/comments-thread';

export default function CommentsPage() {
  const { me } = useApp();
  const isManager = me.role === 'manager';
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow mint" style={{ marginBottom: 6 }}>TEAMKOMMUNIKATION</div>
          <h1 className="page-title">Kommentarer</h1>
          <p className="page-sub">Korta uppföljningar, hejarop och frågor — kopplade till en dag vid behov. Respektfull ton, alltid.</p>
        </div>
        <Badge tone={isManager ? 'violet' : 'mint'}>{isManager ? 'Chef' : 'Säljare'}</Badge>
      </div>
      <div className="grid g-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <CommentsThread markSeen />
        <Card>
          <div className="card-head"><div><div className="card-kicker">ETIKETT</div><h3>Så använder vi kommentarer</h3></div></div>
          <ul className="insight-list">
            <li>Kommentera det som är åtgärdbart — konkreta observationer från registrerade siffror.</li>
            <li>Jämför aldrig säljare negativt med varandra. Chefer följer upp i första hand direkt.</li>
            <li>Reagera med emojis i stället för korta svar — det håller tråden ren.</li>
            <li>Fästa kommentarer visas överst för hela teamet.</li>
            <li>Kommentarer med datum länkar till den dagens registrering.</li>
          </ul>
          <div className="note" style={{ marginTop: 12 }}>
            <Icon name="shield" size={15} />
            <span>Privata anteckningar, humör och betyg i registreringar syns aldrig för andra — bara sälj, TB och timmar.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

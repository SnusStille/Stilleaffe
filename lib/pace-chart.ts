import type { Row } from './calc';

export type PaceDay = {
  date: string;
  dayOfMonth: number;
  status: 'registered' | 'missing' | 'nonworkday' | 'future';
  cumulativeTb: number | null;
  minimumPace: number;
  targetPace: number;
  beastPace: number;
};

export type PaceSeries = {
  month: string;
  totalWorkdays: number;
  registeredWorkdays: number;
  missingWorkdays: number;
  points: PaceDay[];
};

const dateParts = (date: string) => date.split('-').map(Number);
const weekday = (date: string) => {
  const [year, month, day] = dateParts(date);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dow > 0 && dow < 6;
};

/** Build actual-only cumulative points and deterministic linear target paces. */
export function buildPaceSeries(month: string, rows: Pick<Row, 'entry_date' | 'tb_sek'>[], asOf: string): PaceSeries {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return { month, totalWorkdays: 0, registeredWorkdays: 0, missingWorkdays: 0, points: [] };
  }
  const [year, monthNumber] = dateParts(`${month}-01`);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  const dayMap = new Map<string, number>();
  for (const row of rows) {
    if (row.entry_date < firstDay || row.entry_date > lastDay || row.entry_date > asOf) continue;
    const tb = Number(row.tb_sek);
    if (Number.isFinite(tb)) dayMap.set(row.entry_date, (dayMap.get(row.entry_date) || 0) + tb);
  }

  const dates = Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  const totalWorkdays = dates.filter(weekday).length;
  let elapsedWorkdays = 0;
  let cumulativeTb = 0;
  let registeredWorkdays = 0;
  let missingWorkdays = 0;
  const points: PaceDay[] = dates.map((date, index) => {
    const isWorkday = weekday(date);
    if (isWorkday) elapsedWorkdays += 1;
    const hasRegistration = dayMap.has(date);
    const status: PaceDay['status'] = date > asOf ? 'future'
      : hasRegistration ? 'registered'
        : isWorkday ? 'missing' : 'nonworkday';
    if (isWorkday && status === 'registered') registeredWorkdays += 1;
    if (isWorkday && status === 'missing') missingWorkdays += 1;
    if (hasRegistration) cumulativeTb += dayMap.get(date)!;
    const progress = totalWorkdays ? elapsedWorkdays / totalWorkdays : 0;
    return {
      date,
      dayOfMonth: index + 1,
      status,
      cumulativeTb: status === 'registered' ? cumulativeTb : null,
      minimumPace: 60_000 * progress,
      targetPace: 80_000 * progress,
      beastPace: 100_000 * progress,
    };
  });

  return { month, totalWorkdays, registeredWorkdays, missingWorkdays, points };
}

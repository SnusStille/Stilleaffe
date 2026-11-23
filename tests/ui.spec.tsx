// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '@/components/app-provider';
import { EntryForm } from '@/components/entry-form';
import { WeekStrip } from '@/components/week-strip';
import { TrendChart } from '@/components/charts';
import { CommandPalette } from '@/components/command-palette';
import { buildCommands, commandsFor } from '@/lib/command';
import { InsightsCard } from '@/components/insights-card';
import { DuelCard } from '@/components/duel-card';
import { PlannerCard } from '@/components/planner-card';
import { OpenDays } from '@/components/open-days';
import { HeatYear } from '@/components/heat-year';
import type { Insight } from '@/lib/analysis';
import { todayISO, weekMonday, type Entry, type Goals } from '@/lib/calc';

const GOALS: Goals = { daily_sales: 7, daily_tb: 3000, weekly_sales: 35, weekly_tb: 15000, monthly_sales: 140, monthly_tb: 60000 };
const ME = { username: 'stille', display_name: 'Stille', role: 'seller' as const };

function entry(date: string, sales: number, extra: Partial<Entry> = {}): Entry {
  return { id: Math.floor(Math.random() * 1e9), seller_username: 'stille', entry_date: date, sales, tb_sek: sales * 400, hours: null, note: null, rating: null, mood: null, tags: [], brandkollen_sales: null, konsumentkollen_sales: null, brandkollen_tb: null, konsumentkollen_tb: null, ...extra };
}

beforeAll(() => {
  // jsdom has no layout: pretend every chart container is 400px wide.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 400; } });
});

afterEach(() => cleanup());

describe('<WeekStrip/>', () => {
  it('renders Monday→Sunday with the right states and reports clicks', () => {
    const today = '2026-11-25'; // Wednesday
    const monday = weekMonday(today);
    const rows = [entry(monday, 9), entry('2026-11-24', 3)];
    const onPick = vi.fn();
    render(<WeekStrip entries={rows} goals={GOALS} today={today} onPick={onPick} />);
    const days = screen.getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(days[0].className).toContain('s-hit');
    expect(days[1].className).toContain('s-miss');
    expect(days[2].className).toContain('s-today');
    expect(days[3].className).toContain('s-future');
    expect(days[5].className).toContain('s-weekend');
    expect(screen.getByText(/2\/3 registrerade/)).toBeTruthy();
    fireEvent.click(days[2]);
    expect(onPick).toHaveBeenCalledWith('2026-11-25', null);
    fireEvent.click(days[1]);
    expect(onPick).toHaveBeenCalledWith('2026-11-24', rows[1]);
    fireEvent.click(days[4]);
    expect(onPick).toHaveBeenCalledTimes(2); // future days are not clickable
  });
});

describe('<TrendChart/>', () => {
  it('draws one line per contiguous segment and breaks on missing days', () => {
    const { container } = render(
      <TrendChart points={[{ label: 'mån', value: 3 }, { label: 'tis', value: null }, { label: 'ons', value: 5 }, { label: 'tor', value: 7 }]} goal={5} height={160} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg).toBeTruthy();
    const lines = [...svg.querySelectorAll('path[fill="none"]')];
    expect(lines).toHaveLength(2); // 3 | 5,7
    expect(svg.textContent).toContain('Mål 5');
    expect(container.querySelectorAll('circle').length).toBe(3); // one dot per registered day
  });
  it('shows a tooltip with the hovered value', () => {
    const { container } = render(<TrendChart points={[{ label: 'mån', value: 2 }, { label: 'tis', value: 8 }]} height={160} />);
    const svg = container.querySelector('svg')!;
    fireEvent.mouseMove(svg, { clientX: 400, clientY: 50 });
    expect(container.querySelector('.chart-tip')?.textContent).toContain('8');
  });
});

describe('<EntryForm/> inside the app', () => {
  function setup(initial?: Entry | null) {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => {
        if (url === '/api/data') return { me: ME, team: [{ username: 'stille', display_name: 'Stille', role: 'seller', goals: GOALS, entries: [] }], myEntries: [entry('2026-11-20', 4, { tags: ['ny kund'] })], activity: [], now: todayISO() };
        return { ok: true };
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('stepper, split helper, tag suggestions and two-step delete work', async () => {
    const fetchMock = setup(entry('2026-11-24', 5, { id: 42 }));
    const onSaved = vi.fn();
    render(
      <AppProvider user={ME}>
        <EntryForm initial={entry('2026-11-24', 5, { id: 42 })} onSaved={onSaved} />
      </AppProvider>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/data', expect.anything()));

    const sales = screen.getByLabelText('Antal sälj') as HTMLInputElement;
    expect(sales.value).toBe('5');
    fireEvent.click(screen.getByLabelText('Öka med 1'));
    expect(sales.value).toBe('6');

    fireEvent.click(screen.getByText('Allt → Konsumentkollen'));
    expect((screen.getByLabelText('Konsumentkollen — sälj') as HTMLInputElement).value).toBe('6');
    expect((screen.getByLabelText('Brandkollen — sälj') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByText('Rensa'));
    fireEvent.change(screen.getByLabelText('Brandkollen — sälj'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Fördela resten'));
    expect((screen.getByLabelText('Konsumentkollen — sälj') as HTMLInputElement).value).toBe('4');

    expect(screen.getByText('+ ny kund')).toBeTruthy(); // suggestion from history
    fireEvent.click(screen.getByText('+ företag'));
    expect((screen.getByLabelText('Taggar') as HTMLInputElement).value).toBe('företag');

    fireEvent.click(screen.getByLabelText('4 av 5'));
    expect(screen.getByRole('radio', { name: '4 av 5' }).getAttribute('aria-checked')).toBe('true');

    // Delete needs a second click; the first only arms it.
    const del = screen.getByRole('button', { name: /Ta bort/ });
    fireEvent.click(del);
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/entries')).toBe(false);
    expect(screen.getByRole('button', { name: /Tryck igen för att ta bort/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Tryck igen för att ta bort/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const deleteCall = fetchMock.mock.calls.find((c) => c[0] === '/api/entries')!;
    expect(JSON.parse((deleteCall[1] as RequestInit).body as string)).toEqual({ action: 'delete', id: 42 });
    vi.unstubAllGlobals();
  });

  it('sends the split only when touched and the date passed via the palette', async () => {
    const fetchMock = setup(null);
    const onSaved = vi.fn();
    render(
      <AppProvider user={ME}>
        <EntryForm date="2026-11-23" onSaved={onSaved} />
      </AppProvider>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/data', expect.anything()));
    expect((screen.getByLabelText('Datum') as HTMLInputElement).value).toBe('2026-11-23');
    fireEvent.change(screen.getByLabelText('Antal sälj'), { target: { value: '7' } });
    fireEvent.change(document.getElementById('ef-tb')!, { target: { value: '2800' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Spara registrering/ })); });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const saveCall = fetchMock.mock.calls.find((c) => c[0] === '/api/entries')!;
    const body = JSON.parse((saveCall[1] as RequestInit).body as string);
    expect(body).toMatchObject({ action: 'upsert', entry_date: '2026-11-23', sales: 7, tb_sek: 2800 });
    expect(body).not.toHaveProperty('brandkollen_sales');
    expect(screen.getByText(/Målet är nått/)).toBeTruthy(); // 7 of 7 → celebration copy in the toast
    vi.unstubAllGlobals();
  });
});

describe('<CommandPalette/>', () => {
  it('filters, navigates with the keyboard and runs on Enter', () => {
    const onRun = vi.fn();
    const commands = commandsFor(buildCommands(), 'seller');
    render(<CommandPalette open onClose={() => {}} commands={commands} onRun={onRun} />);
    const input = screen.getByLabelText('Sök kommandon') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'invändning' } });
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0].textContent).toContain('Invändningar'); // dedicated guide search outranks the generic page
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ action: expect.objectContaining({ type: 'guide-search' }) }));
    cleanup();
    render(<CommandPalette open onClose={() => {}} commands={commands} onRun={onRun} />);
    const input2 = screen.getByLabelText('Sök kommandon');
    fireEvent.change(input2, { target: { value: 'zzzz' } });
    expect(screen.getByText(/Inget matchar/)).toBeTruthy();
  });
});

const WED = '2026-11-25';
const member = (u: string, role: 'seller' | 'manager', rows: [string, number][]) => ({ username: u, display_name: u[0].toUpperCase() + u.slice(1), role, goals: GOALS, entries: rows.map(([d, v], i) => entry(d, v, { id: i + 1, seller_username: u })) });
const insight = (id: string, tone: Insight['tone'] = 'info'): Insight => ({ id, tone, emoji: '💡', title: `Titel ${id}`, body: `Body ${id}`, weight: 1 });

describe('<InsightsCard/>', () => {
  it('shows the top three, expands on request and explains when there is nothing yet', () => {
    const list = ['a', 'b', 'c', 'd', 'e'].map((x) => insight(x));
    const { container, getByText, queryByText } = render(<InsightsCard insights={list} />);
    expect(container.querySelectorAll('.insight')).toHaveLength(3);
    expect(queryByText('Titel d')).toBeNull();
    fireEvent.click(getByText('Visa alla 5'));
    expect(container.querySelectorAll('.insight')).toHaveLength(5);
    cleanup();
    render(<InsightsCard insights={[]} />);
    expect(getByText(/Fortsätt registrera/)).toBeTruthy();
  });
});

describe('<DuelCard/>', () => {
  it('explains that a duel needs two sellers', () => {
    render(<DuelCard members={[member('stille', 'seller', [['2026-11-23', 5]])]} today={WED} />);
    expect(screen.getByText(/bara en säljare/)).toBeTruthy();
  });
  it('renders the headline, seven day columns, scores and eight history dots', () => {
    const { container } = render(
      <DuelCard today={WED} highlight="stille" members={[member('stille', 'seller', [['2026-11-23', 5], ['2026-11-24', 7], ['2026-11-25', 3]]), member('kvist', 'seller', [['2026-11-23', 5], ['2026-11-24', 4]])]} />,
    );
    expect(screen.getByText('Stille leder med 6 sälj')).toBeTruthy();
    expect(container.querySelectorAll('.duel-day')).toHaveLength(7);
    expect(container.querySelectorAll('.duel-day.future')).toHaveLength(4);
    expect(container.querySelectorAll('.duel-crown')).toHaveLength(1); // Tuesday only
    expect(container.querySelectorAll('.duel-cell.win')).toHaveLength(1);
    expect(container.querySelectorAll('.duel-dot')).toHaveLength(8);
    expect(screen.getByText('du')).toBeTruthy();
    expect(container.querySelector('.duel-foot')!.textContent).toContain('Stille 1 · Kvist 0');
  });
});

describe('<PlannerCard/>', () => {
  const rows = [{ key: 'stille', label: 'Stille', sales: 100, tb: 40000, avgTbPerSale: 400, openWorkdays: 10, days: 20 }];
  it('starts at the pace the goal requires and reacts to the slider and presets', () => {
    const { container } = render(<PlannerCard rows={rows} goalSales={140} goalTb={56000} dailySales={7} dailyTb={3000} />);
    const range = screen.getByLabelText('Sälj per arbetsdag framöver') as HTMLInputElement;
    expect(range.value).toBe('4'); // (140 − 100) / 10
    expect(screen.getByText('140')).toBeTruthy(); // 100 + 4 × 10 = exactly the goal
    expect(container.querySelector('.planner-verdict')!.className).toContain('reached');
    fireEvent.change(range, { target: { value: '1' } });
    expect(screen.getByText('110')).toBeTruthy();
    expect(container.querySelector('.planner-verdict')!.className).toContain('short');
    fireEvent.click(screen.getByText('Dagsmål · 7'));
    expect((screen.getByLabelText('Sälj per arbetsdag framöver') as HTMLInputElement).value).toBe('7');
  });
  it('says so when there is nothing left to simulate', () => {
    render(<PlannerCard rows={[{ ...rows[0], openWorkdays: 0 }]} goalSales={140} goalTb={56000} dailySales={7} dailyTb={3000} />);
    expect(screen.getByText(/Inga arbetsdagar kvar/)).toBeTruthy();
  });
});

describe('<OpenDays/>', () => {
  it('is silent when the seller is caught up and offers the missing days otherwise', () => {
    const { container } = render(<OpenDays entries={[entry('2026-11-24', 1), entry('2026-11-23', 1)]} today={WED} lookback={2} onPick={() => {}} />);
    expect(container.querySelector('.open-days')).toBeNull();
    const onPick = vi.fn();
    render(<OpenDays entries={[entry('2026-11-24', 1)]} today={WED} lookback={4} onPick={onPick} />);
    expect(screen.getByText('3 arbetsdagar utan registrering')).toBeTruthy();
    const chips = screen.getAllByRole('button').filter((b) => b.className.includes('open-day'));
    expect(chips.map((c) => c.textContent!.trim())).toEqual(['mån 23 nov', 'fre 20 nov', 'tors 19 nov']); // window Nov 24–19; Nov 24 is registered
    fireEvent.click(chips[0]);
    expect(onPick).toHaveBeenCalledWith('2026-11-23');
  });
});

describe('<HeatYear/>', () => {
  it('draws a 53-week grid, toggles to 16 weeks and marks states', () => {
    const { container } = render(<HeatYear entries={[entry('2026-11-25', 7), entry('2026-11-24', 0)]} goal={7} today={WED} />);
    expect(container.querySelectorAll('.hy-cell')).toHaveLength(53 * 7);
    expect(container.querySelectorAll('.hy-cell.future')).toHaveLength(4);
    expect(container.querySelector('[data-date="2026-11-25"]')!.className).toContain('l3');
    expect(container.querySelector('[data-date="2026-11-24"]')!.className).toContain('zero');
    expect(container.querySelector('[data-date="2026-11-23"]')!.className).toContain('miss');
    expect(container.querySelector('[data-date="2026-11-21"]')!.className).toContain('none');
    expect(container.querySelector('.hy-months')!.textContent).toContain('nov');
    fireEvent.click(screen.getByText('16 veckor'));
    expect(container.querySelectorAll('.hy-cell')).toHaveLength(16 * 7);
  });
});

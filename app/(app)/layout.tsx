import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@/lib/session';
import { getUsers } from '@/lib/users';
import { AppProvider } from '@/components/app-provider';
import { Shell } from '@/components/shell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value || '';
  const session = raw ? await verifySession(raw) : null;
  if (!session) redirect('/login');

  const users = await getUsers();
  const me = users.find((u) => u.username === session.u);
  if (!me) redirect('/login?e=session');

  return (
    <AppProvider user={me}>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}

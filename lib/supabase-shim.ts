// Shim som gör det enklare att hantera saknad/felaktig Supabase-URL utan att
// hela servern kraschar (bättre feldiagnostik).
import { createClient as _createClient } from '@supabase/supabase-js';

export function createClient(url: string, key: string, opts: any) {
  if (!url || !/^https?:\/\//.test(url)) {
    // Returnera en proxy som alltid svarar med fel, så att anropare får ett
    // hanterbart fel istället för att servern kastar.
    const fake = () => ({
      select: () => fake(),
      from: () => fake(),
      insert: () => fake(),
      upsert: () => fake(),
      delete: () => fake(),
      update: () => fake(),
      eq: () => fake(),
      gte: () => fake(),
      neq: () => fake(),
      order: () => fake(),
      limit: () => fake(),
      maybeSingle: () => fake(),
      then: (resolve: any) => resolve({ data: null, error: { message: 'Saknar giltig NEXT_PUBLIC_SUPABASE_URL' } }),
    });
    return { from: () => fake() } as any;
  }
  return _createClient(url, key, opts);
}

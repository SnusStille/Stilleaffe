# November Evolution — implementation notes

## Project investigation

- **App:** Next.js 15 / React 18. Seller and manager use the existing app shell.
- **Persistence:** Supabase `sales_entries`, `goals`, `app_settings`, `activity_log`, `achievements` and related tables. Server routes use a private admin key; RLS is enabled and public roles have no table access.
- **Auth:** the existing signed `sd_auth` cookie is checked in middleware. `x-role` is injected by middleware; existing seller-only write routes protect sales and goals. Affe remains read-only for sales/goals. Email configuration is seller-only; the unauthenticated cron route separately requires a timing-safe `CRON_SECRET` bearer check.
- **AI:** the existing Anthropic Messages API is server-side. The key is not returned to the browser and existing write proposals still need explicit approval. The analyst now gets compact rollups for up to five years / 2,000 registrations plus recent rows.
- **Before this work:** no Resend call, email delivery log, email settings or scheduled route existed. The sender's Resend verification and recipient addresses could not be confirmed from the original repo.

## Implemented

- **Mission Control:** default view with fixed 60k / 80k / 100k TB tiers, period picker, November-first planning during the final week of October, live workday counts, daily pace, pressure status, evidence coverage and gated forecast. The cumulative Pace Map compares registered TB with the three linear target paces; unregistered weekdays break the actual line and are never plotted as zero. Daily target allocation uses personal weekday TB patterns only with at least 20 prior weekday entries and three samples for each upcoming weekday; weights are capped, the allocations still sum exactly to the goal gap, and sparse history falls back to an even split.
- **What If:** interactive client-side simulation only; it never calls the write API or changes Supabase.
- **Personal Best Hunter:** prior day-sales, day-TB and weekly sales/TB records, TB per sale and best full-month TB, computed from existing rows.
- **Achievement Archive:** existing real achievement conditions reused, made navigable, with Bronze / Silver / Gold / Predator / Legend rank thresholds.
- **AI Sales Analyst:** example questions and real five-year Supabase context. No new AI provider or schema for analytics.
- **Monthly Review / Autopsy:** month selector, fixed target comparison, actual weekly totals, weekday averages, first/second-half split, best days and prior-month actuals. Missing-date coverage is surfaced. AI analysis is optional and fed the selected period's actual metrics.
- **Morning Sales Briefing:** dark responsive HTML and text report; server-side Resend send; seller-only recipient settings; Resend-domain check; manual preview and test; daily delivery history; idempotent daily claim; and a Hobby-compatible Vercel Cron schedule. The 07:00 Stockholm send time is fixed on Hobby; three once-daily UTC invocations cover CET/CEST and safe retries without sending duplicate reports. A daily report is sent even without a sales row; missing remains distinct from a recorded zero.
- **Security hardening:** the environment/Supabase health diagnostic now requires the existing signed seller or manager session, so unauthenticated requests cannot trigger database probes or inspect configuration status. It still returns no key material.
- **Dependency patch:** Next.js updated from 15.5.27 to 15.5.28 after `npm audit` found a critical advisory. The audit is clean after the patch.

## Email activation checklist — currently inactive until all steps pass

The UI deliberately refuses activation until the current two recipients have both received a successful test. A missing key, unverified domain, absent SQL migration, absent recipient, or failed test is shown as configuration state; it is not represented as an active schedule.

1. Run `supabase/migration-morning-briefing.sql` in the correct Supabase project. This creates the private dispatch log and atomic daily-send claim function. It is safe to rerun.
2. Add server-only Vercel environment variables:
   - `RESEND_API_KEY` — Resend API key with email send permission.
   - `CRON_SECRET` — at least 32 random characters. Keep it out of `NEXT_PUBLIC_*` and browser code.
3. In Resend, verify the **`stilledev.se` domain** and its DNS records. The code checks that Resend reports the domain as `verified`; it does not claim the exact mailbox was separately verified.
4. The Hobby-compatible Cron schedule in `vercel.json` uses three separate once-daily UTC runs (05:00, 06:00, and 07:00 UTC). These hit 07:00 Stockholm during both CEST and CET; later same-day invocations can retry a failed send, while the atomic daily claim and Resend idempotency key prevent duplicate emails. The UI fixes the send hour at 07:00 on Hobby because arbitrary local send times cannot be guaranteed by a daily-only UTC scheduler; changing it requires a matching redeploy schedule or a Vercel plan with more frequent Cron support.
5. In **Inställningar → Morning Sales Briefing**, enter Oliver's and Affe's valid addresses (the Hobby send time is fixed at 07:00). Save, preview the report, send a test to both recipients and verify successful delivery in both mailboxes and the log. Only then enable daily sending.
6. If either recipient address changes, the schedule is automatically paused; send another successful test before re-enabling.

Required configuration is not present in this checkout, so Resend domain verification, real test delivery and an actual scheduled send remain unverified. No recipient addresses were supplied, so none have been invented or saved. The schedule is **not active** until the checklist is completed in deployment.

## Data integrity and limitations

- Missing sales rows are not treated as registered zero results.
- Active-month projections are withheld until at least 70% of elapsed weekdays are covered, with three registered days when available. A closed month shows its recorded total, not an extrapolated value.
- The period picker and simulator do not write to sales or goal data.
- Achievement rank is based on the count of previously implemented, real-data achievements; it does not fabricate sales milestones.
- The AI route's five-year source window is capped at the latest 2,000 entries. If the database exceeds that cap, older rows are outside the analysis window.
- Month/date workday arithmetic assumes the app's existing Monday–Friday sales calendar; no Swedish public-holiday calendar exists in the current schema.
- Production auth, Supabase reads, live Anthropic calls, Resend domain verification and Cron delivery cannot be tested from this checkout without deployment configuration.

## Checks

- `npm test` — sixteen deterministic tests covering missing versus zero entries, date bounds, coverage-gated forecasts, per-day and weekday-adaptive pacing, historical fallback labels, HTML escaping, Pace Map gap semantics, target pace across weekends, Stockholm CET/CEST conversion, Hobby Cron frequency/UTC hours, daily retry windows, and DST idempotency.
- `npx tsc --noEmit`
- `npm run build`
- `npm audit`
- `git diff --check`

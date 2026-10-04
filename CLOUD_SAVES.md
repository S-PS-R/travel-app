# Cloud plan recovery

On October 4, 2026 the saved-plan loading failure was traced to a missing `public.plans` table in the live Supabase project. The client had been switched to cloud storage before migration `004_cloud_plans.sql` was applied. The migration is now applied to project `evzymkqaeopozmdikmmo`.

Live verification: the project is ACTIVE_HEALTHY, RLS is enabled and forced on plans, anonymous SELECT is denied, and authenticated access is constrained by `auth.uid() = user_id` for both reads and writes. Local PostgreSQL tests cover ownership, cross-account denial and stale-version update/delete conflicts. The Supabase security advisor reported no plan-table findings; its existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains unchanged.

The app offers Retry loading plans after a load failure. Failure to read an older device copy no longer blocks valid cloud plans. Upcoming trips offers explicit import of account-specific local plans and review of guest plans saved before sign-in. Guest recovery makes a new copy when saved to the account; it leaves the original browser record intact. Import preserves cloud records with matching IDs rather than overwriting them.

Browser storage is isolated by origin and browser profile. `localhost:8081`, `127.0.0.1:8081`, and `127.0.0.2:8081` do not share old local plans or login sessions. To recover an older local plan, open the original address in the original browser/profile. Sign in there, then use Upcoming trips to import or review device copies. No local records were deleted by this repair.

Cloud payloads use JSONB with PostgreSQL EXTENDED storage, which permits automatic lossless TOAST compression for sufficiently large values. Compression ratios are not guaranteed. Plan revisions detect conflicting updates, but this is not realtime synchronization: reload to fetch another device's changes before editing. Guest plans stay local until explicitly copied to an account. Friend sharing is a separate migration and is not enabled by this repair.

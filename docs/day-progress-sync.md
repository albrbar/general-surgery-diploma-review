# Day 1–Day 16 progress sync

The public Day 1–Day 16 app now has a local-first progress tracker. It records, for each of the 16 days:

- answered question count;
- correct answer count;
- total questions;
- last visible question;
- completion state and update timestamp.

The tracker never blocks the learner when offline. It stores data in `gsdiploma.day16.progress.v2` and displays a 16-day progress widget. When a Supabase session and configuration are available, it pulls newer rows and upserts the local state to `public.day_progress`.

## Enable server synchronization

1. Run `supabase/migrations/20261116_day_progress.sql` in the Supabase SQL editor.
2. Put the Supabase publishable/anon key in `public/day1-16/progress-config.js` as `publishableKey`. Never use a service-role key in a browser or commit it to Git.
3. Ensure the same Supabase project is used by the portal authentication flow.
4. Publish the static site and sign in through the portal. The widget will change from `Saved on this device` to `Synced to server` after a successful request.

Until steps 1–2 are completed, local progress remains fully usable and the UI will report `Saved on this device` or `Waiting to sync`; no progress is discarded.

## Security model

The SQL migration enables Row Level Security. A signed-in learner can only select, insert, or update rows whose `user_id` equals `auth.uid()`. The browser must only receive a publishable/anon key. There is no service-role credential in the frontend.

# DateClash

Next.js app (App Router) backed by Supabase, deployed to Vercel at
https://dateclash.com.

## Ops notes

### Supabase free-tier keep-alive

The Supabase project (`pulgkhplscedstaxopuc`, Free plan) auto-pauses after
extended inactivity, which previously crashed the site for the first visitor
after a pause (see the `success`-gating in `app/page.tsx` — the app now shows
a graceful error instead of crashing when a backend call fails).

To prevent the pause, a local `launchd` job on Ali's Mac pings the Supabase
REST API directly every 6 hours. It lives outside this repo — see
`~/Library/Application Support/dateclash-keepalive/README.md` on that machine
for details, logs, and management commands. Note it only runs while that Mac
is on, so it's not a guaranteed 24/7 safeguard.

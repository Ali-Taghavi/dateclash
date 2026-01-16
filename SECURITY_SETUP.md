# Security Setup Guide

This document explains the 3-layer security system implemented to protect your verified database content from scrapers and bots.

## Overview

1. **Database Security (Supabase RLS)** - Prevents direct database queries from client-side
2. **Middleware Bot Blocker** - Blocks malicious bots at the edge
3. **API Rate Limiting** - Limits request frequency per IP address

---

## 1. Database Security (Supabase RLS)

### Setup Instructions

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the migration script: `migrations/secure_manual_school_holidays_rls.sql`

### What It Does

- **Enables RLS** on the `manual_school_holidays` table
- **Revokes SELECT permission** from `anon` and `authenticated` roles
- **Creates a deny-all policy** (service_role bypasses RLS by default)
- **Result**: Only server-side code using `service_role` key can access the table

### Important Notes

- Your server-side code (using `NEXT_PUBLIC_SUPABASE_ANON_KEY`) will **NOT** be able to access this table
- You must use the `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!) for server-side queries
- Client-side code cannot query this table directly, even with the anon key

### Updating Your Server Code

If you're currently using `createSupabaseServerClient()` with the anon key, you'll need to create a separate client for accessing `manual_school_holidays`:

```typescript
// For protected tables (manual_school_holidays)
function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key
  );
}
```

---

## 2. Middleware Bot Blocker

### Setup Instructions

The middleware is already configured at `middleware.ts` in the root directory.

### What It Does

- **Inspects User-Agent** header on every request
- **Blocks known scrapers**: HeadlessChrome, Puppeteer, Selenium, curl, wget, etc.
- **Allows legitimate bots**: Googlebot, Bingbot, GPTBot, ChatGPT-User, etc.
- **Returns 403 Forbidden** for blocked bots

### Allowed Bots (for SEO)

- Googlebot, Bingbot, DuckDuckBot
- GPTBot, ChatGPT-User, Google-Extended
- Anthropic AI bots, PerplexityBot
- Twitterbot, LinkedInBot, etc.

### Blocked Signatures

- HeadlessChrome, Puppeteer, Selenium, Playwright
- Python-requests, curl, wget
- Scrapy, crawler, spider, bot, scraper

### Customization

Edit `middleware.ts` to add/remove bot signatures as needed.

---

## 3. API Rate Limiting

### Setup Instructions

1. **Install required packages:**
   ```bash
   npm install @upstash/ratelimit @vercel/kv
   ```

2. **Configure Vercel KV:**
   - Go to your Vercel Dashboard
   - Navigate to **Storage** → **Create Database** → **KV**
   - Copy the connection details

3. **Set environment variables** (Vercel will auto-detect KV, but verify):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### What It Does

- **Limits requests**: 10 requests per 60 seconds per IP address
- **Applied to**: `getHybridSchoolHolidays()` function
- **Error message**: "Too many requests. Please slow down."

### How It Works

- Uses **Upstash Redis** (via Vercel KV) for distributed rate limiting
- Tracks requests by IP address (from `x-forwarded-for` or `x-real-ip` headers)
- Uses sliding window algorithm for smooth rate limiting

### Fallback Behavior

- If rate limiting packages are not installed: **Allows all requests** (fail open)
- If rate limiting service is down: **Allows all requests** (fail open)
- You can change this to "fail closed" in `app/lib/rate-limit.ts` if preferred

### Testing Rate Limiting

1. Make 10 requests quickly (should succeed)
2. Make an 11th request (should fail with "Too many requests")
3. Wait 60 seconds, then try again (should succeed)

---

## Security Layers Summary

| Layer | Protection | Bypass Method |
|-------|-----------|---------------|
| **Database RLS** | Direct DB queries | Use service_role key (server-side only) |
| **Middleware** | Bot/scraper detection | Legitimate browser User-Agent |
| **Rate Limiting** | Request flooding | Wait 60 seconds between batches |

---

## Troubleshooting

### "Rate limiting not working"

- Ensure packages are installed: `npm install @upstash/ratelimit @vercel/kv`
- Verify Vercel KV is configured in your dashboard
- Check environment variables are set correctly

### "Cannot access manual_school_holidays table"

- Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Verify the RLS migration has been run
- Check that your server-side code uses the service role client

### "Legitimate bots are blocked"

- Add the bot's User-Agent to the `allowedBots` array in `middleware.ts`
- Ensure the bot's User-Agent matches exactly (case-insensitive)

---

## Next Steps

1. ✅ Run the SQL migration in Supabase
2. ✅ Install rate limiting packages
3. ✅ Configure Vercel KV
4. ✅ Update server code to use service_role key for protected tables
5. ✅ Test the security layers

Your verified data is now protected! 🛡️

# Expiry reminders — activation and operation

This feature needs a schema update **before** its production deployment. It adds
`Product.reminderDays` and `ExpiryReminder`; it does not remove existing data.
The code is prepared on `expiry-reminders`, leaving `password-reset` unchanged
until the production database is ready.

## 1. Update Neon from your local project

Keep `DATABASE_URL` in your local `.env` pointed at the same Neon database used
by production. Never paste connection strings or keys into chat or Git.

```powershell
git fetch origin
git switch expiry-reminders
npm install
npm run db:push
```

Check that Prisma reports the database is in sync. Tell the assistant that the
schema update succeeded so the prepared branch can be merged into the production
branch (`password-reset`). Existing production code can run with the added fields.
No seed or data reset is needed. Do not accept a destructive reset prompt.

## 2. Configure production email and cron in Vercel

- `APP_URL=https://goats.win`
- `RESEND_API_KEY`: your existing Resend API key with email sending permission.
- `EMAIL_FROM`: a sender from a domain verified in Resend.
- `CRON_SECRET`: a new random value of at least 32 characters. Generate locally:
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
- `EXPIRY_NOTIFICATION_EMAIL` (optional): one destination email. If omitted,
  notifications go to administrator account emails (up to 50 recipients).

Store secret values only in Vercel environment variables. After the merge and
successful production deployment, Vercel uses `vercel.json` to run
`/api/cron/expiry-reminders` daily at 14:00 UTC (approximately 09:00 Bogotá).
Vercel supplies the `Authorization: Bearer <CRON_SECRET>` header automatically.
Cron runs on production, not preview deployments. Check the cron job and its logs
in Vercel to verify activation; deployment alone does not prove email delivery.

## Behavior

- New Streaming, Música, Productividad and combo purchases create reminders in
  the same transaction as the purchase. Administrator purchases are excluded.
- Names such as `Netflix x20 días`, `Chat GPT x27 Dias`, `x33`, `2 meses`,
  `2 semanas` and `1 año` are recognized. A month means 30 days, a week 7 and a
  year 365. Numbers inside a brand, such as Office 365, are not durations.
- A missing duration defaults to 30 days. Lifetime/permanent names do not create
  automatic reminders. Admins can override the duration in **Editar producto →
  Duración para recordatorio (días)**: blank = automatic; 0 = disabled.
- Overrides apply to new purchases only. Saved reminders keep the sold plan
  name, duration, quantity and due date even after product edits.
- Combo reminders are grouped by included plan and duration. Two copies of the
  same two-platform combo create two reminders, each with quantity two. Each
  source plan's duration is used unless the combo has an explicit override.
- The clock starts at the purchase time, including manually delivered purchases.
  A 20-day plan becomes due after exactly 20 × 24 hours. This does not verify or
  alter the subscription on the external platform.
- The dashboard bell checks due unread reminders every minute while visible.
  **Administración → Vencimientos** shows pending, upcoming and reviewed reminders.
  Reviewed state is shared by admins and does not cancel the email.
- Daily emails are sent on the first successful cron run after the due time;
  they are not guaranteed at the exact expiry minute. Typically this is within
  the next daily run, subject to scheduler/provider availability.
- Emails include the buyer, order reference, sold product/plan, quantity,
  purchase/due dates and a private admin order link. Platform passwords and PINs
  are never included. Full credentials remain in the authenticated order detail.
- Existing purchases made before activation are not automatically backfilled.
  Reminders do not renew subscriptions, refund payments, or release sold profiles.

## Reliability and limits

Successful checkout replays do not create duplicate reminders. Email workers use
conditional database claims and a stable provider idempotency key. Failed sends
remain pending with a generic error for the next run. Stale claims can be retried
after 15 minutes. Provider idempotency has its own retention period, so exactly-once
external email delivery across prolonged network/database failures is not guaranteed.

Each run considers up to 50 due reminders and stops starting work after 40 seconds.
Successful sends are spaced to stay below two email requests per second. Backlogs
and failures continue on subsequent runs; use Vercel's cron Run control for an
additional authorized run if needed. Monitor Resend quotas and Vercel logs.

## Validation

`npm test`, `npm run test:expiry`, and `npm run test:combos` cover date boundaries,
duration parsing, override behavior, purchase atomicity and replay, combo plans,
admin access, notification state, mocked email concurrency/retries and cron auth.
Integration scripts refuse non-local databases. No real emails are needed for tests.

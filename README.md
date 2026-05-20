# oposiciones-monitor

Monitors [cido.diba.cat](https://cido.diba.cat/oposicions) for new "Educació social" job postings and sends email notifications. Runs twice daily via GitHub Actions at 08:00 and 14:00 UTC.

## Environment variables

| Variable | Description |
|---|---|
| `GMAIL_USER` | Gmail address used to send emails (e.g. `bot@gmail.com`) |
| `GMAIL_APP_PASSWORD` | [Gmail App Password](https://myaccount.google.com/apppasswords) — requires 2FA enabled on the account |
| `RECIPIENT_EMAIL` | Comma-separated list of notification recipients (e.g. `a@example.com,b@example.com`) |
| `TECH_EMAIL` | Email for failure alerts after 3 consecutive scraper errors |

## Commands

```bash
pnpm install     # install dependencies
pnpm test        # run tests
pnpm run dry-run # run scraper without sending email or saving state
pnpm start       # run for real
```

## Project structure

```
.github/workflows/scraper.yml   GitHub Actions cron workflow
src/
  main.js                       Entry point
  scraper.js                    Fetches and parses cido.diba.cat
  stateManager.js               Reads/writes state/seen.json
  notifier.js                   Sends emails via Resend
  errorHandler.js               Tracks failures and alerts TECH_EMAIL
state/seen.json                 IDs already notified (auto-committed by the bot)
tests/                          Vitest test suite
```

## How it works

On first run, all existing offers are marked as seen without sending any email. From the second run onward, only new offers trigger a notification. The `state/seen.json` file is committed back to the repo after each run.

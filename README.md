# Resilient Browser-Automation Bot

A browser-automation bot built with **TypeScript** and **Playwright** that logs into a website, navigates a multi-step workflow, and extracts structured data — designed to stay reliable when the target site is slow, flaky, or failing.

This project is intentionally focused on **production-minded engineering rather than feature count**: the interesting part isn't automating a form, it's doing so *resiliently* — with retries, fail-fast timeouts, structured logging, graceful failure handling, and run metrics. It's a compact demonstration of how I approach automation against unreliable real-world systems.

## What it does

Against a public automation-practice site ([the-internet](https://the-internet.herokuapp.com/)), the bot:

1. Logs in through a standard username/password form
2. Navigates to a page whose content loads only after a deliberate delay
3. Waits for the content to actually appear — retrying if it doesn't
4. Extracts the result and outputs it as structured JSON
5. Logs every step and prints a run summary (status + total time)

The target site includes intentionally slow and unreliable pages, which makes it a realistic testbed for the resilience features below.

## Key features

- **Retry with exponential backoff** — a reusable `withRetry` wrapper retries any async step up to a configurable number of attempts, increasing the wait between tries (1s, 2s, 4s). Transient failures recover automatically instead of crashing the run.
- **Fail-fast timeouts** — individual steps use short explicit timeouts so a genuinely broken step fails quickly and is retried, rather than hanging on one long wait. (See the tradeoff note below.)
- **Structured logging** — every log line is timestamped and leveled (`INFO` / `WARN` / `ERROR`), so routine progress is easy to distinguish from handled hiccups and real failures.
- **Graceful failure handling** — the full flow is wrapped in `try/catch/finally`. Failures are caught and logged cleanly instead of dumping a raw stack trace, and the browser is *always* closed, even on failure, to avoid leaked processes.
- **Run summary** — each run ends with a status (`success` / `failure`) and total elapsed time, a small step toward the kind of metrics that make automation observable.

## Tech stack

- **TypeScript** — typed, for clarity and safety (e.g. a `LogLevel` union type constrains log levels at compile time)
- **Playwright** — drives a real Chromium browser
- **Node.js**

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Install the Chromium browser Playwright drives
npx playwright install chromium

# 3. Run the bot
npm start
```

By default the browser runs visibly (`headless: false`) so you can watch it work; this can be flipped to headless for speed.

## Design decisions & tradeoffs

A few choices worth calling out, since they reflect the reasoning behind the code:

- **Why retries with backoff, not just longer waits.** A fixed longer wait is a guess; retries with backoff respond to *actual* failure and give a slow or overloaded page progressively more room to recover, which is both faster on the happy path and more reliable on a bad one.

- **The timeout-stacking tradeoff.** Playwright steps have a long default timeout (30s). Wrapping a step in 3 retries would stack those into a ~90s worst case before failing — too slow to fail usefully. Setting a short explicit per-attempt timeout (5s) means a broken step fails fast and relies on the *retries* for resilience, cutting worst-case failure time dramatically while keeping the happy path unaffected.

- **Log levels carry meaning.** A failed attempt that then recovers is a `WARN` (handled), not an `ERROR`. `ERROR` is reserved for unrecoverable failures — retries exhausted, or the run itself failing. Keeping that distinction precise means the logs stay a useful signal rather than noise.

- **`finally` for guaranteed cleanup.** Browser cleanup lives in a `finally` block so it runs whether the automation succeeds or throws — closing the browser is not something that should depend on the happy path.

## What I'd harden for production next

This is a focused sample; a production version would add:

- **Idempotency & safe resumption** — so a retried or re-run workflow doesn't duplicate side effects
- **Configuration-driven flows** — externalize URLs, selectors, and credentials rather than hardcoding them
- **Parallelization** — run many workflows concurrently with pooling and rate limiting
- **Persistent metrics & observability** — emit run metrics to a store/dashboard instead of just logging them
- **Containerization** — package with Docker for consistent, reproducible runs
- **Screenshot/trace capture on failure** — for faster debugging of failed runs
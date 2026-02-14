# E2E Tests - Playwright

## Prerequisites

E2E credentials must be set in `.env.local`:

```
E2E_USER_EMAIL="your-email"
E2E_USER_PASSWORD="your-password"
```

## Running Tests

```bash
# Headless (default)
npm run test:e2e

# With visible browser
npm run test:e2e:headed

# Playwright interactive UI
npm run test:e2e:ui
```

The dev server must be running (`npm run dev`) or Playwright will start it automatically.

## Slow Motion Mode

Use the `SLOW_MO` environment variable to add a delay (in milliseconds) between each action. Useful for demos and video recordings:

```bash
# Slow (500ms between actions) + visible browser
SLOW_MO=500 npm run test:e2e:headed

# Slower (1 second between actions)
SLOW_MO=1000 npm run test:e2e:headed
```

Without `SLOW_MO` (or with `SLOW_MO=0`) tests run at normal speed.

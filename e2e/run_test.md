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

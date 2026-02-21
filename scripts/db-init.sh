#!/usr/bin/env bash
# CI database initialisation: schema + all migrations + test user
set -euo pipefail

echo "==> Running database setup..."
npx tsx lib/db/setup.ts

echo "==> Running migrate-*.ts migrations..."
for f in lib/db/migrate-admin.ts \
         lib/db/migrate-comments.ts \
         lib/db/migrate-checklist.ts \
         lib/db/migrate-approval.ts \
         lib/db/migrate-archive.ts \
         lib/db/migrate-public-boards.ts \
         lib/db/migrate-list-color.ts \
         lib/db/migrate-thumbnail.ts \
         lib/db/migrate-attachments.ts \
         lib/db/migrate-board-shares.ts \
         lib/db/migrate-rate-limits.ts \
         lib/db/migrate-responsible-user.ts \
         lib/db/migrate-wiki-page-id.ts; do
  echo "  -> $f"
  npx tsx "$f"
done

echo "==> Running migrations/*.ts..."
for f in lib/db/migrations/add-activity-log.ts \
         lib/db/migrations/add-notifications.ts \
         lib/db/migrations/add-fulltext-search.ts; do
  echo "  -> $f"
  npx tsx "$f"
done

# Create test user if credentials are provided
if [ -n "${E2E_USER_EMAIL:-}" ] && [ -n "${E2E_USER_PASSWORD:-}" ]; then
  echo "==> Creating test user ($E2E_USER_EMAIL)..."
  node -e "
    const bcrypt = require('bcryptjs');
    const { createClient } = require('@libsql/client');
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    (async () => {
      const hash = await bcrypt.hash(process.env.E2E_USER_PASSWORD, 10);
      const id = 'ci-test-user-' + Date.now();
      const now = new Date().toISOString();
      await client.execute({
        sql: 'INSERT OR IGNORE INTO users (id, email, password_hash, name, is_admin, is_approved, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
        args: [id, process.env.E2E_USER_EMAIL, hash, 'Admin', now, now],
      });
      console.log('  Test user created (or already exists).');
    })();
  "
else
  echo "==> Skipping test user (E2E_USER_EMAIL / E2E_USER_PASSWORD not set)"
fi

echo "==> Database initialisation complete!"

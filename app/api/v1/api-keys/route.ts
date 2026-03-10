import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { CreateApiKeySchema } from '@/lib/validation/apiSchemas';
import { generateId } from '@/lib/utils/id';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const key = `pk_live_${random}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

/**
 * GET /api/v1/api-keys — List API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await query<ApiKeyRow>(
    'SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = :userId ORDER BY created_at DESC',
    { userId }
  );

  return NextResponse.json({ data: rows });
}

/**
 * POST /api/v1/api-keys — Create a new API key
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  // Enforce limit of 10 keys per user
  const countRow = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM api_keys WHERE user_id = :userId',
    { userId }
  );
  if (countRow && countRow.count >= 10) {
    return NextResponse.json({ error: 'Maximum of 10 API keys per user' }, { status: 400 });
  }

  const { key, hash, prefix } = generateApiKey();
  const id = generateId();
  const now = new Date().toISOString();

  await execute(
    'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at) VALUES (:id, :userId, :name, :hash, :prefix, :now)',
    { id, userId, name: parsed.data.name, hash, prefix, now }
  );

  return NextResponse.json(
    {
      data: {
        id,
        name: parsed.data.name,
        key,
        key_prefix: prefix,
        created_at: now,
      },
    },
    { status: 201 }
  );
}

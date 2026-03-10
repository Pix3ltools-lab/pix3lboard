import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { queryOne, execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/api-keys/[keyId] — Revoke an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { keyId } = params;

  // Verify the key belongs to the authenticated user
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM api_keys WHERE id = :keyId AND user_id = :userId',
    { keyId, userId }
  );
  if (!row) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  await execute('DELETE FROM api_keys WHERE id = :keyId', { keyId });

  return NextResponse.json({ data: { deleted: true } });
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, deleteUser } from '@/lib/auth/auth';
import logger from '../../../../../lib/logger'

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await getUserById(payload.userId);
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { userId } = await params;

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const result = await deleteUser(userId);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete user error');
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

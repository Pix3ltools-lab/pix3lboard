import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, adminResetPassword } from '@/lib/auth/auth';
import { validatePassword } from '@/lib/auth/validation';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // Prevent admin from resetting their own password via this endpoint
    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Use the change password feature to update your own password' },
        { status: 400 }
      );
    }

    const result = await adminResetPassword(userId, newPassword);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Reset password error');
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

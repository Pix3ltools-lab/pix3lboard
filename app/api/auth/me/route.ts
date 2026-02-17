import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const user = await getUserById(payload.userId);
    return NextResponse.json({ user });
  } catch (error) {
    logger.error({ err: error }, 'Get user error');
    return NextResponse.json({ user: null });
  }
}

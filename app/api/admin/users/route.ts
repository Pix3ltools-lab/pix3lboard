import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, getAllUsers, adminCreateUser } from '@/lib/auth/auth';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    logger.error({ err: error }, 'Get users error');
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

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

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const result = await adminCreateUser(email, password, name);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (error) {
    logger.error({ err: error }, 'Create user error');
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

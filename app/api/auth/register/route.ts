import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth/auth';
import { validateEmail, validatePassword, sanitizeInput } from '@/lib/auth/validation';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = sanitizeInput(body.email).toLowerCase();
    const password = body.password;
    const name = body.name ? sanitizeInput(body.name) : undefined;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const result = await register(email, password, name);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Registration returns pending status (user needs admin approval)
    return NextResponse.json({
      pending: true,
      message: result.message
    });
  } catch (error) {
    logger.error({ err: error }, 'Register error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth/auth';
import {
  validateEmail,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  sanitizeInput,
} from '@/lib/auth/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = sanitizeInput(body.email).toLowerCase();
    const password = body.password;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    // Check rate limiting
    const rateLimit = await checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: 429,
          headers: rateLimit.retryAfter ? { 'Retry-After': String(rateLimit.retryAfter) } : {},
        }
      );
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const result = await login(email, password);

    if ('error' in result) {
      await recordFailedAttempt(email);
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Clear failed attempts on successful login
    await clearFailedAttempts(email);

    const response = NextResponse.json({ user: result.user });

    // Set HTTP-only cookie with token
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth/auth';
import {
  validateEmail,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  sanitizeInput,
  getClientIp,
  IP_LOGIN_MAX_ATTEMPTS,
  IP_LOGIN_LOCKOUT,
} from '@/lib/auth/validation';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

const IP_CONFIG = { maxAttempts: IP_LOGIN_MAX_ATTEMPTS, lockoutDuration: IP_LOGIN_LOCKOUT };

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

    // Check IP rate limit (credential stuffing protection).
    // Skipped silently if IP cannot be determined (Docker without proxy).
    const clientIp = getClientIp(request);
    if (clientIp) {
      const ipRateLimit = await checkRateLimit(clientIp, 'login-ip', IP_CONFIG);
      if (!ipRateLimit.allowed) {
        return NextResponse.json(
          { error: ipRateLimit.error },
          {
            status: 429,
            headers: ipRateLimit.retryAfter ? { 'Retry-After': String(ipRateLimit.retryAfter) } : {},
          }
        );
      }
    }

    // Check per-email rate limit
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
      // Record IP failure only; do not clear IP counter on success to prevent
      // an attacker from resetting the counter by logging into their own account.
      if (clientIp) {
        await recordFailedAttempt(clientIp, 'login-ip', IP_CONFIG);
      }
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Clear per-email failed attempts on successful login
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
    logger.error({ err: error }, 'Login error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth/auth';
import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  checkRateLimit,
  recordFailedAttempt,
  getClientIp,
  IP_REGISTER_MAX_ATTEMPTS,
  IP_REGISTER_LOCKOUT,
} from '@/lib/auth/validation';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

const IP_CONFIG = { maxAttempts: IP_REGISTER_MAX_ATTEMPTS, lockoutDuration: IP_REGISTER_LOCKOUT };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = sanitizeInput(body.email).toLowerCase();
    const password = body.password;
    const name = body.name ? sanitizeInput(body.name) : undefined;

    // Check IP rate limit before any processing.
    // Every registration attempt (success or failure) is counted to prevent
    // account creation spam and admin approval queue flooding.
    // Skipped silently if IP cannot be determined (Docker without proxy).
    const clientIp = getClientIp(request);
    if (clientIp) {
      const ipRateLimit = await checkRateLimit(clientIp, 'register-ip', IP_CONFIG);
      if (!ipRateLimit.allowed) {
        return NextResponse.json(
          { error: ipRateLimit.error },
          {
            status: 429,
            headers: ipRateLimit.retryAfter ? { 'Retry-After': String(ipRateLimit.retryAfter) } : {},
          }
        );
      }
      // Count the attempt up front regardless of outcome
      await recordFailedAttempt(clientIp, 'register-ip', IP_CONFIG);
    }

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

import { z } from 'zod';

const envSchema = z.object({
  // Database
  TURSO_DATABASE_URL: z.string().min(1, 'TURSO_DATABASE_URL is required'),
  TURSO_AUTH_TOKEN: z.string().optional().default(''),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Storage (optional — defaults to vercel)
  STORAGE_PROVIDER: z.enum(['vercel', 'local']).optional().default('vercel'),
  LOCAL_STORAGE_PATH: z.string().optional().default('/data/blob-storage'),

  // Cookie (optional — no domain if not set)
  COOKIE_DOMAIN: z.string().optional(),
});

let validated = false;

export function validateEnv() {
  if (validated) return;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  validated = true;
}

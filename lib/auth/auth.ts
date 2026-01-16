import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import { query, queryOne, execute } from '@/lib/db/turso';

// User type
export interface User {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  is_admin: number;
  is_approved: number;
  created_at: string;
  updated_at: string;
}

// JWT helpers
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
};

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

// Auth functions
export async function register(
  email: string,
  password: string,
  name?: string
): Promise<{ pending: true; message: string } | { error: string }> {
  // Check if user exists
  const existing = await queryOne<UserRow>(
    'SELECT id FROM users WHERE email = :email',
    { email: email.toLowerCase() }
  );

  if (existing) {
    return { error: 'Email already registered' };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const id = nanoid();

  // Create user (is_approved defaults to 0/false)
  await execute(
    `INSERT INTO users (id, email, password_hash, name, is_approved, created_at, updated_at)
     VALUES (:id, :email, :passwordHash, :name, 0, :createdAt, :updatedAt)`,
    {
      id,
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      createdAt: now,
      updatedAt: now,
    }
  );

  return { pending: true, message: 'Account created. Waiting for admin approval.' };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  const row = await queryOne<UserRow>(
    'SELECT * FROM users WHERE email = :email',
    { email: email.toLowerCase() }
  );

  if (!row) {
    return { error: 'Invalid email or password' };
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return { error: 'Invalid email or password' };
  }

  // Check if user is approved
  if (!row.is_approved) {
    return { error: 'Account pending approval. Please wait for admin to approve your account.' };
  }

  const user: User = {
    id: row.id,
    email: row.email,
    name: row.name,
    is_admin: Boolean(row.is_admin),
    is_approved: Boolean(row.is_approved),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const token = await createToken(row.id);
  return { user, token };
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await queryOne<UserRow>(
    'SELECT id, email, name, is_admin, is_approved, created_at, updated_at FROM users WHERE id = :id',
    { id }
  );

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    is_admin: Boolean(row.is_admin),
    is_approved: Boolean(row.is_approved),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  // Get user with password hash
  const row = await queryOne<UserRow>(
    'SELECT * FROM users WHERE id = :id',
    { id: userId }
  );

  if (!row) {
    return { error: 'User not found' };
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) {
    return { error: 'Current password is incorrect' };
  }

  // Hash new password and update
  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date().toISOString();

  await execute(
    'UPDATE users SET password_hash = :passwordHash, updated_at = :updatedAt WHERE id = :id',
    { passwordHash: newPasswordHash, updatedAt: now, id: userId }
  );

  return { success: true };
}

// Admin functions
export interface UserWithStats {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  workspace_count: number;
  board_count: number;
}

export async function getAllUsers(): Promise<UserWithStats[]> {
  const rows = await query<{
    id: string;
    email: string;
    name: string | null;
    is_admin: number;
    is_approved: number;
    created_at: string;
    workspace_count: number;
    board_count: number;
  }>(`
    SELECT
      u.id, u.email, u.name, u.is_admin, u.is_approved, u.created_at,
      COUNT(DISTINCT w.id) as workspace_count,
      COUNT(DISTINCT b.id) as board_count
    FROM users u
    LEFT JOIN workspaces w ON w.user_id = u.id
    LEFT JOIN boards b ON b.workspace_id = w.id
    GROUP BY u.id
    ORDER BY u.is_approved ASC, u.created_at DESC
  `);

  return rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    is_admin: Boolean(row.is_admin),
    is_approved: Boolean(row.is_approved),
    created_at: row.created_at,
    workspace_count: Number(row.workspace_count),
    board_count: Number(row.board_count),
  }));
}

export async function adminResetPassword(
  userId: string,
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  // Verify user exists
  const row = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = :id', { id: userId });
  if (!row) {
    return { error: 'User not found' };
  }

  // Hash new password and update
  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date().toISOString();

  await execute(
    'UPDATE users SET password_hash = :passwordHash, updated_at = :updatedAt WHERE id = :id',
    { passwordHash: newPasswordHash, updatedAt: now, id: userId }
  );

  return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success: true } | { error: string }> {
  // Verify user exists
  const row = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = :id', { id: userId });
  if (!row) {
    return { error: 'User not found' };
  }

  // Delete user (CASCADE will delete workspaces, boards, lists, cards)
  await execute('DELETE FROM users WHERE id = :id', { id: userId });

  return { success: true };
}

export async function approveUser(userId: string): Promise<{ success: true } | { error: string }> {
  // Verify user exists
  const row = await queryOne<{ id: string; is_approved: number }>(
    'SELECT id, is_approved FROM users WHERE id = :id',
    { id: userId }
  );
  if (!row) {
    return { error: 'User not found' };
  }

  if (row.is_approved) {
    return { error: 'User is already approved' };
  }

  const now = new Date().toISOString();
  await execute(
    'UPDATE users SET is_approved = 1, updated_at = :updatedAt WHERE id = :id',
    { updatedAt: now, id: userId }
  );

  return { success: true };
}

export async function adminCreateUser(
  email: string,
  password: string,
  name?: string
): Promise<{ user: User } | { error: string }> {
  // Check if user exists
  const existing = await queryOne<UserRow>(
    'SELECT id FROM users WHERE email = :email',
    { email: email.toLowerCase() }
  );

  if (existing) {
    return { error: 'Email already registered' };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const id = nanoid();

  // Create user (already approved)
  await execute(
    `INSERT INTO users (id, email, password_hash, name, is_approved, created_at, updated_at)
     VALUES (:id, :email, :passwordHash, :name, 1, :createdAt, :updatedAt)`,
    {
      id,
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      createdAt: now,
      updatedAt: now,
    }
  );

  const user: User = {
    id,
    email: email.toLowerCase(),
    name: name || null,
    is_admin: false,
    is_approved: true,
    created_at: now,
    updated_at: now,
  };

  return { user };
}

# Database Migration Guide - Pix3lBoard

## Current State
- **Storage**: Browser localStorage (5MB limit)
- **Privacy**: 100% local, no server communication
- **Sync**: None - data tied to single browser
- **Backup**: Manual export/import JSON

## Goal
Add optional cloud database persistence while maintaining privacy-first approach and localStorage option.

---

## Database Options Comparison

### 1. ⭐ **Supabase** (RECOMMENDED)
**Type**: PostgreSQL Backend-as-a-Service

**Pros:**
- Backend-as-a-Service, quick setup (1-2 hours migration)
- Managed PostgreSQL database
- Built-in authentication system (ready for multi-user)
- Real-time subscriptions for automatic sync
- Generous free tier (500MB database, 50,000 monthly active users)
- Excellent TypeScript/JavaScript SDK
- Can be self-hosted for complete privacy
- Row Level Security (RLS) for data isolation
- Auto-generated REST and GraphQL APIs
- Dashboard for database management

**Cons:**
- External service dependency
- Costs after free tier ($25/month for Pro)
- Learning curve for RLS policies

**Free Tier Limits:**
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users
- Social OAuth providers

**Best for:** Privacy-conscious apps needing cloud sync

---

### 2. **Vercel Postgres + Prisma**
**Type**: Serverless PostgreSQL with ORM

**Pros:**
- Perfect integration with Vercel (where app is deployed)
- Prisma ORM excellent for TypeScript
- Serverless, scales automatically
- Managed migrations via Prisma
- Type-safe database access

**Cons:**
- Must create API routes manually
- More complex than Supabase
- Limited free tier (256 MB, 60 hours compute)
- More code to write and maintain

**Best for:** Apps already heavily invested in Vercel ecosystem

---

### 3. **Firebase Firestore**
**Type**: NoSQL Document Database

**Pros:**
- NoSQL, flexible schema
- Native real-time sync
- Integrated authentication
- Generous free tier
- Offline support built-in

**Cons:**
- Google ecosystem lock-in
- NoSQL may be overkill for relational data structure
- Query learning curve
- Less intuitive for relational data models

**Best for:** Apps with unpredictable data structures

---

### 4. **PlanetScale**
**Type**: Serverless MySQL

**Pros:**
- MySQL compatible
- Database branching (like Git!)
- Great for teams
- Free tier available
- Non-blocking schema changes

**Cons:**
- Requires ORM (Prisma recommended)
- Must manage API routes
- MySQL may be limiting vs PostgreSQL

**Best for:** Teams needing database versioning workflows

---

## 🎯 Recommended Approach: Hybrid Mode (localStorage + Supabase)

### Architecture Overview

Give users **choice** between storage methods:
1. **Local Only** - Current behavior, 100% privacy, no account needed
2. **Cloud Sync** - Optional Supabase sync, requires account, multi-device access

### Why Hybrid?

✅ **Preserves Privacy Promise**: Users uncomfortable with cloud storage can stay local
✅ **Adds Flexibility**: Power users get cloud sync
✅ **Progressive Enhancement**: Users can upgrade from local to cloud
✅ **Migration Path**: Smooth transition, no breaking changes
✅ **Data Portability**: Export/import works for both modes

---

## Implementation Strategy

### Phase 1: Setup Supabase

1. **Create Supabase Project**
   - Sign up at https://supabase.com
   - Create new project
   - Note: API URL and anon key

2. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js
   npm install @supabase/auth-helpers-nextjs
   ```

3. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Phase 2: Database Schema

**Create Tables in Supabase:**

```sql
-- Users table (handled by Supabase Auth)
-- auth.users table is auto-created

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boards
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  background TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lists
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,

  -- Card type (9 types: AI content + Project management)
  type TEXT CHECK (type IN ('music', 'video', 'image', 'task', 'text', 'bug', 'feature', 'audio', 'meeting')),

  -- AI-specific fields
  prompt TEXT,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  ai_tool TEXT,

  -- Project management fields
  responsible TEXT,
  job_number TEXT, -- Format: Letter-2digits-4digits (e.g., C-26-0001)

  -- Type-specific fields
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')), -- For bug type
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')), -- For feature type
  effort TEXT CHECK (effort IN ('small', 'medium', 'large')), -- For feature type
  attendees TEXT[] DEFAULT '{}', -- For meeting type (max 5)
  meeting_date TIMESTAMPTZ, -- For meeting type

  -- Arrays
  tags TEXT[] DEFAULT '{}',
  links TEXT[] DEFAULT '{}',

  -- Dates
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workspaces_user ON workspaces(user_id);
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_user ON boards(user_id);
CREATE INDEX idx_lists_board ON lists(board_id);
CREATE INDEX idx_lists_position ON lists(board_id, position);
CREATE INDEX idx_cards_list ON cards(list_id);
CREATE INDEX idx_cards_position ON cards(list_id, position);

-- Row Level Security (RLS) Policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can only access their own
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- Boards: Users can only access their own
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own boards" ON boards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own boards" ON boards
  FOR DELETE USING (auth.uid() = user_id);

-- Lists: Users can only access their own
CREATE POLICY "Users can view own lists" ON lists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON lists
  FOR DELETE USING (auth.uid() = user_id);

-- Cards: Users can only access their own
CREATE POLICY "Users can view own cards" ON cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Phase 2.5: User Management & Role-Based Access Control

### Overview

Pix3lBoard will implement a **multi-user collaboration system** with role-based access control:

- **Purpose**: Enable multiple users to collaborate on workspaces and boards across devices
- **Authentication**: Email/password via Supabase Auth
- **User Creation**: Admin-only (no public registration)
- **Roles**: 3 levels with different permissions

---

### User Roles & Permissions

| Role | Create Users | Create Workspaces | Create Boards | Edit Content | Delete Content | View All Data |
|------|--------------|-------------------|---------------|--------------|----------------|---------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User** | ❌ | ✅ | ✅ | ✅ (own) | ✅ (own) | ❌ (own only) |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (shared) |

#### Role Definitions:

**Admin**
- Full system access
- Can create/delete users via Admin Dashboard
- Can assign roles to users
- Can view and manage all workspaces/boards
- Can reset user passwords
- First user in the system is automatically admin

**User**
- Can create and manage own workspaces/boards
- Can be invited to collaborate on other users' workspaces
- Can edit/delete own content
- Cannot see other users' private content
- Cannot manage other users

**Viewer**
- Read-only access to shared workspaces
- Can view boards, lists, and cards
- Cannot create, edit, or delete anything
- Cannot create own workspaces
- Useful for stakeholders, clients, or observers

---

### Database Schema for User Management

```sql
-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'viewer')) DEFAULT 'user',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users, -- Admin who created this user
  last_login TIMESTAMPTZ
);

-- Workspace members (for collaboration)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id)
);

-- Board members (optional: board-specific permissions)
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- User invitations (pending user creation)
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'viewer')),
  invited_by UUID REFERENCES auth.users NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 7 days from creation
  accepted_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  token TEXT NOT NULL UNIQUE -- Secure random token for invitation link
);

-- Password reset tokens (for admin-initiated resets)
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users NOT NULL, -- Admin who initiated reset
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 24 hours from creation
  is_used BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Trigger to update user_profiles.updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Updated Row Level Security (RLS) Policies

#### User Profiles Policies

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Only admins can insert new profiles
CREATE POLICY "Only admins can create profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile, users can update their own (except role)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = id
    AND (
      -- User can update own profile but not role
      (auth.uid() = id AND OLD.role = NEW.role)
      OR
      -- Admin can update any profile including role
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Workspace Collaboration Policies

```sql
-- Update workspace policies to support collaboration
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;

-- Users can view workspaces they own or are members of
CREATE POLICY "Users can view accessible workspaces" ON workspaces
  FOR SELECT USING (
    auth.uid() = user_id -- Owner
    OR EXISTS ( -- Or member
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
    )
    OR EXISTS ( -- Or admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users (not viewers) can create workspaces
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Owners and editors can update, viewers cannot
CREATE POLICY "Members can update workspaces" ON workspaces
  FOR UPDATE USING (
    auth.uid() = user_id -- Owner
    OR EXISTS ( -- Or editor member
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    OR EXISTS ( -- Or admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only owners and admins can delete
CREATE POLICY "Owners can delete workspaces" ON workspaces
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Workspace Members Policies

```sql
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members of their workspaces
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_members.workspace_id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Workspace owners can add members
CREATE POLICY "Owners can add members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Workspace owners can update member roles
CREATE POLICY "Owners can update members" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Workspace owners can remove members
CREATE POLICY "Owners can remove members" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND user_id = auth.uid()
    )
    OR auth.uid() = user_id -- Users can leave workspaces
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Board/List/Card Policies (Updated for Collaboration)

```sql
-- Similar pattern: users can access content in workspaces they're members of
-- Implementation follows same logic as workspace policies
-- Each table checks: owner, workspace member, or admin
```

---

### Authentication Flow

#### Admin-Only User Creation

```
1. Admin logs into Admin Dashboard
2. Admin clicks "Create New User"
3. Admin fills form:
   - Email (required, unique)
   - Full Name (optional)
   - Role (admin/user/viewer)
   - Generate temporary password OR send invitation email
4. System creates user in Supabase Auth:
   - If temporary password: User created immediately, email sent with credentials
   - If invitation: User receives email with secure link to set password
5. User profile created in user_profiles table
6. User receives welcome email with login instructions
```

#### User Login Flow

```
1. User navigates to /login
2. Enters email and password
3. Supabase Auth validates credentials
4. On success:
   - Update last_login timestamp in user_profiles
   - Redirect to dashboard
   - Load user's workspaces and boards
5. On failure:
   - Show error message
   - Allow password reset request (admin-initiated)
```

#### Password Reset Flow (Admin-Initiated)

```
1. Admin selects user in Admin Dashboard
2. Admin clicks "Reset Password"
3. System generates secure reset token
4. System sends email to user with reset link
5. User clicks link (valid for 24 hours)
6. User enters new password (minimum 8 characters, 1 uppercase, 1 number)
7. Password updated in Supabase Auth
8. User can log in with new password
```

---

### Admin Dashboard Requirements

#### User Management Page (`/admin/users`)

**Features:**

1. **User List Table**
   - Columns: Email, Full Name, Role, Status (Active/Inactive), Created Date, Last Login
   - Search by email or name
   - Filter by role (Admin/User/Viewer)
   - Filter by status (Active/Inactive)
   - Sort by any column
   - Pagination (50 users per page)

2. **Create User Button**
   - Opens modal with form:
     - Email (required, validated)
     - Full Name (optional)
     - Role dropdown (Admin/User/Viewer)
     - Send invitation email checkbox (default: true)
     - If unchecked: generate temporary password field

3. **User Actions (Per Row)**
   - **Edit**: Update full name, role, status
   - **Reset Password**: Send password reset email
   - **Deactivate/Activate**: Toggle user active status
   - **Delete**: Remove user (requires confirmation)
   - **View Activity**: Show user's recent actions (future feature)

4. **Bulk Actions**
   - Select multiple users (checkboxes)
   - Bulk deactivate
   - Bulk delete (requires confirmation)
   - Export users to CSV

5. **Statistics Dashboard**
   - Total users count
   - Active users count
   - Users by role (pie chart)
   - Recent registrations (last 7 days)
   - Users without recent activity (>30 days)

#### Workspace Sharing Page (`/workspace/[id]/settings/members`)

**Features:**

1. **Current Members List**
   - Columns: Name, Email, Role (Owner/Editor/Viewer), Added Date
   - Remove member button (except owner)
   - Change role dropdown (owner only)

2. **Invite New Member**
   - Search existing users by email
   - Select role (Editor/Viewer)
   - Send invitation
   - Shows pending invitations

3. **Pending Invitations**
   - List of invited but not yet accepted
   - Resend invitation button
   - Cancel invitation button

---

### Password Management System

#### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (optional but recommended)

#### Password Policies

1. **Initial Password**
   - Admin can set temporary password OR
   - User receives invitation email to set own password

2. **Password Change**
   - User can change own password in settings
   - Requires current password verification
   - New password must meet requirements

3. **Password Reset (Admin-Initiated)**
   - Admin can trigger password reset for any user
   - User receives email with secure reset link
   - Link expires after 24 hours
   - Reset token is single-use

4. **Password Reset (User-Requested)**
   - Not available in initial implementation (admin-only)
   - Future feature: Allow users to request password reset
   - Requires admin approval

---

### User Invitation System

#### Invitation Email Template

```
Subject: You've been invited to Pix3lBoard

Hi [Full Name],

You've been invited to join Pix3lBoard by [Admin Name].

Your role: [Admin/User/Viewer]

Click the link below to set your password and get started:
[Secure Invitation Link - valid for 7 days]

Your login email: [user@example.com]

Questions? Contact your administrator.

---
Pix3lBoard - Privacy-first project management
```

#### Invitation Flow

```
1. Admin creates user and checks "Send invitation email"
2. System generates:
   - Unique secure token (UUID)
   - User record in auth.users (email verified = false)
   - User profile in user_profiles (is_active = false)
   - Invitation record in user_invitations
3. Email sent with invitation link: /auth/accept-invitation?token=[token]
4. User clicks link (valid for 7 days)
5. User sets password (must meet requirements)
6. System:
   - Updates auth.users (email verified = true)
   - Updates user_profiles (is_active = true)
   - Marks invitation as used
7. User redirected to /login
8. User logs in with email and new password
```

#### Invitation Expiration

- Invitations expire after 7 days
- Expired invitations cannot be accepted
- Admin can resend invitation (generates new token)
- System sends reminder email after 3 days if not accepted

---

### Security Considerations

1. **Principle of Least Privilege**
   - Users can only see and modify their own content by default
   - Collaboration requires explicit invitation
   - Viewer role is strictly read-only

2. **Admin Safeguards**
   - Cannot delete own admin account if last admin
   - Deleting user also deletes all their content (or transfers to admin)
   - All admin actions are logged (audit trail - future feature)

3. **Password Security**
   - Passwords hashed by Supabase Auth (bcrypt)
   - Temporary passwords expire after first use
   - Reset tokens are single-use and time-limited

4. **Data Isolation**
   - RLS policies enforce user data boundaries
   - Even admins access through proper policies
   - No direct database access in production

5. **Session Management**
   - Sessions expire after 7 days of inactivity
   - Refresh tokens rotated regularly
   - Logout invalidates all sessions

---

### Implementation Checklist

**Database Setup:**
- [ ] Create user_profiles table
- [ ] Create workspace_members table
- [ ] Create board_members table (optional)
- [ ] Create user_invitations table
- [ ] Create password_reset_tokens table
- [ ] Update RLS policies for all tables
- [ ] Create helper functions for user management

**Admin Dashboard:**
- [ ] Create `/admin/users` page
- [ ] Implement user list with search/filter
- [ ] Create user creation modal
- [ ] Implement edit user functionality
- [ ] Implement password reset functionality
- [ ] Implement user activation/deactivation
- [ ] Add user deletion with confirmation
- [ ] Create statistics dashboard

**Authentication:**
- [ ] Set up Supabase Auth
- [ ] Create login page
- [ ] Create password setup page (invitation flow)
- [ ] Create password reset page
- [ ] Implement email templates
- [ ] Configure email sender (SMTP)

**Workspace Collaboration:**
- [ ] Create workspace settings page
- [ ] Implement member invitation system
- [ ] Create member management UI
- [ ] Implement role-based permissions in UI
- [ ] Add sharing controls to workspace

**Security & Testing:**
- [ ] Test all RLS policies
- [ ] Verify admin-only user creation
- [ ] Test password reset flow
- [ ] Test invitation expiration
- [ ] Test role-based access (admin/user/viewer)
- [ ] Security audit

---

### Phase 3: Code Architecture Changes

#### 3.1 Create Supabase Client

**File: `lib/supabase/client.ts`**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const supabase = createClientComponentClient<Database>()
```

#### 3.2 Storage Abstraction Layer

**File: `lib/storage/storage-adapter.ts`**
```typescript
// Abstract interface for storage
interface StorageAdapter {
  getWorkspaces(): Promise<Workspace[]>
  createWorkspace(data): Promise<Workspace>
  updateWorkspace(id, data): Promise<void>
  deleteWorkspace(id): Promise<void>
  // ... similar for boards, lists, cards
}

// LocalStorageAdapter (current implementation)
class LocalStorageAdapter implements StorageAdapter {
  // Current localStorage code
}

// SupabaseAdapter (new)
class SupabaseAdapter implements StorageAdapter {
  // Supabase API calls
}

// Factory to choose adapter based on user preference
export function createStorageAdapter(mode: 'local' | 'cloud'): StorageAdapter {
  return mode === 'cloud'
    ? new SupabaseAdapter()
    : new LocalStorageAdapter()
}
```

#### 3.3 Update DataContext

**File: `lib/context/DataContext.tsx`**
- Add storage mode state: `'local' | 'cloud'`
- Read mode from localStorage preference
- Use appropriate adapter based on mode
- All operations become async (wrap current sync operations)

#### 3.4 Add Auth Components

**New files needed:**
- `components/auth/SignInModal.tsx` - Email/password or magic link
- `components/auth/UserMenu.tsx` - User dropdown with logout
- `components/layout/StorageModeToggle.tsx` - Switch between local/cloud

### Phase 4: UI Changes

#### 4.1 Home Page Updates
- Add "Sign In / Sign Up" button in header when not authenticated
- Show user menu when authenticated
- Add storage mode indicator (Local 💾 vs Cloud ☁️)

#### 4.2 Settings Page (New)
Create `/settings` page with:
- Storage mode selector
- Migration tool: "Sync local data to cloud"
- Account management
- Export/import (works for both modes)

#### 4.3 Migration Tool
When user switches from local → cloud:
1. Show confirmation dialog
2. Read all localStorage data
3. Upload to Supabase
4. Verify sync successful
5. Keep local copy as backup
6. Show success message

When user switches from cloud → local:
1. Show warning about losing cloud features
2. Download all data from Supabase
3. Save to localStorage
4. Clear Supabase session
5. Continue with local storage

### Phase 5: Real-time Sync (Optional)

Enable real-time updates if user has multiple tabs/devices:

```typescript
// Subscribe to changes
supabase
  .channel('workspaces')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'workspaces' },
    (payload) => {
      // Update local state
    }
  )
  .subscribe()
```

---

## Migration Steps (Detailed)

### Step 1: Prepare Codebase
- [ ] Create feature branch: `git checkout -b feat/supabase-integration`
- [ ] Install dependencies
- [ ] Add environment variables
- [ ] Create Supabase client utilities

### Step 2: Database Setup
- [ ] Create Supabase project
- [ ] Run SQL schema creation
- [ ] Test RLS policies
- [ ] Verify indexes created

### Step 3: Abstraction Layer
- [ ] Create StorageAdapter interface
- [ ] Refactor localStorage code into LocalStorageAdapter
- [ ] Create SupabaseAdapter with same interface
- [ ] Add storage factory

### Step 4: Update DataContext
- [ ] Add storage mode state
- [ ] Make all operations async
- [ ] Add loading states for cloud operations
- [ ] Add error handling for network issues

### Step 5: Authentication
- [ ] Implement Supabase Auth UI
- [ ] Add sign in/up flows
- [ ] Add user menu component
- [ ] Test auth flow

### Step 6: Migration Tool
- [ ] Build settings page
- [ ] Create migration utility
- [ ] Add confirmation dialogs
- [ ] Test local → cloud migration
- [ ] Test cloud → local migration

### Step 7: Testing
- [ ] Test localStorage mode (should work unchanged)
- [ ] Test cloud mode CRUD operations
- [ ] Test migration tool both directions
- [ ] Test with multiple devices/tabs
- [ ] Test offline behavior
- [ ] Test RLS policies (try accessing other user's data)

### Step 8: UI Polish
- [ ] Add loading states
- [ ] Add error messages
- [ ] Add sync indicators
- [ ] Update help documentation
- [ ] Add onboarding for new storage options

### Step 9: Deployment
- [ ] Set Vercel environment variables
- [ ] Deploy to staging
- [ ] Test in production-like environment
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Data Migration Format

Keep export/import JSON compatible:

```json
{
  "version": "1.0.0",
  "storageMode": "local" | "cloud",
  "exportDate": "2024-01-09T10:00:00Z",
  "userId": "optional-for-cloud-mode",
  "workspaces": [...],
  "boards": [...],
  "lists": [...],
  "cards": [...]
}
```

---

## Cost Estimation (Supabase)

**Free Tier:**
- Up to 500 MB database
- Up to 50,000 monthly active users
- Up to 2 GB bandwidth
- **Sufficient for: ~5,000 active users**

**Pro Plan ($25/month):**
- 8 GB database
- 100,000 monthly active users
- 50 GB bandwidth
- Daily backups
- **Sufficient for: ~50,000 active users**

**Typical User Storage:**
- Average workspace: ~10 KB
- Average board with 50 cards: ~50 KB
- 1 active user with 10 boards: ~500 KB
- **Free tier can support 1,000 active users comfortably**

---

## Privacy Considerations

### Local Mode (Default):
- ✅ Zero data leaves device
- ✅ No account required
- ✅ No analytics on user data
- ✅ Complete anonymity

### Cloud Mode (Opt-in):
- ⚠️ Data stored on Supabase servers (US/EU regions available)
- ⚠️ Requires email for account
- ✅ End-to-end encryption possible (future enhancement)
- ✅ GDPR compliant (data export/deletion)
- ✅ User owns their data
- ✅ Can self-host Supabase for complete control

### Recommendations:
1. Make local storage the **default**
2. Require explicit opt-in for cloud sync
3. Show clear privacy policy
4. Add "Download all my data" button
5. Add "Delete my account and all data" button
6. Consider end-to-end encryption (encrypt data before sending to Supabase)

---

## Alternative: Self-Hosted Supabase

For ultimate privacy, users can self-host Supabase:

**Pros:**
- Complete control over data
- No external dependencies
- Can run on-premise

**Cons:**
- Requires server management
- More complex setup
- User responsibility for backups

**How:**
```bash
git clone https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker compose up
```

---

## Backward Compatibility

**Critical:** Existing users must not lose data

1. **First load after upgrade:**
   - Detect localStorage data
   - Show migration prompt (optional)
   - Continue with localStorage if user declines

2. **Version checking:**
   - Check data version in localStorage
   - Run migrations if needed
   - Preserve all existing data

3. **Fallback:**
   - If Supabase unavailable, offer local mode
   - Never force users to cloud mode

---

## Performance Considerations

### LocalStorage (Current):
- ⚡ Instant reads/writes
- ⚡ No network latency
- ❌ 5 MB limit
- ❌ No sync

### Supabase:
- 🐌 Network latency (~50-200ms per operation)
- ✅ No storage limits (free tier: 500 MB)
- ✅ Multi-device sync
- ⚡ Can cache locally with service workers

**Optimization strategies:**
- Implement optimistic updates (update UI immediately, sync in background)
- Cache frequently accessed data locally
- Batch operations when possible
- Use Supabase real-time subscriptions to avoid polling

---

## Testing Checklist

- [ ] Create workspace in local mode
- [ ] Create workspace in cloud mode
- [ ] Migrate local → cloud with existing data
- [ ] Migrate cloud → local
- [ ] Test with poor network (slow 3G)
- [ ] Test with no network (offline)
- [ ] Test with multiple browser tabs
- [ ] Test with multiple devices
- [ ] Test concurrent edits (conflict resolution)
- [ ] Test export/import in both modes
- [ ] Test user logout (data access revoked)
- [ ] Test RLS policies (unauthorized access blocked)

---

## Future Enhancements

Once hybrid mode is stable:

1. **Collaboration** (requires cloud mode)
   - Share boards with other users
   - Real-time collaborative editing
   - Comments on cards
   - Activity log

2. **Mobile Apps**
   - React Native app
   - Shares same Supabase backend
   - Offline-first sync

3. **Advanced Features**
   - Recurring tasks
   - Calendar view
   - Gantt charts
   - Time tracking

4. **End-to-End Encryption**
   - Encrypt data client-side before upload
   - Supabase stores encrypted blobs
   - Only user has decryption key

---

## Recommended Timeline

**Minimum Viable Migration:** 2-3 weeks
- Week 1: Schema + Adapters + Auth
- Week 2: Migration tool + Testing
- Week 3: Polish + Deploy

**Full Implementation:** 4-6 weeks
- Weeks 1-3: Same as above
- Week 4: Real-time sync
- Week 5: UI polish + documentation
- Week 6: Beta testing + bug fixes

---

## Questions to Answer Before Starting

1. **Priority:** Is cloud sync a must-have or nice-to-have?
2. **Authentication:** Email/password, magic links, or social OAuth?
3. **Default mode:** Local or ask user on first launch?
4. **Encryption:** Client-side encryption needed?
5. **Self-hosting:** Support self-hosted Supabase?
6. **Costs:** Willing to pay for Pro plan if free tier exceeded?
7. **EU users:** Need EU data residency (Supabase EU region)?

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase with Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Self-Hosting Supabase](https://supabase.com/docs/guides/self-hosting)

---

## Decision: Go or No-Go?

**Go with Supabase if:**
✅ Users request multi-device sync
✅ Want to support collaboration in future
✅ Comfortable with managed service
✅ Want to move fast

**Stay with localStorage if:**
✅ Privacy is absolute priority
✅ Target audience values local-only
✅ Don't want external dependencies
✅ 5 MB limit is acceptable

**Hybrid approach (recommended):**
✅ Best of both worlds
✅ User choice preserved
✅ Gradual migration path
✅ Future-proof architecture

-- ========================================
-- Pix3lBoard - Supabase Database Schema
-- Version: 1.1.0
-- ========================================
-- Run this script in Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste and Run
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CORE TABLES (Phase 2)
-- ========================================

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
  allowed_card_types TEXT[], -- Array of allowed card types for this board
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

-- ========================================
-- USER MANAGEMENT TABLES (Phase 2.5)
-- ========================================

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

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Core tables indexes
CREATE INDEX idx_workspaces_user ON workspaces(user_id);
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_user ON boards(user_id);
CREATE INDEX idx_lists_board ON lists(board_id);
CREATE INDEX idx_lists_position ON lists(board_id, position);
CREATE INDEX idx_cards_list ON cards(list_id);
CREATE INDEX idx_cards_position ON cards(list_id, position);

-- User management indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ========================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ========================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to core tables
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user management tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USER PROFILES POLICIES
-- ========================================

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

-- Users can update their own profile, admins can update any profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
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

-- ========================================
-- WORKSPACE POLICIES (with collaboration)
-- ========================================

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

-- ========================================
-- BOARD POLICIES (with collaboration)
-- ========================================

-- Users can view boards they own or have access to
CREATE POLICY "Users can view accessible boards" ON boards
  FOR SELECT USING (
    auth.uid() = user_id -- Owner
    OR EXISTS ( -- Or workspace member
      SELECT 1 FROM workspace_members
      WHERE workspace_id = boards.workspace_id
      AND user_id = auth.uid()
    )
    OR EXISTS ( -- Or board member
      SELECT 1 FROM board_members
      WHERE board_id = boards.id
      AND user_id = auth.uid()
    )
    OR EXISTS ( -- Or admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create boards in workspaces they have access to
CREATE POLICY "Members can create boards" ON boards
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Owner of workspace
      EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id AND user_id = auth.uid()
      )
      OR -- Or editor of workspace
      EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = boards.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
      )
    )
  );

-- Owners and editors can update boards
CREATE POLICY "Members can update boards" ON boards
  FOR UPDATE USING (
    auth.uid() = user_id -- Owner
    OR EXISTS ( -- Or workspace editor
      SELECT 1 FROM workspace_members
      WHERE workspace_id = boards.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    OR EXISTS ( -- Or board editor
      SELECT 1 FROM board_members
      WHERE board_id = boards.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    OR EXISTS ( -- Or admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only owners and admins can delete boards
CREATE POLICY "Owners can delete boards" ON boards
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- LIST POLICIES (inherit from boards)
-- ========================================

-- Users can view lists in boards they have access to
CREATE POLICY "Users can view accessible lists" ON lists
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM boards
      WHERE id = lists.board_id
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = boards.workspace_id
          AND user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create lists in boards they can edit
CREATE POLICY "Members can create lists" ON lists
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_id
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = boards.workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
        OR EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Users can update lists in boards they can edit
CREATE POLICY "Members can update lists" ON lists
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM boards
      WHERE id = lists.board_id
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = boards.workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
        OR EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete lists they own or in boards they own
CREATE POLICY "Members can delete lists" ON lists
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM boards
      WHERE id = lists.board_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- CARD POLICIES (inherit from boards)
-- ========================================

-- Users can view cards in boards they have access to
CREATE POLICY "Users can view accessible cards" ON cards
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      WHERE lists.id = cards.list_id
      AND (
        boards.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = boards.workspace_id
          AND user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create cards in boards they can edit
CREATE POLICY "Members can create cards" ON cards
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      WHERE lists.id = list_id
      AND (
        boards.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = boards.workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
        OR EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Users can update cards in boards they can edit
CREATE POLICY "Members can update cards" ON cards
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      WHERE lists.id = cards.list_id
      AND (
        boards.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = boards.workspace_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
        OR EXISTS (
          SELECT 1 FROM board_members
          WHERE board_id = boards.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'editor')
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete cards they own or in boards they own
CREATE POLICY "Members can delete cards" ON cards
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      WHERE lists.id = cards.list_id AND boards.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- WORKSPACE MEMBERS POLICIES
-- ========================================

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

-- Workspace owners can remove members, or users can leave
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

-- ========================================
-- BOARD MEMBERS POLICIES (similar to workspace_members)
-- ========================================

CREATE POLICY "Members can view board members" ON board_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_members.board_id
      AND bm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_members.board_id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Board owners can add members" ON board_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Board owners can update members" ON board_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Board owners can remove members" ON board_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = board_id AND user_id = auth.uid()
    )
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- USER INVITATIONS POLICIES
-- ========================================

-- Admins can view all invitations
CREATE POLICY "Admins can view invitations" ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can create invitations
CREATE POLICY "Only admins can create invitations" ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update invitations (mark as used)
CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations" ON user_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- PASSWORD RESET TOKENS POLICIES
-- ========================================

-- Admins can view all reset tokens
CREATE POLICY "Admins can view reset tokens" ON password_reset_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can create reset tokens
CREATE POLICY "Only admins can create reset tokens" ON password_reset_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update tokens (mark as used)
CREATE POLICY "Admins can update reset tokens" ON password_reset_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- SCHEMA CREATION COMPLETE!
-- ========================================
-- Next steps:
-- 1. Configure environment variables in your Next.js app
-- 2. Create Supabase client utility
-- 3. Implement Storage Adapter
-- 4. Create authentication UI
-- 5. Implement migration tools
-- ========================================

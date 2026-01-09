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

  -- Card type and AI fields
  type TEXT CHECK (type IN ('music', 'video', 'image', 'task')),
  prompt TEXT,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  ai_tool TEXT,
  responsible TEXT,

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

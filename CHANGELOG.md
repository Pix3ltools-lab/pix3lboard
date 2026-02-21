# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.6] - 2026-02-21

### Added
- **Storage Usage**: New section in the Admin page showing database size (via
  SQLite PRAGMA) and blob storage totals (file count + MB). Auto-loads on page
  open with a Refresh button. New `GET /api/admin/storage-info` endpoint,
  admin-only (403 for unauthenticated access).

---

## [2.8.5] - 2026-02-20

### Fixed
- **Runtime config**: Fall back to `NEXT_PUBLIC_PIX3LWIKI_URL` if `PIX3LWIKI_URL`
  is not set, so Vercel deployments continue to work without additional env var
  configuration while Docker deployments use the server-only var.

---

## [2.8.4] - 2026-02-20

### Fixed
- **Runtime config**: Add `export const dynamic = 'force-dynamic'` to root layout
  so Next.js renders it at request time instead of statically at build time.
  This ensures `PIX3LWIKI_URL` is read from the container environment on every
  request rather than being baked in as `localhost` during the Docker image build.

---

## [2.8.3] - 2026-02-20

### Fixed
- **Runtime URL config**: Use server-only env var `PIX3LWIKI_URL` instead of
  `NEXT_PUBLIC_PIX3LWIKI_URL` in layout.tsx so Docker deployments correctly
  inject the wiki URL at request time without requiring an image rebuild.

---

## [2.8.2] - 2026-02-20

### Changed
- **Runtime URL config**: Cross-app link to Pix3lWiki now reads from
  `window.__PIX3L_CONFIG__` injected by the server layout, so self-hosted
  Docker deployments get the correct URL without rebuilding the image.
  Affects Header and CardModal "Create wiki page" link.

---

## [2.8.1] - 2026-02-18

### Fixed
- **FTS5 Search**: `cards_fts` table now always created in standalone mode, fixing
  `no such column: T.card_id` errors on Docker/sqld. The `content='cards'` option
  caused FTS5 to look for a column `card_id` in the source table, which only has `id`.

---

## [2.8.0] - 2026-02-17

### Added
- **Structured Logging**: Pino JSON logging across all 47 API route files
  - Configurable log level via `LOG_LEVEL` environment variable (defaults to `info`)
  - Works on Vercel (Function Logs dashboard) and Docker (`docker compose logs`)
  - `pino-pretty` devDependency for human-readable dev output (`npm run dev:pretty`)
- **CI/CD Pipeline**: GitHub Actions workflow for automated lint, type-check, and E2E tests
- **Database Backup & Restore**: Admin panel JSON export/import with atomic batch replace

### Changed
- All `console.error` / `console.log` calls in API routes replaced with `logger.error` / `logger.info`

---

## [2.7.0] - 2026-02-14

### Added
- **Public REST API v1**: Full CRUD API for external applications (web, desktop, mobile)
  - Bearer token authentication via `POST /api/auth/token`
  - Board endpoints: list, create, get detail (with nested lists/cards), update, delete
  - List endpoints: list, create, update, delete (cascade)
  - Card endpoints: create (all 25 fields), get detail (with comments/attachments), update, delete
  - Move card between lists with automatic position recalculation
  - Archive/unarchive cards via API
  - Paginated card listing with filters (list, archived, responsible, page/limit)
  - Zod validation with snake_case field names (REST convention)
  - Permission checks reuse existing role system (owner/editor/commenter/viewer)
  - Side effects: FTS sync, assignment notifications
- **Swagger UI**: Interactive API documentation at `/docs`
  - OpenAPI 3.0 spec served at `GET /api/docs`
  - Swagger UI loaded from CDN (zero bundle impact)
- **API Documentation**: Complete `api.md` with endpoints, examples, and curl commands

### Changed
- Removed `api.md` from `.gitignore` (now project documentation, not personal notes)

---

## [2.6.1] - 2026-02-08

### Added
- **SSO Cross-App Authentication**: Single sign-on between Pix3lBoard and Pix3lWiki
  - Shared `auth-token` cookie on `.pix3ltools.com` domain in production
  - Login on one app automatically authenticates on the other

---

## [2.6.0] - 2026-02-07

### Added
- **Pix3lWiki Integration**: Full integration with companion wiki application
  - "Pix3lWiki" link in header navigation (opens in new tab)
  - "Wiki" button in card modal to create/open linked wiki pages
  - Wiki badge (BookOpen icon) on cards that have a linked wiki page
  - New `wiki_page_id` column on cards table for wiki page linking
  - Data sync and delta sync support for `wikiPageId` field
  - Migration script: `lib/db/migrate-wiki-page-id.ts`

---

## [2.5.0] - 2025-02-06

### Added
- **Analytics Dashboard**: Board-level metrics with interactive charts
  - Summary KPIs: total cards, completed in period, average lead time, overdue count
  - Cards per list bar chart with color coding
  - Cards per type donut chart
  - Throughput chart: created vs completed cards per week
  - Lead time chart: days from creation to archive per card
  - Configurable date range with presets (7d, 30d, 90d, 1y) and custom picker
  - "Analytics" button in board toolbar
- New API endpoint: `GET /api/boards/[boardId]/analytics?from=&to=`
- New components: `MetricCard`, `CardsByListChart`, `CardsByTypeChart`, `ThroughputChart`, `LeadTimeChart`, `DateRangeSelector`

### Changed
- Activity log now records `fromListId`, `fromListName`, and `toListName` on card moves for better analytics tracking
- Added `recharts` dependency for chart rendering

---

## [2.4.8] - 2025-02-03

### Added
- **In-App Notifications**: Bell icon with unread count and notification center
  - Notifications for card assignments (when assigned as responsible)
  - Notifications for comments on cards you're responsible for
  - Mark as read/unread, delete individual notifications
  - Mark all as read functionality
  - Polling every 30 seconds for new notifications
- **Due Date Notifications**: Automatic alerts for approaching deadlines
  - Notifications for cards due today or tomorrow
  - Notifications for overdue cards
  - Deduplication: no duplicate alerts within 24 hours
- **Quick Filters**: One-click filters in unified filter panel
  - "My cards" - cards where you're responsible
  - "Due soon" - cards due today or tomorrow
  - "Overdue" - cards past due date
  - "Unassigned" - cards without a responsible person
  - "High priority" - high priority cards
  - Filters are combinable (AND logic)
  - Badge shows active filter count
- **FTS Sync via API**: Full-text search now stays synchronized
  - Manual sync on card create/update/delete
  - Sync on archive/restore operations
  - Sync on new comments
  - Replaces problematic database triggers

### Changed
- Filter dropdown now combines Quick Filters and Tags in unified panel
- Notification links use `/board/{id}` format with automatic workspace resolution

### Fixed
- FTS tables recreated as standalone (fixes Turso/libSQL compatibility)
- Notification links now work correctly for shared boards

---

## [2.4.7] - 2025-02-02

### Added
- **Full-Text Search**: Search cards by title, description, and comments
  - FTS5-powered search for fast and accurate results
  - Server-side search for comments with 300ms debounce
  - Visual indicator showing number of cards matched in comments
  - Fallback to LIKE queries if FTS5 not available
- New API endpoint: `GET /api/boards/[boardId]/search?q=query`
- Database migration for FTS5 tables: `lib/db/migrations/add-fulltext-search.ts`

### Changed
- SearchContext now supports both client-side (title/description) and server-side (comments) search
- BoardToolbar shows search loading indicator and comment match count

---

## [2.4.6] - 2025-01-30

### Added
- **Granular Board Permissions**: 4 role levels for shared boards
  - **Owner**: Full access (manage board, lists, cards, comments)
  - **Editor**: Can manage lists, edit cards, add comments
  - **Commenter**: Can view and add comments only
  - **Viewer**: Read-only access (no editing or commenting)
- Permission matrix enforced on both backend and frontend
- Visual "View only" indicator for restricted users
- Drag & drop disabled for viewers
- All form controls disabled based on user role

### Changed
- ShareBoardModal now shows all 4 role options with descriptions
- README updated with permission matrix documentation

---

## [2.4.5] - 2025-01-27

### Added
- **Archived Cards Export**: Export all archived cards as JSON from admin panel
  - New "Archived Cards Export" section in admin panel
  - Includes card details: title, description, tags, checklist, dates
  - Includes context: workspace name, board name, list name
  - Includes all comments with author name and email
  - Download as timestamped JSON file

---

## [2.4.4] - 2025-01-26

### Added
- **Database Backup in Admin Panel**: Download complete database backup as JSON file
  - New "Database Backup" section in admin panel
  - Includes all tables: users, workspaces, boards, lists, cards, comments, attachments
  - Restore remains command-line only for safety
- **YouTube Demo Video**: Added demo video badge/link to README

### Fixed
- **Archived Cards Persistence**: Cards now correctly stay archived instead of being deleted
  - Fixed sync tracking that was sending DELETE instead of preserving archive status
  - Added `removeCardFromState` function for local-only state changes
- **Responsible Field Search**: Legacy text values now cleared when linking to user
  - Fixes search returning wrong cards after reassignment
- **Date Picker Locale**: Set English locale for date input placeholder
- **Job Number Format**: Updated examples to clarify any letter (A-Z) is valid, not just "C"

---

## [2.4.3] - 2025-01-25

### Added
- **User Autocomplete in Share Board**: Search users by name/email when sharing boards
  - Debounced search with 300ms delay
  - Shows user name and email in dropdown
- **Responsible Field Linked to Users**: Assign registered users as card responsible
  - User autocomplete when typing in Responsible field
  - "Assign to me" button for quick self-assignment
  - Backward compatible with legacy text values
  - New `responsible_user_id` column in database
- **Move Board Between Workspaces**: Move boards to different workspaces
  - "Move to..." option in board menu
  - Modal to select destination workspace
  - Full sync support for workspace changes

### Changed
- **Registration Disabled**: Public registration is no longer available
  - Login page shows "Registration is currently not available"
  - New users must be created by admin

---

## [2.2.9] - 2025-01-18

### Added
- **Board Sharing**: Share boards with other users
  - Share boards by email with role selection (Owner/Viewer)
  - Owners can edit the board, Viewers have read-only access
  - "Shared with me" workspace shows boards shared by others
  - Changes made by shared owners sync to the original board
  - Share management modal with user list and role badges
  - New `board_shares` table in database

### Fixed
- Fixed SQL query errors in shares API (removed non-existent column references)

---

## [2.2.0] - 2025-01-17

### Added
- **File Attachments**: Upload files to cards with Vercel Blob storage
  - Support for any file type (max 10MB)
  - File list with type-specific icons
  - Image preview for image attachments
  - Download and delete functionality
  - New `attachments` table in database

### Changed
- Updated README with attachments feature documentation
- Completed Phase 4 (Media & Attachments) in improvement roadmap

---

## [2.1.3] - 2025-01-17

### Added
- **Card Thumbnails**: Upload images to cards with Vercel Blob storage
  - Client-side image compression (800x600 max, JPEG 80%)
  - Thumbnail preview in card and modal
  - Lightbox for full-size image viewing
  - Delete thumbnail functionality
- **Calendar View**: View cards with due dates in a calendar
  - Monthly and weekly views using FullCalendar
  - Cards with `dueDate` shown in blue (red if overdue)
  - Meeting cards with `meetingDate` shown in purple
  - Toggle between Kanban and Calendar views in toolbar
  - Click on event to open CardModal
  - Dark theme styling

### Changed
- Updated README with new features documentation

---

## [2.1.2] - 2025-01-17

### Fixed
- **Archived Cards Bug**: Fixed bug where archived cards would disappear after sync
  - Disabled foreign key checks during sync to prevent constraint errors
  - Added proper cascade delete order for data integrity
  - Used INSERT OR IGNORE for archived cards restoration
- **Permanent Delete**: Fixed permanent deletion of archived cards (now actually deletes from database)

### Added
- **DELETE /api/cards/[cardId]**: New API endpoint for permanent card deletion

---

## [2.1.1] - 2025-01-17

### Added
- **Board Backgrounds**: Choose from 8 preset colors for board backgrounds
- **List Colors**: Choose from 9 preset colors for individual lists

### Removed
- **Storage Indicator**: Removed from header (obsolete with cloud database)

---

## [2.1.0] - 2025-01-17

### Added
- **Public Boards**: Share boards publicly with a read-only link
  - Toggle "Private/Public" in board toolbar
  - Copy shareable link for public access
  - Public page at `/public/[boardId]` (no login required)
  - Read-only view for visitors (no editing, no drag & drop)

### Changed
- Updated welcome page tagline to "Cloud-based project management tool for AI creators"
- Updated meta description for SEO

---

## [2.0.5] - 2025-01-16

### Added
- **Card Archiving**: Archive cards instead of deleting them
  - Archive button in card modal
  - Archived Cards modal accessible from board toolbar
  - Search archived cards by title
  - Restore archived cards to their original list
  - Permanently delete archived cards
  - Archived cards preserved during data sync

---

## [2.0.4] - 2025-01-16

### Added
- **User Approval System**: New users require admin approval before login
  - Registration shows "Waiting for admin approval" message
  - Login blocked with "Account pending approval" until approved
- **Admin User Management**:
  - View pending users with yellow "Pending" badge
  - Approve users with one click
  - Create new pre-approved users
  - Delete users (with all their data)

---

## [2.0.3] - 2025-01-16

### Added
- **Checklists**: Add subtasks to cards with checkboxes
  - Progress bar in card modal
  - Progress indicator on cards (e.g., "2/5", green when complete)
  - Add, toggle, and delete items

### Fixed
- **Date Picker**: Fixed timezone issue causing dates to show one day earlier

---

## [2.0.2] - 2025-01-16

### Added
- **Card Comments**: Add comments to cards with author name and timestamp
  - Delete own comments (or any comment if admin)
- **Login Security**: Rate limiting (5 attempts, 15 min lockout), password strength validation
- **Admin Panel**: User management dashboard with password reset capability

### Security
- Input validation and sanitization on all auth endpoints
- Parameterized queries to prevent SQL injection

---

## [2.0.1] - 2025-01-15

### Added
- **Change Password**: Users can now change their password from the user menu

### Changed
- **Welcome Page**: Hide "Create Workspace" button for non-authenticated users

### Fixed
- **API Routes**: Added `force-dynamic` to routes using cookies to fix Next.js build warnings

---

## [2.0.0] - 2025-01-15

### Added
- **Cloud Storage**: Data is now stored in Turso (SQLite) cloud database
- **User Authentication**: Register and login with email/password
- **User Menu**: Dropdown menu with user avatar, email and logout
- **Multi-device Sync**: Access your data from any device with the same account
- **Database Schema**: 5 tables (users, workspaces, boards, lists, cards)
- **API Routes**: RESTful endpoints for auth (`/api/auth/*`) and data (`/api/data`)
- **JWT Authentication**: Secure token-based authentication with 7-day expiry
- **Password Hashing**: Secure password storage with bcrypt

### Changed
- **Storage**: Migrated from browser localStorage to Turso cloud database
- **Auth**: Replaced Supabase with custom JWT-based authentication
- **Welcome Page**: Updated messaging to reflect cloud storage
- **Storage Limit**: Increased from 5MB (localStorage) to 256MB (Turso free tier)

### Removed
- **Local Storage**: No longer stores data in browser localStorage
- **Supabase**: Removed Supabase authentication dependency
- **Upstash Redis**: Removed Redis storage layer

### Fixed
- Login page input colors now visible in dark mode

### Security
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens for session management
- HTTP-only cookies for token storage

---

## [1.1.0] - 2025-01-10

### Added
- **Board Templates**: AI Music Video, Project Management, Software Development
- **Card Types**: 9 types with type-specific fields
  - AI Content: Music, Video, Image, Audio, Text
  - Project: Task, Bug, Feature, Meeting
- **Job Number**: Tracking field with format validation (Letter-2digits-4digits)
- **Responsible**: Person assignment field
- **Bug Severity**: Low, Medium, High, Critical levels
- **Feature Priority/Effort**: Priority (P1/P2/P3) and Effort (S/M/L)
- **Meeting Fields**: Attendees list and meeting date
- **Search & Filter**: Search by title, filter by tags and job number
- **Storage Indicator**: Real-time storage usage monitoring

### Changed
- Improved card modal with all field types
- Better mobile responsiveness

---

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Workspaces and Boards management
- Kanban lists with drag & drop
- Cards with basic fields (title, description, tags, due date)
- AI-specific fields (prompt, rating, AI tool)
- Dark mode theme
- Export/Import JSON functionality
- Local storage persistence

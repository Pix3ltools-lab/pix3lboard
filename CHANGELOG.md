# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

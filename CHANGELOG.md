# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

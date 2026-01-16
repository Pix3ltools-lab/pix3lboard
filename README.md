# Pix3lBoard

**Cloud-based project management tool for AI creators**

A modern, lightweight Kanban board application built with Next.js 14, designed for project management with support for AI-specific workflows. Your data is stored securely in the cloud and syncs across all your devices.

> **Note**: This is an experimental demo. Data persistence is not guaranteed and may be reset at any time.

## Features

### Core Functionality
- **Workspaces & Boards**: Organize projects with customizable workspaces and boards
- **Kanban Lists & Cards**: Full drag & drop support for lists and cards
- **Multiple Card Types**:
  - **AI Content**: Music, Video, Image, Audio, Text
  - **Project Management**: Task, Bug, Feature, Meeting
  - Type-specific fields (bug severity, feature priority/effort, meeting attendees)
- **AI-Specific Fields**:
  - AI prompts and tool tracking
  - Rating system (1-5 stars)
  - Tags and links management
- **Project Management Fields**:
  - Job Number tracking (format: Letter-2digits-4digits)
  - Responsible person assignment
  - Due dates and meeting dates
- **Card Comments**: Add comments to cards with author and timestamp
- **Checklists**: Add subtasks with progress tracking
- **Search & Filter**: Search cards by title, filter by tags and job number
- **Export/Import**: Backup and restore your data as JSON
- **Dark Mode**: Eye-friendly dark theme (light mode coming soon)

### Cloud Storage & Authentication
- **User Accounts**: Register and login with email/password
- **Admin Approval**: New accounts require admin approval before access
- **Cloud Sync**: Data automatically syncs across all devices
- **Secure Storage**: Data stored in Turso (SQLite) cloud database
- **JWT Authentication**: Secure token-based sessions

### Admin Panel
- **User Management**: View all users with statistics
- **User Approval**: Approve pending user registrations
- **Create Users**: Admin can create pre-approved accounts
- **Delete Users**: Remove users and all their data
- **Reset Passwords**: Admin can reset user passwords

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **User Menu**: Avatar with dropdown for account info and logout
- **Keyboard Shortcuts**: ESC to close modals, click outside to dismiss
- **Touch Support**: Drag & drop works on touch devices
- **Auto-save**: Changes saved automatically (throttled to reduce API calls)
- **Toast Notifications**: Clear feedback for all actions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Turso (libSQL/SQLite)
- **Authentication**: Custom JWT with bcryptjs
- **Styling**: Tailwind CSS with custom CSS variables
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **ID Generation**: nanoid

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Turso account (free tier available)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Pix3ltools-lab/pix3lboard.git
cd pix3lboard
```

2. Install dependencies:
```bash
npm install
```

3. Create a Turso database:
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create a database
turso db create pix3lboard

# Get the database URL
turso db show pix3lboard --url

# Create an auth token
turso db tokens create pix3lboard
```

4. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Turso Database
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-auth-token"

# JWT Secret (generate a random string)
JWT_SECRET="your-random-secret-key-min-32-chars"
```

5. Initialize the database:
```bash
npm run db:setup
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm run start
```

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
4. Deploy

## Project Structure

```
pix3lboard/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   └── data/                 # Data CRUD endpoints
│   ├── login/                    # Login/Register page
│   ├── workspace/[id]/           # Workspace detail
│   │   └── board/[boardId]/      # Board view
│   ├── page.tsx                  # Home page (workspaces)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── board/                    # Board-related components
│   ├── card/                     # Card field components
│   ├── kanban/                   # Kanban board components
│   ├── layout/                   # Header, UserMenu, etc.
│   ├── providers/                # Context providers
│   ├── ui/                       # Reusable UI components
│   └── workspace/                # Workspace components
├── lib/
│   ├── auth/                     # Authentication functions
│   ├── db/                       # Database client and setup
│   ├── context/                  # React contexts
│   ├── storage/                  # Export/import utilities
│   └── utils/                    # Helper functions
├── types/                        # TypeScript types
└── public/                       # Static assets
```

## Usage Guide

### Creating an Account

1. Go to the login page
2. Click "Don't have an account? Register"
3. Enter your email and password (min 8 characters, must include uppercase, lowercase, and number)
4. Click "Create Account"
5. Wait for admin approval (you'll see "Account pending approval" until approved)

### Creating Your First Workspace

1. Click "Create Workspace" on the home page
2. Give it a name, choose an icon and color
3. Click "Create Workspace"

### Creating a Board

1. Open a workspace
2. Click "Create Board"
3. Choose a template option:
   - **Empty Board**: Start from scratch
   - **Project Management Template**: 5 lists with example cards
   - **AI Music Video Template**: 6 lists for AI content workflow
   - **Software Development Template**: 5 lists for dev workflow
4. Add name and description
5. Click "Create Board"

### Working with Cards

1. Click "Add a card" in any list
2. Click on a card to open the detail modal
3. Edit all fields:
   - **Type**: Choose from 9 types
   - **Job Number**: Optional tracking number
   - **Description**: Detailed description
   - **Type-Specific Fields**: Severity, Priority, Attendees, etc.
   - **AI Prompt**: The prompt you used
   - **Rating**: 1-5 stars
   - **AI Tool**: e.g., "Suno", "Runway", "Midjourney"
   - **Tags**: Up to 5 tags per card
   - **Due Date**: Optional deadline
   - **Links**: Up to 3 URLs
4. Click "Save Changes"

### Drag & Drop

- **Reorder lists**: Drag list headers horizontally
- **Reorder cards**: Drag cards vertically within a list
- **Move cards between lists**: Drag cards to different lists

## Browser Compatibility

- Chrome/Edge: Fully supported
- Firefox: Fully supported
- Safari: Fully supported
- Mobile browsers: Responsive design

## Storage

- **Cloud Storage**: Turso SQLite database
- **Free Tier Limit**: 256 MB
- **Auto-save**: Changes saved automatically (2-second throttle)
- **Export**: Download data as JSON backup anytime

## Known Limitations

- No real-time collaboration (single user per account)
- No undo/redo functionality
- No file attachments
- No offline support

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
- `npm run db:setup` - Initialize database tables

### Database Schema

```sql
-- users: User accounts
-- workspaces: User workspaces
-- boards: Boards within workspaces
-- lists: Lists within boards
-- cards: Cards within lists
```

## Contributing

This is an experimental project, but suggestions and bug reports are welcome!

## License

MIT License - feel free to use this project for your own purposes.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Turso](https://turso.tech/)
- [Tailwind CSS](https://tailwindcss.com/)
- [@dnd-kit](https://dndkit.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Part of [Pix3lTools](https://x.com/pix3ltools)**

Made with the help of Claude Code

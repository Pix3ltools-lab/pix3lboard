# Pix3lBoard

**Privacy-first project management tool**

A modern, lightweight Kanban board application built with Next.js 14, designed for project management with support for AI-specific workflows. All data is stored locally in your browser - no servers, no tracking, complete privacy.

## Features

### Core Functionality
- **Workspaces & Boards**: Organize projects with customizable workspaces and boards
- **Kanban Lists & Cards**: Full drag & drop support for lists and cards
- **AI-Specific Fields**:
  - Card types (Music, Video, Image, Task)
  - AI prompts and tool tracking
  - Rating system (1-5 stars)
  - Tags and links management
- **Search & Filter**: Search cards by title and filter by tags
- **Export/Import**: Backup and restore your data as JSON
- **Dark Mode**: Eye-friendly dark theme (light mode coming soon)

### Privacy & Storage
- **100% Local Storage**: All data stored in browser localStorage
- **No Server Sync**: Nothing leaves your device
- **Export Anytime**: Download full backup as JSON
- **Storage Indicator**: Real-time storage usage monitoring (5MB limit)

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Keyboard Shortcuts**: ESC to close modals, click outside to dismiss
- **Touch Support**: Drag & drop works on touch devices
- **Auto-save**: Changes saved automatically every second
- **Toast Notifications**: Clear feedback for all actions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom CSS variables
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **ID Generation**: nanoid

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pix3lboard
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
pix3lboard/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Home page (workspaces)
│   ├── workspace/[id]/          # Workspace detail
│   │   └── board/[boardId]/     # Board view
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── board/                   # Board-related components
│   ├── card/                    # Card field components
│   ├── kanban/                  # Kanban board components
│   ├── layout/                  # Header, breadcrumb, etc.
│   ├── providers/               # Context providers
│   ├── ui/                      # Reusable UI components
│   └── workspace/               # Workspace components
├── lib/
│   ├── constants.ts             # App constants
│   ├── context/                 # React contexts
│   ├── storage/                 # localStorage utilities
│   ├── utils/                   # Helper functions
│   └── types/                   # TypeScript types
└── public/                      # Static assets

```

## Usage Guide

### Creating Your First Workspace

1. Click "Create Workspace" on the home page
2. Give it a name, choose an icon and color
3. Click "Create Workspace"

### Creating a Board

1. Open a workspace
2. Click "Create Board"
3. Choose a template option:
   - **Empty Board**: Start from scratch
   - **Project Management Template**: 5 lists (To Do, In Progress, In Review, Approve, Delivered) with example cards
   - **AI Music Video Template**: 6 lists (Ideas, Music, Visuals, Video, Edit, Done) with AI-specific example cards
4. Add name and description
5. Click "Create Board"

### Working with Cards

1. Click "Add a card" in any list
2. Click on a card to open the detail modal
3. Edit all fields:
   - **Type**: Music, Video, Image, or Task
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

### Search & Filter

- Use the search bar to find cards by title
- Click "Filter by Tag" to show only cards with a specific tag
- Click "Clear" to remove filters

### Export & Import

- **Export**: Click "Export" in the board toolbar to download a JSON backup
- **Import**: Click "Import" and select a previously exported JSON file
- **Important**: Importing replaces all current data

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ✅ Responsive design

## Storage Limits

- **Maximum**: 5 MB of data (enforced)
- **Warning**: Yellow indicator at 3 MB (60%)
- **Critical**: Red indicator at 4 MB (80%)
- **Recommendation**: Export data regularly as backup

## Known Limitations

- No cloud sync between devices
- No collaboration features
- Single user only
- Data tied to browser localStorage
- No undo/redo functionality
- No checklist or subtasks
- No file attachments

## Planned Improvements

### Card Management
- **Responsible Field**: Add a "Responsible" text field to each card to track who's working on it (simple text input, no user management system)
- **Card Type Dropdown**: Replace the current card type buttons (Music, Video, Image, Task) with a compact dropdown menu to save space in the card modal

### UI/UX Enhancements
- **Light Mode**: Implement a light theme option alongside the existing dark mode
- **Undo/Redo**: Add ability to undo/redo actions
- **Checklists**: Add subtask/checklist functionality within cards

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js recommended rules
- Prettier for code formatting (optional)

## Contributing

This is a personal project, but suggestions and bug reports are welcome!

## License

MIT License - feel free to use this project for your own purposes.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [@dnd-kit](https://dndkit.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Part of [Pix3lTools](https://x.com/pix3ltools)** 🎨

Made with ❤️ for project managers and AI content creators

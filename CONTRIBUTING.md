# Contributing to Pix3lBoard

Thank you for your interest in contributing to Pix3lBoard! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're building tools to help content creators succeed.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the issue template** with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser and OS version

### Suggesting Features

1. **Open an issue** with the `enhancement` label
2. **Describe the feature** and its use case
3. **Explain why** it would benefit users
4. **Consider alternatives** you've thought about

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our code style
4. **Test thoroughly** - ensure everything works
5. **Commit with clear messages**: Use conventional commits (feat:, fix:, docs:, etc.)
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Open a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots/videos if UI changes

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Pix3ltools-lab/pix3lboard.git
cd pix3lboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
npm run start
```

## Code Style Guidelines

### TypeScript/React

- Use **TypeScript** strict mode
- Use **functional components** with hooks
- Follow **React best practices**
- Use **descriptive variable names**
- Add **JSDoc comments** for complex functions
- Keep components **focused and small**

### File Organization

```
pix3lboard/
├── app/                   # Next.js App Router pages
│   ├── page.tsx          # Home page
│   ├── workspace/[id]/   # Dynamic routes
│   └── layout.tsx        # Root layout
├── components/
│   ├── board/            # Board components
│   ├── card/             # Card field components
│   ├── kanban/           # Kanban components
│   ├── layout/           # Header, breadcrumb
│   ├── ui/               # Reusable UI components
│   └── workspace/        # Workspace components
├── lib/
│   ├── context/          # React contexts
│   ├── storage/          # localStorage utilities
│   ├── utils/            # Helper functions
│   └── constants.ts      # App constants
└── types/                # TypeScript types
```

### Naming Conventions

- **Components**: PascalCase (`KanbanBoard.tsx`)
- **Files**: camelCase for utils (`position.ts`)
- **Variables**: camelCase (`selectedCard`)
- **Constants**: UPPER_CASE (`MAX_SIZE_MB`)
- **Types**: PascalCase (`Card`, `Workspace`)

### Git Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example:
```
feat: Add card rating system with stars
fix: Resolve drag & drop positioning bug
docs: Update README with export/import guide
```

## Project Architecture

### Key Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 3.4**: Utility-first styling
- **@dnd-kit**: Drag & drop functionality
- **Lucide React**: Icon library
- **date-fns**: Date formatting
- **nanoid**: ID generation

### State Management

- **React Context API**: DataContext, UIContext, SearchContext
- **localStorage**: Client-side persistence (privacy-first)
- **Auto-save**: Throttled saves (1/second)

### Key Files

- `app/page.tsx`: Home page with workspaces
- `app/workspace/[id]/board/[boardId]/page.tsx`: Kanban board view
- `lib/context/DataContext.tsx`: Main data management (~450 lines)
- `lib/context/UIContext.tsx`: Modal, toast, confirm dialogs
- `lib/storage/localStorage.ts`: Storage with size checking
- `components/kanban/KanbanBoard.tsx`: Drag & drop implementation
- `components/kanban/CardModal.tsx`: Card detail modal

## Testing

Before submitting a PR, test:

1. **Workspace CRUD**: Create, edit, delete workspaces
2. **Board management**: Create with/without template, edit, delete
3. **List operations**: Create, rename, delete, reorder (drag)
4. **Card operations**: Create, edit, delete, duplicate, move
5. **Drag & drop**: Lists horizontal, cards vertical, cross-list
6. **Card modal**: All AI fields (type, prompt, rating, tool, tags, links, date)
7. **Search & filter**: Search by title, filter by tag
8. **Export/Import**: JSON backup and restore
9. **Storage**: Monitor usage, test 5MB limit
10. **Mobile responsive**: Test on various screen sizes
11. **Cross-browser**: Chrome, Firefox, Safari, Edge

## Feature Priorities

### High Priority
- Undo/Redo functionality
- Light mode theme
- Keyboard shortcuts (beyond ESC)
- Checklist in cards

### Medium Priority
- Board templates customization
- Batch card operations
- Card comments/notes
- Activity history

### Future
- Cloud sync (optional, maintains privacy option)
- Collaboration features
- File attachments
- Card dependencies

## Privacy-First Development

**Important**: Pix3lBoard is privacy-first. All features must:
- Store data **locally** only (no external servers)
- Never transmit user data without explicit consent
- Provide clear export/import for user control
- Maintain transparency about data storage

## Questions?

- Open an issue with the `question` label
- Check existing discussions
- Review the README.md

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Pix3lBoard!** 🎨

Part of the [Pix3lTools](https://github.com/Pix3ltools-lab) suite.

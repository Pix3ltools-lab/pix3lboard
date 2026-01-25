# Pix3lBoard User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Account Management](#account-management)
4. [Workspace & Board Management](#workspace--board-management)
5. [Kanban Board Features](#kanban-board-features)
6. [Card Types & Fields](#card-types--fields)
7. [Collaboration Features](#collaboration-features)
8. [Calendar View](#calendar-view)
9. [Search & Filtering](#search--filtering)
10. [File Attachments](#file-attachments)
11. [Import & Export](#import--export)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Troubleshooting](#troubleshooting)

## Introduction

Pix3lBoard is a cloud-based Kanban project management tool designed specifically for AI creators and creative professionals. It combines traditional project management features with AI-specific workflows, allowing you to organize projects, track AI-generated content, and collaborate with team members.

### Key Features

- **Kanban Boards**: Drag-and-drop project management
- **AI-Specific Cards**: Specialized cards for music, video, image, audio, and text content
- **Collaboration**: Share boards, assign tasks, and work with your team
- **Calendar View**: Track deadlines and meetings
- **File Attachments**: Upload and manage project files
- **Search & Filter**: Find anything quickly
- **Import/Export**: Backup and restore your data

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Valid user account (requires admin approval)

### First Time Setup

1. **Register**: Create an account using the registration form
2. **Wait for Approval**: Your account requires admin approval before activation
3. **Login**: Once approved, log in with your credentials
4. **Create Workspace**: Set up your first workspace
5. **Create Board**: Add your first Kanban board

## Account Management

### User Registration

1. Click "Register" on the login page
2. Fill in your email, username, and password
3. Submit the form and wait for admin approval
4. You'll receive an email when your account is approved

### Login & Logout

- **Login**: Enter your email and password on the login page
- **Logout**: Click your avatar in the top-right corner and select "Logout"

### Profile Management

Access your profile by clicking your avatar in the header:

- **Change Password**: Update your account password
- **Account Settings**: Manage your personal information
- **Admin Panel**: (Admins only) Manage users and system settings

## Workspace & Board Management

### Workspaces

Workspaces are containers for your boards and help organize different projects or clients.

#### Creating a Workspace

1. Click the "+" button next to "Workspaces" in the sidebar
2. Enter a workspace name and optional description
3. Choose a color for the workspace
4. Click "Create Workspace"

#### Managing Workspaces

- **Edit**: Click the three dots next to a workspace name and select "Edit"
- **Delete**: Click the three dots and select "Delete" (requires confirmation)
- **Switch**: Click on any workspace name in the sidebar to switch to it

### Boards

Boards are Kanban boards within workspaces where you manage your tasks and projects.

#### Creating a Board

1. Select a workspace from the sidebar
2. Click the "+" button next to "Boards"
3. Enter a board name and optional description
4. Click "Create Board"

#### Board Settings

Access board settings by clicking the gear icon in the board header:

- **Edit Board**: Change name and description
- **Delete Board**: Remove the board (requires confirmation)
- **Sharing**: Manage board sharing and permissions

## Kanban Board Features

### Basic Navigation

- **Lists**: Vertical columns that represent different stages of work
- **Cards**: Individual tasks or items that move between lists
- **Drag & Drop**: Click and drag cards to move them between lists

### Creating Lists

1. Click the "+ Add List" button at the end of the board
2. Enter a list name
3. Press Enter or click "Add"

### Creating Cards

1. Click the "+ Add Card" button at the bottom of any list
2. Select a card type (see [Card Types](#card-types--fields))
3. Fill in the required fields
4. Click "Create Card"

### Card Operations

- **Edit**: Click on a card to open the detail modal
- **Move**: Drag cards between lists or to different positions
- **Archive**: Click the archive icon in the card detail modal
- **Delete**: Click the delete button in the card detail modal (requires confirmation)

## Card Types & Fields

Pix3lBoard supports 9 different card types, each with specialized fields:

### AI Content Types

#### Music Card

- **Title**: Song or track name
- **Artist**: Creator name
- **Prompt**: AI prompt used for generation
- **Tool**: AI tool used (Suno, Udio, etc.)
- **Rating**: 1-5 star quality rating
- **Tags**: Categorization tags

#### Video Card

- **Title**: Video title
- **Duration**: Video length
- **Prompt**: AI prompt used
- **Tool**: AI tool used (Runway, Pika, etc.)
- **Rating**: Quality rating
- **Tags**: Categorization tags

#### Image Card

- **Title**: Image title
- **Style**: Art style or description
- **Prompt**: AI prompt used
- **Tool**: AI tool used (Midjourney, DALL-E, etc.)
- **Rating**: Quality rating
- **Tags**: Categorization tags

#### Audio Card

- **Title**: Audio title
- **Duration**: Audio length
- **Prompt**: AI prompt used
- **Tool**: AI tool used
- **Rating**: Quality rating
- **Tags**: Categorization tags

#### Text Card

- **Title**: Text title
- **Word Count**: Text length
- **Prompt**: AI prompt used
- **Tool**: AI tool used (ChatGPT, Claude, etc.)
- **Rating**: Quality rating
- **Tags**: Categorization tags

### Project Management Types

#### Task Card

- **Title**: Task description
- **Priority**: Low, Medium, High
- **Due Date**: Deadline for completion
- **Assigned To**: Team member responsible
- **Tags**: Categorization tags

#### Bug Card

- **Title**: Bug description
- **Severity**: Low, Medium, High, Critical
- **Steps to Reproduce**: How to trigger the bug
- **Assigned To**: Developer responsible
- **Tags**: Categorization tags

#### Feature Card

- **Title**: Feature description
- **Priority**: Low, Medium, High
- **Effort**: Story points or time estimate
- **Assigned To**: Team member responsible
- **Tags**: Categorization tags

#### Meeting Card

- **Title**: Meeting title
- **Date & Time**: Scheduled meeting time
- **Duration**: Meeting length
- **Attendees**: Participants list
- **Tags**: Categorization tags

## Collaboration Features

### Board Sharing

Share your boards with team members or make them publicly accessible.

#### Private Sharing

1. Click the share button in the board header
2. Enter the email address of the user to share with
3. Select permission level:
   - **Owner**: Full access to edit and manage
   - **Viewer**: Read-only access
4. Click "Share"

#### Public Links

1. Click the share button in the board header
2. Toggle "Enable public link"
3. Copy the generated URL
4. Share the URL for read-only access

### User Assignment

Assign cards to team members:

1. Open a card in edit mode
2. Click the "Assigned To" field
3. Select from the autocomplete list of registered users
4. The assigned user will receive notification

### Comments & Communication

Add comments to cards for team communication:

1. Open a card detail modal
2. Scroll to the comments section
3. Type your comment and press Enter
4. Comments are timestamped and show the author

## Calendar View

The calendar view displays cards with dates in a traditional calendar format.

### Accessing Calendar View

1. Click the calendar icon in the board header
2. Select a month and year
3. View cards with due dates and meetings

### Calendar Features

- **Monthly View**: Display all days in a month
- **Card Display**: Shows card titles and types
- **Navigation**: Move between months
- **Quick Access**: Click on any card to open its details

### Supported Card Types in Calendar

- **Task Cards**: Show due dates
- **Meeting Cards**: Show scheduled meeting times
- **Bug Cards**: Show due dates (if set)
- **Feature Cards**: Show target dates (if set)

## Search & Filtering

### Global Search

Use the search bar in the header to find cards across all boards:

1. Type your search query in the search bar
2. Press Enter or click the search button
3. Results show matching cards with board and list information

### Board-Level Filtering

Filter cards within the current board:

1. Click the filter button in the board header
2. Choose filter criteria:
   - **Tags**: Filter by specific tags
   - **Assigned To**: Filter by team member
   - **Card Type**: Filter by card type
   - **Job Number**: Filter by job number (if applicable)
3. Apply filters to see matching cards

### Search Tips

- Search works on card titles and descriptions
- Use quotes for exact phrase matching
- Filters can be combined for precise results
- Clear filters to show all cards

## File Attachments

### Supported File Types

- **Images**: JPG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, TXT
- **Archives**: ZIP, RAR
- **Maximum Size**: 10MB per file

### Attaching Files

1. Open a card in edit mode
2. Scroll to the "Attachments" section
3. Click "Choose Files" or drag files into the drop zone
4. Select files and click "Upload"
5. Files appear as thumbnails with download options

### Image Thumbnails

- Images automatically generate thumbnails
- Click thumbnails to view in lightbox mode
- Download original files using the download button

### Managing Attachments

- **View**: Click on any attachment to preview
- **Download**: Use the download button to save files
- **Delete**: Remove attachments with the delete button

## Import & Export

### Export (Backup)

Create a JSON backup of your workspace data:

1. Go to workspace settings
2. Click "Export Data"
3. Choose what to export (workspaces, boards, cards)
4. Download the JSON file

### Import (Restore)

Restore data from a JSON backup:

1. Go to workspace settings
2. Click "Import Data"
3. Select your JSON backup file
4. Choose import options:
   - **Merge**: Add to existing data
   - **Replace**: Clear and replace existing data
5. Confirm the import operation

### Import Best Practices

- Always export current data before importing
- Test imports with a small dataset first
- Keep backup files in a safe location
- Verify data after import completion

## Keyboard Shortcuts

### Navigation

- `Ctrl + K` (Cmd + K on Mac): Open search
- `Escape`: Close modals and cancel operations
- `Tab`: Navigate between form fields
- `Enter`: Submit forms or create new items

### Board Operations

- `N`: Create new card in selected list
- `L`: Create new list
- `S`: Open search
- `F`: Open filter panel

### Card Management

- `Enter`: Quick create card
- `Space`: Open card details
- `Delete`: Archive selected card

## Troubleshooting

### Common Issues

#### Login Problems

- **Account Not Approved**: Wait for admin approval email
- **Wrong Password**: Use the "Forgot Password" link
- **Browser Issues**: Clear cache and cookies, try a different browser

#### Drag & Drop Not Working

- **Browser Compatibility**: Ensure you're using a modern browser
- **JavaScript Enabled**: Check that JavaScript is enabled
- **Refresh Page**: Try refreshing the browser page

#### File Upload Issues

- **File Size**: Ensure files are under 10MB
- **File Type**: Check that file types are supported
- **Network Connection**: Verify stable internet connection

#### Sync Issues

- **Refresh**: Press F5 to refresh the page
- **Check Connection**: Verify internet connectivity
- **Clear Cache**: Clear browser cache and cookies

### Performance Tips

- **Large Boards**: Archive old cards to improve performance
- **File Management**: Remove unnecessary attachments
- **Browser Updates**: Keep your browser updated
- **Network**: Use a stable internet connection

### Getting Help

If you encounter issues not covered in this manual:

1. Check the browser console for error messages
2. Try refreshing the page
3. Clear browser cache and cookies
4. Contact your system administrator
5. Report bugs through the appropriate channels

---

## Version Information

This manual covers Pix3lBoard version 1.0.0 and above. Features may vary based on your specific version and deployment configuration.

For the most up-to-date information, please refer to the in-app help documentation or contact your system administrator.

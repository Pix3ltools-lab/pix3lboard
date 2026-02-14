# Pix3lboard REST API v1

Public REST API for managing boards, lists, and cards from external applications.
The existing frontend and delta sync system are untouched.

Interactive documentation: **`/docs`** (Swagger UI)
OpenAPI spec: **`GET /api/docs`** (JSON, for Postman/SDK generators)

---

## Authentication

Two methods are supported — both use the same JWT:

| Method | Usage |
|--------|-------|
| `Authorization: Bearer <token>` | External API clients |
| `auth-token` cookie | Web UI (automatic) |

### Obtain a token

```
POST /api/auth/token
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }
```

**Response 200:**
```json
{
  "token": "eyJ...",
  "expires_in": "7d",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

Rate limited: 5 attempts per 15 minutes (endpoint `api-token`).

---

## Response format

All endpoints return consistent JSON:

- **Entity:** `{ "data": { ... } }`
- **Collection:** `{ "data": [ ... ] }`
- **Paginated:** `{ "data": [ ... ], "pagination": { "page", "limit", "total", "total_pages" } }`
- **Delete:** `{ "success": true }`
- **Error:** `{ "error": "message" }` with optional `issues` array for validation errors

HTTP status codes: `200`, `201`, `400`, `401`, `403`, `404`, `429`, `500`.

---

## Endpoints

### Boards

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/v1/boards` | List all accessible boards | authenticated |
| POST | `/api/v1/boards` | Create a board | workspace owner |
| GET | `/api/v1/boards/:boardId` | Board detail with nested lists and cards | `canView` |
| PATCH | `/api/v1/boards/:boardId` | Update board properties | `canManageBoard` |
| DELETE | `/api/v1/boards/:boardId` | Delete board (cascade) | owner only |

**GET /api/v1/boards** query params:
- `workspace_id` — filter by workspace

**POST /api/v1/boards** body:
```json
{
  "workspace_id": "...",
  "name": "My Board",
  "description": "optional",
  "background": "optional",
  "allowed_card_types": ["task", "bug"],
  "is_public": false
}
```

**PATCH /api/v1/boards/:boardId** body (all fields optional):
```json
{
  "name": "...",
  "description": "..." | null,
  "background": "..." | null,
  "allowed_card_types": [...] | null,
  "is_public": true
}
```

**GET /api/v1/boards/:boardId** returns nested structure:
```json
{
  "data": {
    "id": "...", "name": "...", "role": "owner", "...",
    "lists": [
      {
        "id": "...", "name": "...", "position": 0,
        "cards": [ { "id": "...", "title": "...", "..." } ]
      }
    ]
  }
}
```

### Lists

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/v1/boards/:boardId/lists` | Lists for a board | `canView` |
| POST | `/api/v1/boards/:boardId/lists` | Create a list | `canManageLists` |
| PATCH | `/api/v1/lists/:listId` | Update list | `canManageLists` |
| DELETE | `/api/v1/lists/:listId` | Delete list (cascade cards) | `canManageLists` |

**POST /api/v1/boards/:boardId/lists** body:
```json
{
  "name": "To Do",
  "position": 0,
  "color": "#ff0000"
}
```
If `position` is omitted, it is auto-calculated as `MAX(position) + 1`.

**PATCH /api/v1/lists/:listId** body (all optional):
```json
{
  "name": "...",
  "position": 2,
  "color": "..." | null
}
```

### Cards

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/api/v1/boards/:boardId/cards` | List cards (filtered, paginated) | `canView` |
| POST | `/api/v1/cards` | Create a card | `canEditCards` |
| GET | `/api/v1/cards/:cardId` | Card detail + comments + attachments | `canView` |
| PATCH | `/api/v1/cards/:cardId` | Update card | `canEditCards` |
| DELETE | `/api/v1/cards/:cardId` | Delete card | `canEditCards` |
| PATCH | `/api/v1/cards/:cardId/move` | Move to different list/position | `canEditCards` (both lists) |
| POST | `/api/v1/cards/:cardId/archive?action=archive` | Archive a card | `canEditCards` |
| POST | `/api/v1/cards/:cardId/archive?action=unarchive` | Unarchive a card | `canEditCards` |

**GET /api/v1/boards/:boardId/cards** query params:
- `list_id` — filter by list
- `is_archived` — `true` or `false` (default: excludes archived)
- `responsible_user_id` — filter by assignee
- `page` — page number (default: 1)
- `limit` — items per page (default: 50, max: 200)

**POST /api/v1/cards** body (all 25 card fields):
```json
{
  "list_id": "...",
  "title": "New task",
  "description": "optional",
  "position": 0,
  "type": "task",
  "prompt": "...",
  "rating": 5,
  "ai_tool": "...",
  "tags": ["tag1", "tag2"],
  "due_date": "2026-03-01",
  "links": ["https://example.com"],
  "responsible": "John",
  "responsible_user_id": "...",
  "job_number": "A-26-0001",
  "severity": "high",
  "priority": "medium",
  "effort": "large",
  "attendees": ["Alice", "Bob"],
  "meeting_date": "2026-03-15",
  "checklist": [{"id": "1", "text": "Step 1", "checked": false}],
  "thumbnail": "...",
  "wiki_page_id": "..."
}
```
If `position` is omitted, it is auto-calculated. Only `list_id` and `title` are required.

**PATCH /api/v1/cards/:cardId** body (all optional, nullable to clear):
```json
{
  "title": "Updated title",
  "description": null,
  "tags": ["new-tag"],
  "priority": null
}
```
Convention: field omitted = don't change; field set to `null` = clear field.

**PATCH /api/v1/cards/:cardId/move** body:
```json
{
  "list_id": "target-list-id",
  "position": 0
}
```
Handles cross-list moves (closes gap in source, makes room in target) and same-list reordering.

### Side effects

Card create/update triggers:
- **FTS sync** — `syncCardToFts()` on title/description changes
- **Notifications** — `notifyAssignment()` when `responsible_user_id` changes to another user
- **FTS removal** — on archive and delete

---

## File structure

```
lib/
  auth/
    apiAuth.ts                          # authenticateRequest() — Bearer + cookie
  validation/
    apiSchemas.ts                       # Zod schemas (snake_case): Token, Board, List, Card, Move
  swagger.ts                            # OpenAPI spec generator

app/api/
  auth/
    token/route.ts                      # POST — exchange credentials for Bearer JWT
  docs/route.ts                         # GET — OpenAPI JSON spec
  v1/
    boards/
      route.ts                          # GET (list), POST (create)
      [boardId]/
        route.ts                        # GET (detail), PATCH, DELETE
        lists/route.ts                  # GET, POST
        cards/route.ts                  # GET (filtered, paginated)
    lists/
      [listId]/route.ts                 # PATCH, DELETE
    cards/
      route.ts                          # POST (create)
      [cardId]/
        route.ts                        # GET (detail+comments+attachments), PATCH, DELETE
        move/route.ts                   # PATCH (move between lists)
        archive/route.ts                # POST ?action=archive|unarchive

app/docs/
  page.tsx                              # Swagger UI page at /docs
```

Total: 17 new files. No existing files modified.

---

## Dependencies

```bash
npm install next-swagger-doc swagger-ui-react
npm install -D @types/swagger-ui-react
```

---

## Example usage (curl)

```bash
# 1. Get token
TOKEN=$(curl -s -X POST https://pix3lboard.example/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"..."}' | jq -r .token)

# 2. List boards
curl -s https://pix3lboard.example/api/v1/boards \
  -H "Authorization: Bearer $TOKEN"

# 3. Get board with lists and cards
curl -s https://pix3lboard.example/api/v1/boards/BOARD_ID \
  -H "Authorization: Bearer $TOKEN"

# 4. Create a card
curl -s -X POST https://pix3lboard.example/api/v1/cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"list_id":"LIST_ID","title":"New task","priority":"high"}'

# 5. Update a card
curl -s -X PATCH https://pix3lboard.example/api/v1/cards/CARD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description","tags":["api","v1"]}'

# 6. Move card to another list
curl -s -X PATCH https://pix3lboard.example/api/v1/cards/CARD_ID/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"list_id":"TARGET_LIST_ID","position":0}'

# 7. Archive a card
curl -s -X POST "https://pix3lboard.example/api/v1/cards/CARD_ID/archive?action=archive" \
  -H "Authorization: Bearer $TOKEN"

# 8. List archived cards for a board
curl -s "https://pix3lboard.example/api/v1/boards/BOARD_ID/cards?is_archived=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notes

- The `/api/v1/` prefix allows future versioning.
- The existing delta sync (`/api/sync`) and full load (`/api/data`) are untouched.
- The frontend continues to use cookies; external clients use Bearer tokens.
- Both auth methods use the same JWT and `verifyToken()` function.
- API uses **snake_case** field names (REST convention for external clients).
- IDs are generated server-side with `nanoid()` — never client-provided.
- Permission checks use the same `getBoardRole()` / `canManageBoard()` / `canEditCards()` system as the web UI.

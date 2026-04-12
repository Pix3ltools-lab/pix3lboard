# Requirements Traceability

Pix3lBoard includes a built-in requirements traceability system that lets you track work from specification to verification across three levels:

```
Requirement (REQ-001)
    └── Kanban Card
            └── Test Case (TC-001)
                    └── Test Run (passed / failed / pending)
```

---

## Concepts

### Requirement
A requirement describes something the system must do or a quality it must have. Each requirement belongs to a board and has:

- **Code** — auto-generated (REQ-001, REQ-002, …), unique per board
- **Title** — short description of the requirement
- **Description** — optional longer explanation
- **Priority** — `high`, `medium`, or `low`
- **Status** — lifecycle state (see below)
- **Coverage %** — automatically computed from linked test results

#### Requirement status lifecycle

| Status | Meaning |
|--------|---------|
| `draft` | Requirement created, not yet reviewed |
| `approved` | Reviewed and accepted for implementation |
| `implemented` | At least one linked test has failed (work in progress) |
| `verified` | All linked test cases passed |

Status transitions to `implemented` or `verified` happen **automatically** when a test run is recorded.

---

### Test Case
A test case describes how to verify that a requirement or card feature works correctly. Each test case has:

- **Code** — auto-generated (TC-001, TC-002, …), unique per board
- **Title** — what the test checks
- **Type** — `manual` (executed by a person) or `automated`
- **Card link** — optional link to the card being tested
- **Requirement link** — optional direct link to a requirement

#### Test Run
A test run records the outcome of executing a test case at a specific point in time:
- **Result** — `passed`, `failed`, or `pending`
- **Notes** — optional free-text observation
- The latest run result is shown inline on each test case

---

### Requirement → Card link
A requirement can be linked to one or more Kanban cards via the `requirement_cards` table. This association means "this card is part of the work needed to satisfy this requirement". A card can be linked to multiple requirements.

---

## Where to find it

| Feature | How to access |
|---------|--------------|
| Traceability dashboard | Board toolbar → **Traceability** button (clipboard icon) |
| Test cases for a card | Open card → **Tests** button in the actions bar (flask icon) |

---

## Traceability Dashboard

The traceability page (`/workspace/:id/board/:boardId/traceability`) has three tabs.

### Requirements tab
Full CRUD for requirements on this board.

- Click **New Requirement** to create one — code is assigned automatically
- Click the **chevron** (▶) on a row to expand it and see:
  - Linked cards (with a **Link card** dropdown to add more, and **×** to unlink)
  - Test cases linked to this requirement or to its linked cards, with latest result badge
- Click the **pencil** icon to edit title, description, priority, and status inline
- Click the **trash** icon to delete (confirmation required)

### Matrix tab
A read-only table showing every requirement with its linked cards and coverage percentage. Click a card chip to open the card modal on the board page.

### Coverage tab
Charts and metrics for the board's overall traceability health:

- **Key metrics** — total requirements, covered (≥1 test passed), partial (mix), not covered (no tests)
- **Status donut chart** — distribution of draft / approved / implemented / verified
- **Priority bar chart** — coverage breakdown by priority level
- **List bar chart** — coverage breakdown by board list
- **At-risk section** — high-priority requirements that are not yet verified

---

## Tests Modal (from a card)

Open any card and click the **Tests** button in the actions bar to manage test cases for that card.

### Linked requirements
If the card is linked to any requirements, their codes (REQ-001, …) are shown as chips at the top of the modal for quick reference.

### Link an existing test case
Type in the search field to find test cases already on the board. Select one to link it to this card.

### Create a new test case
Click **New test**, enter a title, choose `manual` or `automated`, and click **Create**. The test case is created and linked to this card automatically.

### Run a test
Click the **▶ (Play)** button on any test case row to open the inline run form:
1. Select a result: `passed`, `failed`, or `pending`
2. Add optional notes
3. Click **Record result**

The latest result badge updates immediately. If the test case is linked to a requirement (directly or via the card), the requirement status is updated automatically.

### Create a bug card on failure
When a test result is `failed`, a **🐛 (Bug)** button appears on that row. Clicking it:
- Creates a new card in the same list with title `[TC-001] <test title>`
- Closes the Tests modal

The original card is not modified — the bug card is a separate work item to track the fix.

### Unlink a test case
Click the **Unlink** button (chain-break icon) to remove the association between the test case and the card. The test case itself is not deleted.

---

## Export and Import

When you export your board data (board toolbar → **Export**), the JSON backup includes a `traceability` section with:
- All requirements and their card links
- All test cases
- All test run history

When you import a backup, traceability data is restored automatically after the workspace and cards are in place, so all foreign key references remain valid.

---

## API

All traceability entities are accessible via the REST API v1 (see `/docs` for the full Swagger reference).

| Endpoint | Description |
|----------|-------------|
| `GET /api/requirements?boardId=` | List requirements for a board |
| `GET /api/requirements?cardId=` | List requirements linked to a card |
| `POST /api/requirements` | Create a requirement |
| `PATCH /api/requirements/:id` | Update a requirement |
| `DELETE /api/requirements/:id` | Delete a requirement |
| `POST /api/requirements/:id/cards` | Link a card to a requirement |
| `DELETE /api/requirements/:id/cards/:cardId` | Unlink a card |
| `GET /api/test-cases?boardId=` | List test cases for a board |
| `GET /api/test-cases?cardId=` | List test cases linked to a card |
| `POST /api/test-cases` | Create a test case |
| `PATCH /api/test-cases/:id` | Update a test case |
| `DELETE /api/test-cases/:id` | Delete a test case |
| `POST /api/test-cases/:id/runs` | Record a test run |
| `GET /api/boards/:boardId/traceability/coverage` | Aggregated coverage metrics |
| `GET /api/traceability/export?boardIds=` | Bulk export for backup |
| `POST /api/traceability/import` | Bulk import from backup |

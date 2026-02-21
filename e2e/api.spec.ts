import { test, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_USER_EMAIL!;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD!;
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

let token: string;
let workspaceId: string;
let boardId: string;
let listId: string;
let cardId: string;

test.describe('REST API v1', () => {
  test('POST /api/auth/token — get bearer token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/token`, {
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.expires_in).toBe('7d');
    expect(body.user).toBeTruthy();
    expect(body.user.email).toBe(E2E_EMAIL);

    token = body.token;
  });

  test('GET /api/v1/boards — 401 without token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/boards`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/v1/boards — list boards', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/boards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);

    // Find workspace_id from an owned board (not shared)
    const ownedBoard = body.data.find((b: { role: string }) => b.role === 'owner');
    if (ownedBoard) {
      workspaceId = ownedBoard.workspace_id;
    }
  });

  test('POST /api/v1/boards — create board', async ({ request }) => {
    test.skip(!workspaceId, 'No owned workspace available — create one via UI first');

    const res = await request.post(`${BASE_URL}/api/v1/boards`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        workspace_id: workspaceId,
        name: `API Test Board ${Date.now()}`,
        description: 'Created via E2E API test',
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toContain('API Test Board');
    expect(body.data.role).toBe('owner');

    boardId = body.data.id;
  });

  test('POST /api/v1/boards/:boardId/lists — create list', async ({ request }) => {
    test.skip(!boardId, 'No board available');

    const res = await request.post(`${BASE_URL}/api/v1/boards/${boardId}/lists`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'API Test List' },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe('API Test List');

    listId = body.data.id;
  });

  test('POST /api/v1/cards — create card', async ({ request }) => {
    test.skip(!listId, 'No list available');

    const res = await request.post(`${BASE_URL}/api/v1/cards`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        list_id: listId,
        title: 'API Test Card',
        description: 'Created via E2E API test',
        type: 'task',
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.id).toBeTruthy();
    expect(body.data.title).toBe('API Test Card');

    cardId = body.data.id;
  });

  test('GET /api/v1/cards/:cardId — get card', async ({ request }) => {
    test.skip(!cardId, 'No card available');

    const res = await request.get(`${BASE_URL}/api/v1/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.title).toBe('API Test Card');
    expect(body.data.type).toBe('task');
  });

  test('PATCH /api/v1/cards/:cardId — update card', async ({ request }) => {
    test.skip(!cardId, 'No card available');

    const res = await request.patch(`${BASE_URL}/api/v1/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Updated API Card',
        description: 'Updated description',
        tags: ['e2e', 'api-test'],
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.title).toBe('Updated API Card');
  });

  test('DELETE /api/v1/cards/:cardId — delete card', async ({ request }) => {
    test.skip(!cardId, 'No card available');

    const res = await request.delete(`${BASE_URL}/api/v1/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    // Verify card no longer exists
    const getRes = await request.get(`${BASE_URL}/api/v1/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(404);
  });

  test('DELETE /api/v1/boards/:boardId — delete board', async ({ request }) => {
    test.skip(!boardId, 'No board available');

    const res = await request.delete(`${BASE_URL}/api/v1/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    // Verify board no longer exists
    const getRes = await request.get(`${BASE_URL}/api/v1/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(404);
  });

  test('POST /api/v1/boards — 400 invalid input', async ({ request }) => {
    // Get a fresh token to ensure auth works
    const authRes = await request.post(`${BASE_URL}/api/auth/token`, {
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    });
    const authBody = await authRes.json();
    const freshToken = authBody.token;

    const res = await request.post(`${BASE_URL}/api/v1/boards`, {
      headers: { Authorization: `Bearer ${freshToken}` },
      data: { description: 'missing required fields' },
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('GET /api/admin/storage-info — 403 without admin cookie', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/storage-info`);
    expect(res.status()).toBe(403);
  });

  test('POST /api/auth/token — 401 invalid credentials', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/token`, {
      data: { email: E2E_EMAIL, password: 'totally-wrong-password' },
    });
    expect(res.status()).toBe(401);

    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

/**
 * OpenAPI 3.0 spec for Pix3lboard REST API v1.
 * No build-time filesystem scanning — pure static object.
 */
export function getApiDocs() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Pix3lboard API',
      version: '1.0.0',
      description: 'REST API for managing boards, lists, and cards in Pix3lboard.',
    },
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Boards', description: 'Board management' },
      { name: 'Lists', description: 'List management' },
      { name: 'Cards', description: 'Card management' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Obtain a token via POST /api/auth/token',
        },
      },
      schemas: {
        Board: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            workspace_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            background: { type: 'string', nullable: true },
            allowed_card_types: { type: 'array', items: { type: 'string' }, nullable: true },
            is_public: { type: 'boolean' },
            role: { type: 'string', enum: ['owner', 'editor', 'commenter', 'viewer'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        List: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            board_id: { type: 'string' },
            name: { type: 'string' },
            position: { type: 'integer' },
            color: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Card: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            list_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            position: { type: 'integer' },
            type: { type: 'string', nullable: true },
            prompt: { type: 'string', nullable: true },
            rating: { type: 'integer', nullable: true },
            ai_tool: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' }, nullable: true },
            due_date: { type: 'string', nullable: true },
            links: { type: 'array', items: { type: 'string' }, nullable: true },
            responsible: { type: 'string', nullable: true },
            responsible_user_id: { type: 'string', nullable: true },
            responsible_user_name: { type: 'string', nullable: true },
            responsible_user_email: { type: 'string', nullable: true },
            job_number: { type: 'string', nullable: true },
            severity: { type: 'string', nullable: true },
            priority: { type: 'string', nullable: true },
            effort: { type: 'string', nullable: true },
            attendees: { type: 'array', items: { type: 'string' }, nullable: true },
            meeting_date: { type: 'string', nullable: true },
            checklist: {
              type: 'array',
              nullable: true,
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  checked: { type: 'boolean' },
                },
              },
            },
            is_archived: { type: 'boolean' },
            thumbnail: { type: 'string', nullable: true },
            wiki_page_id: { type: 'string', nullable: true },
            comment_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/auth/token': {
        post: {
          summary: 'Exchange credentials for a Bearer token',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'JWT token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      expires_in: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'Invalid credentials' },
            '429': { description: 'Too many attempts' },
          },
        },
      },
      '/api/v1/boards': {
        get: {
          summary: 'List all accessible boards',
          tags: ['Boards'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'workspace_id', schema: { type: 'string' }, description: 'Filter by workspace' },
          ],
          responses: {
            '200': { description: 'List of boards' },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create a board',
          tags: ['Boards'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workspace_id', 'name'],
                  properties: {
                    workspace_id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    background: { type: 'string' },
                    allowed_card_types: { type: 'array', items: { type: 'string' } },
                    is_public: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Board created' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/boards/{boardId}': {
        get: {
          summary: 'Get board with lists and cards',
          tags: ['Boards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'boardId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Board detail' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Not found' },
          },
        },
        patch: {
          summary: 'Update a board',
          tags: ['Boards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'boardId', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    background: { type: 'string', nullable: true },
                    allowed_card_types: { type: 'array', items: { type: 'string' }, nullable: true },
                    is_public: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Board updated' },
            '400': { description: 'Invalid request' },
            '403': { description: 'Forbidden' },
          },
        },
        delete: {
          summary: 'Delete a board (owner only)',
          tags: ['Boards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'boardId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Deleted' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/boards/{boardId}/lists': {
        get: {
          summary: 'List all lists for a board',
          tags: ['Lists'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'boardId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'List of lists' },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create a list',
          tags: ['Lists'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'boardId', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    position: { type: 'integer' },
                    color: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'List created' },
            '400': { description: 'Invalid request' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/boards/{boardId}/cards': {
        get: {
          summary: 'List cards for a board (filtered, paginated)',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'boardId', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'list_id', schema: { type: 'string' } },
            { in: 'query', name: 'is_archived', schema: { type: 'boolean' } },
            { in: 'query', name: 'responsible_user_id', schema: { type: 'string' } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50, maximum: 200 } },
          ],
          responses: {
            '200': { description: 'Paginated list of cards' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/lists/{listId}': {
        patch: {
          summary: 'Update a list',
          tags: ['Lists'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'listId', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    position: { type: 'integer' },
                    color: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'List updated' },
            '400': { description: 'Invalid request' },
            '403': { description: 'Forbidden' },
          },
        },
        delete: {
          summary: 'Delete a list and its cards',
          tags: ['Lists'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'listId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Deleted' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/cards': {
        post: {
          summary: 'Create a card',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['list_id', 'title'],
                  properties: {
                    list_id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    position: { type: 'integer' },
                    type: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    due_date: { type: 'string' },
                    responsible_user_id: { type: 'string' },
                    priority: { type: 'string' },
                    severity: { type: 'string' },
                    effort: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Card created' },
            '400': { description: 'Invalid request' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/cards/{cardId}': {
        get: {
          summary: 'Get card with comments and attachments',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Card detail' },
            '404': { description: 'Not found' },
          },
        },
        patch: {
          summary: 'Update a card',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    tags: { type: 'array', items: { type: 'string' }, nullable: true },
                    due_date: { type: 'string', nullable: true },
                    responsible_user_id: { type: 'string', nullable: true },
                    priority: { type: 'string', nullable: true },
                    severity: { type: 'string', nullable: true },
                    effort: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Card updated' },
            '400': { description: 'Invalid request' },
            '403': { description: 'Forbidden' },
          },
        },
        delete: {
          summary: 'Delete a card',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Deleted' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/cards/{cardId}/move': {
        patch: {
          summary: 'Move a card to a different list/position',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['list_id', 'position'],
                  properties: {
                    list_id: { type: 'string', description: 'Target list ID' },
                    position: { type: 'integer', description: 'Target position (0-based)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Card moved' },
            '400': { description: 'Invalid request' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/v1/cards/{cardId}/archive': {
        post: {
          summary: 'Archive or unarchive a card',
          tags: ['Cards'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'cardId', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'action', required: true, schema: { type: 'string', enum: ['archive', 'unarchive'] } },
          ],
          responses: {
            '200': { description: 'Card archived/unarchived' },
            '400': { description: 'Invalid action' },
            '403': { description: 'Forbidden' },
          },
        },
      },
    },
  };
}

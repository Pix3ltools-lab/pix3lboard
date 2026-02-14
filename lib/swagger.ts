import { createSwaggerSpec } from 'next-swagger-doc';

export function getApiDocs() {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Pix3lboard API',
        version: '1.0.0',
        description: 'REST API for managing boards, lists, and cards in Pix3lboard.',
      },
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
              allowed_card_types: {
                type: 'array',
                items: { type: 'string' },
                nullable: true,
              },
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
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    text: { type: 'string' },
                    checked: { type: 'boolean' },
                  },
                },
                nullable: true,
              },
              is_archived: { type: 'boolean' },
              thumbnail: { type: 'string', nullable: true },
              wiki_page_id: { type: 'string', nullable: true },
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
      security: [],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Boards', description: 'Board management' },
        { name: 'Lists', description: 'List management' },
        { name: 'Cards', description: 'Card management' },
      ],
    },
  });
  return spec;
}

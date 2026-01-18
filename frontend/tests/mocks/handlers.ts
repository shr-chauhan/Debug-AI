import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const handlers = [
  http.get(`${API_BASE_URL}/api/v1/projects`, () => {
    return HttpResponse.json({
      projects: [
        {
          id: 1,
          project_key: 'test-project',
          name: 'Test Project',
          language: 'python',
          framework: 'fastapi',
          error_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          repo_config: null,
        },
      ],
      total: 1,
    });
  }),

  http.get(`${API_BASE_URL}/api/v1/projects/:id`, ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      project_key: 'test-project',
      name: 'Test Project',
      language: 'python',
      framework: 'fastapi',
      error_count: 2,
      created_at: '2024-01-01T00:00:00Z',
      repo_config: {
        provider: 'github',
        owner: 'testuser',
        repo: 'testrepo',
        branch: 'main',
      },
    });
  }),

  http.get(`${API_BASE_URL}/api/v1/events`, () => {
    return HttpResponse.json({
      events: [
        {
          id: 1,
          timestamp: '2024-01-01T12:00:00Z',
          status_code: 500,
          message: 'Internal server error',
          method: 'GET',
          path: '/api/test',
          project_key: 'test-project',
          project_name: 'Test Project',
          created_at: '2024-01-01T12:00:00Z',
          has_analysis: true,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
  }),

  http.get(`${API_BASE_URL}/api/v1/events/:id/with-analysis`, ({ params }) => {
    return HttpResponse.json({
      event: {
        id: Number(params.id),
        timestamp: '2024-01-01T12:00:00Z',
        status_code: 500,
        payload: {
          message: 'Internal server error',
          stack: 'Error: Test\n  at test.js:1:1',
          method: 'GET',
          path: '/api/test',
        },
        created_at: '2024-01-01T12:00:00Z',
        project: {
          id: 1,
          project_key: 'test-project',
          name: 'Test Project',
        },
      },
      analysis: {
        id: 1,
        error_event_id: Number(params.id),
        analysis_text: 'This error occurs when...',
        model: 'gpt-4o-mini',
        confidence: 'high',
        has_source_code: true,
        created_at: '2024-01-01T12:01:00Z',
      },
    });
  }),

  http.post(`${API_BASE_URL}/api/v1/auth/sync-user`, () => {
    return HttpResponse.json({
      id: 1,
      github_id: '12345',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
      api_token: 'test-token-123',
      created_at: '2024-01-01T00:00:00Z',
    });
  }),

  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: null,
    });
  }),
];

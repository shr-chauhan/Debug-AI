import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiClientError } from '@/lib/api';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('getProjects', () => {
    it('fetches projects successfully', async () => {
      const mockProjects = {
        projects: [{ id: 1, project_key: 'test', name: 'Test' }],
        total: 1,
      };

      server.use(
        http.get('http://localhost:8000/api/v1/projects', () => {
          return HttpResponse.json(mockProjects);
        })
      );

      localStorage.setItem('stackwise_api_token', 'test-token');

      const result = await api.getProjects();

      expect(result).toEqual(mockProjects);
    });

    it('handles 401 errors and clears token', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/projects', () => {
          return HttpResponse.json({ detail: 'Invalid token' }, { status: 401 });
        })
      );

      localStorage.setItem('stackwise_api_token', 'invalid-token');

      await expect(api.getProjects()).rejects.toThrow(ApiClientError);

      expect(localStorage.getItem('stackwise_api_token')).toBeNull();
    });
  });

  describe('syncUser', () => {
    it('stores token after successful sync', async () => {
      const mockUser = {
        id: 1,
        github_id: '123',
        username: 'testuser',
        api_token: 'new-token',
        created_at: '2024-01-01T00:00:00Z',
      };

      server.use(
        http.post('http://localhost:8000/api/v1/auth/sync-user', () => {
          return HttpResponse.json(mockUser);
        })
      );

      const result = await api.syncUser({
        github_id: '123',
        username: 'testuser',
      });

      expect(result).toEqual(mockUser);
      expect(localStorage.getItem('stackwise_api_token')).toBe('new-token');
    });
  });
});

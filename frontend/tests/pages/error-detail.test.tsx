import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ErrorDetailPage from '@/app/projects/[projectId]/errors/[errorId]/page';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({
    projectId: '1',
    errorId: '1',
  }),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

describe('ErrorDetailPage', () => {
  beforeEach(() => {
    localStorage.setItem('stackwise_api_token', 'test-token');
    window.dispatchEvent(new CustomEvent('user-synced'));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders loading state initially', () => {
    render(<ErrorDetailPage />);
    expect(screen.getByText(/loading error details/i)).toBeInTheDocument();
  });

  it('displays error information after loading', async () => {
    render(<ErrorDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('/api/test')).toBeInTheDocument();
  });

  it('displays AI analysis when available', async () => {
    render(<ErrorDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Analysis')).toBeInTheDocument();
    });

    expect(screen.getByText(/This error occurs when/i)).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
  });

  it('shows pending state when analysis is not available', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/events/1/with-analysis', () => {
        return HttpResponse.json({
          event: {
            id: 1,
            timestamp: '2024-01-01T12:00:00Z',
            status_code: 500,
            payload: {
              message: 'Error',
              method: 'GET',
              path: '/test',
            },
            created_at: '2024-01-01T12:00:00Z',
            project: {
              id: 1,
              project_key: 'test',
              name: 'Test',
            },
          },
          analysis: null,
        });
      })
    );

    render(<ErrorDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/AI analysis is being generated/i)).toBeInTheDocument();
    });
  });

  it('displays stack trace when available', async () => {
    render(<ErrorDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
    });

    expect(screen.getByText(/Error: Test/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ClientHeader } from '@/components/ClientHeader';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('ClientHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('renders Stackwise brand', () => {
    render(<ClientHeader />);
    expect(screen.getByText('Stackwise')).toBeInTheDocument();
  });

  it('shows user info when session exists', async () => {
    server.use(
      http.get('/api/auth/session', () => {
        return HttpResponse.json({
          user: {
            username: 'testuser',
            name: 'Test User',
            image: 'https://example.com/avatar.png',
          },
        });
      })
    );

    render(<ClientHeader />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });

  it('does not show user info when no session', async () => {
    server.use(
      http.get('/api/auth/session', () => {
        return HttpResponse.json({ user: null });
      })
    );

    render(<ClientHeader />);

    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    server.use(
      http.get('/api/auth/session', () => {
        return HttpResponse.error();
      })
    );

    render(<ClientHeader />);

    await waitFor(() => {
      expect(screen.getByText('Stackwise')).toBeInTheDocument();
    });
  });
});

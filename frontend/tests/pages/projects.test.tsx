import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProjectsPage from '@/app/projects/page';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('ProjectsPage', () => {
  beforeEach(() => {
    localStorage.setItem('stackwise_api_token', 'test-token');
    window.dispatchEvent(new CustomEvent('user-synced'));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders loading state initially', () => {
    render(<ProjectsPage />);
    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it('displays projects after loading', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    expect(screen.getByText('test-project')).toBeInTheDocument();
  });

  it('shows empty state when no projects', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/projects', () => {
        return HttpResponse.json({ projects: [], total: 0 });
      })
    );

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    });
  });

  it('displays error message on API failure', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/projects', () => {
        return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
      })
    );

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading projects/i)).not.toBeInTheDocument();
    });
  });

  it('shows create project button', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });
  });
});

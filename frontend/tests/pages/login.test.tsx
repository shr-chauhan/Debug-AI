import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('LoginPage', () => {
  it('renders login form', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText('Stackwise')).toBeInTheDocument();
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument();
  });

  it('displays platform description', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText('AI-powered error debugging platform')).toBeInTheDocument();
  });

  it('has sign in button', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    const button = screen.getByRole('button', { name: /sign in with github/i });
    expect(button).toBeInTheDocument();
  });
});

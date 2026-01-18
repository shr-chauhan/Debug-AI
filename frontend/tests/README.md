# Frontend Tests

## Overview

Tests for the Next.js frontend focus on:

1. **Component Tests** (`components/`): UI components like Badge, Header
2. **Page Tests** (`pages/`): Key pages like login, projects list, error detail
3. **API Client Tests** (`lib/`): API client behavior and error handling

## Testing Philosophy

- **User-centric**: Test what users see and interact with, not implementation details
- **Mock external dependencies**: API calls, NextAuth, localStorage
- **Fast and deterministic**: No real network calls, no flaky tests
- **Maintainable**: Clear test names, minimal mocking complexity

## Tools

- **Vitest**: Fast test runner with excellent TypeScript support (consistent with SDK)
- **React Testing Library**: Focuses on testing components from user perspective
- **MSW (Mock Service Worker)**: Clean API mocking without manual fetch mocks
- **@testing-library/jest-dom**: Better assertions for DOM elements

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (for development)
npm run test:watch

# UI mode (visual test runner)
npm run test:ui
```

## Test Structure

```
tests/
├── setup.ts              # Global test setup (MSW, cleanup)
├── utils.tsx              # Test utilities
├── mocks/
│   ├── handlers.ts       # MSW request handlers
│   ├── server.ts         # MSW server (Node.js)
│   └── browser.ts        # MSW worker (browser)
├── components/           # Component tests
├── pages/                # Page component tests
└── lib/                  # API client tests
```

## What's Tested

- Component rendering and variants
- Page loading states and error handling
- API client error handling and token management
- User interactions (where applicable)
- Empty states and error states

## What's Not Tested (by design)

- NextAuth internals (mocked)
- Real API calls (mocked with MSW)
- Complex async flows (tested at component level)
- E2E flows (would require Playwright/Cypress - out of scope)

/**
 * API client for backend integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Token storage key
const API_TOKEN_KEY = 'stackwise_api_token';

export interface ApiError {
  detail: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Get API token from localStorage (client-side) or return null (server-side)
 */
export function getApiToken(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }
  return localStorage.getItem(API_TOKEN_KEY);
}

/**
 * Set API token in localStorage
 */
export function setApiToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_TOKEN_KEY, token);
  }
}

/**
 * Remove API token from localStorage
 */
export function clearApiToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(API_TOKEN_KEY);
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token if required
  const token = requireAuth ? getApiToken() : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Create AbortController for timeout (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorDetail: string;
      try {
        const errorData = await response.json() as ApiError;
        errorDetail = errorData.detail || response.statusText;
      } catch {
        errorDetail = response.statusText;
      }
      
      // If we get a 401 or 403, the token is invalid or missing - clear it and trigger re-sync
      if ((response.status === 401 || response.status === 403) && requireAuth) {
        // Only trigger re-sync if we had a token (it was invalid, not just missing)
        if (token) {
          clearApiToken();
          // Dispatch event to trigger user re-sync only when token was invalid
          window.dispatchEvent(new CustomEvent('token-invalid'));
        }
        // If no token, don't trigger sync - UserSync will handle it on mount if needed
      }
      
      // Only log non-auth errors
      const isAuthError = (response.status === 401 || response.status === 403) && requireAuth;
      if (!isAuthError) {
        console.error(`API request failed: ${response.status} ${response.statusText}`, {
          url,
          status: response.status,
          detail: errorDetail
        });
      }
      
      throw new ApiClientError(
        `API request failed: ${errorDetail}`,
        response.status,
        errorDetail
      );
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    
    return {} as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout/abort errors
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new ApiClientError(
        'Request timeout: Backend server did not respond in time. Please ensure the backend is running.',
        408,
        'Request timeout'
      );
    }
    
    // Re-throw other errors (including ApiClientError)
    throw error;
  }
}

// Project types
export interface Project {
  id: number;
  project_key: string;
  name: string;
  language?: string | null;
  framework?: string | null;
  description?: string | null;
  repo_config: {
    provider?: string;
    owner?: string;
    repo?: string;
    branch?: string;
  } | null;
  created_at: string;
  error_count?: number;
}

export interface ProjectCreate {
  name: string;
  project_key: string;
  language?: string;
  framework?: string;
  description?: string;
  repo_provider?: string;
  repo_owner?: string;
  repo_name?: string;
  branch?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

// Error event types
export interface ErrorEvent {
  id: number;
  timestamp: string;
  status_code: number | null;
  message: string;
  method: string;
  path: string;
  project_key: string;
  project_name: string;
  created_at: string;
  has_analysis: boolean;
}

export interface ErrorEventListResponse {
  events: ErrorEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorEventDetail {
  id: number;
  timestamp: string;
  status_code: number | null;
  payload: {
    message: string;
    stack?: string;
    method: string;
    path: string;
  };
  created_at: string;
  project: {
    id: number;
    project_key: string;
    name: string;
  };
}

export interface ErrorAnalysis {
  id: number;
  error_event_id: number;
  analysis_text: string;
  model: string;
  confidence: string | null;
  has_source_code: boolean;
  created_at: string;
}

export interface ErrorEventWithAnalysis {
  event: ErrorEventDetail;
  analysis: ErrorAnalysis | null;
}

// User types
export interface User {
  id: number;
  github_id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  api_token: string;
  created_at: string;
}

export interface UserSyncRequest {
  github_id: string;
  username: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string | null;
}

// API functions
export const api = {
  // Authentication
  async syncUser(userData: UserSyncRequest): Promise<User> {
    const user = await apiRequest<User>('/api/v1/auth/sync-user', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, false); // Don't require auth for user sync
    
    // Store API token
    if (user.api_token) {
      setApiToken(user.api_token);
    } else {
      console.error('syncUser: No token in user response');
    }
    
    return user;
  },

  // Projects
  async getProjects(): Promise<ProjectListResponse> {
    return apiRequest<ProjectListResponse>('/api/v1/projects');
  },

  async getProject(projectId: number): Promise<Project> {
    return apiRequest<Project>(`/api/v1/projects/${projectId}`);
  },

  async createProject(data: ProjectCreate): Promise<Project> {
    return apiRequest<Project>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Error events
  async getErrorEvents(params?: {
    project_key?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorEventListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.project_key) searchParams.set('project_key', params.project_key);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return apiRequest<ErrorEventListResponse>(
      `/api/v1/events${query ? `?${query}` : ''}`
    );
  },

  async getErrorEvent(eventId: number): Promise<ErrorEventDetail> {
    return apiRequest<ErrorEventDetail>(`/api/v1/events/${eventId}`);
  },

  async getErrorEventWithAnalysis(eventId: number): Promise<ErrorEventWithAnalysis> {
    return apiRequest<ErrorEventWithAnalysis>(`/api/v1/events/${eventId}/with-analysis`);
  },
};


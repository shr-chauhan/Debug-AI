/**
 * API client for backend integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errorData = await response.json() as ApiError;
      errorDetail = errorData.detail || response.statusText;
    } catch {
      errorDetail = response.statusText;
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
}

// Project types
export interface Project {
  id: number;
  project_key: string;
  name: string;
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
  created_at: string;
}

export interface ErrorEventWithAnalysis {
  event: ErrorEventDetail;
  analysis: ErrorAnalysis | null;
}

// API functions
export const api = {
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


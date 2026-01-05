"use client";

import { ClientHeader } from "@/components/ClientHeader";
import { api, Project } from "@/lib/api";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { UserSync } from "@/components/UserSync";
import { useEffect, useState } from "react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.getProjects();
        
        if (response && response.projects) {
          setProjects(response.projects);
          setError(null);
        } else {
          setError('Invalid response from server');
          setProjects([]);
        }
      } catch (e) {
        // Only log as error if it's not a 401/403 (expected during initial load)
        const isAuthError = e instanceof Error && (
          e.message.includes('401') || 
          e.message.includes('403') ||
          e.message.includes('Unauthorized') ||
          e.message.includes('Forbidden')
        );
        
        if (!isAuthError) {
          console.error('Error fetching projects:', e);
          setError(e instanceof Error ? e.message : "Failed to load projects");
        }
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    // Wait for token to be available before making first API call
    const waitForTokenAndFetch = async () => {
      const { getApiToken } = await import('@/lib/api');
      
      // Check if token already exists
      const existingToken = getApiToken();
      if (existingToken) {
        // Small delay to ensure UserSync has a chance to validate the token
        setTimeout(() => fetchProjects(), 100);
        return;
      }
      
      // Wait for user-synced event (with timeout)
      let timeoutId: NodeJS.Timeout;
      let checkIntervalId: NodeJS.Timeout;
      
      const handleUserSynced = () => {
        clearTimeout(timeoutId);
        clearInterval(checkIntervalId);
        
        // Verify token exists before fetching
        const token = getApiToken();
        if (token) {
          fetchProjects();
        } else {
          // Token might not have been stored, wait a bit more
          setTimeout(() => {
            const retryToken = getApiToken();
            if (retryToken) {
              fetchProjects();
            }
          }, 500);
        }
      };
      
      timeoutId = setTimeout(() => {
        clearInterval(checkIntervalId);
        const token = getApiToken();
        if (token) {
          fetchProjects();
        } else {
          // Will fail and trigger token-invalid event
          fetchProjects();
        }
      }, 5000); // 5 second timeout
      
      window.addEventListener('user-synced', handleUserSynced, { once: true });
      
      // Also check periodically if token becomes available
      checkIntervalId = setInterval(() => {
        const token = getApiToken();
        if (token) {
          clearTimeout(timeoutId);
          clearInterval(checkIntervalId);
          window.removeEventListener('user-synced', handleUserSynced);
          fetchProjects();
        }
      }, 200);
      
      // Cleanup interval after timeout
      setTimeout(() => {
        clearInterval(checkIntervalId);
      }, 5000);
    };

    // Start the wait-and-fetch process
    waitForTokenAndFetch();

    // Listen for user-synced event to retry after token refresh (for subsequent syncs)
    const handleUserSyncedRetry = () => {
      fetchProjects();
    };

    window.addEventListener('user-synced', handleUserSyncedRetry);

    return () => {
      window.removeEventListener('user-synced', handleUserSyncedRetry);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <UserSync />
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-gray-600">
              Manage your projects and view error analytics
            </p>
          </div>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create New Project
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Loading projects...</p>
          </div>
        )}

        {!loading && error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && (
          projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No projects yet</p>
              <Link
                href="/projects/new"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Create your first project →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {project.name}
                    </h2>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Key:</span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {project.project_key}
                      </code>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Errors:</span>
                      <Badge variant={project.error_count && project.error_count > 0 ? "error" : "default"}>
                        {project.error_count || 0}
                      </Badge>
                    </div>
                    
                    {project.repo_config && (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Repo:</span>{" "}
                        {project.repo_config.owner}/{project.repo_config.repo}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}


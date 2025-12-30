"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { api, ApiClientError } from "@/lib/api";

function generateProjectKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    project_key: "",
    repo_provider: "github",
    repo_owner: "",
    repo_name: "",
    branch: "main",
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      project_key: generateProjectKey(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const project = await api.createProject({
        name: formData.name,
        project_key: formData.project_key,
        repo_provider: formData.repo_provider,
        repo_owner: formData.repo_owner || undefined,
        repo_name: formData.repo_name || undefined,
        branch: formData.branch || undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(e.detail || e.message);
      } else {
        setError("Failed to create project");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="mt-2 text-gray-600">
            Set up a new project for error tracking and AI debugging
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Project Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={handleNameChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label htmlFor="project_key" className="block text-sm font-medium text-gray-700">
              Project Key *
            </label>
            <input
              type="text"
              id="project_key"
              required
              value={formData.project_key}
              onChange={(e) => setFormData({ ...formData, project_key: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border font-mono"
              placeholder="my-awesome-project"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used in SDK configuration. Must be unique and URL-safe.
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Repository Configuration (Optional)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure repository access for AI-powered debugging. If provided, the system will fetch source code context when analyzing errors. 
                  <span className="font-medium text-gray-900"> You can skip this section entirely.</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  If you skip repository setup, AI analysis will still work using only the stack trace information.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="repo_provider" className="block text-sm font-medium text-gray-700">
                  Provider <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  id="repo_provider"
                  value={formData.repo_provider}
                  onChange={(e) => setFormData({ ...formData, repo_provider: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                </select>
              </div>

              <div>
                <label htmlFor="repo_owner" className="block text-sm font-medium text-gray-700">
                  Repository Owner <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="repo_owner"
                  value={formData.repo_owner}
                  onChange={(e) => setFormData({ ...formData, repo_owner: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="username"
                />
              </div>

              <div>
                <label htmlFor="repo_name" className="block text-sm font-medium text-gray-700">
                  Repository Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="repo_name"
                  value={formData.repo_name}
                  onChange={(e) => setFormData({ ...formData, repo_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="my-repo"
                />
              </div>

              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                  Branch <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="main"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Leave all repository fields empty to skip repository setup. 
                AI analysis will still work using stack trace information only.
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}



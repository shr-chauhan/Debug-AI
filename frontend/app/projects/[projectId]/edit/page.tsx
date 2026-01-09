"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ClientHeader } from "@/components/ClientHeader";
import { api, ApiClientError, Project } from "@/lib/api";
import { UserSync } from "@/components/UserSync";

// Language and framework mappings
const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
];

const FRAMEWORKS_BY_LANGUAGE: Record<string, Array<{ value: string; label: string }>> = {
  python: [
    { value: "django", label: "Django" },
    { value: "flask", label: "Flask" },
    { value: "fastapi", label: "FastAPI" },
    { value: "tornado", label: "Tornado" },
    { value: "bottle", label: "Bottle" },
    { value: "pyramid", label: "Pyramid" },
  ],
  javascript: [
    { value: "express", label: "Express.js" },
    { value: "nextjs", label: "Next.js" },
    { value: "react", label: "React" },
    { value: "vue", label: "Vue.js" },
    { value: "angular", label: "Angular" },
    { value: "nestjs", label: "NestJS" },
    { value: "koa", label: "Koa" },
    { value: "hapi", label: "Hapi" },
  ],
  typescript: [
    { value: "nextjs", label: "Next.js" },
    { value: "nestjs", label: "NestJS" },
    { value: "express", label: "Express.js" },
    { value: "react", label: "React" },
    { value: "vue", label: "Vue.js" },
    { value: "angular", label: "Angular" },
  ],
  java: [
    { value: "spring", label: "Spring" },
    { value: "spring-boot", label: "Spring Boot" },
    { value: "play", label: "Play Framework" },
    { value: "vertx", label: "Vert.x" },
    { value: "struts", label: "Struts" },
  ],
  go: [
    { value: "gin", label: "Gin" },
    { value: "echo", label: "Echo" },
    { value: "fiber", label: "Fiber" },
    { value: "gorilla", label: "Gorilla" },
    { value: "beego", label: "Beego" },
  ],
  rust: [
    { value: "actix", label: "Actix" },
    { value: "rocket", label: "Rocket" },
    { value: "axum", label: "Axum" },
    { value: "warp", label: "Warp" },
  ],
  php: [
    { value: "laravel", label: "Laravel" },
    { value: "symfony", label: "Symfony" },
    { value: "codeigniter", label: "CodeIgniter" },
    { value: "yii", label: "Yii" },
    { value: "cakephp", label: "CakePHP" },
  ],
  ruby: [
    { value: "rails", label: "Ruby on Rails" },
    { value: "sinatra", label: "Sinatra" },
    { value: "hanami", label: "Hanami" },
  ],
  csharp: [
    { value: "aspnet", label: "ASP.NET" },
    { value: "aspnet-core", label: "ASP.NET Core" },
    { value: "blazor", label: "Blazor" },
  ],
  cpp: [
    { value: "cpprest", label: "C++ REST SDK" },
    { value: "crow", label: "Crow" },
  ],
  swift: [
    { value: "vapor", label: "Vapor" },
    { value: "perfect", label: "Perfect" },
  ],
  kotlin: [
    { value: "ktor", label: "Ktor" },
    { value: "spring", label: "Spring" },
  ],
};

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const projectIdNum = parseInt(projectId, 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    language: "",
    framework: "",
    description: "",
    repo_provider: "",
    repo_owner: "",
    repo_name: "",
    branch: "",
  });

  const availableFrameworks = formData.language 
    ? FRAMEWORKS_BY_LANGUAGE[formData.language] || []
    : [];

  // Load project data
  useEffect(() => {
    if (isNaN(projectIdNum)) {
      setError("Invalid project ID");
      setLoading(false);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let isCancelled = false;

    const fetchProject = async () => {
      try {
        // Wait a bit for token to be available
        await new Promise<void>((resolve) => {
          if (abortController.signal.aborted) {
            resolve();
            return;
          }
          
          const token = localStorage.getItem('stackwise_api_token');
          if (token) {
            resolve();
            return;
          }
          // Wait for sync event or timeout
          const timeout = setTimeout(() => {
            if (!abortController.signal.aborted) {
              resolve();
            }
          }, 2000);
          const handler = () => {
            clearTimeout(timeout);
            window.removeEventListener('user-synced', handler);
            if (!abortController.signal.aborted) {
              resolve();
            }
          };
          window.addEventListener('user-synced', handler, { once: true });
        });

        if (isCancelled || abortController.signal.aborted) {
          setLoading(false);
          return;
        }

        const projectData = await api.getProject(projectIdNum);
        
        if (isCancelled || abortController.signal.aborted) {
          setLoading(false);
          return;
        }

        setProject(projectData);

        // Pre-fill form with existing data
        setFormData({
          name: projectData.name || "",
          language: projectData.language || "",
          framework: projectData.framework || "",
          description: projectData.description || "",
          repo_provider: projectData.repo_config?.provider || "",
          repo_owner: projectData.repo_config?.owner || "",
          repo_name: projectData.repo_config?.repo || "",
          branch: projectData.repo_config?.branch || "",
        });
        
        // Set loading to false only after all data is set
        if (!isCancelled && !abortController.signal.aborted) {
          setLoading(false);
        }
      } catch (e) {
        if (isCancelled || abortController.signal.aborted) {
          setLoading(false);
          return;
        }
        console.error('Failed to fetch project:', e);
        setError(e instanceof Error ? e.message : "Failed to load project");
        setLoading(false);
      }
    };

    fetchProject();

    return () => {
      isCancelled = true;
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [projectIdNum]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const language = e.target.value;
    setFormData({
      ...formData,
      language,
      framework: "", // Reset framework when language changes
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updatedProject = await api.updateProject(projectIdNum, {
        name: formData.name || undefined,
        language: formData.language || undefined,
        framework: formData.framework || undefined,
        description: formData.description || undefined,
        repo_provider: formData.repo_owner && formData.repo_name ? (formData.repo_provider || "github") : undefined,
        repo_owner: formData.repo_owner || undefined,
        repo_name: formData.repo_name || undefined,
        branch: formData.repo_owner && formData.repo_name ? (formData.branch || "main") : undefined,
      });

      router.push(`/projects/${updatedProject.id}`);
    } catch (e) {
      if (e instanceof ApiClientError) {
        setError(e.detail || e.message);
      } else {
        setError("Failed to update project");
      }
    } finally {
      setSaving(false);
    }
  };

  // Skeleton loader component with shimmer effect
  const SkeletonLoader = () => {
    const SkeletonBox = ({ className = "" }: { className?: string }) => (
      <div className={`skeleton-shimmer rounded ${className}`}></div>
    );

    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Project Name Skeleton */}
        <div>
          <SkeletonBox className="h-4 w-24 mb-2" />
          <SkeletonBox className="h-10 w-full" />
        </div>

        {/* Project Context Section Skeleton */}
        <div className="border-t pt-6">
          <div className="mb-4">
            <SkeletonBox className="h-5 w-48 mb-2" />
            <SkeletonBox className="h-4 w-96" />
          </div>

          <div className="space-y-4">
            {/* Language Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-40 mb-2" />
              <SkeletonBox className="h-10 w-full" />
            </div>

            {/* Framework Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-32 mb-2" />
              <SkeletonBox className="h-10 w-full" />
            </div>

            {/* Description Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-36 mb-2" />
              <SkeletonBox className="h-20 w-full" />
            </div>
          </div>
        </div>

        {/* Repository Configuration Section Skeleton */}
        <div className="border-t pt-6">
          <div className="mb-4">
            <SkeletonBox className="h-5 w-64 mb-2" />
            <SkeletonBox className="h-4 w-full max-w-md mb-1" />
            <SkeletonBox className="h-3 w-80" />
          </div>

          <div className="space-y-4">
            {/* Provider Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-24 mb-2" />
              <SkeletonBox className="h-10 w-full" />
            </div>

            {/* Owner Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-32 mb-2" />
              <SkeletonBox className="h-10 w-full" />
            </div>

            {/* Repo Name Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-36 mb-2" />
              <SkeletonBox className="h-10 w-full" />
            </div>

            {/* Branch Skeleton */}
            <div>
              <SkeletonBox className="h-4 w-20 mb-2" />
              <SkeletonBox className="h-10 w-full" />
            </div>
          </div>

          {/* Note Skeleton */}
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <SkeletonBox className="h-3 w-full" />
          </div>
        </div>

        {/* Buttons Skeleton */}
        <div className="flex gap-4 pt-4">
          <SkeletonBox className="h-10 w-32" />
          <SkeletonBox className="h-10 w-24" />
        </div>
      </div>
    );
  };

  // Show skeleton loader while loading or when project data is not yet available
  if (loading || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserSync />
        <ClientHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-4 bg-gray-200 rounded w-16 mb-4 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <SkeletonLoader />
        </main>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserSync />
        <ClientHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-indigo-600 hover:text-indigo-700 text-sm mb-4 inline-block"
            >
              ← Back
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserSync />
      <ClientHeader />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-700 text-sm mb-4 inline-block"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Project</h1>
          <p className="mt-2 text-gray-600">
            Update project details and repository configuration
          </p>
          {project && (
            <p className="mt-1 text-sm text-gray-500">
              Project Key: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{project.project_key}</code>
            </p>
          )}
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              placeholder="My Awesome Project"
            />
          </div>

          <div className="border-t pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Project Context (Optional)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Help improve AI analysis by providing information about your project's language, framework, and purpose.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  Programming Language <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={handleLanguageChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">Select language...</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.language && availableFrameworks.length > 0 && (
                <div>
                  <label htmlFor="framework" className="block text-sm font-medium text-gray-700">
                    Framework <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    id="framework"
                    value={formData.framework}
                    onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="">Select framework...</option>
                    {availableFrameworks.map((fw) => (
                      <option key={fw.value} value={fw.value}>
                        {fw.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Project Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of your project, tech stack, or context..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This helps the AI understand your project better when analyzing errors.
                </p>
              </div>
            </div>
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
                  <option value="">Select provider...</option>
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
                  placeholder="main (default)"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Leave all repository fields empty to remove repository configuration. 
                AI analysis will still work using stack trace information only.
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
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

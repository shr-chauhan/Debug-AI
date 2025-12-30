import { Header } from "@/components/Header";
import { api, ErrorEvent } from "@/lib/api";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { notFound } from "next/navigation";
import { SdkSetup } from "@/components/SdkSetup";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    notFound();
  }

  let project;
  let errors: ErrorEvent[] = [];
  let error: string | null = null;

  try {
    project = await api.getProject(projectIdNum);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load project";
  }

  if (!project) {
    notFound();
  }

  try {
    const response = await api.getErrorEvents({
      project_key: project.project_key,
      limit: 50,
      offset: 0,
    });
    errors = response.events;
  } catch (e) {
    errors = [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-[95%] 2xl:max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-8">
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-indigo-600 hover:text-indigo-700 text-sm mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="mt-2 text-gray-600">
                Project Key: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">{project.project_key}</code>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-white rounded-lg shadow flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Errors</h2>
              </div>
              
              {errors.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500 mb-4">No errors yet</p>
                  <p className="text-sm text-gray-400">
                    Errors will appear here once your application starts sending error events.
                  </p>
                </div>
              ) : (
                <div className="overflow-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                          Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Path
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Analysis
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {errors.map((err) => (
                        <tr
                          key={err.id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Link
                              href={`/projects/${projectId}/errors/${err.id}`}
                              className="block"
                            >
                              {new Date(err.timestamp).toLocaleString()}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 min-w-[300px]">
                            <Link
                              href={`/projects/${projectId}/errors/${err.id}`}
                              className="block hover:text-indigo-600"
                            >
                              {err.message}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Link
                              href={`/projects/${projectId}/errors/${err.id}`}
                              className="block"
                            >
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {err.method} {err.path}
                              </code>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/projects/${projectId}/errors/${err.id}`}
                              className="block"
                            >
                              {err.status_code && (
                                <Badge
                                  variant={
                                    err.status_code >= 500
                                      ? "error"
                                      : err.status_code >= 400
                                      ? "warning"
                                      : "default"
                                  }
                                >
                                  {err.status_code}
                                </Badge>
                              )}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/projects/${projectId}/errors/${err.id}`}>
                              <Badge variant={err.has_analysis ? "success" : "warning"}>
                                {err.has_analysis ? "Analyzed" : "Pending"}
                              </Badge>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <SdkSetup projectKey={project.project_key} />
            
            {project.repo_config && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Repository Configuration
                </h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Provider</dt>
                    <dd className="text-gray-900 font-medium">{project.repo_config.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Repository</dt>
                    <dd className="text-gray-900 font-medium">
                      {project.repo_config.owner}/{project.repo_config.repo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Branch</dt>
                    <dd className="text-gray-900 font-medium">{project.repo_config.branch}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


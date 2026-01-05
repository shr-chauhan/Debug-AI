"use client";

import { useState } from "react";

interface SdkSetupProps {
  projectKey: string;
}

export function SdkSetup({ projectKey }: SdkSetupProps) {
  const [activeTab, setActiveTab] = useState<"npm" | "yarn" | "pnpm">("npm");

  const installCommands = {
    npm: `npm install @your-org/stackwise-sdk`,
    yarn: `yarn add @your-org/stackwise-sdk`,
    pnpm: `pnpm add @your-org/stackwise-sdk`,
  };

  const apiUrl = typeof window !== 'undefined' 
    ? (window.location.origin.includes('localhost') ? 'http://localhost:8000' : window.location.origin.replace(':3000', ':8000'))
    : 'http://localhost:8000';

  const expressExample = `const express = require('express');
const { Stackwise } = require('@your-org/stackwise-sdk');

const app = express();
const stackwise = new Stackwise({
  apiUrl: '${apiUrl}',
  projectKey: '${projectKey}',
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Send error to Stackwise
  stackwise.captureError(err, {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
  });
  
  // Continue with your error handling
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000);`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        SDK Setup Instructions
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Install SDK
          </label>
          <div className="flex gap-2 mb-2">
            {(["npm", "yarn", "pnpm"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-sm rounded ${
                  activeTab === tab
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
            <code>{installCommands[activeTab]}</code>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Key
          </label>
          <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
            <code>{projectKey}</code>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Use this key when initializing the SDK
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Express.js Example
          </label>
          <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
            <pre className="whitespace-pre-wrap">{expressExample}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}


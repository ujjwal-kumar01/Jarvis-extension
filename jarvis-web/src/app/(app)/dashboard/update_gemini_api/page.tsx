'use client';

import React from 'react';
import { useUser } from '@/app/context/userContext';

function UpdateAPI() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  const geminiConfig = user.gemini;

  const isUsingOwnKey = geminiConfig?.isProvidedByUser;
  const hasKey = Boolean(geminiConfig?.apiKeyEncrypted);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-wide">
            API Settings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your AI provider configuration
          </p>
        </div>

        {/* Gemini Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Gemini API</h2>

          <div className="space-y-3">
            {/* Key Status */}
            <input
              type="text"
              disabled
              value={
                isUsingOwnKey && hasKey
                  ? 'User-provided API key (encrypted)'
                  : 'Using system-provided API key'
              }
              className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
            />

            <p className="text-xs text-gray-500">
              {isUsingOwnKey
                ? 'Your API key is encrypted and securely stored.'
                : 'You are currently using the default system API key.'}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 transition py-2 rounded-lg text-sm font-medium"
              >
                {isUsingOwnKey ? 'Replace API Key' : 'Add Your Own API Key'}
              </button>

              {isUsingOwnKey && (
                <button
                  className="flex-1 border border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-300 transition py-2 rounded-lg text-sm font-medium"
                >
                  Remove Key
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Status</h2>

          <div className="rounded-lg border border-gray-800 bg-black/40 px-4 py-3 text-sm">
            {isUsingOwnKey ? (
              <span className="text-green-400 font-medium">
                Active — Using your Gemini API key
              </span>
            ) : (
              <span className="text-yellow-400 font-medium">
                Not Active — please enter your Gemini API key
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default UpdateAPI;

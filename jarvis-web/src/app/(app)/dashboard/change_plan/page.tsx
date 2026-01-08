'use client';

import React from 'react';
import { useUser } from '@/app/context/userContext';

function ChangePlan() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  const subscription = user.subscription;

  const currentPlan = subscription?.plan || 'free';
  const status = subscription?.status;

  const isFree = currentPlan === 'free';
  const isPro = currentPlan === 'monthly' || currentPlan === 'yearly';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Change Plan</h1>
          <p className="text-sm text-gray-400 mt-1">
            Upgrade your Jarvis experience
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Free Plan */}
          <div className={`rounded-2xl border p-6 bg-gray-900/80 backdrop-blur-md shadow-lg
            ${isFree ? 'border-blue-500' : 'border-gray-800'}`}
          >
            <h2 className="text-xl font-semibold mb-2">Free</h2>
            <p className="text-gray-400 text-sm mb-4">
              Best for trying out Jarvis
            </p>

            <div className="text-3xl font-bold mb-4">₹0</div>

            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>• 50 Requests per day</li>
              <li>• Your AI keys</li>
              <li>• no memory</li>
            </ul>

            {isFree ? (
              <button
                disabled
                className="w-full py-2 rounded-lg bg-blue-600/30 text-blue-300 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                className="w-full py-2 rounded-lg border border-gray-700 hover:bg-white/5 transition"
              >
                Downgrade
              </button>
            )}
          </div>

          {/* Pro Plan */}
          <div className={`rounded-2xl border p-6 bg-gray-900/80 backdrop-blur-md shadow-lg
            ${isPro ? 'border-green-500' : 'border-gray-800'}`}
          >
            <h2 className="text-xl font-semibold mb-2">Pro</h2>
            <p className="text-gray-400 text-sm mb-4">
              For power users and developers
            </p>

            <div className="text-3xl font-bold mb-4">
              ₹499 <span className="text-sm font-normal text-gray-400">/ month</span>
            </div>

            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>• 1,000+ Requests per day</li>
              <li>• Monthly & Yearly billing</li>
              <li>• Priority AI routing</li>
              <li>• Advanced memory</li>
            </ul>

            {isPro ? (
              <button
                disabled
                className="w-full py-2 rounded-lg bg-green-600/30 text-green-300 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 transition"
              >
                Upgrade to Pro
              </button>
            )}
          </div>

        </div>

        {/* Status Info */}
        {subscription && (
          <div className="text-center text-sm text-gray-400">
            Status: <span className="text-white font-medium">{status}</span>
            {subscription.trialEndsAt && (
              <span>
                {' '}• Trial ends on{' '}
                {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ChangePlan;

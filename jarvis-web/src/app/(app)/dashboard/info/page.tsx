'use client'

import React, { useEffect, useRef , useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import axios from 'axios'
import { useUser } from '@/app/context/userContext';
import Link from 'next/link'

function Info() {
  // const searchParams = useSearchParams()
  // const reason = searchParams.get("reason")
  // const router = useRouter()

  // ensure toast only shows once in React 18 Strict Mode
  // const toastShown = useRef(false)

  // useEffect(() => {
  //   if (reason === "authorized" && !toastShown.current) {
  //     toastShown.current = true

  //     // show the toast
  //     // delay the redirect slightly so toast has time to appear
  //     setTimeout(() => {
  //       toast.success("You are already logged in", {
  //         description: "Redirected to dashboard",
  //       })
  //       router.replace('/dashboard/info')
  //     }, 500) // 500ms is usually enough
  //   }
  // }, [reason, router])


  const { user } = useUser();  
  // console.log(user)

  return (
  <div className="min-h-screen text-white bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 rounded-2xl">

    {/* Page Title */}
    <h1 className="mb-6 text-2xl font-semibold tracking-wider text-gray-600">
      Account Information
    </h1>

    {/* Profile Card */}
    <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">

      {/* Header */}
      <div className="flex items-center gap-6 border-b border-white/10 px-6 py-4">
        <img
          src={user?.avatar}
          alt="Avatar"
          className="h-20 w-20 rounded-full border border-cyan-400/40 object-cover"
        />

        <div>
          <p className="text-lg font-medium text-cyan-200">
            @{user?.username}
          </p>
          <p className="text-sm text-white/60">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid gap-6 px-6 py-4 md:grid-cols-2">

        {/* Email Verification */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">
            Email Status
          </p>
          <p
            className={`mt-2 text-sm font-medium ${
              user?.isEmailVerified
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {user?.isEmailVerified ? "Verified" : "Not Verified"}
          </p>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">
            Subscription
          </p>
          <p className="mt-2 text-sm font-medium text-cyan-200">
            {user?.subscription?.plan?.toUpperCase() || "FREE"}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Status: {user?.subscription?.status || "trial"}
          </p>
        </div>

        {/* Gemini API */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">
            Gemini API Key
          </p>
          <p
            className={`mt-2 text-sm font-medium ${
              user?.gemini?.isProvidedByUser
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {user?.gemini?.isProvidedByUser
              ? "Connected"
              : "Not Configured"}
          </p>
        </div>

        {/* Account Type */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">
            Auth Method
          </p>
          <p className="mt-2 text-sm font-medium text-cyan-200">
            {(user?.googleId=="GoogleAuth")? "Google OAuth" : "Email & Password"}
          </p>
        </div>
      </div>
    </div>
    <div className="mt-8 text-center">
      <p className="mb-4 text-white/70 text-sm md:text-base">
    Check out the Jarvis Chrome Extension to get an A.I. assistant for your browser & enjoy automation.
  </p>
  <Link href="https://github.com/ujjwal-kumar01/Jarvis-extension" target="_blank" rel="noopener noreferrer">
    <button
      className="inline-flex items-center gap-2 px-6 py-3 
                 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 
                 text-white font-semibold text-sm
                 hover:scale-105 hover:opacity-90 transition-transform duration-200 shadow-lg
                 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
    >
      Visit Extension
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  </Link>
</div>

  </div>
);

}

export default Info

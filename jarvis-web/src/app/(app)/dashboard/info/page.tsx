'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function Info() {
  // const searchParams = useSearchParams()
  // const reason = searchParams.get("reason")
  const router = useRouter()

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

  const logout = async () => {
    try {
      const response = await fetch('/backend/user/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        console.log('User logged out successfully')
      } 
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      router.replace('/sign-in')
    }
  }

  return (
    <div className='text-white'>
      <button onClick={logout}>Logout</button>
      <div className='text-white'>info</div>
    </div>
  )
}

export default Info

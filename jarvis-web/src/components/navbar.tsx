'use client'
import React from 'react'
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from 'next/navigation';

function Navbar() {
    const [user, setUser] = useState({});
    const router = useRouter();

    const userInfo = async () => {
        try {
            const response = await axios.get("/backend/user/getProfile", {
                withCredentials: true,
            })

            setUser(response.data.user);
        } catch (error) {
            console.error('Error fetching user info:', error)
        }
    }

    useEffect(() => {
        userInfo()
    }, []);

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
  <div className="flex items-center justify-between px-6 py-2 text-white">

    {/* Logo */}
    <img src='https://res.cloudinary.com/dowcqyxsi/image/upload/v1767794387/012844dd547f6b5b0f79b63ce3f256e427f4dac2_vsoo3w.png' className='h-15 ml-5' alt='jarvis'/>
    {/* Profile Section */}
    <div className="flex items-center gap-4">

      {/* Profile Button */}
      <div
        onClick={() => router.replace('/dashboard/info')}
        className="flex cursor-pointer items-center gap-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1 shadow-lg hover:bg-white/10 transition"
      >
        <img
          src={user?.avatar || "/default-avatar.png"}
          alt="Profile Picture"
          className="h-8 w-8 rounded-full object-cover "
        />

        <span className="text-lg font-medium tracking-wide text-zinc-400">
          @{user?.username}
        </span>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="rounded-full border border-red-400/30 px-4 py-1 text-sm font-semibold uppercase tracking-wider text-red-400 hover:bg-red-400/10 hover:text-red-300 transition"
      >
        Logout
      </button>
    </div>
  </div>
);


}

export default Navbar
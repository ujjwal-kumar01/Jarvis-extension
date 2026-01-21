'use client'

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import axios from "axios";
import { UserProvider } from "@/app/context/userContext";
import { Toaster, toast } from "sonner";

const sidebarOptions = [
  { name: "Info", href: "/dashboard/info" },
  { name: "Update Details", href: "/dashboard/update_info" },
  { name: "Update Gemini API", href: "/dashboard/update_gemini_api" },
  { name: "Verify Account", href: "/dashboard/verify" },
  { name: "Change Plan", href: "/dashboard/change_plan" },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [initialUser, setInitialUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch user data on client-side
  useEffect(() => {
    axios.get('/backend/user/getProfile', { withCredentials: true })
      .then(res => setInitialUser(res.data.user))
      .catch(err => {
        console.error("Error fetching user:", err);
        toast.error("Failed to fetch user data");
        setInitialUser({});
      });
  }, []);

  if (!initialUser) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

  return (
    <UserProvider initialUser={initialUser}>
      <Toaster />
      <div className="h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col overflow-hidden">

        {/* Navbar */}
        <Navbar sidebarOpen={sidebarOpen} sidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden relative pt-14"> {/* pt-14 for fixed navbar */}

          {/* Sidebar */}
          <aside className={`
            fixed top-14 left-0 h-full z-20
            w-64 bg-black/80 backdrop-blur-md border-r border-white/10
            transform transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0 md:static md:flex md:flex-col
          `}>
            <div className="flex flex-col p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Dashboard</h2>
              <nav className="flex flex-col space-y-2">
                {sidebarOptions.map(option => (
                  <Link
                    key={option.name}
                    href={option.href}
                    className="relative group rounded-xl px-4 py-3 text-sm text-zinc-300 transition-all
                               hover:text-white hover:bg-white/5"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full 
                                     bg-gradient-to-b from-purple-500 to-blue-500 opacity-0
                                     group-hover:opacity-100 transition-opacity" />
                    {option.name}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 p-4 overflow-auto relative">
            <div className="rounded-2xl bg-black/40 border border-white/10 p-6 min-h-full">
              {children}
            </div>
          </main>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-10 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </UserProvider>
  );
}

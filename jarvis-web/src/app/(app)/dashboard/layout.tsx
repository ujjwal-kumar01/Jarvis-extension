// layout.tsx
import Link from "next/link";
import { ReactNode } from "react";
import { headers } from "next/headers";
import { cn } from "@/lib/utils"; // optional, if you use cn()
import { Toaster } from "sonner";
import Navbar from "@/components/navbar";
import axios from "axios";
import { UserProvider } from "@/app/context/userContext";

const sidebarOptions = [
  { name: "Info", href: "/dashboard/info" },
  { name: "Update", href: "/dashboard/update_info" },
  { name: "Update Gemini API", href: "/dashboard/update_gemini_api" },
  { name: "Verify Account", href: "/dashboard/verify" },
  { name: "Change Plan", href: "/dashboard/change_plan" },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {

  let initialUser = {};
  
  try {
    const headersList = await headers();
    const response = await axios.get(`${process.env.BASE_URL}/user/getProfile`, {
      withCredentials: true,
      headers: {
        cookie: headersList.get('cookie') || '', // If needed for SSR cookies
      },
    });
    initialUser = response.data.user;
  } catch (err) {
    console.error('Error fetching user in layout:', err);
    initialUser = {}; // fallback
  }

  return (
    <UserProvider initialUser={initialUser}> 
    <div className="h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-black overflow-hidden">
      {/* OUTER CONTAINER */}
      <div className="h-full w-full max-w-7xl mx-auto px-4">
      <Navbar />
        <div className="h-full grid grid-cols-[260px_1fr] rounded-2xl border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl overflow-hidden">

          {/* SIDEBAR */}
          <aside className="flex flex-col p-6 border-r border-white/10 bg-gradient-to-b from-black/60 to-black/30">
            {/* BRAND */}

            {/* NAV */}
            <nav className="flex flex-col space-y-2">
              {sidebarOptions.map((option) => (
                <Link
                  key={option.name}
                  href={option.href}
                  className="relative group rounded-xl px-4 py-3 text-sm text-zinc-300 transition-all
                             hover:text-white hover:bg-white/5"
                >
                  {/* GLOW STRIP */}
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full 
                                   bg-gradient-to-b from-purple-500 to-blue-500 opacity-0
                                   group-hover:opacity-100 transition-opacity" />

                  {option.name}
                </Link>
              ))}
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main className="p-4 overflow-auto ">
            <div className="h-full rounded-2xl bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5
                            border border-white/10 p-6">
              {children }
              <Toaster
                richColors
                closeButton
              />
            </div>
          </main>
        </div>
      </div>
    </div>
    </UserProvider>
  );
}

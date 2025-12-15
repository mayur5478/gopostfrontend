"use client";

import Image from "next/image";
import { Sidebar } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Define a type for the user object for better type safety
interface User {
  first_name: string;
  last_name: string;
  email: string;
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userInitials, setUserInitials] = useState<string>("");

  useEffect(() => {
    // Retrieve user data from localStorage when the component mounts
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        // Generate initials from the user's first and last name
        if (parsedUser.first_name && parsedUser.last_name) {
          const initials = `${parsedUser.first_name.charAt(0)}${parsedUser.last_name.charAt(0)}`.toUpperCase();
          setUserInitials(initials);
        }
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
        // Clear broken data and redirect to login
        localStorage.clear();
        router.push("/login");
      }
    } else {
        // If no user data, redirect to login
        router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    // Clear all relevant items from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    // Redirect to the login page
    router.push("/login");
  };

  return (
    <div className="h-screen bg-white grid grid-cols-[auto_1fr] overflow-hidden">
      <div className="h-screen overflow-y-auto">
        <Sidebar />
      </div>

      <div className="flex flex-col h-screen overflow-hidden">
        <div className="w-full h-[56px] bg-[#F3F3F3] flex items-center justify-end px-5 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-2">
              <div className="w-[20px] h-[20px]">
                <Image
                  src="/progress.svg"
                  alt="Progress Icon"
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 leading-5">75</span>
                <span className="text-sm font-normal text-gray-900 leading-5"> / 300 credit used</span>
              </div>
            </div>

            <div className="w-[32px] h-[32px] bg-white border border-black/10 rounded-lg flex items-center justify-center">
              <div className="w-[20px] h-[22px]">
                <Image
                  src="/Notification.svg"
                  alt="Notification"
                  width={20}
                  height={22}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Dynamic User Avatar and Logout Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-[#FDE7E3] text-gray-900 font-semibold text-base">
                      {userInitials || '...'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {user && (
                  <>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{`${user.first_name} ${user.last_name}`}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        <div className="flex-1 bg-white overflow-y-auto relative">
          {children}
        </div>
      </div>
    </div>
  );
}
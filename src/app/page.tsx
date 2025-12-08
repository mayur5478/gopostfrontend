"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated by checking localStorage
    const accessToken = localStorage.getItem("access_token");
    
    if (accessToken) {
      // User is authenticated, redirect to dashboard
      router.push("/agents/create");
    } else {
      // User is not authenticated, redirect to login
      router.push("/login");
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-xl font-semibold text-gray-900">GoPost</div>
        <div className="text-sm text-gray-600 mt-2">Redirecting...</div>
      </div>
    </div>
  );
}
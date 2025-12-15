"use client";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react"; 
import axios from "axios";
import URLS from "@/lib/urls";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>();
  const [passwordFocus, setPasswordFocus] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false); // NEW: State for password visibility
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const password = watch("password", "");

  useEffect(() => {
    // Check if user is already authenticated
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      router.push("/agents/create");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) return <p className="text-center">Loading...</p>;

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await axios.post(URLS.AUTH.LOGIN, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.data) {
        throw new Error(
          "Login failed. Please check your credentials and try again."
        );
      }

      const result = response.data;
      localStorage.setItem("access_token", result.access);
      localStorage.setItem("refresh_token", result.refresh);

      localStorage.setItem("user", JSON.stringify(result.user));

      router.push("/agents/create");
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
      console.error("Login error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMinLength: boolean = password.length >= 8;
  const hasNumber: boolean = /\d/.test(password);
  const hasSpecialChar: boolean = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-[400px] rounded-2xl bg-white p-8 shadow-md text-black">
        <h1 className="text-center text-2xl font-bold mb-6">
          Go<span className="text-black">Post</span>
        </h1>
        <h2 className="text-center text-xl font-semibold mb-6">Welcome back</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Invalid email address",
                },
              })}
              placeholder="youremail@example.com"
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            {/* NEW: Added relative wrapper div */}
            <div className="relative">
              <input
                // MODIFIED: Dynamic type
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                  pattern: {
                    value: /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/,
                    message:
                      "Password must include at least one number and one special character",
                  },
                })}
                placeholder="********"
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
                // MODIFIED: Added pr-10 for icon spacing
                className={`w-full rounded-lg border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                  !isMinLength || !hasNumber || !hasSpecialChar
                    ? "focus:ring-red-500"
                    : "focus:ring-green-400"
                }`}
              />
              {/* NEW: Show/hide button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {passwordFocus && (
              <div className="mt-2 space-y-1 text-sm">
                <p className={isMinLength ? "text-green-600" : "text-red-500"}>
                  • Minimum 8 characters
                </p>
                <p className={hasNumber ? "text-green-600" : "text-red-500"}>
                  • At least one number
                </p>
                <p
                  className={
                    hasSpecialChar ? "text-green-600" : "text-red-500"
                  }
                >
                  • At least one special character
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            variant="default"
            className="w-full py-2 font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
        <p className="text-center text-sm mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
"use client";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react"; 
import URLS from "@/lib/urls";
import toast, { Toaster } from "react-hot-toast"; 

interface SignupFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  password2: string;
}

export default function SignupPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();
  const [passwordFocus, setPasswordFocus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const password = watch("password", "");
  const password2 = watch("password2", "");

  // Check if user is already logged in
  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      router.push("/agents/create");
    }
  }, [router]);

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const filteredData = {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      };

      const response = await axios.post(URLS.AUTH.SIGNUP, filteredData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 201) {
        throw new Error(
          "Signup failed. Please check your details and try again."
        );
      }


      // 1. Show a success message
      toast.success("Signup successful! Please log in to continue.");

      // 2. Redirect to the login page after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000); // 2-second delay

      // --- END OF CHANGES ---
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "An error occurred during signup."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setError("Google sign-in is not yet implemented.");
  };

  const handleFacebookSignIn = async () => {
    setError(null);
    setError("Facebook sign-in is not yet implemented.");
  };

  const isMinLength: boolean = password.length >= 8;
  const hasNumber: boolean = /\d/.test(password);
  const hasSpecialChar: boolean = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch: boolean = password === password2;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Toaster position="top-center" /> {/* Add Toaster component here */}
      <div className="w-[400px] rounded-2xl bg-white p-8 shadow-md text-black">
        <h1 className="text-center text-2xl font-bold mb-6">
          Go<span className="text-black">Post</span>
        </h1>
        <h2 className="text-center text-xl font-semibold mb-6">Sign up</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full mb-3 flex items-center justify-center py-2 text-sm font-medium"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Sign up with Google
        </Button>
        <Button
          onClick={handleFacebookSignIn}
          variant="outline"
          className="w-full mb-6 flex items-center justify-center py-2 text-sm font-medium"
        >
          <img
            src="https://www.svgrepo.com/show/448224/facebook.svg"
            alt="Facebook"
            className="w-5 h-5 mr-2"
          />
          Sign up with Facebook
        </Button>
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
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              {...register("first_name", {
                required: "First name is required",
              })}
              placeholder="First name"
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              {...register("last_name", {
                required: "Last name is required",
              })}
              placeholder="Last name"
              className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm">{errors.last_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            {/* --- ADDED: relative container --- */}
            <div className="relative">
              <input
                // --- CHANGED: type is now dynamic ---
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
                // --- CHANGED: Added pr-10 for padding ---
                className={`w-full rounded-lg border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                  !isMinLength || !hasNumber || !hasSpecialChar
                    ? "focus:ring-red-500"
                    : "focus:ring-green-400"
                }`}
              />
              {/* --- ADDED: Toggle Button --- */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
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
                  className={hasSpecialChar ? "text-green-600" : "text-red-500"}
                >
                  • At least one special character
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            {/* --- ADDED: relative container --- */}
            <div className="relative">
              <input
                // --- CHANGED: type is now dynamic ---
                type={showPassword2 ? "text" : "password"}
                {...register("password2", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
                placeholder="********"
                // --- CHANGED: Added pr-10 for padding ---
                className={`w-full rounded-lg border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                  passwordsMatch ? "focus:ring-green-400" : "focus:ring-red-500"
                }`}
              />
              {/* --- ADDED: Toggle Button --- */}
              <button
                type="button"
                onClick={() => setShowPassword2(!showPassword2)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showPassword2 ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password2 && (
              <p className="text-red-500 text-sm">{errors.password2.message}</p>
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
                Creating account...
              </>
            ) : (
              "Sign up"
            )}
          </Button>
        </form>
        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <a href="/login" className="font-medium">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
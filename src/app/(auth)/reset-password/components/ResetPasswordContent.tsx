"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import LoadingButton from "@/components/LoadingButton";
import { PasswordInput } from "@/components/PasswordInput";
import { resetPasswordSchema, ResetPasswordValues } from "@/lib/validation";
import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");
  const type = searchParams.get("type");
  const supabase = createClient();
  const [isCodeExchanged, setIsCodeExchanged] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log("User is authenticated, allowing password reset");
          setIsCodeExchanged(true);
          setIsLoading(false);
          return;
        }
        
        // If no user but we have URL parameters, try to exchange the code
        if (code && access_token && refresh_token) {
          console.log("Attempting to exchange code for session");
          
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (error) {
            console.error("Error setting session:", error);
            setError("Invalid or expired reset link. Please request a new one.");
            setIsLoading(false);
            return;
          }
          
          if (data.user) {
            console.log("Session established successfully");
            setIsCodeExchanged(true);
            setIsLoading(false);
            return;
          }
        }
        
        // If we get here, no valid authentication was found
        setError("Invalid or expired reset link. Please request a new one.");
        setIsLoading(false);
        
      } catch (error) {
        console.error("Error checking authentication:", error);
        setError("An error occurred while verifying your reset link.");
        setIsLoading(false);
      }
    };
    
    checkAuthentication();
  }, [code, access_token, refresh_token, supabase.auth]);

  const onSubmit = (values: ResetPasswordValues) => {
    setError(null);
    startTransition(async () => {
      try {
        // First check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("You need to be authenticated to reset your password. Please request a new reset link.");
          return;
        }
        
        const { error } = await supabase.auth.updateUser({ 
          password: values.password 
        });
        
        if (error) {
          console.error("Password update error:", error);
          setError("Failed to update password. Please try again.");
        } else {
          // Password updated successfully
          setIsSuccess(true);
          // Start countdown and redirect
          const countdownInterval = setInterval(() => {
            setRedirectCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                router.push("/login?message=Password updated successfully");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (error) {
        console.error("Error resetting password:", error);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  if (isSuccess) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/ForgetPasswordBg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-brand">
              Password Reset Successfully
            </h1>
            <p className="text-brand-light text-sm mb-6">
              Your password has been updated successfully. You can now log in with your new password.
            </p>
            <div className="space-y-4">
              <p className="text-brand text-sm">
                Redirecting to login page in {redirectCountdown} seconds...
              </p>
              <p className="text-brand-light text-xs">
                If app doesn't redirect you automatically click this link
              </p>
              <Link 
                href="/login?message=Password updated successfully" 
                className="block w-full bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors text-center"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/ForgetPasswordBg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-brand">
              Error
            </h1>
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <Link 
                href="/forgot-password" 
                className="block w-full bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors text-center"
              >
                Request New Reset Link
              </Link>
              <Link 
                href="/login" 
                className="block w-full text-brand hover:underline text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !isCodeExchanged) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/ForgetPasswordBg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-brand mx-auto mb-6 animate-spin" />
            <h1 className="text-3xl font-bold mb-4 text-brand">
              Verifying
            </h1>
            <p className="text-brand-light">Verifying your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center"
      style={{
        backgroundImage: "url('/images/ForgetPasswordBg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
        {/* Link Icon */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/link.png"
            alt="Link Icon"
            width={60}
            height={60}
            className="object-contain"
          />
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 text-brand">
            Reset Password
          </h1>
          <p className="text-brand-light text-sm">
            Enter your new password below.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-brand font-medium">New Password</FormLabel>
                  <FormControl>
                    <PasswordInput 
                      placeholder="Enter new password" 
                      {...field} 
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-brand font-medium">Confirm New Password</FormLabel>
                  <FormControl>
                    <PasswordInput 
                      placeholder="Confirm new password" 
                      {...field} 
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton loading={isPending} type="submit" className="w-full">
              Reset Password
            </LoadingButton>
          </form>
        </Form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link 
            href="/login" 
            className="text-brand hover:underline text-sm"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
} 
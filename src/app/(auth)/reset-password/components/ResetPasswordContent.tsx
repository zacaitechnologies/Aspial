"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import LoadingButton from "@/components/LoadingButton";
import { PasswordInput } from "@/components/PasswordInput";
import Image from "next/image";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

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

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    console.log("URL parameters:", {
      code,
      access_token,
      refresh_token,
      type
    });
    
    // Test environment variables
    console.log("Environment variables:", {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET"
    });
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", { event, session });
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("User signed in, allowing password reset");
        setIsCodeExchanged(true);
      }
    });
    
    // For password reset, Supabase should automatically authenticate the user
    // when they click the reset link. We just need to check if they're authenticated.
    const checkAuthentication = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("Session check:", { session, sessionError });
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log("User check:", { user, userError });
        
        if (user && !isCodeExchanged) {
          console.log("User is authenticated, allowing password reset");
          setIsCodeExchanged(true);
        } else if (!user && !isCodeExchanged) {
          console.log("No authenticated user found");
          // If there's a code parameter, allow the user to proceed anyway
          // as the password reset might work even without automatic authentication
          if (code) {
            console.log("Code parameter found, allowing password reset to proceed");
            setIsCodeExchanged(true);
          } else {
            setError("Invalid or expired reset link. Please request a new one.");
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setError("An error occurred while verifying your reset link.");
      }
    };
    
    checkAuthentication();
    
    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, [code, access_token, refresh_token, type, isCodeExchanged, supabase.auth]);

  const onSubmit = (values: ResetPasswordValues) => {
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
          router.push("/login?message=Password updated successfully");
        }
      } catch (error) {
        console.error("Error resetting password:", error);
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

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
            <h1 className="text-3xl font-bold mb-4 text-brand">
              Error
            </h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => router.push("/forgot-password")}
              className="text-brand hover:underline"
            >
              Request new reset link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isCodeExchanged) {
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
      <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
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
                    <PasswordInput placeholder="Enter new password" {...field} />
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
                    <PasswordInput placeholder="Confirm new password" {...field} />
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
      </div>
    </div>
  );
} 
"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import LoadingButton from "@/components/LoadingButton";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/validation";
import { forgotPassword } from "@/lib/auth-actions";
import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setError(null);
    startTransition(async () => {
      try {
        await forgotPassword(values.email);
        setIsSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
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
              Check Your Email
            </h1>
            <p className="text-brand-light text-sm mb-6">
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
            </p>
            <div className="space-y-4">
              <Link 
                href="/login" 
                className="block w-full bg-brand text-white py-2 px-4 rounded-md hover:bg-brand/90 transition-colors text-center"
              >
                Back to Login
              </Link>
              <button 
                onClick={() => {
                  setIsSuccess(false);
                  form.reset();
                }}
                className="block w-full text-brand hover:underline"
              >
                Send Another Email
              </button>
            </div>
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
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/Lock.png"
            alt="Lock Icon"
            width={60}
            height={60}
            className="object-contain"
          />
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 text-brand">
            Forgot Password
          </h1>
          <p className="text-brand-light text-sm">
            Enter your email to receive a reset link.
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-brand font-medium">Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      {...field} 
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton loading={isPending} type="submit" className="w-full">
              Send Reset Link
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

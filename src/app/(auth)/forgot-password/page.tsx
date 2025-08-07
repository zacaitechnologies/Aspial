"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransition } from "react";
import LoadingButton from "@/components/LoadingButton";
import { forgotPassword } from "@/lib/auth-actions";
import Image from "next/image";

const forgotSchema = z.object({
  email: z.string().email(),
});

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: z.infer<typeof forgotSchema>) => {
    startTransition(() => forgotPassword(values.email));
  };

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
                    <Input type="email" placeholder="Enter your email" {...field} />
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
      </div>
    </div>
  );
}

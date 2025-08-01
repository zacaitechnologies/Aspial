"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransition } from "react";
import LoadingButton from "@/components/LoadingButton";
import { forgotPassword } from "@/lib/auth-actions";

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
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <LoadingButton loading={isPending} type="submit">Send Reset Link</LoadingButton>
        </form>
      </Form>
    </div>
  );
}

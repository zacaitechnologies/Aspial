"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth-actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { loginSchema, LoginValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordInput } from "@/components/PasswordInput";
import { useTransition } from "react";
import LoadingButton from "@/components/LoadingButton";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues>({
    //make sure input is valid
    resolver: zodResolver(loginSchema),
    // make sure the default value is not undefined, since undefined doesnt trigger the schema.
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    startTransition(async () => {
      const result = await login(values);
      if (result && !result.success) {
        toast({
          title: "Login failed",
          description: "Wrong credentials. Please check your email and password.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Username"
                      className="w-full px-4 py-3 bg-background/95 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PasswordInput
                      placeholder="Password"
                      className="w-full px-4 py-3 bg-background/95 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />

            <div className="flex justify-center">
              <LoadingButton 
                loading={isPending} 
                type="submit"
                className="px-10 py-6 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 uppercase"
              >
                LOGIN
              </LoadingButton>
            </div>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

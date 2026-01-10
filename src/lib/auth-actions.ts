"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient } from "@/utils/supabase/server";
import { loginSchema, LoginValues, signUpSchema, SignUpValues } from "./validation";
import { prisma } from "@/lib/prisma";

export async function login(formData: LoginValues) {
  const supabase = await createClient();
  const { email, password} = loginSchema.parse(formData);

  const data = {
    email: email,
    password: password,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    // Check if error is due to email not confirmed
    const errorMessage = error.message?.toLowerCase() || "";
    if (errorMessage.includes("email not confirmed") || 
        errorMessage.includes("email not verified") ||
        errorMessage.includes("email address not confirmed") ||
        errorMessage.includes("email address not verified") ||
        errorMessage.includes("confirm your email") ||
        errorMessage.includes("verify your email") ||
        (error.status === 400 && errorMessage.includes("confirm"))) {
      // Redirect to email confirmation page with email as query param
      redirect(`/email-confirmation?email=${encodeURIComponent(email)}`);
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/projects", "layout");
  redirect("/projects");
}

export async function signup(formData: SignUpValues) {
  try {
    const { email, password, firstName, lastName } = signUpSchema.parse(formData);
    const supabase = await createClient();

    // Create user in Supabase Auth - wait for response
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/projects`
      }
    });

    if (error) {
      console.error("Supabase signup error:", error);
      
      // Handle duplicate email error from Supabase
      if (error.message?.includes("already registered") || 
          error.message?.includes("User already registered") ||
          error.message?.includes("email address is already") ||
          error.message?.includes("already exists") ||
          error.message?.toLowerCase().includes("duplicate")) {
        return {
          success: false,
          error: "This email is already registered. Please use a different email or sign in instead."
        };
      }
      
      // Generic error for other cases
      return {
        success: false,
        error: "Something went wrong. Please try again later."
      };
    }

    if (!data.user) {
      console.error("No user returned from Supabase");
      return {
        success: false,
        error: "Failed to create user account. Please try again."
      };
    }

    const supabaseId = data.user.id;

    // Check if this Supabase user already exists in our database
    // (Supabase doesn't error on duplicate emails, so we need to check)
    const existingUser = await prisma.user.findUnique({
      where: { supabase_id: supabaseId }
    });

    // If user already exists, they're already registered
    if (existingUser) {
      return {
        success: false,
        error: "This email is already registered. Please sign in instead."
      };
    }

    // Check if email is already used by a different account
    const emailExists = await prisma.user.findFirst({
      where: { email }
    });

    if (emailExists) {
      return {
        success: false,
        error: "This email is already registered. Please use a different email or sign in instead."
      };
    }

    // Ensure admin role exists
    const adminRole = await prisma.role.upsert({
      where: { slug: 'admin' },
      update: {},
      create: { slug: 'admin' }
    });

    // Create user in Prisma database with admin role
    const user = await prisma.user.create({
      data: {
        supabase_id: supabaseId,
        firstName,
        lastName,
        email,
        userRoles: {
          create: {
            roleId: adminRole.id
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    // If user was updated (not created), ensure they have admin role
    if (user.userRoles.length === 0 || !user.userRoles.some(ur => ur.role.slug === 'admin')) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: adminRole.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          roleId: adminRole.id
        }
      });
    }

    console.log("User created successfully:", { email, userId: user.id });

    revalidatePath("/", "layout");
    redirect("/projects");
  } catch (error: any) {
    // Handle redirect errors - don't catch them, let them propagate
    if (isRedirectError(error)) {
      throw error;
    }
    
    console.error("Signup error:", error);
    
    // Return error instead of redirecting
    return {
      success: false,
      error: error?.message || "An error occurred during signup. Please try again."
    };
  }
}

export async function forgotPassword(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    console.error(error.message);
    throw new Error(error.message);
  }

  // Don't redirect here, let the component handle the success state
}

export async function resetPassword(newPassword: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    console.error(error.message);
    redirect("/error");
  }

  redirect("/login");
}

export async function sendPasswordReset(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function resendConfirmationEmail(email: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/projects`
      }
    });

    if (error) {
      console.error("Error resending confirmation email:", error);
      return {
        success: false,
        error: error.message || "Failed to resend confirmation email. Please try again."
      };
    }

    return {
      success: true,
      message: "Confirmation email sent successfully"
    };
  } catch (error: any) {
    // Handle redirect errors
    if (isRedirectError(error)) {
      throw error;
    }
    
    console.error("Error in resendConfirmationEmail:", error);
    return {
      success: false,
      error: error?.message || "Something went wrong. Please try again later."
    };
  }
}


export async function signout() {
  const supabase = await createClient();
  
  // Get current user ID before signing out to clear their cache
  const { data: { user } } = await supabase.auth.getUser();
  
  // CRITICAL: Clear ALL caches for security
  if (user?.id) {
    const { clearAdminCache, clearAllAdminCache } = await import("@/lib/admin-cache");
    // Clear this user's cache
    await clearAdminCache(user.id);
    // Clear all admin cache to prevent any leakage
    await clearAllAdminCache();
  } else {
    // Even if no user, clear all admin cache as a safety measure
    const { clearAllAdminCache } = await import("@/lib/admin-cache");
    await clearAllAdminCache();
  }
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.log(error);
    redirect("/error");
  }

  // Revalidate ALL paths to ensure fresh data on next login
  revalidatePath("/", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/quotations", "layout");
  revalidatePath("/invoices", "layout");
  revalidatePath("/receipts", "layout");
  revalidatePath("/clients", "layout");
  revalidatePath("/services", "layout");
  revalidatePath("/appointment-bookings", "layout");
  revalidatePath("/time-tracking", "layout");
  revalidatePath("/user-management", "layout");
  revalidatePath("/settings", "layout");
  
  redirect("/logout");
}
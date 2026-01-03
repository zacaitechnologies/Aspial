"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/projects`
      }
    });

    if (error) {
      console.error("Supabase signup error:", error);
      throw new Error(error.message || "Failed to create user account");
    }

    if (!data.user) {
      console.error("No user returned from Supabase");
      throw new Error("Failed to create user account");
    }

    const supabaseId = data.user.id;

    // Ensure admin role exists
    const adminRole = await prisma.role.upsert({
      where: { slug: 'admin' },
      update: {},
      create: { slug: 'admin' }
    });

    // Create user in Prisma database with admin role
    const user = await prisma.user.upsert({
      where: { supabase_id: supabaseId },
      update: { 
        firstName, 
        lastName, 
        email,
      },
      create: {
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
    console.error("Signup error:", error);
    // Redirect to error page with error message
    const errorMessage = error?.message || "An error occurred during signup";
    redirect(`/error?message=${encodeURIComponent(errorMessage)}`);
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
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { loginSchema, LoginValues, signUpSchema, SignUpValues } from "./validation";
import prisma from "@/lib/prisma";

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
  const { email, password, firstName, lastName } = signUpSchema.parse(formData);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    redirect("/error");
  }

  const supabaseId = data.user.id;
  try {
    await prisma.user.upsert({
      where: { supabase_id: supabaseId },
      update: { firstName, lastName, email },
      create: {
        supabase_id: supabaseId,
        firstName,
        lastName,
        email,
      },
    });
  } catch (e) {
    console.log("Error: " + e)
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect("/");
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
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.log(error);
    redirect("/error");
  }

  redirect("/logout");
}
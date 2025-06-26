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
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect("/");
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

export async function signout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.log(error);
    redirect("/error");
  }

  redirect("/logout");
}
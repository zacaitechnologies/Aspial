"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const supabase = createClient();

  useEffect(() => {
    if (code) {
      // exchange the code for a session
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (!error) {
            router.replace("/reset-password");
          } else {
            router.replace("/error");
          }
        });
    }
  }, [code]);

  return <p>Loading...</p>; // or a spinner
}
"use client";

import { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

interface SessionContext {
  enhancedUser: EnhancedUser;
}

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  supabase_id: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedUser extends User {
  profile?: UserProfile;
}

const SessionContext = createContext<SessionContext | null>(null);

export default function SessionProvider({
  children,
  value,
}: React.PropsWithChildren<{ value: SessionContext }>) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}

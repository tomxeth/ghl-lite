"use client";

import { createContext, useContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

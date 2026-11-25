"use client";
import { useApi } from "./useApi";

interface Me { id: string; email: string | null; roles: string[] }

/** UI hint only: the server enforces every permission regardless of what the screen shows. */
export function useMe() {
  const { data } = useApi<Me>("/auth/me");
  return { me: data, isOwner: !!data?.roles.includes("OWNER") };
}

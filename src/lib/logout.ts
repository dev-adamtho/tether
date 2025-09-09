import { authClient } from "./authClient";
import type { QueryClient } from "@tanstack/react-query";

export async function logout(queryClient: QueryClient, router: any) {
  try {
    // Sign out from better-auth
    await authClient.signOut();

    // Clear all TanStack Query caches
    queryClient.clear();

    // Reset query client to ensure complete cleanup
    queryClient.resetQueries();

    // Remove any cached data
    queryClient.removeQueries();

    // Clear local storage items that might contain cached data
    if (typeof window !== "undefined") {
      // Clear any potential cached session data
      localStorage.removeItem("session");
      localStorage.removeItem("user");

      // Clear any other auth-related items
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("auth_") ||
          key.startsWith("session_") ||
          key.startsWith("user_")
        ) {
          localStorage.removeItem(key);
        }
      });

      // Clear session storage as well
      sessionStorage.clear();
    }

    // Force a page reload to ensure complete cleanup
    if (typeof window !== "undefined") {
      // Use window.location.href for immediate redirect
      window.location.href = "/login";
    } else {
      // Fallback for server-side
      router.push("/login");
    }
  } catch (error) {
    console.error("Logout failed:", error);

    // Even if logout fails, clear everything and redirect
    queryClient.clear();
    queryClient.resetQueries();
    queryClient.removeQueries();

    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } else {
      router.push("/login");
    }
  }
}

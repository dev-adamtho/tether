import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "./authClient";
import { logout } from "./logout";

export function useSessionMonitor() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Poll session every 5 seconds when user is active
  const { data: session } = useQuery({
    queryKey: ["session-monitor"],
    queryFn: async () => {
      try {
        const result = await authClient.getSession();
        return result.data;
      } catch (error) {
        console.error("Session monitor error:", error);
        // Return null to trigger logout
        return null;
      }
    },
    refetchInterval: 5000, // Check every 5 seconds for faster detection
    refetchIntervalInBackground: false,
    staleTime: 2000, // Consider data stale after 2 seconds
    retry: 1, // Only retry once on failure
  });

  useEffect(() => {
    if (session === null) {
      // Session is explicitly null (not just loading), user should be logged out
      console.log("Session is null, logging out user");
      logout(queryClient, router);
      return;
    }

    if (session) {
      const currentPath = window.location.pathname;
      const userStatus = session.user.status;
      const userRole = session.user.role;

      // Check if user should still have access to current page
      const shouldRedirect = checkAccessViolation(
        currentPath,
        userStatus || "UNAUTHORIZED",
        userRole || "user",
      );

      if (shouldRedirect) {
        console.log("Session access violation detected, logging out user");
        logout(queryClient, router);
      }
    }
  }, [session, router, queryClient]);

  return session;
}

function checkAccessViolation(
  pathname: string,
  status: string,
  role: string,
): boolean {
  // Admin routes - require approved admin
  if (pathname.startsWith("/admin")) {
    return !(status === "APPROVED" && role === "admin");
  }

  // Dashboard - require approved admin or staff
  if (pathname === "/dashboard") {
    return !(status === "APPROVED" && (role === "admin" || role === "staff"));
  }

  // Client page - require approved client
  if (pathname === "/client") {
    return !(status === "APPROVED" && role === "client");
  }

  // Pending page - require pending status
  if (pathname === "/pending") {
    return status !== "PENDING";
  }

  // Request approval page - require unauthorized status
  if (pathname === "/request-approval") {
    return status !== "UNAUTHORIZED";
  }

  // Access denied page - require denied status
  if (pathname === "/access-denied") {
    return status !== "DENIED";
  }

  return false;
}

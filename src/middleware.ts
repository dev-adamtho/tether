import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";

export const config = {
  runtime: "nodejs",
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup"];

  // Routes that require authentication but have different access rules
  const authRoutes = ["/dashboard", "/client", "/request-approval", "/pending"];

  // Admin-only routes
  const adminRoutes = ["/admin"];

  try {
    const session = await auth.api.getSession(request);

    // If user is not authenticated
    if (!session) {
      // Allow access to public routes
      if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
      }
      // Redirect to login for protected routes
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const user = session.user;
    const userStatus = user.status || "UNAUTHORIZED";
    const userRole = user.role || "user";

    // If user is on a public route but is authenticated, redirect based on status
    if (publicRoutes.includes(pathname)) {
      return redirectBasedOnStatus(userStatus, userRole, request.url);
    }

    // Handle protected routes based on user status and role
    if (authRoutes.includes(pathname)) {
      return handleProtectedRoute(pathname, userStatus, userRole, request.url);
    }

    // Handle admin-only routes
    if (pathname.startsWith("/admin")) {
      if (userStatus === "APPROVED" && userRole === "admin") {
        return NextResponse.next();
      }
      // Non-admin users get redirected based on their status/role
      return redirectBasedOnStatus(userStatus, userRole, request.url);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // On error, redirect to login if not on public route
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }
}

function redirectBasedOnStatus(
  status: string,
  role: string,
  requestUrl: string,
) {
  switch (status) {
    case "UNAUTHORIZED":
      return NextResponse.redirect(new URL("/request-approval", requestUrl));
    case "PENDING":
      return NextResponse.redirect(new URL("/pending", requestUrl));
    case "APPROVED":
      if (role === "admin") {
        return NextResponse.redirect(new URL("/dashboard", requestUrl));
      } else if (role === "client") {
        return NextResponse.redirect(new URL("/client", requestUrl));
      }
      // Other approved users (staff) go to dashboard
      return NextResponse.redirect(new URL("/dashboard", requestUrl));
    case "DENIED":
      return NextResponse.redirect(new URL("/access-denied", requestUrl));
    default:
      return NextResponse.redirect(new URL("/request-approval", requestUrl));
  }
}

function handleProtectedRoute(
  pathname: string,
  status: string,
  role: string,
  requestUrl: string,
) {
  // Dashboard access - only for approved admin users
  if (pathname === "/dashboard") {
    if (status === "APPROVED" && (role === "admin" || role === "staff")) {
      return NextResponse.next();
    }
    // Redirect based on current status/role
    return redirectBasedOnStatus(status, role, requestUrl);
  }

  // Client page access - only for approved client users
  if (pathname === "/client") {
    if (status === "APPROVED" && role === "client") {
      return NextResponse.next();
    }
    // Redirect based on current status/role
    return redirectBasedOnStatus(status, role, requestUrl);
  }

  // Request approval page - only for unauthorized users
  if (pathname === "/request-approval") {
    if (status === "UNAUTHORIZED") {
      return NextResponse.next();
    }
    return redirectBasedOnStatus(status, role, requestUrl);
  }

  // Pending page - only for pending users
  if (pathname === "/pending") {
    if (status === "PENDING") {
      return NextResponse.next();
    }
    return redirectBasedOnStatus(status, role, requestUrl);
  }

  // Default: redirect based on status
  return redirectBasedOnStatus(status, role, requestUrl);
}

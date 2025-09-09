"use client";

import { authClient } from "@/lib/authClient";
import { logout } from "@/lib/logout";
import { useSessionMonitor } from "@/lib/useSessionMonitor";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Monitor session for access violations
  useSessionMonitor();

  // Query for session data
  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      if (!result.data) {
        throw new Error("No session found");
      }
      return result.data;
    },
    retry: false,
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await logout(queryClient, router);
    },
  });

  const handleSignOut = () => {
    signOutMutation.mutate();
  };

  // Redirect to login if no session
  if (error || (!isLoading && !session)) {
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const isApproved = user?.status === "APPROVED";

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl">
                <span>Admin Dashboard</span>
                {isAdmin && (
                  <span className="bg-primary text-primary-foreground rounded px-2 py-1 text-sm">
                    Administrator
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h2 className="mb-4 text-lg font-semibold">User Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {user?.name || "Not provided"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium capitalize">
                      {user?.role || "User"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`font-medium ${
                        user?.status === "APPROVED"
                          ? "text-green-600"
                          : user?.status === "PENDING"
                            ? "text-amber-600"
                            : user?.status === "DENIED"
                              ? "text-red-600"
                              : "text-muted-foreground"
                      }`}
                    >
                      {user?.status || "Unknown"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-mono text-sm font-medium">
                      {user?.id}
                    </span>
                  </div>
                </div>
              </div>

              {isAdmin && isApproved && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold">Admin Actions</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 font-medium">User Management</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Manage user accounts, roles, and permissions
                        </p>
                        <Button variant="outline" className="w-full">
                          Manage Users
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 font-medium">Approval Requests</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Review and approve pending access requests
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/admin/approval-requests">
                            Review Requests
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 font-medium">System Settings</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Configure system settings and preferences
                        </p>
                        <Button variant="outline" className="w-full">
                          Settings
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 font-medium">Analytics</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          View system analytics and reports
                        </p>
                        <Button variant="outline" className="w-full">
                          View Analytics
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <div className="pt-6">
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={signOutMutation.isPending}
                >
                  {signOutMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {signOutMutation.isPending ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

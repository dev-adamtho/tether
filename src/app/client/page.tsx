"use client";

import { authClient } from "@/lib/authClient";
import { logout } from "@/lib/logout";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, User, Building, Mail, Shield } from "lucide-react";

export default function ClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const isClient = user?.role === "client";
  const isApproved = user?.status === "APPROVED";

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl">
                <span className="flex items-center gap-2">
                  <Building className="h-6 w-6" />
                  Client Portal
                </span>
                {isClient && (
                  <Badge
                    variant="secondary"
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  >
                    Client Access
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <User className="h-5 w-5" />
                  Profile Information
                </h2>
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
                    <span className="flex items-center gap-2 font-medium capitalize">
                      <Shield className="h-4 w-4" />
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

              {isClient && isApproved && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold">
                    Client Services
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-medium">
                          <Mail className="h-4 w-4" />
                          Support
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Contact our support team for assistance
                        </p>
                        <Button variant="outline" className="w-full">
                          Contact Support
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-medium">
                          <Building className="h-4 w-4" />
                          Resources
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Access client resources and documentation
                        </p>
                        <Button variant="outline" className="w-full">
                          View Resources
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-medium">
                          <User className="h-4 w-4" />
                          Account Settings
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Manage your account preferences
                        </p>
                        <Button variant="outline" className="w-full">
                          Settings
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-medium">
                          <Shield className="h-4 w-4" />
                          Security
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          Review security settings and activity
                        </p>
                        <Button variant="outline" className="w-full">
                          Security
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!isApproved && (
                <div className="bg-muted rounded-lg p-6 text-center">
                  <h3 className="mb-2 text-lg font-semibold">Access Pending</h3>
                  <p className="text-muted-foreground mb-4">
                    Your client access is currently being reviewed. You'll
                    receive full access once approved.
                  </p>
                  <Badge
                    variant="outline"
                    className="border-yellow-200 bg-yellow-50 text-yellow-700"
                  >
                    {user?.status || "Pending"}
                  </Badge>
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

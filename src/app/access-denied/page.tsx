"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";
import { logout } from "@/lib/logout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { XCircle, User, Calendar, Loader2, Mail } from "lucide-react";

export default function AccessDeniedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Query for session data
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data;
    },
  });

  const handleSignOut = async () => {
    await logout(queryClient, router);
  };

  const handleRequestNewAccess = () => {
    // You might want to implement a way for users to request access again
    // or redirect them to contact support
    router.push("/request-approval");
  };

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

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive flex items-center justify-center gap-2 text-center text-2xl">
                <XCircle className="h-6 w-6" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Your access request has been denied. You do not have
                  permission to access the dashboard.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Account Information</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Email:
                    </span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-destructive flex items-center gap-2 font-medium">
                      <XCircle className="h-4 w-4" />
                      {user?.status || "DENIED"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="mb-2 font-semibold">What can you do?</h4>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Contact your administrator to understand the reason for
                    denial
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Provide additional information or clarification if requested
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Submit a new access request with more details
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Reach out to IT support for assistance
                  </li>
                </ul>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleRequestNewAccess}
                  className="flex-1"
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Request Access Again
                </Button>

                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>

              <div className="text-muted-foreground text-center text-sm">
                <p>
                  Need help? Contact your administrator or IT support for more
                  information.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

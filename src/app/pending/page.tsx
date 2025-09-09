"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";
import { logout } from "@/lib/logout";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  User,
  Building,
  Calendar,
  Loader2,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Query for session data
  const {
    data: session,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds to check for status updates
  });

  // Query for approval request details
  const {
    data: approvalRequestData,
    isLoading: requestLoading,
    refetch: refetchRequest,
  } = api.approvalRequest.getMine.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30000,
  });

  const handleSignOut = async () => {
    await logout(queryClient, router);
  };

  const handleRefresh = async () => {
    setIsCheckingStatus(true);

    try {
      // Refetch both session and request data
      const [sessionResult, requestResult] = await Promise.all([
        refetchSession(),
        refetchRequest(),
      ]);

      const updatedSession = sessionResult.data;
      const userStatus = updatedSession?.user?.status;
      const userRole = updatedSession?.user?.role;

      // Check if user is now approved and redirect them
      if (userStatus === "APPROVED") {
        // Small delay to show the loading state
        setTimeout(() => {
          // Redirect based on role
          if (userRole === "admin") {
            router.push("/dashboard");
          } else if (userRole === "client") {
            router.push("/client");
          } else {
            // Staff or other approved users go to dashboard
            router.push("/dashboard");
          }
        }, 1000);
        return;
      }

      // If denied, redirect to access-denied page
      if (userStatus === "DENIED") {
        setTimeout(() => {
          router.push("/access-denied");
        }, 1000);
        return;
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  if (sessionLoading || requestLoading) {
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
  const request = approvalRequestData;
  const userStatus = user?.status || "PENDING";

  const requestDate = request?.requestedAt
    ? new Date(request.requestedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";

  // Get status-specific styling and content
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          icon: CheckCircle,
          iconColor: "text-green-500",
          title: "Access Approved!",
          alertVariant: "default" as const,
          alertColor: "border-green-200 bg-green-50",
          statusBadge: "bg-green-100 text-green-700 border-green-200",
          message:
            "Congratulations! Your access request has been approved. Click 'Check Status' to proceed to your dashboard.",
          nextSteps: [
            "Your access has been approved by an administrator",
            "Click 'Check Status' below to be redirected to your dashboard",
            "You now have full access to the platform features",
            "Welcome to the team!",
          ],
        };
      case "DENIED":
        return {
          icon: XCircle,
          iconColor: "text-red-500",
          title: "Access Request Denied",
          alertVariant: "destructive" as const,
          alertColor: "border-red-200 bg-red-50",
          statusBadge: "bg-red-100 text-red-700 border-red-200",
          message:
            "Unfortunately, your access request has been denied. Please contact your administrator for more information.",
          nextSteps: [
            "Your request has been reviewed and denied",
            "Contact your administrator or IT support for clarification",
            "You may be able to submit a new request with additional information",
            "Review the requirements and try again if appropriate",
          ],
        };
      default: // PENDING
        return {
          icon: Clock,
          iconColor: "text-amber-500",
          title: "Access Request Pending",
          alertVariant: "default" as const,
          alertColor: "border-amber-200 bg-amber-50",
          statusBadge: "bg-amber-100 text-amber-700 border-amber-200",
          message:
            "Your access request has been successfully submitted and is currently under review.",
          nextSteps: [
            "An administrator will review your request within 1-2 business days",
            "You will receive an email notification once your request is processed",
            "You can check this page for real-time status updates",
            "Once approved, you'll automatically gain access to the dashboard",
          ],
        };
    }
  };

  const statusConfig = getStatusConfig(userStatus);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl">
                <statusConfig.icon
                  className={`h-6 w-6 ${statusConfig.iconColor}`}
                />
                {statusConfig.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert
                variant={statusConfig.alertVariant}
                className={statusConfig.alertColor}
              >
                <statusConfig.icon className="h-4 w-4" />
                <AlertDescription>{statusConfig.message}</AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Request Details</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Email:
                    </span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <Separator />

                  {request?.fullName && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Full Name:
                        </span>
                        <span className="font-medium">{request.fullName}</span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {request?.company && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Company:
                        </span>
                        <span className="font-medium">{request.company}</span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {request?.jobTitle && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Job Title:
                        </span>
                        <span className="font-medium">{request.jobTitle}</span>
                      </div>
                      <Separator />
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Request Date:
                    </span>
                    <span className="font-medium">{requestDate}</span>
                  </div>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant="outline"
                      className={statusConfig.statusBadge}
                    >
                      <statusConfig.icon className="mr-1 h-3 w-3" />
                      {userStatus}
                    </Badge>
                  </div>
                </div>

                {request?.accessReason && (
                  <div className="mt-4">
                    <h4 className="mb-2 font-semibold">Access Reason</h4>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      {request.accessReason}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="mb-2 font-semibold">
                  {userStatus === "APPROVED"
                    ? "Next Steps:"
                    : userStatus === "DENIED"
                      ? "What now?"
                      : "What happens next?"}
                </h4>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  {statusConfig.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span
                        className={`mt-1 ${statusConfig.iconColor.replace("text-", "text-")}`}
                      >
                        •
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleRefresh}
                  variant={userStatus === "APPROVED" ? "default" : "outline"}
                  className="flex-1"
                  disabled={isCheckingStatus}
                >
                  {isCheckingStatus ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isCheckingStatus
                    ? "Checking..."
                    : userStatus === "APPROVED"
                      ? "Continue to Dashboard"
                      : "Check Status"}
                </Button>

                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>

              <div className="text-muted-foreground text-center text-sm">
                <p>Need help? Contact your administrator or IT support.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

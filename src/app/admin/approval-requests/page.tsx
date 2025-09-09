"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { useSessionMonitor } from "@/lib/useSessionMonitor";
import { authClient } from "@/lib/authClient";
import { logout } from "@/lib/logout";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Check,
  X,
  RotateCcw,
  Loader2,
  Users,
  Building,
  Mail,
  Calendar,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

type ApprovalRequest = {
  id: string;
  userId: string;
  fullName: string;
  company: string;
  jobTitle: string;
  accessReason: string;
  status: string;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  userEmail: string;
  userRole: string | null;
};

export default function ApprovalRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Monitor session for access violations
  const currentSession = useSessionMonitor();
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "admin" | "staff" | "client" | undefined
  >(undefined);
  const [actionType, setActionType] = useState<"APPROVED" | "DENIED" | null>(
    null,
  );

  // Editable fields for approval
  const [editableFullName, setEditableFullName] = useState("");
  const [editableCompany, setEditableCompany] = useState("");
  const [editableJobTitle, setEditableJobTitle] = useState("");

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  // Fetch all approval requests
  const {
    data: requests,
    isLoading,
    refetch,
  } = api.approvalRequest.getAll.useQuery();

  // Update request status mutation
  const updateStatusMutation = api.approvalRequest.updateStatus.useMutation({
    onSuccess: async () => {
      setShowDialog(false);
      setSelectedRequest(null);
      setReviewNotes("");
      setSelectedRole(undefined);
      setActionType(null);
      await refetch();
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = api.approvalRequest.revokeAccess.useMutation({
    onSuccess: async (_, variables) => {
      // Check if user revoked their own access
      const revokedRequest = requests?.find(
        (r) => r.id === variables.requestId,
      );
      const isSelfRevocation =
        revokedRequest?.userId === currentSession?.user?.id;

      if (isSelfRevocation) {
        // Immediately log out the user if they revoked their own access
        console.log("Self-revocation detected, logging out immediately");
        // Close dialog first to prevent UI errors
        setShowDialog(false);
        setSelectedRequest(null);
        // Use setTimeout to ensure UI updates complete before logout
        setTimeout(() => {
          logout(queryClient, router);
        }, 100);
        return;
      }

      const { data: updatedRequests } = await refetch();
      // Update the selected request with fresh data if dialog is open
      if (selectedRequest && updatedRequests) {
        const updatedRequest = updatedRequests.find(
          (r) => r.id === selectedRequest.id,
        );
        if (updatedRequest) {
          setSelectedRequest(updatedRequest);
        }
      }
    },
    onError: (error) => {
      console.error("Error revoking access:", error);
      // Don't log out on error - let user see the error and try again
    },
  });

  // Revert to pending mutation
  const revertToPendingMutation =
    api.approvalRequest.revertToPending.useMutation({
      onSuccess: async () => {
        const { data: updatedRequests } = await refetch();
        // Update the selected request with fresh data if dialog is open
        if (selectedRequest && updatedRequests) {
          const updatedRequest = updatedRequests.find(
            (r) => r.id === selectedRequest.id,
          );
          if (updatedRequest) {
            setSelectedRequest(updatedRequest);
          }
        }
      },
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="border-yellow-200 bg-yellow-50 text-yellow-700"
          >
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700"
          >
            Approved
          </Badge>
        );
      case "DENIED":
        return (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-red-700"
          >
            Denied
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAction = (
    request: ApprovalRequest,
    action: "APPROVED" | "DENIED",
  ) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowDialog(true);
  };

  const handleRevoke = (request: ApprovalRequest) => {
    const isSelfRevocation = request.userId === currentSession?.user?.id;
    const title = isSelfRevocation
      ? "Revoke Your Own Access?"
      : "Revoke Access?";
    const description = isSelfRevocation
      ? `You are about to revoke your own access. You will be logged out immediately and lose access to this panel.`
      : `Are you sure you want to revoke access for ${request.fullName}? This will reset their status to PENDING and remove their current role.`;

    showConfirmDialog(title, description, () => {
      revokeAccessMutation.mutate({
        requestId: request.id,
        reviewNotes: "Access revoked by administrator",
      });
    });
  };

  const handleRevert = (request: ApprovalRequest) => {
    showConfirmDialog(
      "Revert to Pending?",
      `Are you sure you want to revert ${request.fullName} back to PENDING status? This will allow them to be reconsidered for approval.`,
      () => {
        revertToPendingMutation.mutate({
          requestId: request.id,
          reviewNotes: "Request reverted to pending by administrator",
        });
      },
    );
  };

  const handleSubmitAction = () => {
    if (!selectedRequest || !actionType) return;

    // Validate that a role is selected when approving
    if (actionType === "APPROVED" && !selectedRole) {
      showConfirmDialog(
        "Role Required",
        "Please select a role before approving the request. This role will determine the user's access level in the system.",
        () => {},
      );
      return;
    }

    const actionText = actionType === "APPROVED" ? "approve" : "deny";
    const title = `${actionText === "approve" ? "Approve" : "Deny"} Request?`;

    let description = `Are you sure you want to ${actionText} the access request for ${editableFullName}?`;

    if (actionType === "APPROVED") {
      description += ` They will be assigned the role of ${selectedRole} and gain access to the system.`;

      // Check if any editable fields were changed
      const hasChanges =
        editableFullName !== selectedRequest.fullName ||
        editableCompany !== selectedRequest.company ||
        editableJobTitle !== selectedRequest.jobTitle;

      if (hasChanges) {
        description +=
          " The updated information will be saved to their profile.";
      }
    }

    showConfirmDialog(title, description, () => {
      updateStatusMutation.mutate({
        requestId: selectedRequest.id,
        status: actionType,
        reviewNotes: reviewNotes.trim() || undefined,
        assignedRole: actionType === "APPROVED" ? selectedRole : undefined,
        // TODO: Add API support for updating user info
        updatedInfo:
          actionType === "APPROVED"
            ? {
                fullName: editableFullName,
                company: editableCompany,
                jobTitle: editableJobTitle,
              }
            : undefined,
      });
    });
  };

  const showConfirmDialog = (
    title: string,
    description: string,
    action: () => void,
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      action,
    });
  };

  const handleViewDetails = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setActionType(null);
    setReviewNotes("");
    setSelectedRole(undefined);
    // Initialize editable fields with current values
    setEditableFullName(request.fullName);
    setEditableCompany(request.company);
    setEditableJobTitle(request.jobTitle);
    setShowDialog(true);
  };

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading approval requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Approval Requests
            </h1>
            <p className="text-muted-foreground">
              Manage user access requests to the dashboard
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests?.filter((r) => r.status === "PENDING").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests?.filter((r) => r.status === "APPROVED").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
            <CardDescription>
              Review and manage user access requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!requests || requests.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-lg font-medium">No requests found</p>
                <p className="text-muted-foreground">
                  New requests will appear here when submitted
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.fullName}
                      </TableCell>
                      <TableCell>{request.userEmail}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>{request.jobTitle}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {format(new Date(request.requestedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Details/Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType
                ? `${actionType === "APPROVED" ? "Approve" : "Deny"} Request`
                : selectedRequest?.status === "PENDING"
                  ? "Review Request"
                  : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {actionType
                ? `Complete the form below to ${actionType === "APPROVED" ? "approve access and assign a role" : "deny access"}.`
                : selectedRequest?.status === "PENDING"
                  ? "Review the request details and choose an action."
                  : "View detailed information about this access request."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* User Info - Editable when approving */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4" />
                      Full Name
                    </Label>
                    {actionType === "APPROVED" ? (
                      <div className="relative">
                        <Input
                          value={editableFullName}
                          onChange={(e) => setEditableFullName(e.target.value)}
                          className={`transition-all duration-200 ${
                            editableFullName !== selectedRequest.fullName
                              ? "border-blue-300 ring-2 ring-blue-200"
                              : ""
                          }`}
                          placeholder="Enter full name"
                        />
                        {editableFullName !== selectedRequest.fullName && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
                        {selectedRequest.fullName}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
                      {selectedRequest.userEmail}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Building className="h-4 w-4" />
                      Company
                    </Label>
                    {actionType === "APPROVED" ? (
                      <div className="relative">
                        <Input
                          value={editableCompany}
                          onChange={(e) => setEditableCompany(e.target.value)}
                          className={`transition-all duration-200 ${
                            editableCompany !== selectedRequest.company
                              ? "border-blue-300 ring-2 ring-blue-200"
                              : ""
                          }`}
                          placeholder="Enter company name"
                        />
                        {editableCompany !== selectedRequest.company && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
                        {selectedRequest.company}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Job Title</Label>
                    {actionType === "APPROVED" ? (
                      <div className="relative">
                        <Input
                          value={editableJobTitle}
                          onChange={(e) => setEditableJobTitle(e.target.value)}
                          className={`transition-all duration-200 ${
                            editableJobTitle !== selectedRequest.jobTitle
                              ? "border-blue-300 ring-2 ring-blue-200"
                              : ""
                          }`}
                          placeholder="Enter job title"
                        />
                        {editableJobTitle !== selectedRequest.jobTitle && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
                        {selectedRequest.jobTitle}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Access Reason */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Reason for Access
                </Label>
                <div className="bg-muted/30 rounded-lg border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedRequest.accessReason}
                  </p>
                </div>
              </div>

              {/* Request Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Request Date
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {format(
                      new Date(selectedRequest.requestedAt),
                      "PPP 'at' p",
                    )}
                  </p>
                </div>
              </div>

              {/* Role Selection (if approving) - Smooth slide animation */}
              {actionType === "APPROVED" && (
                <div className="animate-in slide-in-from-top-2 space-y-3 rounded-lg border border-green-200 bg-green-50/50 p-4 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <Label
                      htmlFor="roleSelect"
                      className="text-sm font-medium text-green-800"
                    >
                      Assign Role *
                    </Label>
                  </div>
                  <Select
                    value={selectedRole || ""}
                    onValueChange={(value: "admin" | "staff" | "client") =>
                      setSelectedRole(value)
                    }
                  >
                    <SelectTrigger
                      className={`transition-all duration-200 ${
                        !selectedRole
                          ? "border-red-300 ring-2 ring-red-100"
                          : "border-green-300 ring-2 ring-green-100"
                      }`}
                    >
                      <SelectValue placeholder="Select a role (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          Staff
                        </div>
                      </SelectItem>
                      <SelectItem value="client">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                          Client
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500"></div>
                          Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-green-700">
                    Choose the appropriate role for this user based on their
                    request and requirements.
                  </p>
                </div>
              )}

              {/* Review Notes (if taking action) */}
              {actionType && (
                <div className="animate-in slide-in-from-bottom-2 space-y-3 duration-300">
                  <Label
                    htmlFor="reviewNotes"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Review Notes (Optional)
                  </Label>
                  <Textarea
                    id="reviewNotes"
                    placeholder={`Add notes about why you ${actionType === "APPROVED" ? "approved" : "denied"} this request...`}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="min-h-[100px] transition-all duration-200 focus:ring-2"
                  />
                </div>
              )}

              {/* Error Message */}
              {updateStatusMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {updateStatusMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div className="flex gap-2">
                {!actionType && selectedRequest?.status === "PENDING" && (
                  <>
                    <Button
                      onClick={() => setActionType("APPROVED")}
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setActionType("DENIED")}
                      variant="destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Deny
                    </Button>
                  </>
                )}
                {!actionType && selectedRequest?.status === "APPROVED" && (
                  <Button
                    onClick={() => handleRevoke(selectedRequest)}
                    variant="outline"
                    className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revoke Access
                  </Button>
                )}
                {!actionType && selectedRequest?.status === "DENIED" && (
                  <Button
                    onClick={() => handleRevert(selectedRequest)}
                    variant="outline"
                    className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revert to Pending
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (actionType) {
                      setActionType(null);
                      setReviewNotes("");
                      setSelectedRole(undefined);
                    } else {
                      setShowDialog(false);
                    }
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  {actionType ? "Cancel" : "Close"}
                </Button>
                {actionType && (
                  <Button
                    onClick={handleSubmitAction}
                    disabled={
                      updateStatusMutation.isPending ||
                      (actionType === "APPROVED" && !selectedRole)
                    }
                    variant={
                      actionType === "APPROVED" ? "default" : "destructive"
                    }
                  >
                    {updateStatusMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {actionType === "APPROVED"
                      ? "Approve Request"
                      : "Deny Request"}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

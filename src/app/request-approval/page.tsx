"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/authClient";
import { logout } from "@/lib/logout";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  AlertCircle,
  Loader2,
  Building,
  User,
  Mail,
  MessageSquare,
} from "lucide-react";

const approvalRequestSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
  accessReason: z
    .string()
    .min(10, "Please provide a detailed reason (at least 10 characters)"),
});

type ApprovalRequestForm = z.infer<typeof approvalRequestSchema>;

export default function RequestApprovalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Check current session to get user info
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data;
    },
  });

  const form = useForm<ApprovalRequestForm>({
    resolver: zodResolver(approvalRequestSchema),
    defaultValues: {
      fullName: "",
      company: "",
      jobTitle: "",
      accessReason: "",
    },
  });

  // Submit approval request mutation
  const submitRequestMutation = api.approvalRequest.submit.useMutation({
    onSuccess: () => {
      // Redirect to pending page after successful submission
      router.push("/pending");
    },
  });

  const onSubmit = (values: ApprovalRequestForm) => {
    submitRequestMutation.mutate(values);
  };

  const handleSignOut = async () => {
    await logout(queryClient, router);
  };

  if (sessionLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl">
              <User className="h-6 w-6" />
              Request Access Approval
            </CardTitle>
            <CardDescription className="text-center">
              Your account needs approval to access the dashboard. Please
              provide the following information to request access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {session && (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Signed in as: <strong>{session.user.email}</strong>
                </AlertDescription>
              </Alert>
            )}

            {submitRequestMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {submitRequestMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Company
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your company name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your job title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Reason for Access
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please explain why you need access to this dashboard and how you plan to use it..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a detailed explanation to help expedite your
                        approval process.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitRequestMutation.isPending}
                  >
                    {submitRequestMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {submitRequestMutation.isPending
                      ? "Submitting Request..."
                      : "Submit Request"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

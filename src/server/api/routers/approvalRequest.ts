import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { approvalRequest, user as users } from "@/server/db/schema";

const submitApprovalRequestSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
  accessReason: z
    .string()
    .min(10, "Please provide a detailed reason (at least 10 characters)"),
});

export const approvalRequestRouter = createTRPCRouter({
  // Submit a new approval request
  submit: protectedProcedure
    .input(submitApprovalRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, authSession } = ctx;

      if (!authSession?.user) {
        throw new Error("Authentication required");
      }

      // Check if user already has a pending request
      const existingRequest = await db
        .select()
        .from(approvalRequest)
        .where(
          and(
            eq(approvalRequest.userId, authSession.user.id),
            eq(approvalRequest.status, "PENDING"),
          ),
        )
        .limit(1);

      if (existingRequest.length > 0) {
        throw new Error("You already have a pending approval request");
      }

      // Create approval request
      const newRequest = await db
        .insert(approvalRequest)
        .values({
          id: randomUUID(),
          userId: authSession.user.id,
          fullName: input.fullName,
          company: input.company,
          jobTitle: input.jobTitle,
          accessReason: input.accessReason,
          status: "PENDING",
        })
        .returning();

      // Update user status to PENDING only if currently UNAUTHORIZED
      await db
        .update(users)
        .set({
          status: "PENDING",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.id, authSession.user.id),
            eq(users.status, "UNAUTHORIZED"),
          ),
        );

      return {
        success: true,
        message: "Approval request submitted successfully",
        request: newRequest[0],
      };
    }),

  // Get current user's approval request
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const { db, authSession } = ctx;

    if (!authSession?.user) {
      throw new Error("Authentication required");
    }

    // Get the user's most recent approval request
    const userRequest = await db
      .select()
      .from(approvalRequest)
      .where(eq(approvalRequest.userId, authSession.user.id))
      .orderBy(desc(approvalRequest.requestedAt))
      .limit(1);

    if (userRequest.length === 0) {
      return null;
    }

    return userRequest[0];
  }),

  // Get all requests (admin only)
  getAll: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const allRequests = await db
      .select({
        id: approvalRequest.id,
        userId: approvalRequest.userId,
        fullName: approvalRequest.fullName,
        company: approvalRequest.company,
        jobTitle: approvalRequest.jobTitle,
        accessReason: approvalRequest.accessReason,
        status: approvalRequest.status,
        requestedAt: approvalRequest.requestedAt,
        reviewedAt: approvalRequest.reviewedAt,
        reviewedBy: approvalRequest.reviewedBy,
        reviewNotes: approvalRequest.reviewNotes,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(approvalRequest)
      .innerJoin(users, eq(approvalRequest.userId, users.id))
      .orderBy(desc(approvalRequest.requestedAt));

    return allRequests;
  }),

  // Get all pending requests (admin only)
  getAllPending: adminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const pendingRequests = await db
      .select({
        id: approvalRequest.id,
        userId: approvalRequest.userId,
        fullName: approvalRequest.fullName,
        company: approvalRequest.company,
        jobTitle: approvalRequest.jobTitle,
        accessReason: approvalRequest.accessReason,
        status: approvalRequest.status,
        requestedAt: approvalRequest.requestedAt,
        userEmail: users.email,
      })
      .from(approvalRequest)
      .innerJoin(users, eq(approvalRequest.userId, users.id))
      .where(eq(approvalRequest.status, "PENDING"))
      .orderBy(desc(approvalRequest.requestedAt));

    return pendingRequests;
  }),

  // Update request status (admin only)
  updateStatus: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        status: z.enum(["APPROVED", "DENIED"]),
        reviewNotes: z.string().optional(),
        assignedRole: z.enum(["admin", "staff", "client"]).optional(),
        updatedInfo: z
          .object({
            fullName: z.string().optional(),
            company: z.string().optional(),
            jobTitle: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, authSession } = ctx;

      // If approving, role assignment is required
      if (input.status === "APPROVED" && !input.assignedRole) {
        throw new Error("Role assignment is required when approving a user");
      }

      // Prepare approval request update data
      const requestUpdateData: any = {
        status: input.status,
        reviewedAt: new Date(),
        reviewedBy: authSession.user.id,
        reviewNotes: input.reviewNotes,
        updatedAt: new Date(),
      };

      // Update user info in the request if provided
      if (input.updatedInfo) {
        if (input.updatedInfo.fullName)
          requestUpdateData.fullName = input.updatedInfo.fullName;
        if (input.updatedInfo.company)
          requestUpdateData.company = input.updatedInfo.company;
        if (input.updatedInfo.jobTitle)
          requestUpdateData.jobTitle = input.updatedInfo.jobTitle;
      }

      // Update the approval request
      const updatedRequest = await db
        .update(approvalRequest)
        .set(requestUpdateData)
        .where(eq(approvalRequest.id, input.requestId))
        .returning();

      if (updatedRequest.length === 0) {
        throw new Error("Request not found");
      }

      // Update user status and role
      const userUpdateData: any = {
        status: input.status,
        updatedAt: new Date(),
      };

      // If approving, assign the role; if denying, reset to default role
      if (input.status === "APPROVED" && input.assignedRole) {
        userUpdateData.role = input.assignedRole;

        // Update user's display name if provided
        if (input.updatedInfo?.fullName) {
          userUpdateData.name = input.updatedInfo.fullName;
        }
      } else if (input.status === "DENIED") {
        userUpdateData.role = "user"; // Reset to default role when denied
      }

      await db
        .update(users)
        .set(userUpdateData)
        .where(eq(users.id, updatedRequest[0]!.userId));

      return {
        success: true,
        message: `Request ${input.status.toLowerCase()} successfully`,
        request: updatedRequest[0],
      };
    }),

  // Revoke access (admin only)
  revokeAccess: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, authSession } = ctx;

      // Update the approval request back to PENDING
      const updatedRequest = await db
        .update(approvalRequest)
        .set({
          status: "PENDING",
          reviewedAt: new Date(),
          reviewedBy: authSession.user.id,
          reviewNotes: input.reviewNotes || "Access revoked by administrator",
          updatedAt: new Date(),
        })
        .where(eq(approvalRequest.id, input.requestId))
        .returning();

      if (updatedRequest.length === 0) {
        throw new Error("Request not found");
      }

      // Update user status back to PENDING and reset role to default
      await db
        .update(users)
        .set({
          status: "PENDING",
          role: "user", // Reset to default role when access is revoked
          updatedAt: new Date(),
        })
        .where(eq(users.id, updatedRequest[0]!.userId));

      return {
        success: true,
        message: "Access revoked successfully",
        request: updatedRequest[0],
      };
    }),

  // Revert denied user back to pending (admin only)
  revertToPending: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, authSession } = ctx;

      // Update the approval request back to PENDING
      const updatedRequest = await db
        .update(approvalRequest)
        .set({
          status: "PENDING",
          reviewedAt: new Date(),
          reviewedBy: authSession.user.id,
          reviewNotes:
            input.reviewNotes || "Request reverted to pending by administrator",
          updatedAt: new Date(),
        })
        .where(eq(approvalRequest.id, input.requestId))
        .returning();

      if (updatedRequest.length === 0) {
        throw new Error("Request not found");
      }

      // Update user status back to PENDING and reset role to default
      await db
        .update(users)
        .set({
          status: "PENDING",
          role: "user", // Reset to default role
          updatedAt: new Date(),
        })
        .where(eq(users.id, updatedRequest[0]!.userId));

      return {
        success: true,
        message: "Request reverted to pending successfully",
        request: updatedRequest[0],
      };
    }),
});

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./authSchema";

export * from "./authSchema";

export const approvalRequest = pgTable("approval_request", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  accessReason: text("access_reason").notNull(),
  status: text("status").default("PENDING").notNull(), // PENDING, APPROVED, DENIED
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by").references(() => user.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

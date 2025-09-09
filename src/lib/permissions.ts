import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
  approvalRequest: ["request", "approve", "decline", "revoke"], // <-- Permissions available for created roles
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
  approvalRequest: ["request"],
});

export const client = ac.newRole({
  approvalRequest: [],
});

export const staff = ac.newRole({
  approvalRequest: [],
});

export const admin = ac.newRole({
  approvalRequest: ["approve", "decline", "revoke"],
});

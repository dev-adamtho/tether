import { defaultStatements } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
  ...defaultStatements,
  access: ["grant", "revoke", "update"], // <-- Permissions available for created roles
} as const;

export const ac = createAccessControl(statement);

export const client = ac.newRole({
  access: [],
});

export const user = ac.newRole({
  access: [],
});

export const admin = ac.newRole({
  access: ["grant", "revoke", "update"],
});

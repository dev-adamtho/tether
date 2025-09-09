import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import { env } from "@/env";
import { nextCookies } from "better-auth/next-js";
import { ac, user, client, staff, admin } from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),
  user: {
    additionalFields: {
      status: {
        type: "string",
        required: true,
        defaultValue: "UNAUTHORIZED",
        input: false,
        options: ["UNAUTHORIZED", "PENDING", "APPROVED", "DENIED"],
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    microsoft: {
      clientId: env.MICROSOFT_CLIENT_ID,
      clientSecret: env.MICROSOFT_CLIENT_SECRET,
      tenantId: "common",
      prompt: "select_account", // Prompt Account Selection
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        user,
        admin,
        staff,
        client,
      },
      defaultRole: "user",
    }),
    nextCookies(),
  ],
});

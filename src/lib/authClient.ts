import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { ac, user, client, admin } from "./permissions";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  //you can pass client configuration here
  plugins: [
    adminClient({
      ac,
      roles: {
        admin,
        user,
        client,
      },
    }),
    inferAdditionalFields<typeof auth>(),
  ],
});

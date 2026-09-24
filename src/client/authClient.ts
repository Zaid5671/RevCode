// Better Auth's browser client. Same origin as the app, so no base URL is needed.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

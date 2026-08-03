import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { getAuth } from "@/lib/auth";

export const authClient = createAuthClient({
  // 讓 client 端的 session.user 帶有 role 型別
  plugins: [inferAdditionalFields<ReturnType<typeof getAuth>>()]
});

export const { signIn, signOut, useSession } = authClient;

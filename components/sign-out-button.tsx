"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** 公開頁面（投稿、管理投稿）用的登出按鈕；學生區／教師區的登出在 components/app-header.tsx。 */
export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <button type="button" className="btn btn-ghost" onClick={() => void handleSignOut()} disabled={isSigningOut}>
      {isSigningOut ? "登出中…" : "登出"}
    </button>
  );
}

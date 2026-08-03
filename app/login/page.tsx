"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthHero } from "@/components/auth-hero";
import { DiscordIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

/** 從網址參數推導出要顯示的錯誤訊息，不用 state 保存。 */
function readUrlError(params: URLSearchParams) {
  const discord = params.get("discord");

  if (discord === "error") {
    return "Discord OAuth 發生錯誤，請重試或檢查回呼網址設定。";
  }

  if (discord === "unauthenticated") {
    return "尚未完成 Discord 登入，請再試一次。";
  }

  if (discord === "failed") {
    return params.get("reason") || "Discord 驗證失敗，請聯絡管理員檢查機器人與身份組設定。";
  }

  return "";
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const error = formError || readUrlError(searchParams);

  const handleDiscordLogin = async () => {
    setFormError("");
    setIsPending(true);

    try {
      await authClient.signIn.social({
        provider: "discord",
        // 身份組解析在 /discord/complete 這個 server component 內完成
        callbackURL: "/discord/complete",
        errorCallbackURL: "/login?discord=error"
      });
    } catch {
      setFormError("無法啟動 Discord OAuth，請檢查 DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET。");
      setIsPending(false);
    }
  };

  return (
    <AuthHero
      title="SIGN IN"
      subtitle="登入"
      sidebarText="使用 Discord 登入，系統會依你在校內伺服器的身份組自動辨識學生或教師身分。"
    >
      <button
        type="button"
        className="btn btn-discord"
        onClick={() => void handleDiscordLogin()}
        disabled={isPending}
      >
        <DiscordIcon className="btn-discord__icon" aria-hidden="true" />
        <span>{isPending ? "前往 Discord 驗證…" : "使用 Discord 登入"}</span>
      </button>

      {error ? (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="login-automation-note">
        <div className="login-automation-note__title">登入說明</div>
        <div className="login-automation-note__text">
          需要先加入校內 Discord 伺服器，並取得學生或教職員身份組。
          <br />
          驗證通過後會自動導向對應的入口，不需要另外註冊帳號。
        </div>
      </div>

      <div className="login-sidebar__links">
        <span>Helpdesk</span>
      </div>
    </AuthHero>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

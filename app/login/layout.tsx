import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LOGIN_ENABLED } from "@/lib/course-constants";

/** 登入頁本身是 client component，登入沒開放時的導向放在這層 server layout。 */
export default function LoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!LOGIN_ENABLED) {
    redirect("/");
  }

  return children;
}

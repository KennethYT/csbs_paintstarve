import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function Page() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  redirect(user.role === "teacher" ? "/teacher/courses" : "/student/browse");
}

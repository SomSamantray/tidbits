import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth/session";
import { listCategories } from "@/lib/db/queries";
import { LoginForm } from "./LoginForm";
import { AddTidbitForm } from "./AddTidbitForm";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16 sm:px-8">
      {isAuthenticated ? (
        <AddTidbitForm categories={await listCategories()} />
      ) : (
        <LoginForm />
      )}
    </div>
  );
}

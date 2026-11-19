import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ register?: string; mode?: string }>;
}) {
  const { register, mode } = await searchParams;
  redirect(register === "1" || mode === "register" ? "/sign-up" : "/sign-in");
}

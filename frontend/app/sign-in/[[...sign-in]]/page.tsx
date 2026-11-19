import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense>
        <SignIn fallbackRedirectUrl="/dashboard" signUpForceRedirectUrl="/onboarding" />
      </Suspense>
    </div>
  );
}

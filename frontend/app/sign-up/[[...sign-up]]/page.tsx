import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense>
        <SignUp forceRedirectUrl="/onboarding" signInFallbackRedirectUrl="/dashboard" />
      </Suspense>
    </div>
  );
}

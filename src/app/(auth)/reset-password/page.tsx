import { Suspense } from "react";
import ResetPasswordContent from "./components/ResetPasswordContent";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mx-auto mb-6"></div>
            <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
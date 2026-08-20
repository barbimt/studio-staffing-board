"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Studio Capacity</h1>
      <p className="text-muted-foreground mt-4">
        Something went wrong while loading the staffing board. Try again.
      </p>
      <Button className="mt-4" type="button" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}

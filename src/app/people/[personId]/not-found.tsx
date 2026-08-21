import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PersonNotFound() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Person not found
      </h1>
      <p className="text-muted-foreground mt-2">
        That person is not in the current staffing snapshot.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-4")}>
        Back to Staffing board
      </Link>
    </main>
  );
}

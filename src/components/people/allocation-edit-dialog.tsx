"use client";

import { useActionState, useId, useState } from "react";

import {
  updateAllocationAction,
  type UpdateAllocationState,
} from "@/app/people/[personId]/actions";
import { CapacityStatusBadge } from "@/components/staffing/capacity-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { previewMonthlyAllocation } from "@/server/capacity/capacity-math";
import { formatMonthLabel } from "@/server/capacity/month";

const initialState: UpdateAllocationState = {};

export function AllocationEditDialog({
  personId,
  assignmentId,
  projectName,
  currentAllocationPercentage,
  otherAllocationPercentage,
  effectiveCapacityPercentage,
  countsTowardSelectedMonth,
  month,
  disabled = false,
}: {
  personId: number;
  assignmentId: number;
  projectName: string;
  currentAllocationPercentage: number;
  otherAllocationPercentage: number;
  effectiveCapacityPercentage: number;
  countsTowardSelectedMonth: boolean;
  month: string;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(currentAllocationPercentage));
  const [state, formAction, pending] = useActionState(
    async (previous: UpdateAllocationState, formData: FormData) => {
      const result = await updateAllocationAction(previous, formData);

      if (result.success) {
        setOpen(false);
      }

      return result;
    },
    initialState,
  );

  const parsedDraft = /^\d+$/.test(draft) ? Number(draft) : null;
  const preview =
    parsedDraft === null
      ? null
      : previewMonthlyAllocation({
          effectiveCapacityPercentage,
          otherAllocationPercentage,
          draftAllocationPercentage: countsTowardSelectedMonth
            ? parsedDraft
            : 0,
        });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          setDraft(String(currentAllocationPercentage));
        }
      }}
    >
      <DialogTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            title={disabled ? "This project has already ended" : undefined}
          >
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit allocation</DialogTitle>
            <DialogDescription>
              Change this person&apos;s allocation on {projectName}.
              Over-allocation is allowed and shows as over capacity.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="month" value={month} />
          <div className="grid gap-2">
            <Label htmlFor={inputId}>Allocation %</Label>
            <Input
              id={inputId}
              name="allocationPercentage"
              inputMode="numeric"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={parsedDraft === null || Boolean(state.error)}
              aria-describedby={
                state.error ? `${inputId}-error` : `${inputId}-preview`
              }
            />
          </div>
          {preview ? (
            <div
              id={`${inputId}-preview`}
              className="flex flex-col items-start gap-2"
              aria-live="polite"
            >
              {countsTowardSelectedMonth ? (
                <>
                  <p className="text-sm">
                    {preview.totalAllocationPercentage}% allocated against{" "}
                    {effectiveCapacityPercentage}% effective capacity in{" "}
                    {formatMonthLabel(month)}.
                  </p>
                  <CapacityStatusBadge
                    status={preview.status}
                    remainingCapacityPercentage={
                      preview.remainingCapacityPercentage
                    }
                  />
                </>
              ) : (
                <p className="text-sm">
                  This project is not active in {formatMonthLabel(month)}, so
                  this month&apos;s capacity will not change.
                </p>
              )}
            </div>
          ) : (
            <p className="text-destructive text-sm">
              Enter a whole number, 0 or more.
            </p>
          )}
          {state.error ? (
            <Alert variant="destructive" id={`${inputId}-error`}>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending || parsedDraft === null}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

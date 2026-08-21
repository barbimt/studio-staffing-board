"use server";

import { revalidatePath } from "next/cache";

import {
  assignmentAllocationInputSchema,
  AssignmentUpdateError,
  updateAssignmentAllocation,
} from "@/server/capacity/update-assignment-allocation";
import { getDb } from "@/server/db";

export type UpdateAllocationState = {
  error?: string;
  success?: boolean;
};

export async function updateAllocationAction(
  _previous: UpdateAllocationState,
  formData: FormData,
): Promise<UpdateAllocationState> {
  const parsed = assignmentAllocationInputSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    personId: formData.get("personId"),
    month: formData.get("month"),
    allocationPercentage: formData.get("allocationPercentage"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Allocation must be a whole number",
    };
  }

  try {
    await updateAssignmentAllocation(getDb(), parsed.data);
  } catch (error) {
    if (error instanceof AssignmentUpdateError) {
      return { error: error.message };
    }

    return { error: "Could not save the allocation. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${parsed.data.personId}`);

  return { success: true };
}

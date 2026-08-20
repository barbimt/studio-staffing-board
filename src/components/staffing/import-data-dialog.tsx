"use client";

import { useRouter } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  hasStudioImportErrors,
  type StudioImportResult,
  type StudioImportSourceErrors,
} from "@/lib/import-result";
import {
  importFileFieldError,
  type ImportSource,
} from "@/lib/validate-import-file";
import { cn } from "@/lib/utils";

const fields: {
  source: ImportSource;
  label: string;
  accept: string;
  heading: string;
}[] = [
  {
    source: "people",
    label: "People — CSV",
    accept: ".csv,text/csv",
    heading: "People",
  },
  {
    source: "projects",
    label: "Projects — CSV",
    accept: ".csv,text/csv",
    heading: "Projects",
  },
  {
    source: "calendar",
    label: "Leave calendar — ICS",
    accept: ".ics,text/calendar",
    heading: "Leave calendar",
  },
];

type SelectedFiles = Record<ImportSource, File | null>;

const emptyFiles: SelectedFiles = {
  people: null,
  projects: null,
  calendar: null,
};

export function ImportDataDialog({
  hasStaffingData,
  trigger,
}: {
  hasStaffingData: boolean;
  trigger: ReactElement;
}) {
  const router = useRouter();
  const formId = useId();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<SelectedFiles>(emptyFiles);
  const [serverErrors, setServerErrors] = useState<StudioImportSourceErrors>(
    {},
  );
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [failed, setFailed] = useState(false);

  const fieldErrors: Record<ImportSource, string | undefined> = {
    people: importFileFieldError(files.people, "people"),
    projects: importFileFieldError(files.projects, "projects"),
    calendar: importFileFieldError(files.calendar, "calendar"),
  };

  const selectionComplete = Boolean(
    files.people && files.projects && files.calendar,
  );
  const selectionValid =
    selectionComplete &&
    !fieldErrors.people &&
    !fieldErrors.projects &&
    !fieldErrors.calendar;
  const showServerErrors = hasStudioImportErrors(serverErrors);
  const canSubmit = selectionValid && !pending;

  function handleOpenChange(nextOpen: boolean) {
    if (pending) {
      return;
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      setServerErrors({});
      setFailed(false);
    }
  }

  function handleFileChange(source: ImportSource, fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    setFiles((current) => ({ ...current, [source]: file }));
    setServerErrors((current) => {
      const next = { ...current };
      delete next[source];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !files.people || !files.projects || !files.calendar) {
      return;
    }

    setPending(true);
    setServerErrors({});
    setFailed(false);
    setStatusMessage("");

    const body = new FormData();
    body.set("people", files.people);
    body.set("projects", files.projects);
    body.set("calendar", files.calendar);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as StudioImportResult;

      if (!result.ok) {
        setServerErrors(result.errors);
        setFailed(true);
        setPending(false);
        queueMicrotask(() => errorSummaryRef.current?.focus());
        return;
      }

      setFiles(emptyFiles);
      setFileInputKey((key) => key + 1);
      setPending(false);
      setOpen(false);
      setStatusMessage("Studio data imported.");
      router.refresh();
    } catch {
      setServerErrors({});
      setFailed(true);
      setPending(false);
      queueMicrotask(() => errorSummaryRef.current?.focus());
    }
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger nativeButton={false} render={trigger} />
        <DialogContent className="sm:max-w-md" aria-busy={pending}>
          <DialogHeader>
            <DialogTitle>Import studio data</DialogTitle>
            <DialogDescription>
              Select the three files used to build the monthly staffing board.
            </DialogDescription>
          </DialogHeader>
          <form
            id={formId}
            key={fileInputKey}
            onSubmit={handleSubmit}
            className="grid gap-4"
          >
            {hasStaffingData ? (
              <Alert>
                <AlertTitle>Importing updates current data</AlertTitle>
                <AlertDescription>
                  Importing new studio data will update the current staffing
                  data. Project allocations will be replaced by the latest
                  imported values.
                </AlertDescription>
              </Alert>
            ) : null}
            {failed ? (
              <div
                ref={errorSummaryRef}
                tabIndex={-1}
                role="alert"
                className="outline-none"
              >
                <Alert variant="destructive">
                  <AlertTitle>
                    We couldn&apos;t import the studio data.
                  </AlertTitle>
                  <AlertDescription>
                    <p>Fix the issues below and try again.</p>
                    {showServerErrors ? null : (
                      <p className="mt-2">The import failed. Try again.</p>
                    )}
                    {fields.map((field) => {
                      const messages = serverErrors[field.source];

                      if (!messages?.length) {
                        return null;
                      }

                      return (
                        <div key={field.source} className="mt-3">
                          <p className="text-foreground font-medium">
                            {field.heading}
                          </p>
                          <ul className="mt-1 list-disc pl-4">
                            {messages.map((message) => (
                              <li key={message}>{message}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            {fields.map((field) => {
              const inputId = `${formId}-${field.source}`;
              const errorId = `${inputId}-error`;
              const fieldError = fieldErrors[field.source];
              const sourceHasServerErrors = Boolean(
                serverErrors[field.source]?.length,
              );
              const describedBy = fieldError ? errorId : undefined;

              return (
                <div key={field.source} className="grid gap-1.5">
                  <Label htmlFor={inputId}>{field.label}</Label>
                  <input
                    id={inputId}
                    name={field.source}
                    type="file"
                    accept={field.accept}
                    disabled={pending}
                    aria-invalid={Boolean(fieldError) || sourceHasServerErrors}
                    aria-describedby={describedBy}
                    className={cn(
                      "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full min-w-0 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3 disabled:opacity-50",
                      (fieldError || sourceHasServerErrors) &&
                        "border-destructive aria-invalid:ring-destructive/20",
                    )}
                    onChange={(event) =>
                      handleFileChange(field.source, event.target.files)
                    }
                  />
                  {files[field.source] ? (
                    <p className="text-muted-foreground text-sm">
                      {files[field.source]?.name}
                      {sourceHasServerErrors ? " — has problems" : ""}
                    </p>
                  ) : null}
                  {fieldError ? (
                    <p id={errorId} className="text-destructive text-sm">
                      {fieldError}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </form>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" form={formId} disabled={!canSubmit}>
              {pending ? "Importing…" : "Import data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

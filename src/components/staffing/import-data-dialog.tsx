"use client";

import { useRouter } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  TriangleAlertIcon,
} from "lucide-react";

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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  hasStudioImportErrors,
  type StudioImportResult,
  type StudioImportSourceErrors,
} from "@/lib/import-result";
import {
  validateSelectedImportFile,
  visibleImportErrors,
  type ImportFieldIssue,
  type ImportSource,
} from "@/lib/validate-import-file";

const fields: {
  source: ImportSource;
  label: string;
  accept: string;
  heading: string;
  chooseLabel: string;
}[] = [
  {
    source: "people",
    label: "People — CSV",
    accept: ".csv,text/csv",
    heading: "People",
    chooseLabel: "Choose people file",
  },
  {
    source: "projects",
    label: "Projects — CSV",
    accept: ".csv,text/csv",
    heading: "Projects",
    chooseLabel: "Choose projects file",
  },
  {
    source: "calendar",
    label: "Leave calendar — ICS",
    accept: ".ics,text/calendar",
    heading: "Leave calendar",
    chooseLabel: "Choose leave calendar file",
  },
];

type SelectedFiles = Record<ImportSource, File | null>;

const emptyFiles: SelectedFiles = {
  people: null,
  projects: null,
  calendar: null,
};

const emptySelectionErrors: Record<ImportSource, ImportFieldIssue | undefined> =
  {
    people: undefined,
    projects: undefined,
    calendar: undefined,
  };

const emptyChecking: Record<ImportSource, boolean> = {
  people: false,
  projects: false,
  calendar: false,
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
  const [selectionErrors, setSelectionErrors] = useState(emptySelectionErrors);
  const [checking, setChecking] = useState(emptyChecking);
  const validationRequest = useRef<Record<ImportSource, number>>({
    people: 0,
    projects: 0,
    calendar: 0,
  });
  const [serverErrors, setServerErrors] = useState<StudioImportSourceErrors>(
    {},
  );
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [failed, setFailed] = useState(false);

  const selectionComplete = Boolean(
    files.people && files.projects && files.calendar,
  );
  const selectionValid =
    selectionComplete &&
    !selectionErrors.people &&
    !selectionErrors.projects &&
    !selectionErrors.calendar;
  const showServerErrors = hasStudioImportErrors(serverErrors);
  const isChecking = checking.people || checking.projects || checking.calendar;
  const canSubmit = selectionValid && !pending && !isChecking;

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

  async function handleFileChange(
    source: ImportSource,
    fileList: FileList | null,
  ) {
    const file = fileList?.[0] ?? null;
    const request = ++validationRequest.current[source];

    setFiles((current) => ({ ...current, [source]: file }));
    setSelectionErrors((current) => ({ ...current, [source]: undefined }));
    setChecking((current) => ({ ...current, [source]: Boolean(file) }));
    setServerErrors((current) => {
      const next = { ...current };
      delete next[source];
      return next;
    });

    const error = await validateSelectedImportFile(file, source);

    if (request !== validationRequest.current[source]) {
      return;
    }

    setSelectionErrors((current) => ({ ...current, [source]: error }));
    setChecking((current) => ({ ...current, [source]: false }));
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
      setSelectionErrors(emptySelectionErrors);
      setChecking(emptyChecking);
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
        <DialogTrigger render={trigger} />
        <DialogContent
          className="flex max-h-[min(90dvh,40rem)] flex-col overflow-hidden sm:max-w-md"
          aria-busy={pending}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Import studio data</DialogTitle>
            <DialogDescription>
              Select the three files used to build the monthly staffing board.
            </DialogDescription>
          </DialogHeader>
          <form
            id={formId}
            key={fileInputKey}
            onSubmit={handleSubmit}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <FieldGroup className="gap-4">
              {hasStaffingData ? (
                <Alert variant="warning">
                  <TriangleAlertIcon aria-hidden="true" />
                  <AlertDescription>
                    People, projects, assignments and calendar events not
                    present in the new files will be removed.
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
                      <ScrollArea className="mt-3 h-48 pr-3">
                        {fields.map((field) => {
                          const messages = serverErrors[field.source];

                          if (!messages?.length) {
                            return null;
                          }

                          const { shown, remaining } =
                            visibleImportErrors(messages);

                          return (
                            <div key={field.source} className="mt-3 first:mt-0">
                              <p className="text-foreground font-medium">
                                {field.heading}
                              </p>
                              <ul className="mt-1 list-disc pl-4">
                                {shown.map((message) => (
                                  <li key={message}>{message}</li>
                                ))}
                              </ul>
                              {remaining > 0 ? (
                                <p className="mt-1">
                                  and {remaining} more{" "}
                                  {remaining === 1 ? "issue" : "issues"}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}
              {fields.map((field) => {
                const inputId = `${formId}-${field.source}`;
                const errorId = `${inputId}-error`;
                const selectedId = `${inputId}-selected`;
                const fieldError = selectionErrors[field.source];
                const sourceHasServerErrors = Boolean(
                  serverErrors[field.source]?.length,
                );
                const describedBy = fieldError
                  ? errorId
                  : files[field.source]
                    ? selectedId
                    : undefined;
                const selectedName = files[field.source]?.name;
                const fileLooksValid = Boolean(
                  selectedName &&
                  !checking[field.source] &&
                  !fieldError &&
                  !sourceHasServerErrors,
                );

                return (
                  <Field
                    key={field.source}
                    data-invalid={Boolean(fieldError) || sourceHasServerErrors}
                  >
                    <FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
                    <input
                      id={inputId}
                      name={field.source}
                      type="file"
                      accept={field.accept}
                      disabled={pending}
                      aria-invalid={
                        Boolean(fieldError) || sourceHasServerErrors
                      }
                      aria-describedby={describedBy || undefined}
                      className="sr-only"
                      onChange={(event) =>
                        void handleFileChange(field.source, event.target.files)
                      }
                    />
                    <div className="flex min-w-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          document.getElementById(inputId)?.click()
                        }
                      >
                        {field.chooseLabel}
                      </Button>
                      {fileLooksValid ? (
                        <CheckCircle2Icon
                          className="size-4 shrink-0 text-green-600 dark:text-green-500"
                          aria-hidden
                        />
                      ) : null}
                      <FieldDescription
                        id={selectedId}
                        className="min-w-0 truncate"
                      >
                        {selectedName ?? "No file selected"}
                        {fileLooksValid ? (
                          <span className="sr-only"> File looks valid.</span>
                        ) : null}
                        {selectedName && sourceHasServerErrors
                          ? " — has problems"
                          : ""}
                      </FieldDescription>
                    </div>
                    {fieldError ? (
                      <Alert id={errorId} variant="destructive">
                        <AlertCircleIcon />
                        <AlertTitle>{fieldError.message}</AlertTitle>
                        {fieldError.details?.length ? (
                          <AlertDescription>
                            <ul className="mt-1 list-disc pl-4">
                              {fieldError.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        ) : null}
                      </Alert>
                    ) : null}
                  </Field>
                );
              })}
            </FieldGroup>
          </form>
          <DialogFooter className="shrink-0">
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

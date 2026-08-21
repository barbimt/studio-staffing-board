import { z } from "zod";

import { normalizeEmail } from "./normalize-email";

function requiredNormalized(
  field: string,
  normalize: (value: string) => string,
) {
  return z
    .string({ error: `${field} is required` })
    .transform(normalize)
    .refine((value) => value.length > 0, { error: `${field} is required` });
}

function optionalNormalized(normalize: (value: string) => string) {
  return z.union([z.string(), z.undefined()]).transform((value) => {
    if (value == null) {
      return null;
    }

    const normalized = normalize(value);
    return normalized === "" ? null : normalized;
  });
}

export function requiredString(field: string) {
  return requiredNormalized(field, (value) => value.trim());
}

export function requiredDate(field: string) {
  return requiredString(field).pipe(
    z.iso.date({ error: `${field} is invalid` }),
  );
}

export function optionalDate(field: string) {
  return optionalNormalized((value) => value.trim()).pipe(
    z.iso.date({ error: `${field} is invalid` }).nullable(),
  );
}

export function requiredEmail(field: string) {
  return requiredNormalized(field, normalizeEmail).pipe(
    z.email({ error: `${field} is invalid` }),
  );
}

export function optionalEmail(field: string) {
  return optionalNormalized(normalizeEmail).pipe(
    z.email({ error: `${field} is invalid` }).nullable(),
  );
}

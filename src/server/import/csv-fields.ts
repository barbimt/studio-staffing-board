import { z } from "zod";

import { normalizeEmail } from "./normalize-email";

export function requiredString(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { error: `${field} is required` });
}

export function requiredDate(field: string) {
  return requiredString(field).pipe(
    z.iso.date({ error: `${field} is invalid` }),
  );
}

export function optionalDate(field: string) {
  return z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value == null) {
        return null;
      }

      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .pipe(z.iso.date({ error: `${field} is invalid` }).nullable());
}

export function requiredEmail(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => normalizeEmail(value))
    .refine((value) => value.length > 0, { error: `${field} is required` })
    .pipe(z.email({ error: `${field} is invalid` }));
}

export function optionalEmail(field: string) {
  return z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value == null) {
        return null;
      }

      const trimmed = normalizeEmail(value);
      return trimmed === "" ? null : trimmed;
    })
    .pipe(z.email({ error: `${field} is invalid` }).nullable());
}

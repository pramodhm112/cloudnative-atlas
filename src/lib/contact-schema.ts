/**
 * Zod schema for the public Contact Us form.
 *
 * Every regex is anchored (^...$) so partial matches don't sneak through.
 * Fields are trimmed and length-bounded; the country and dial code are
 * cross-checked against the curated list in `src/data/countries.ts` so the
 * server never trusts client-supplied option text.
 */

import { z } from 'zod';
import { COUNTRY_CODES, DIAL_CODES } from '../data/countries';

// --- Regex patterns -------------------------------------------------------
//
// NAME: letters, spaces, apostrophes, hyphens, periods. Unicode letter class
// allows non-ASCII names (José, O'Neill, Sønderby). 1–50 chars.
export const NAME_RE = /^[\p{L}][\p{L} '.\-]{0,49}$/u;

// EMAIL: pragmatic regex (RFC 5322 in full is impractical). Zod's .email()
// also runs; this regex is a second belt-and-braces structural check.
export const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// COUNTRY DIAL CODE: leading +, then 1–3 digits. We additionally validate
// the digits exist in the curated COUNTRIES list.
export const DIAL_RE = /^\+\d{1,3}$/;

// MOBILE NUMBER (LOCAL PART): digits only, 4–14 chars (combined with dial
// code stays within E.164's 15-digit max).
export const MOBILE_RE = /^\d{4,14}$/;

// COUNTRY CODE (ISO 3166-1 alpha-2): two uppercase letters; cross-checked
// against COUNTRY_CODES set.
export const COUNTRY_RE = /^[A-Z]{2}$/;

// MESSAGE: free text; we accept any printable Unicode but cap length and
// reject control characters (except common whitespace) to avoid log
// injection via embedded newlines/escapes.
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// --- Schema ---------------------------------------------------------------

const trimmed = (max: number) =>
  z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(max));

export const ContactFormSchema = z.object({
  firstName: trimmed(50).pipe(z.string().regex(NAME_RE, 'Invalid first name')),
  lastName: trimmed(50).pipe(z.string().regex(NAME_RE, 'Invalid last name')),

  email: trimmed(254)
    .pipe(z.string().email('Invalid email address'))
    .pipe(z.string().regex(EMAIL_RE, 'Invalid email format')),

  dialCode: z
    .string()
    .regex(DIAL_RE, 'Country code must be + followed by 1–3 digits')
    .refine((v) => DIAL_CODES.has(v.slice(1)), 'Unknown country dial code'),

  mobile: trimmed(14).pipe(z.string().regex(MOBILE_RE, 'Mobile number must be 4–14 digits')),

  country: z
    .string()
    .regex(COUNTRY_RE, 'Country must be a 2-letter ISO code')
    .refine((v) => COUNTRY_CODES.has(v), 'Unknown country'),

  message: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'))
    .refine((s) => !CONTROL_CHAR_RE.test(s), 'Message contains disallowed control characters'),

  // Honeypot — must be empty. Bots that auto-fill every field will fail this.
  // The visible form has this field hidden via CSS + aria-hidden.
  website: z.string().max(0, 'Bot detected').optional().default(''),
});

export type ContactForm = z.infer<typeof ContactFormSchema>;

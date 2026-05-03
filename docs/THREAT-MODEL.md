# CloudNative Atlas — Threat Model

A short STRIDE walkthrough of the security-sensitive surfaces in the codebase. Updated when new features land that change auth, content writing, or rendering pipelines. Intended for internal review and to anchor the PR risk-section template.

---

## System Diagram (logical)

```
                 ┌──────────────────────┐
   Public  ─►   │  Astro public pages   │  (static-style: blog, projects,
                 │  (no auth, read-only) │   courses, practice-tests)
                 └──────────────────────┘
                            │
                            │ reads
                            ▼
                 ┌──────────────────────┐
                 │  Content collections │  (MDX + JSON files on disk)
                 │  src/content/**      │
                 └──────────────────────┘
                            ▲
                            │ writes
                            │
                 ┌──────────────────────┐
                 │  Admin (SSR via Node │  ← session cookie + middleware
                 │  adapter)             │     gate
                 │  /admin, /api/admin  │
                 └──────────────────────┘
                            ▲
                            │ form POST
                            │
                Admin user (authenticated by password)
```

Trust boundaries:
1. **Public ↔ public pages** — anonymous, read-only
2. **Public ↔ admin login** — anonymous, write attempt
3. **Authenticated admin ↔ admin pages / API** — full content control
4. **Process ↔ filesystem** — the Node process can read/write under `src/content/**`

---

## STRIDE per surface

### Surface 1 — Admin login (`POST /api/admin/login`)

| Threat | Mitigation |
|---|---|
| **S** poofing — attacker tries to authenticate as admin | Single password compared with `safePasswordCompare` (timing-safe SHA256+`crypto.timingSafeEqual`). Rate-limited to 5 attempts / 15 min per IP via `src/lib/rate-limit.ts`. |
| **T** ampering — attacker forges a session cookie | Session token is `base64url(payload).base64url(HMAC-SHA256(payload, secret))`. Validated by recomputing HMAC and `timingSafeEqual` on the signature in `validateSessionToken`. Tampering invalidates the signature. |
| **R** epudiation — admin denies they performed an action | All login attempts and CRUD operations are logged via `src/lib/logger.ts` (level `info` for success, `warn` for failure). Includes IP, action, slug. |
| **I** nformation disclosure — leaking the password | `console.error` for the missing-config case in `login.ts` doesn't print the password. Errors don't echo the submitted password back. `.env` is `.gitignore`d. |
| **D** enial of service — brute-force or login flood | Rate limit returns 429 with `Retry-After`. In-memory bucket grows bounded with periodic GC of stale keys. |
| **E** levation of privilege — bypass the gate | Middleware (`src/middleware.ts`) runs on every `/admin/*` and `/api/admin/*` request; only login + logout are allowed unauthenticated. No other code path issues a session cookie. |

### Surface 2 — Admin content CRUD (`/api/admin/{posts,projects,tests,courses}`)

| Threat | Mitigation |
|---|---|
| **S** poofing — unauth caller hits CRUD | Same middleware gate as above; missing/invalid token → 401 (API) or redirect to login (page). |
| **T** ampering — malformed body, oversized payload | Every endpoint runs `parseJsonBody(request, ZodSchema)` from `api-response.ts`. Bad JSON → 400 `INVALID_JSON`. Schema mismatch → 400 `INVALID_BODY` with per-field details. |
| **R** epudiation — admin claims they didn't change content | `logger.info('admin.<entity>.<action>', { slug, status })` on every CRUD action. Filesystem gives an mtime audit trail too. |
| **I** nformation disclosure — leaking other users' data | Single-user admin; no cross-user data exposure to design against. Error responses are sanitized (no stack traces in client payload). |
| **D** enial of service — large MDX bodies, deep modules | Astro caps request size by default; we don't accept multi-MB bodies. JSON parser will OOM on malicious input — accept this for an authenticated-only endpoint. Future: add explicit body-size limit. |
| **E** levation — write to arbitrary file paths | All file writes go through `src/lib/slug.ts` `validateSlug`: lowercase ASCII + hyphens only, no `..`, `/`, or `\`. Paths constructed only via `path.join(getContentDir(collection), `${slug}.mdx`)`. Slug is the only user-controlled segment and it's validated. |

### Surface 3 — Markdown rendering (`src/lib/markdown.ts`)

Used for course study guides (markdown stored as strings in JSON). Higher risk than MDX (which Astro compiles at build time) because we render at request time.

| Threat | Mitigation |
|---|---|
| **T** ampering — admin embeds malicious HTML / JS in study guide | Custom Marked renderer escapes raw HTML blocks (`<` → `&lt;`). Output passes through `DOMPurify.sanitize` with a strict tag/attribute allow-list. A `uponSanitizeAttribute` hook strips any `src`/`href` that isn't `https?://`, root-relative, fragment, `mailto:`, or `tel:` — so `data:`, `javascript:`, `vbscript:`, `file:` URIs are removed. |
| **I** nformation disclosure — exfiltration via `<img src="https://attacker">` referrer | CSP `connect-src 'self'` (report-only currently) and `Referrer-Policy: strict-origin-when-cross-origin` on every response constrain leaks. |
| **D** enial of service — pathological markdown that hangs Marked | Marked is fast on bounded inputs. Course content is admin-authored, so attacker would need to compromise the admin first. Acceptable. |

### Surface 4 — Public listing pages and detail routes

Public, read-only, no user input. Threats are mostly about availability and data integrity — content collections are loaded at build/SSR time from disk; no DB to inject into.

| Threat | Mitigation |
|---|---|
| **T** ampering — modified content not detected | We rely on git history + filesystem permissions on the host. No checksum verification at render time (overkill for this scale). |
| **D** enial of service — request flood | Hosting platform's responsibility (CDN, rate limit at edge). Application has no per-IP throttle on public reads. |

### Surface 5 — Session cookie

`admin_session=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`

| Threat | Mitigation |
|---|---|
| **T** ampering — flip a bit in the cookie | Signature mismatch → reject. |
| **I** nformation disclosure — XSS reads document.cookie | `HttpOnly` flag prevents JS access. CSP report-only currently logs but doesn't block XSS attempts; tightening planned. |
| **R** eplay — stolen cookie reused | Token includes `created` timestamp; rejected after 24h. No revocation list — relies on short lifetime + secret rotation if needed. |
| **CSRF** — attacker site triggers admin action | `SameSite=Strict` blocks cross-site cookie attachment. Admin form submissions are same-origin. |

---

## Known accepted risks

| Risk | Why we accept it for now |
|---|---|
| Single-instance rate-limiter (in-memory) | Project deploys to a single Node process today. If we ever scale horizontally, swap for Redis-backed bucket. |
| `'unsafe-inline'` in CSP | Required by Astro's current hydration. Running CSP report-only until we adopt Astro's nonce-based experimental CSP support, then enforce. |
| @astrojs/node Server-Islands DoS (GHSA-3rmj-9m5h-8fpv) | We don't use Server Islands; vulnerability is in a feature path that doesn't execute in our codebase. Tracked in `SECURITY.md`. Re-evaluate at every Astro version bump. |
| No MFA on admin | Single-maintainer, threat model is brute-force and credential stuffing. Strong password + rate limit + HttpOnly cookie is proportionate. Reconsider if multi-admin. |
| No IP allowlist on admin | Convenience for the maintainer. Reconsider if the deployed environment exposes admin to the open internet. |

---

## Out of scope

- Hosting-layer attacks (BGP, DNS hijacks, certificate misissuance) — platform problem
- Compromise of the maintainer's machine / credentials — operational hygiene
- Supply chain attacks on `npm install` — partially mitigated by `npm audit` + Dependabot + lockfile; full provenance via SLSA L2 in release workflow
- Physical access to the deployment host — platform problem

---

## When to update this document

- A new public surface is added (e.g., comments, registration)
- The auth flow changes (MFA, OAuth, multi-user)
- A new content type is added to the admin API
- We adopt a new rendering pipeline (e.g., MDX → server-side template engine)
- A real incident reveals a gap

Linked from `SECURITY.md` and `CONTRIBUTING.md` so contributors know the threat model exists and where to find it.

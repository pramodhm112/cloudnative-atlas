# GitHub Repository Settings Runbook

A step-by-step guide for the repo owner to apply the security and process settings recommended by Phase 5 of the Best-Practices roadmap. None of this is automatable from the codebase — it has to be configured in the GitHub web UI.

Estimated time: **15–20 minutes** end-to-end.

> All paths below assume you're on the repo's settings page: `https://github.com/<owner>/cloudnative-atlas/settings`.

---

## 1. Branch Protection on `main`  *(highest impact)*

**Why:** Prevents accidental force-pushes, ensures CI passes before merge, and ties commits to verified identities.

**Path:** `Settings → Branches → Add branch protection rule`

Branch name pattern: `main`

Recommended toggles:

| Setting | Value | Why |
|---|---|---|
| Require a pull request before merging | ✅ | Forces every change through PR review |
| Required approvals | `1` | Even solo, you can self-approve via a teammate later — for now this guards against accidental direct pushes |
| Dismiss stale pull request approvals when new commits are pushed | ✅ | Re-review any time the diff changes |
| Require review from Code Owners | ☐ | Skip — no CODEOWNERS file yet (worth adding when team grows) |
| Require status checks to pass before merging | ✅ | |
| ↳ Require branches to be up to date before merging | ✅ | Prevents merging stale branches that would conflict |
| ↳ Status checks: select `Build & Typecheck`, `Dependency Audit` | ✅ | These are the jobs from `ci.yml`. Add `Analyze (javascript-typescript)` once CodeQL has run at least once |
| Require conversation resolution before merging | ✅ | No unresolved review comments slip through |
| Require signed commits | ✅ | See section 2 below for how to set up GPG/SSH signing |
| Require linear history | ✅ | Forces squash- or rebase-merge — no merge bubbles |
| Require deployments to succeed before merging | ☐ | We don't have an environment-gated deploy yet |
| Lock branch | ☐ | Allow merges, just gate them |
| Do not allow bypassing the above settings | ✅ | Even admins go through PRs — easier to audit later |
| Restrict who can push to matching branches | ☐ | Default is everyone with push access; tighten if multi-team |
| Allow force pushes | ☐ | Never |
| Allow deletions | ☐ | Never |

Save.

---

## 2. Signed Commits Setup  *(local machine, one-time)*

Required by the branch-protection rule above. SSH-key signing is simpler than GPG and works with any modern git.

```bash
# 1. Generate a dedicated signing key (or reuse an existing SSH key)
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519_signing

# 2. Tell git to sign with it
git config --global user.signingkey ~/.ssh/id_ed25519_signing.pub
git config --global gpg.format ssh
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# 3. Add the public key to GitHub as a SIGNING key
#    (different from the SSH auth key — same key file, different listing)
#    Settings → SSH and GPG keys → New SSH key → Key type: "Signing Key"
cat ~/.ssh/id_ed25519_signing.pub  # paste into GitHub
```

Verify a commit shows "Verified" badge in the GitHub UI after pushing.

---

## 3. Private Vulnerability Reporting

**Why:** Live the "report privately" promise from `SECURITY.md` — without this enabled, security researchers have no GitHub-native path to report.

**Path:** `Settings → Code security and analysis`

Toggle **Private vulnerability reporting** → **Enable**

After enabling, a **"Report a vulnerability"** button appears under the repo's **Security** tab. Reports come into a private advisory thread visible only to maintainers.

---

## 4. Dependabot Alerts & Security Updates

Dependabot **version updates** are already configured via `.github/dependabot.yml` (Phase 2). Two GitHub-side toggles complement it:

**Path:** `Settings → Code security and analysis`

| Setting | Action | Why |
|---|---|---|
| Dependency graph | Enable | Required for the others to work |
| Dependabot alerts | Enable | Notifies you of new CVEs in dependencies |
| Dependabot security updates | Enable | Auto-opens PRs for known-vuln dependencies (separate from version bump PRs) |

---

## 5. Code Scanning (CodeQL)  *(requires GitHub Advanced Security on private repos)*

The CodeQL workflow file is committed (`.github/workflows/codeql.yml`). It will fail with a clear error if GHAS isn't available.

**Path:** `Settings → Code security and analysis`

| Option | Action |
|---|---|
| If repo is **public** | Toggle "CodeQL analysis" → **Set up** → choose **Default** or **Advanced (workflow file)** |
| If repo is **private** + has GHAS | Same as above |
| If repo is **private** + no GHAS | Either purchase GHAS, or **delete** `.github/workflows/codeql.yml` to silence the failing workflow until then |

---

## 6. Secret Scanning + Push Protection  *(GHAS or public repo)*

**Path:** `Settings → Code security and analysis`

| Setting | Action | Why |
|---|---|---|
| Secret scanning | Enable | Scans the repo for leaked tokens |
| Push protection | Enable | Blocks `git push` if it contains a known secret pattern (saves you from a 2 AM rotation) |

---

## 7. Actions Permissions

**Path:** `Settings → Actions → General`

| Setting | Recommended Value |
|---|---|
| Actions permissions | Allow `<owner>` actions and reusable workflows, plus selected actions |
| Allowed actions and reusable workflows | Pin specific marketplace actions explicitly (we use `actions/*`, `github/codeql-action/*`, `slsa-framework/slsa-github-generator/*`, `softprops/action-gh-release`) |
| Workflow permissions | **Read repository contents and packages permissions** (read-only by default; individual workflows escalate via their own `permissions:` block) |
| Allow GitHub Actions to create and approve pull requests | ✅ (needed for Dependabot to auto-merge eligible PRs once you've set up auto-merge) |

---

## 8. Releases & Tags

When you push your first version tag (e.g. `git tag v0.1.0 && git push --tags`), the `release.yml` workflow:

1. Builds the site
2. Generates a CycloneDX SBOM
3. Packs `dist/` into `dist-v0.1.0.tar.gz`
4. Uploads both files to a GitHub Release
5. Generates SLSA L2 provenance via `slsa-framework/slsa-github-generator` (signed via Sigstore + recorded in Rekor)

To verify a release artifact downstream:

```bash
# Install slsa-verifier
go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest

# Verify the tarball came from this repo's release workflow
slsa-verifier verify-artifact \
  --provenance-path dist-v0.1.0.tar.gz.intoto.jsonl \
  --source-uri github.com/<owner>/cloudnative-atlas \
  dist-v0.1.0.tar.gz
```

---

## 9. Sanity Check

Once all settings are saved, push a trivial change to a branch and open a PR. Confirm:

- [ ] PR cannot be merged without the `Build & Typecheck` and `Dependency Audit` checks passing
- [ ] PR cannot be merged without 1 approval
- [ ] Pushing an unsigned commit gets rejected
- [ ] Pushing a deliberate fake secret (e.g. `AKIAIOSFODNN7EXAMPLE`) is blocked by push protection
- [ ] Dependabot has opened (or will open) at least one update PR within 24h

If all checks pass, the repo is at the recommended hardening level for a single-maintainer proprietary project.

---

## What's intentionally NOT here

| Item | Why |
|---|---|
| OpenSSF Best Practices Badge | Requires a public repo |
| DCO sign-off (`git commit -s`) | OSS contributor record convention; signed commits give us the same audit trail |
| GitHub Discussions | No community to host discussions yet |
| Issue templates / PR templates | Add when repo opens to external contributors; for now, `CONTRIBUTING.md` covers the expectations |
| Security policy declaration | Already done via `SECURITY.md` — GitHub auto-detects it |

---

## When to revisit

Once a year, walk through this doc top-to-bottom. GitHub adds features (recently: push protection, secret scanning custom patterns) that should be evaluated for adoption. Also re-check the branch protection settings — some defaults shift between GitHub UI revisions.

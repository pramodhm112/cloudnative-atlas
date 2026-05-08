-- ============================================================================
-- CloudNative Atlas — initial schema (Supabase / PostgreSQL)
-- ============================================================================
-- Apply against a fresh Supabase project via:
--   supabase SQL Editor → paste this whole file → Run
-- Idempotent only the first time. Re-running will fail on duplicate-create.
--
-- Tables match the shapes already in src/content/** (see content.config.ts +
-- src/lib/*-manager.ts). Columns are snake_case in Postgres; the manager
-- layer maps to the camelCase JS shape on the way out.
--
-- Row Level Security is ENABLED on every table with NO policies. This means:
--   - Anon key (build time, browser): zero rows visible. By design — the public
--     site builds via service role at build time, no anon Supabase calls today.
--   - Service role key (server): full access. Used by Astro server, build, and
--     migration scripts.
--
-- If you ever expose the anon key to the browser, add explicit policies first.
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
create type content_category as enum ('DevOps', 'Cloud', 'AI', 'Security');
create type content_difficulty as enum ('Beginner', 'Intermediate', 'Advanced');
create type publish_status as enum ('draft', 'published');

-- ── Blog posts ──────────────────────────────────────────────────────────────
create table blog_posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title       text not null,
  description text not null,
  pub_date    date not null,
  author      text not null default 'CloudNative Atlas Team',
  category    content_category not null,
  tags        text[] not null default '{}',
  image       text,
  status      publish_status not null default 'published',
  body        text not null default '',           -- raw MDX body
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index blog_posts_status_pub_date_idx on blog_posts (status, pub_date desc);
create index blog_posts_category_idx on blog_posts (category, status, pub_date desc);
create index blog_posts_tags_idx on blog_posts using gin (tags);

-- ── Practice tests ──────────────────────────────────────────────────────────
-- body holds the raw MDX with the existing `> question` / `> * answer` /
-- `> - wrong` blockquote syntax that lib/content-manager.ts:parseQuestions
-- already understands. Don't normalise questions into a child table — the
-- existing parser is the single source of truth for that grammar.
create table practice_tests (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title         text not null,
  description   text not null,
  category      content_category not null,
  difficulty    content_difficulty not null,
  time_limit    int,
  passing_score int not null default 70 check (passing_score between 0 and 100),
  tags          text[] not null default '{}',
  status        publish_status not null default 'published',
  body          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index practice_tests_status_idx on practice_tests (status, category);
create index practice_tests_tags_idx on practice_tests using gin (tags);

-- ── Projects ────────────────────────────────────────────────────────────────
create table projects (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title        text not null,
  description  text not null,
  pub_date     date not null,
  author       text not null default 'CloudNative Atlas Team',
  category     content_category not null,
  difficulty   content_difficulty not null,
  tags         text[] not null default '{}',
  technologies text[] not null default '{}',
  image        text,
  source_url   text,
  status       publish_status not null default 'published',
  body         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_status_pub_date_idx on projects (status, pub_date desc);
create index projects_category_idx on projects (category, status, pub_date desc);
create index projects_tags_idx on projects using gin (tags);

-- ── Courses ─────────────────────────────────────────────────────────────────
-- modules holds the full nested module → topic → questions tree as JSONB.
-- Rationale: every course read walks the entire tree to compute prev/next
-- nav (getCourseNavSequence in course-manager.ts). No query needs cross-
-- course topic lookup. JSONB keeps the nested write atomic and matches the
-- existing JSON-file shape 1:1.
create table courses (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  title       text not null,
  description text not null,
  category    content_category not null,
  difficulty  content_difficulty not null,
  tags        text[] not null default '{}',
  status      publish_status not null default 'draft',
  modules     jsonb not null default '[]'::jsonb check (jsonb_typeof(modules) = 'array'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index courses_status_idx on courses (status);

-- ── Settings ────────────────────────────────────────────────────────────────
-- Single-row table. The boolean PK + CHECK enforces "exactly one row" at the
-- schema level, so there's no race window where two settings rows could exist.
create table settings (
  singleton            boolean primary key default true check (singleton),
  enable_presentations boolean not null default false,
  enable_videos        boolean not null default false,
  updated_at           timestamptz not null default now()
);

insert into settings (singleton) values (true);

-- ── Contact messages ────────────────────────────────────────────────────────
-- id stays text/16-hex (matches crypto.randomBytes(8).toString('hex')) so
-- existing application logs and admin URLs continue to correlate.
create table contact_messages (
  id          text primary key check (id ~ '^[0-9a-f]{16}$'),
  received_at timestamptz not null default now(),
  ip          inet,
  user_agent  text,
  read        boolean not null default false,
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  dial_code   text not null,
  mobile      text not null,
  country     char(2) not null,
  message     text not null
);

create index contact_messages_received_idx on contact_messages (received_at desc);
-- Partial index for the unread-count badge on /admin and /admin/messages
create index contact_messages_unread_idx on contact_messages (received_at desc) where read = false;

-- ── Admin sessions (replaces astro:session FS driver) ───────────────────────
-- Astro's SessionDriver interface keys by string id; we generate a UUID per
-- session and store the serialised session object as JSONB. expires_at is
-- enforced at read time (driver returns null on expiry) and a periodic
-- cleanup deletes stale rows.
create table admin_sessions (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index admin_sessions_expires_idx on admin_sessions (expires_at);

-- ── Updated-at maintenance ──────────────────────────────────────────────────
-- One trigger function reused across every table that has updated_at.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_blog_posts_updated_at      before update on blog_posts      for each row execute function set_updated_at();
create trigger trg_practice_tests_updated_at  before update on practice_tests  for each row execute function set_updated_at();
create trigger trg_projects_updated_at        before update on projects        for each row execute function set_updated_at();
create trigger trg_courses_updated_at         before update on courses         for each row execute function set_updated_at();
create trigger trg_settings_updated_at        before update on settings        for each row execute function set_updated_at();
create trigger trg_admin_sessions_updated_at  before update on admin_sessions  for each row execute function set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Enable on every table with ZERO policies. Effect:
--   anon key   → 0 rows (denied)
--   service    → bypasses RLS, full access
-- The Astro server uses service-role for both reads and writes today.
alter table blog_posts        enable row level security;
alter table practice_tests    enable row level security;
alter table projects          enable row level security;
alter table courses           enable row level security;
alter table settings          enable row level security;
alter table contact_messages  enable row level security;
alter table admin_sessions    enable row level security;

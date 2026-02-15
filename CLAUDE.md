# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spring FES Video (Spring Festival Video) — an AI-powered story-to-video generation platform. Users input a story, select a visual style, and the app orchestrates: story → scene descriptions (LLM) → images → videos, with user confirmation at each step.

## Commands

All commands run from the `hello-nextjs/` directory:

```bash
npm run dev      # Dev server on http://localhost:3000
npm run build    # Production build (also validates TypeScript)
npm run lint     # ESLint
```

There is no test runner configured. Validation is `lint` + `build` + manual browser testing for UI changes.

To initialize the full environment from the repo root: `./init.sh` (installs deps, starts dev server).

## Architecture

### Tech Stack

- **Frontend/Backend:** Next.js 16 with App Router, TypeScript (strict), Tailwind CSS 4 (dark mode forced)
- **Database/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage)
- **AI Services:** Zhipu AI GLM-4 (story→scenes LLM), Volcano Engine Seedream (image gen), Volcano Engine Seedance (video gen)

### Application Code (`hello-nextjs/src/`)

```
app/                    # Next.js App Router — pages + API routes
  api/                  # All backend logic lives here as route handlers
    projects/           # CRUD for projects
    scenes/             # Scene updates and confirmations
    generate/           # AI generation endpoints (scenes, images, videos)
    materials/          # Material management (audio/video/image/text references)
    storage/            # Signed URL generation
    parse-intent/       # Natural language intent parsing
  projects/[id]/        # Project detail page (main working view)
  login/, register/     # Auth pages
  create/               # Project creation page

components/             # React components organized by domain
  auth/                 # LoginForm, RegisterForm, LogoutButton
  project/              # ProjectCard, CreateProjectForm, ModeSelector, StageIndicator
  scene/                # SceneDescriptionList, SceneImageList, SceneVideoList + cards
  materials/            # NaturalLanguageInput for material management
  ui/                   # Toast, Spinner, Skeleton

lib/                    # Service layer and utilities
  ai/                   # AI API wrappers: zhipu.ts, volc-image.ts, volc-video.ts
  db/                   # Database query helpers: projects.ts, scenes.ts, materials.ts, media.ts, video-chains.ts
  supabase/             # Client creation: server.ts, client.ts, middleware.ts
  video/                # frame-extractor.ts (for video chaining)
  utils.ts              # cn() helper for Tailwind class merging

types/                  # TypeScript types
  database.ts           # Supabase-generated DB types
  ai.ts                 # AI service types

middleware.ts           # Protects /projects and /create routes; redirects logged-in users from /login, /register
```

### Core Data Flow

The app uses a staged workflow tracked by `project.stage`: `draft → scenes → images → videos → completed`. Each scene tracks independent statuses for description, image, and video with confirm flags. Video generation is async — tasks are submitted, then polled via `GET /api/generate/video/task/:taskId`.

### Key Patterns

- **Server vs Client Components:** Server components for data fetching (async), client components (`"use client"`) for interactivity
- **AI API calls:** Include retry logic with exponential backoff and 60-second timeouts
- **Video chaining:** Extracts last frame from a completed video to use as first frame of the next video, enabling longer sequences (each video is max ~15 seconds)
- **Supabase clients:** Three variants — server (for API routes), client (for browser), middleware (for auth session refresh)

### Database Tables

`projects` → `scenes` → `images` / `videos` (1:many chain). Also: `materials` (scene attachments), `video_chains` / `video_chain_items` (linked video sequences).

## Environment Variables

Required in `hello-nextjs/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ZHIPU_API_KEY
VOLC_API_KEY
```

## Workflow Conventions

- Task definitions live in `task.json` at the repo root; progress is logged in `progress.txt`
- Bilingual codebase — comments and UI text are primarily in Chinese
- When making changes: pass `lint` + `build` before considering work complete
- For UI changes, browser testing is expected (the app requires Supabase + API keys to fully function)

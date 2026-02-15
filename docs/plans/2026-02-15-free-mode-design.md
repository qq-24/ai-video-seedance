# Free Mode Design — Materials, Video Chaining, Natural Language Generation

**Date:** 2026-02-15
**Status:** Approved

## Overview

Add a "Free Mode" to the project detail page alongside the existing "Story Mode" stage-based workflow. Free Mode gives users per-scene creative controls: a materials panel, natural language generation input, and video chaining for longer sequences.

## Approach

**Approach A: Free Mode Tab** — a mode toggle on the project detail page. Story Mode remains unchanged. Free Mode renders all scenes in a flat list where each scene is an expanded editor with full creative controls. The DB already has `scene.mode` (`story` | `free`) and a `ModeSelector` component exists.

## Design

### 1. Mode System & Navigation

- Project detail page gets a mode toggle at the top (existing `ModeSelector` component)
- **Story Mode** (default): current stage-based flow, unchanged
- **Free Mode**: flat scene list, each scene has materials panel + NL input + chain controls, no stage gates
- Switching mode at project level sets all scenes to that mode
- Scenes created in free mode get `mode: 'free'`

### 2. Per-Scene Materials Panel

Each Free Mode scene card includes a collapsible materials panel:

```
┌─ Scene 3 ──────────────────────────────────┐
│ [Description text]                          │
│                                             │
│ ▼ Materials (3)                             │
│  Audio: bgm.mp3              [x]            │
│  Image: reference.png        [x]            │
│  Text: "supplementary desc"  [x]            │
│                                             │
│  [+ Upload Audio]  [+ Upload Image]         │
│                                             │
│  ┌─ NL Input ─────────────────────────┐     │
│  │ "generate a cyberpunk cityscape"    │ >   │
│  └────────────────────────────────────┘     │
│                                             │
│  [Generate Video]  [Continue ▾]             │
└─────────────────────────────────────────────┘
```

- Upload buttons → file picker → Supabase Storage via `/api/materials/upload` → attach via `/api/materials/attach`
- [x] button detaches material (calls `/api/materials/detach`), does not delete file
- Panel collapsed by default, shows count badge
- All attached materials are included as inputs when generating video for the scene

### 3. Natural Language Input

Single text input per scene. User types a command, system:

1. Parses intent via `/api/parse-intent` (Zhipu GLM → `generate_image` | `generate_text` | `generate_video`)
2. Executes:
   - `generate_image` → image generation → save as material → attach to scene
   - `generate_text` → Zhipu text generation → save as text material → attach to scene
   - `generate_video` → trigger video generation for scene with attached materials
3. Shows inline feedback: loading state → result preview

Existing `NaturalLanguageInput.tsx` has most of the flow. Main work: wire results to materials system, integrate into Free Mode scene card.

### 4. Video Chaining

Two chaining modes:

**Within a scene:** "Continue" button on a scene with an existing video. Extracts last frame → generates new video segment → appends to chain.

**Across scenes:** "Continue from Scene N" option. Uses previous scene's last video's last frame as starting image for current scene.

Data model (already exists): `video_chains`, `video_chain_items` (with `parent_video_id`), `frame-extractor.ts` (ffmpeg + client fallback).

UI:
```
[Generate Video]  [Continue ▾]
                   ├─ Continue this scene
                   └─ Continue from Scene 2
```

API flow: extract frame → generate video with frame as input → append to chain.

### 5. Wiring Materials into Generation

When generating video in Free Mode, attached materials are mapped into the Seedance `content` array:
- Image materials → `{ "type": "image_url", ... }`
- Video materials → `{ "type": "video_url", ... }`
- Text materials → appended to the text content entry
- Audio materials → future integration point

`volc-video.ts` `createVideoTask` gets an optional `materials` parameter. Story Mode generation unchanged.

### 6. New Components

```
components/scene/
  FreeSceneCard.tsx        # Full scene editor for free mode
  FreeSceneList.tsx        # List of FreeSceneCards + "Add Scene" button
  MaterialsPanel.tsx       # Collapsible materials list + upload buttons
  VideoContinueMenu.tsx    # Dropdown for chain options
```

`FreeSceneList.tsx` replaces stage-specific lists when in Free Mode. Renders all scenes regardless of stage.

### 7. API Routes

**Existing (no changes):**
- `/api/materials/*` — CRUD, upload, attach, detach
- `/api/parse-intent` — intent classification
- `/api/generate/image/[sceneId]` — image generation
- `/api/generate/video/scene/[sceneId]` — video generation

**Modified:**
- `/api/generate/video/scene/[sceneId]` — add materials inclusion for `free` mode scenes

**New:**
- `POST /api/video/extract-frame` — extract last frame from a video
- `POST /api/generate/video/continue` — extract frame + generate video + append to chain
- `POST /api/generate/text` — generate text via Zhipu, save as material

### 8. Database Changes

Minimal. Schema already supports this:
- `scene.mode` (`story` | `free`) — exists
- `materials` table — exists
- `video_chains` / `video_chain_items` — exist

One verification needed: confirm chain tables are in the SQL migration file.

### 9. Error Handling

Follows existing patterns:
- AI API failures → toast + retry button
- Material upload failures → inline error in materials panel
- Frame extraction failure → client-side canvas fallback (already in `frame-extractor.ts`)
- Intent parsing failure → "Couldn't understand, try rephrasing"
- Chain continuation with no prior video → disabled button with tooltip

## Scope Summary

| Layer | New | Modified |
|-------|-----|----------|
| Components | `FreeSceneCard`, `FreeSceneList`, `MaterialsPanel`, `VideoContinueMenu` | `ModeSelector`, project detail page |
| API Routes | `/api/video/extract-frame`, `/api/generate/video/continue`, `/api/generate/text` | `/api/generate/video/scene/[sceneId]` |
| Lib | — | `volc-video.ts`, `NaturalLanguageInput.tsx` |
| DB/Migration | Verify chain tables | — |

# Tasks

## Phase 1: Database Architecture Extension

- [ ] Task 1: Extend database type definitions
  - [ ] SubTask 1.1: Add `materials` table type definition in `src/types/database.ts` (supporting audio, video, image, text types)
  - [ ] SubTask 1.2: Add `video_chains` table type definition (for head-to-tail frame continuation)
  - [ ] SubTask 1.3: Modify `scenes` table type, add `mode` field to distinguish story mode/free mode
  - [ ] SubTask 1.4: Add `scene_materials` junction table type definition

- [ ] Task 2: Create database migration script
  - [ ] SubTask 2.1: Write Supabase SQL migration script to create new tables
  - [ ] SubTask 2.2: Add necessary indexes and constraints

## Phase 2: Material Management Functionality

- [ ] Task 3: Create material upload API
  - [ ] SubTask 3.1: Create `POST /api/materials/upload` route to handle file uploads
  - [ ] SubTask 3.2: Implement file type validation and size limits
  - [ ] SubTask 3.3: Integrate Supabase Storage

- [ ] Task 4: Create material management API
  - [ ] SubTask 4.1: Create `GET/POST/DELETE /api/materials` routes
  - [ ] SubTask 4.2: Create `POST /api/materials/attach` to associate materials with scenes
  - [ ] SubTask 4.3: Create `POST /api/materials/detach` to remove materials from scenes

- [ ] Task 5: Create material database operation functions
  - [ ] SubTask 5.1: Implement CRUD operations in `src/lib/db/materials.ts`
  - [ ] SubTask 5.2: Implement material-to-scene association operations

## Phase 3: On-the-fly Material Generation Functionality

- [ ] Task 6: Extend AI services
  - [ ] SubTask 6.1: Add text generation function in `src/lib/ai/zhipu.ts` (for generating descriptions)
  - [ ] SubTask 6.2: Create `POST /api/generate/text` route
  - [ ] SubTask 6.3: Create `POST /api/generate/material/image` route (on-the-fly image generation)

- [ ] Task 7: Implement natural language intent recognition
  - [ ] SubTask 7.1: Add intent recognition function in `src/lib/ai/zhipu.ts`
  - [ ] SubTask 7.2: Create `POST /api/parse-intent` route to parse user natural language input
  - [ ] SubTask 7.3: Implement intent routing (generate image/generate text/other)

## Phase 4: Head-to-Tail Frame Continuation Feature

- [ ] Task 8: Implement last frame extraction
  - [ ] SubTask 8.1: Create `src/lib/video/frame-extractor.ts` video frame extraction utility
  - [ ] SubTask 8.2: Create `POST /api/video/extract-last-frame` route

- [ ] Task 9: Implement video chain management
  - [ ] SubTask 9.1: Create `src/lib/db/video-chains.ts` database operations
  - [ ] SubTask 9.2: Create `POST /api/video-chains` to create video chain
  - [ ] SubTask 9.3: Create `POST /api/video-chains/[id]/append` to append video to chain
  - [ ] SubTask 9.4: Create `GET /api/video-chains/[id]` to get video chain details

- [ ] Task 10: Implement continuation video generation
  - [ ] SubTask 10.1: Modify `src/lib/ai/volc-video.ts` to support first frame input
  - [ ] SubTask 10.2: Create `POST /api/generate/video/continue` continuation generation route
  - [ ] SubTask 10.3: Implement video chain preview and export functionality

## Phase 5: Frontend Component Development

- [ ] Task 11: Create project mode selector component
  - [ ] SubTask 11.1: Create `src/components/project/ModeSelector.tsx` mode selector
  - [ ] SubTask 11.2: Modify `CreateProjectForm.tsx` to integrate mode selection

- [ ] Task 12: Create material panel component
  - [ ] SubTask 12.1: Create `src/components/materials/MaterialPanel.tsx` material panel
  - [ ] SubTask 12.2: Create `src/components/materials/MaterialCard.tsx` individual material card
  - [ ] SubTask 12.3: Create `src/components/materials/MaterialUploader.tsx` material upload component
  - [ ] SubTask 12.4: Create `src/components/materials/MaterialGenerator.tsx` material generation component

- [ ] Task 13: Create natural language input component
  - [ ] SubTask 13.1: Create `src/components/materials/NaturalLanguageInput.tsx` natural language input box
  - [ ] SubTask 13.2: Implement intent recognition and response display

- [ ] Task 14: Create video chain component
  - [ ] SubTask 14.1: Create `src/components/video/VideoChainView.tsx` video chain display
  - [ ] SubTask 14.2: Create `src/components/video/ContinueVideoButton.tsx` continue generation button
  - [ ] SubTask 14.3: Create `src/components/video/VideoChainPreview.tsx` chain preview component

- [ ] Task 15: Modify scene management components
  - [ ] SubTask 15.1: Modify `SceneDescriptionList.tsx` to support free mode
  - [ ] SubTask 15.2: Modify `SceneImageList.tsx` to integrate material panel
  - [ ] SubTask 15.3: Modify `SceneVideoList.tsx` to integrate video chain functionality

## Phase 6: Integration and Testing

- [ ] Task 16: Integration testing
  - [ ] SubTask 16.1: Test material upload and management flow
  - [ ] SubTask 16.2: Test on-the-fly material generation functionality
  - [ ] SubTask 16.3: Test head-to-tail frame continuation functionality
  - [ ] SubTask 16.4: Test natural language invocation functionality

- [ ] Task 17: Documentation update
  - [ ] SubTask 17.1: Update README.md to describe new features
  - [ ] SubTask 17.2: Update `.env.local.example` to add new configuration items

# Task Dependencies

- Task 2 depends on Task 1
- Tasks 3, 4 depend on Task 2
- Task 5 depends on Task 2
- Tasks 6, 7 can run in parallel
- Tasks 8, 9, 10 depend on Task 2
- Task 11 can start independently
- Tasks 12, 13, 14 can run in parallel
- Task 15 depends on Tasks 12, 14
- Task 16 depends on Tasks 3-15
- Task 17 depends on Task 16

# Multimodal Video Creation and Head-to-Tail Frame Continuation Feature Spec

## Why

The current system only supports a single workflow of "story text → scene splitting → images → videos" and cannot meet:
1. Users wanting to use multiple types of materials (audio, video, images, text) as reference inputs
2. Generated video duration is limited (max 15 seconds), unable to produce long videos
3. Lack of on-the-fly material generation capability, users need to prepare materials externally

## What Changes

- New multimodal material input system (audio, video, images, text)
- New on-the-fly material generation feature (images, text, video can be generated within the tool)
- New head-to-tail frame continuation feature, supporting chain-style video extension
- New natural language-driven material generation invocation
- Refactored project stage flow, supporting more flexible creation modes

## Impact

- Affected specs: project creation flow, scene management, material management, video generation flow
- Affected code:
  - `src/types/database.ts` - Database type extensions
  - `src/lib/ai/*` - AI service extensions
  - `src/components/project/*` - Project creation components
  - `src/components/scene/*` - Scene management components
  - `src/app/api/*` - API route extensions

## ADDED Requirements

### Requirement: Multimodal Material Input

The system should support users importing multiple types of materials as reference inputs when creating scenes.

#### Scenario: Import Audio Material
- **WHEN** user clicks "Import Audio" button
- **THEN** the system allows user to upload audio files (supports mp3, wav, m4a formats)
- **AND** audio file is stored in Supabase Storage
- **AND** audio material is associated with the current scene

#### Scenario: Import Video Material
- **WHEN** user clicks "Import Video" button
- **THEN** the system allows user to upload video files (supports mp4, mov, webm formats)
- **AND** video file is stored in Supabase Storage
- **AND** video material is associated with the current scene

#### Scenario: Import Image Material
- **WHEN** user clicks "Import Image" button
- **THEN** the system allows user to upload image files (supports png, jpg, webp formats)
- **AND** image file is stored in Supabase Storage
- **AND** image material is associated with the current scene

#### Scenario: Add Text Material
- **WHEN** user clicks "Add Text" button
- **THEN** the system displays a text input box
- **AND** user-entered text is saved as reference material

### Requirement: On-the-fly Material Generation

The system should allow users to generate images, text descriptions, and video clips on-the-fly during the creation process.

#### Scenario: On-the-fly Image Generation
- **WHEN** user clicks "Generate Image" and inputs a description
- **THEN** the system calls the image generation AI to generate an image
- **AND** the generated image automatically becomes a reference material for the current scene

#### Scenario: On-the-fly Text Description Generation
- **WHEN** user clicks "Generate Description" and inputs a brief prompt
- **THEN** the system calls the text AI to generate a detailed description
- **AND** the generated text serves as reference material or scene description

#### Scenario: On-the-fly Video Clip Generation
- **WHEN** user clicks "Generate Video Clip" and provides a description
- **THEN** the system calls the video generation AI to generate a short video
- **AND** the generated video serves as reference material

### Requirement: Natural Language Material Invocation

The system should support users calling material generation features through natural language descriptions.

#### Scenario: Natural Language Image Generation
- **WHEN** user enters "Generate an image of a beach at sunset" in the input box
- **THEN** the system recognizes the intent as image generation
- **AND** extracts the description "beach at sunset"
- **AND** calls the image generation API

#### Scenario: Natural Language Description Generation
- **WHEN** user enters "Help me write a description of a city nightscape" in the input box
- **THEN** the system recognizes the intent as text generation
- **AND** calls the text generation API

### Requirement: Head-to-Tail Frame Continuation Feature

The system should support using the last frame of a generated video as the first frame of a new video, enabling chain-style video extension.

#### Scenario: Extract Last Frame as First Frame
- **WHEN** user clicks "Continue Generation" button
- **THEN** the system automatically extracts the last frame of the current video
- **AND** uses that frame as the first frame reference for new video generation

#### Scenario: Chain Video Generation
- **WHEN** user completes a video generation and selects "Continue Extending"
- **THEN** the system creates a new video task
- **AND** the new task uses the last frame of the previous video as its first frame
- **AND** user can input new action descriptions

#### Scenario: Video Chain Management
- **WHEN** user views the video chain
- **THEN** the system displays all continued video segments
- **AND** user can preview the complete concatenated result
- **AND** user can regenerate any segment in the chain

### Requirement: Material Panel

The system should provide a unified material management panel for users to manage all materials conveniently.

#### Scenario: View Scene Materials
- **WHEN** user opens scene details
- **THEN** the system displays all materials associated with that scene (images, videos, audio, text)
- **AND** each material displays a type icon and preview

#### Scenario: Delete Material
- **WHEN** user clicks the delete button on a material
- **THEN** the system removes that material from the scene
- **AND** the material file is deleted from storage

#### Scenario: Material Sorting
- **WHEN** user drags and drops materials
- **THEN** the system updates the display order of materials
- **AND** the order affects reference priority during generation

## MODIFIED Requirements

### Requirement: Project Creation Flow

Original requirement: Users create a project by inputting story title, content, and selecting a style.

Modified to: Users can choose between two creation modes:
1. **Story Mode** (original): Input complete story, AI automatically splits into scenes
2. **Free Mode** (new): Manually create scenes, flexibly add various materials

#### Scenario: Select Creation Mode
- **WHEN** user creates a new project
- **THEN** the system displays mode selection interface
- **AND** user can choose "Story Mode" or "Free Mode"

### Requirement: Scene Management

Original requirement: Scenes only contain description text and generated images/videos.

Modified to: Scenes can contain multiple material types, supporting flexible material combinations.

#### Scenario: Scene Material Composition
- **WHEN** user edits a scene
- **THEN** the system allows adding multiple different types of materials
- **AND** user can set the purpose of materials (reference/generation basis)

### Requirement: Video Generation

Original requirement: Generate videos using scene images and descriptions.

Modified to: Support multiple input combinations for video generation, including head-to-tail frame continuation.

#### Scenario: Multi-material Video Generation
- **WHEN** user triggers video generation
- **THEN** the system collects all materials in the scene
- **AND** generates video based on material types and user descriptions

## REMOVED Requirements

No requirements removed. Original features remain compatible.

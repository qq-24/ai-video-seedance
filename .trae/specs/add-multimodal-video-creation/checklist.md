# Checklist

## Database Architecture

- [ ] `materials` table type definition is correct, containing id, scene_id, type, storage_path, url, metadata, order_index, created_at fields
- [ ] `video_chains` table type definition is correct, containing id, project_id, scenes_order, created_at fields
- [ ] `scenes` table has new `mode` field, supporting 'story' and 'free' modes
- [ ] `scene_materials` junction table correctly defines many-to-many relationship between scenes and materials

## Material Upload Functionality

- [ ] Material upload API supports four types: audio, video, image, text
- [ ] File upload has type validation and size limits
- [ ] After successful upload, files are stored in Supabase Storage
- [ ] Database correctly records material information

## Material Management Functionality

- [ ] Materials can be correctly associated with scenes
- [ ] Materials can be removed from scenes
- [ ] When materials are deleted, storage files are also deleted
- [ ] Material sorting functionality works correctly

## On-the-fly Material Generation

- [ ] On-the-fly image generation works correctly, generated images are associated with scenes
- [ ] On-the-fly text description generation works correctly
- [ ] Natural language input correctly identifies generation intent
- [ ] Intent recognition results correctly route to corresponding generation APIs

## Head-to-Tail Frame Continuation Feature

- [ ] Can correctly extract the last frame of a video
- [ ] Extracted frame can be used as first frame input for new video
- [ ] Video chain correctly records continuation relationships
- [ ] Video chain preview can display complete concatenated result
- [ ] Any segment in the chain can be regenerated

## Frontend Components

- [ ] Project mode selector correctly displays both mode options
- [ ] Material panel correctly displays all materials associated with a scene
- [ ] Material cards display type icons and previews
- [ ] Material upload component supports drag-and-drop upload
- [ ] Natural language input box has good interactive experience
- [ ] Video chain component correctly displays continuation relationships
- [ ] Continue generation button works correctly

## Mode Switching

- [ ] Story mode maintains the original workflow unchanged
- [ ] Free mode allows manual scene creation and material adding
- [ ] Projects in both modes can complete the entire workflow

## Compatibility

- [ ] Existing project data is not affected
- [ ] Existing APIs maintain backward compatibility
- [ ] Existing frontend components work correctly without new features

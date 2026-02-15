-- 回滚脚本：撤销 20240115000000_add_multimodal_support.sql 的所有更改

-- 删除 Video Chain Items RLS 策略
DROP POLICY IF EXISTS "Users can delete video chain items in their chains" ON video_chain_items;
DROP POLICY IF EXISTS "Users can update video chain items in their chains" ON video_chain_items;
DROP POLICY IF EXISTS "Users can insert video chain items in their chains" ON video_chain_items;
DROP POLICY IF EXISTS "Users can view video chain items in their chains" ON video_chain_items;

-- 删除 Video Chains RLS 策略
DROP POLICY IF EXISTS "Users can delete video chains in their projects" ON video_chains;
DROP POLICY IF EXISTS "Users can update video chains in their projects" ON video_chains;
DROP POLICY IF EXISTS "Users can insert video chains in their projects" ON video_chains;
DROP POLICY IF EXISTS "Users can view video chains in their projects" ON video_chains;

-- 删除 Materials RLS 策略
DROP POLICY IF EXISTS "Users can delete materials in their scenes" ON materials;
DROP POLICY IF EXISTS "Users can update materials in their scenes" ON materials;
DROP POLICY IF EXISTS "Users can insert materials in their scenes" ON materials;
DROP POLICY IF EXISTS "Users can view materials in their scenes" ON materials;

-- 禁用 RLS
ALTER TABLE video_chain_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_chains DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

-- 删除索引
DROP INDEX IF EXISTS idx_video_chain_items_video_id;
DROP INDEX IF EXISTS idx_video_chain_items_chain_id;
DROP INDEX IF EXISTS idx_video_chains_project_id;
DROP INDEX IF EXISTS idx_materials_type;
DROP INDEX IF EXISTS idx_materials_scene_id;

-- 删除表
DROP TABLE IF EXISTS video_chain_items;
DROP TABLE IF EXISTS video_chains;
DROP TABLE IF EXISTS materials;

-- 删除 scenes 表的 mode 字段
ALTER TABLE scenes DROP COLUMN IF EXISTS mode;

-- 删除枚举类型
DROP TYPE IF EXISTS material_type;
DROP TYPE IF EXISTS scene_mode;

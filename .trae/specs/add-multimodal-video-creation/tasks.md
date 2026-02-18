# Tasks

## Phase 1: 数据库架构扩展

- [x] Task 1: 扩展数据库类型定义
  - [x] SubTask 1.1: 在 `src/types/database.ts` 中添加 `materials` 表类型定义（支持 audio, video, image, text 类型）
  - [x] SubTask 1.2: 添加 `video_chains` 表类型定义（用于首尾帧接续）
  - [x] SubTask 1.3: 修改 `scenes` 表类型，添加 `mode` 字段区分故事模式/自由模式
  - [x] SubTask 1.4: 添加 `video_chain_items` 表类型定义

- [x] Task 2: 创建数据库迁移脚本
  - [x] SubTask 2.1: 编写 Supabase SQL 迁移脚本创建新表
  - [x] SubTask 2.2: 添加必要的索引和约束

## Phase 2: 素材管理功能

- [x] Task 3: 创建素材上传 API
  - [x] SubTask 3.1: 创建 `POST /api/materials/upload` 路由处理文件上传
  - [x] SubTask 3.2: 实现文件类型验证和大小限制
  - [x] SubTask 3.3: 集成 Supabase Storage 存储

- [x] Task 4: 创建素材管理 API
  - [x] SubTask 4.1: 创建 `GET/DELETE /api/materials` 路由
  - [x] SubTask 4.2: 创建 `POST /api/materials/attach` 关联素材到场景
  - [x] SubTask 4.3: 创建 `POST /api/materials/detach` 从场景移除素材

- [x] Task 5: 创建素材数据库操作函数
  - [x] SubTask 5.1: 在 `src/lib/db/materials.ts` 中实现 CRUD 操作
  - [x] SubTask 5.2: 实现素材与场景的关联操作

## Phase 3: 素材临时生成功能

- [x] Task 6: 扩展 AI 服务
  - [x] SubTask 6.1: 在 `src/lib/ai/zhipu.ts` 添加文本生成函数（用于生成描述）
  - [x] SubTask 6.2: 创建 `POST /api/generate/text` 路由
  - [x] SubTask 6.3: 创建 `POST /api/generate/material/image` 路由（临时图片生成）

- [x] Task 7: 实现自然语言意图识别
  - [x] SubTask 7.1: 在 `src/lib/ai/zhipu.ts` 添加意图识别函数
  - [x] SubTask 7.2: 创建 `POST /api/parse-intent` 路由解析用户自然语言输入
  - [x] SubTask 7.3: 实现意图路由（生成图片/生成文字/其他）

## Phase 4: 首尾帧接续功能

- [x] Task 8: 实现尾帧提取
  - [x] SubTask 8.1: 创建 `src/lib/video/frame-extractor.ts` 视频帧提取工具
  - [x] SubTask 8.2: 创建 `POST /api/video/extract-last-frame` 路由

- [x] Task 9: 实现视频链管理
  - [x] SubTask 9.1: 创建 `src/lib/db/video-chains.ts` 数据库操作
  - [x] SubTask 9.2: 创建 `POST /api/video-chains` 创建视频链
  - [x] SubTask 9.3: 创建 `POST /api/video-chains/[id]/append` 追加视频到链
  - [x] SubTask 9.4: 创建 `GET /api/video-chains/[id]` 获取视频链详情

- [x] Task 10: 实现接续视频生成
  - [x] SubTask 10.1: 修改 `src/lib/ai/volc-video.ts` 支持首帧输入
  - [x] SubTask 10.2: 创建 `POST /api/generate/video/continue` 接续生成路由
  - [x] SubTask 10.3: 实现视频链预览和导出功能

## Phase 5: 前端组件开发

- [x] Task 11: 创建项目模式选择组件
  - [x] SubTask 11.1: 创建 `src/components/project/ModeSelector.tsx` 模式选择器
  - [x] SubTask 11.2: 修改 `CreateProjectForm.tsx` 集成模式选择

- [x] Task 12: 创建素材面板组件
  - [x] SubTask 12.1: 创建 `src/components/materials/MaterialPanel.tsx` 素材面板
  - [x] SubTask 12.2: 创建 `src/components/materials/MaterialCard.tsx` 单个素材卡片
  - [x] SubTask 12.3: 创建 `src/components/materials/MaterialUploader.tsx` 素材上传组件
  - [x] SubTask 12.4: 创建 `src/components/materials/MaterialGenerator.tsx` 素材生成组件

- [x] Task 13: 创建自然语言输入组件
  - [x] SubTask 13.1: 创建 `src/components/materials/NaturalLanguageInput.tsx` 自然语言输入框
  - [x] SubTask 13.2: 实现意图识别和响应展示

- [x] Task 14: 创建视频链组件
  - [x] SubTask 14.1: 创建 `src/components/video/VideoChainView.tsx` 视频链展示
  - [x] SubTask 14.2: 创建 `src/components/video/ContinueVideoButton.tsx` 接续生成按钮
  - [x] SubTask 14.3: 创建 `src/components/video/VideoChainPreview.tsx` 链预览组件

- [x] Task 15: 修改场景管理组件
  - [x] SubTask 15.1: 修改 `CreateProjectForm.tsx` 支持模式选择
  - [x] SubTask 15.2: 创建素材面板组件集成
  - [x] SubTask 15.3: 创建视频链组件集成

## Phase 6: 集成与测试

- [x] Task 16: 集成测试
  - [x] SubTask 16.1: TypeScript 类型检查通过
  - [x] SubTask 16.2: ESLint 检查通过（0 errors）
  - [x] SubTask 16.3: 所有 API 路由创建完成
  - [x] SubTask 16.4: 所有前端组件创建完成

- [ ] Task 17: 文档更新
  - [ ] SubTask 17.1: 更新 README.md 说明新功能
  - [ ] SubTask 17.2: 更新 `.env.local.example` 添加新配置项

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3, Task 4 依赖 Task 2
- Task 5 依赖 Task 2
- Task 6, Task 7 可并行
- Task 8, Task 9, Task 10 依赖 Task 2
- Task 11 可独立开始
- Task 12, Task 13, Task 14 可并行
- Task 15 依赖 Task 12, Task 14
- Task 16 依赖 Task 3-15
- Task 17 依赖 Task 16

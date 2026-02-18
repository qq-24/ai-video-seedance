# 本地化改造剩余修复 - Product Requirement Document

## Overview
- **Summary**: 完成 AI 视频生成项目的本地化改造，修复所有剩余的 TypeScript 错误和兼容性问题，使项目能够完全独立运行于本地环境（不依赖 Supabase 云服务）
- **Purpose**: 解决剩余的 45 个 TypeScript 错误，主要包括：视频接续功能 API、材料管理 API、以及其他剩余的 API 路由和组件
- **Target Users**: 单用户本地使用场景

## Goals
- [Goal 1] 修复所有剩余的 TypeScript 编译错误（从 45 个降到 0 个）
- [Goal 2] 确保所有核心功能（视频接续、材料管理等）在本地化环境下正常工作
- [Goal 3] 保持代码质量和架构一致性
- [Goal 4] 验证项目可以正常构建和启动

## Non-Goals (Out of Scope)
- 不进行新功能开发（仅修复现有功能）
- 不重构现有架构（除非必须）
- 不引入新的外部依赖

## Background & Context
- 项目已经从 Supabase 云服务迁移到 Prisma + SQLite 本地数据库
- 已经修复了约 70 个 TypeScript 错误，还剩约 45 个错误
- 主要剩余问题集中在：
  1. 视频接续功能 API (generate/video/continue/route.ts)
  2. 材料管理相关 API (materials/ 目录下)
  3. 其他剩余的 API 路由和组件

## Functional Requirements
- **FR-1**: 修复 generate/video/continue/route.ts 的所有错误（视频接续功能）
- **FR-2**: 修复 generate/video/task/[taskId]/route.ts 的所有错误（视频任务查询）
- **FR-3**: 修复 materials/ 相关 API 的所有错误（材料管理功能）
- **FR-4**: 修复其他剩余的 API 路由（scenes/confirm-all-descriptions, scenes/confirm-all-images 等）
- **FR-5**: 修复或简化不再需要的登录/注册表单组件

## Non-Functional Requirements
- **NFR-1**: TypeScript 编译无错误（npx tsc --noEmit 退出码为 0）
- **NFR-2**: 所有修复的代码符合现有编码规范和架构
- **NFR-3**: 不破坏已修复的功能

## Constraints
- **Technical**: 必须继续使用 Prisma + SQLite + Iron Session 本地化架构
- **Business**: 保持单用户本地使用场景
- **Dependencies**: 不引入新的第三方依赖库

## Assumptions
- 假设之前已修复的代码保持稳定
- 假设 Prisma Schema 不需要变更
- 假设现有认证和存储架构保持不变

## Acceptance Criteria

### AC-1: 所有 TypeScript 错误修复
- **Given**: 项目存在 45 个 TypeScript 错误
- **When**: 完成所有修复任务
- **Then**: 运行 `npx tsc --noEmit` 返回 0 退出码且无错误输出
- **Verification**: `programmatic`

### AC-2: 视频接续 API 修复
- **Given**: generate/video/continue/route.ts 存在 14 个错误
- **When**: 完成该文件的修复
- **Then**: 该文件无 TypeScript 错误，且功能逻辑完整
- **Verification**: `programmatic`

### AC-3: 材料管理 API 修复
- **Given**: materials/ 相关 API 存在多个错误
- **When**: 完成所有 materials/ API 的修复
- **Then**: 所有材料管理 API 无 TypeScript 错误
- **Verification**: `programmatic`

### AC-4: 项目可以正常构建
- **Given**: 所有代码修复完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功完成
- **Verification**: `programmatic`

### AC-5: 代码架构保持一致
- **Given**: 所有修复完成
- **When**: 代码审查
- **Then**: 修复的代码遵循现有架构和编码规范
- **Verification**: `human-judgment`

## Open Questions
- [ ] 材料管理功能是否需要完整实现，还是可以简化为基础版本？

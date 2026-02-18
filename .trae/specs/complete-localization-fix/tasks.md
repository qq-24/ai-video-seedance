# 本地化改造剩余修复 - 实施任务计划

## [ ] Task 1: 修复视频接续 API (generate/video/continue/route.ts)
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 移除 Supabase 依赖，使用 Iron Session 认证
  - 修复所有字段名问题（project_id → projectId, scene_id → sceneId, storage_path → storagePath, chain_id → chainId 等）
  - 修复 getSignedUrl 调用（只接受一个参数）
  - 修复 materials 表查询，改用 Prisma
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-5]
- **Test Requirements**:
  - `programmatic` TR-1.1: 该文件无 TypeScript 错误
  - `programmatic` TR-1.2: 修复后运行 TypeScript 检查，该文件的 14 个错误消失

---

## [ ] Task 2: 修复视频任务查询 API (generate/video/task/[taskId]/route.ts)
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 移除 Supabase 依赖，使用 Iron Session 认证
  - 移除对 uploadFile 的错误导入
- **Acceptance Criteria Addressed**: [AC-1, AC-5]
- **Test Requirements**:
  - `programmatic` TR-2.1: 该文件无 TypeScript 错误
  - `programmatic` TR-2.2: 修复后该文件的 2 个错误消失

---

## [ ] Task 3: 修复材料管理 API (materials/[id]/route.ts, materials/attach/route.ts, materials/detach/route.ts, materials/route.ts)
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 移除所有 Supabase 依赖
  - 修复字段名（scene_id → sceneId, storage_path → storagePath, order_index → orderIndex, created_at → createdAt）
  - 移除不存在的类型导入（MaterialUpdate, Json 等）
  - 确保使用 Prisma 进行数据库操作
- **Acceptance Criteria Addressed**: [AC-1, AC-3, AC-5]
- **Test Requirements**:
  - `programmatic` TR-3.1: 所有 materials/ 相关 API 文件无 TypeScript 错误

---

## [ ] Task 4: 修复材料上传 API (materials/upload/route.ts)
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 移除 Supabase 依赖
  - 修复字段名问题
  - 修复类型问题
  - 使用现有的 materials.ts 数据库操作层
- **Acceptance Criteria Addressed**: [AC-1, AC-3, AC-5]
- **Test Requirements**:
  - `programmatic` TR-4.1: 该文件无 TypeScript 错误
  - `programmatic` TR-4.2: 修复后该文件的 8 个错误消失

---

## [ ] Task 5: 修复其他剩余 API 路由
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - parse-intent/route.ts: 移除 Supabase 依赖
  - scenes/[id]/route.ts: 移除 Supabase 依赖
  - scenes/confirm-all-descriptions/route.ts: 移除 Supabase 依赖
  - scenes/confirm-all-images/route.ts: 移除 Supabase 依赖
- **Acceptance Criteria Addressed**: [AC-1, AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: 所有上述 API 文件无 TypeScript 错误

---

## [ ] Task 6: 修复或简化登录/注册表单组件
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - LoginForm.tsx: 移除 Supabase 依赖，简化为本地登录
  - RegisterForm.tsx: 由于是单用户模式，移除或简化
- **Acceptance Criteria Addressed**: [AC-1, AC-5]
- **Test Requirements**:
  - `programmatic` TR-6.1: 这些组件无 TypeScript 错误

---

## [ ] Task 7: 完整 TypeScript 检查和验证
- **Priority**: P0
- **Depends On**: Tasks 1-6
- **Description**: 
  - 运行完整的 TypeScript 检查
  - 确保 0 个错误
- **Acceptance Criteria Addressed**: [AC-1, AC-4]
- **Test Requirements**:
  - `programmatic` TR-7.1: `npx tsc --noEmit` 退出码 0
  - `programmatic` TR-7.2: 无任何 TypeScript 错误输出

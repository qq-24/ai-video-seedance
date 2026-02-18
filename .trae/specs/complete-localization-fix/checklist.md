# 本地化改造剩余修复 - 验证清单

## 总体验证
- [ ] 运行 `npx tsc --noEmit`，退出码为 0，无任何错误输出
- [ ] 运行 `npm run build`，构建成功完成
- [ ] 项目可以正常启动（`npm run dev`）

## Task 1: 视频接续 API
- [ ] `generate/video/continue/route.ts` 无 TypeScript 错误
- [ ] 已移除所有 Supabase 依赖
- [ ] 使用 Iron Session 进行认证
- [ ] 字段名已正确转换（snake_case → camelCase）
- [ ] 使用 Prisma 进行数据库操作

## Task 2: 视频任务查询 API
- [ ] `generate/video/task/[taskId]/route.ts` 无 TypeScript 错误
- [ ] 已移除所有 Supabase 依赖
- [ ] 使用 Iron Session 进行认证
- [ ] 已移除错误的 uploadFile 导入

## Task 3: 材料管理 API
- [ ] `materials/[id]/route.ts` 无 TypeScript 错误
- [ ] `materials/attach/route.ts` 无 TypeScript 错误
- [ ] `materials/detach/route.ts` 无 TypeScript 错误
- [ ] `materials/route.ts` 无 TypeScript 错误
- [ ] 已移除所有 Supabase 依赖
- [ ] 字段名已正确转换（snake_case → camelCase）
- [ ] 使用 Prisma 进行数据库操作
- [ ] 已移除不存在的类型导入（MaterialUpdate, Json 等）

## Task 4: 材料上传 API
- [ ] `materials/upload/route.ts` 无 TypeScript 错误
- [ ] 已移除所有 Supabase 依赖
- [ ] 字段名已正确转换（snake_case → camelCase）
- [ ] 使用本地存储系统
- [ ] 使用现有的 materials.ts 数据库操作层

## Task 5: 其他剩余 API 路由
- [ ] `parse-intent/route.ts` 无 TypeScript 错误
- [ ] `scenes/[id]/route.ts` 无 TypeScript 错误
- [ ] `scenes/confirm-all-descriptions/route.ts` 无 TypeScript 错误
- [ ] `scenes/confirm-all-images/route.ts` 无 TypeScript 错误
- [ ] 已移除所有 Supabase 依赖

## Task 6: 登录/注册表单组件
- [ ] `LoginForm.tsx` 无 TypeScript 错误
- [ ] `RegisterForm.tsx` 已简化或移除（单用户模式）
- [ ] 已移除所有 Supabase 依赖
- [ ] 使用本地认证逻辑

## 代码质量检查
- [ ] 所有修复的代码遵循现有架构和编码规范
- [ ] 没有引入新的外部依赖
- [ ] 没有破坏已修复的功能
- [ ] 配置与逻辑分离（无硬编码）
- [ ] 错误处理完备（无空 catch）

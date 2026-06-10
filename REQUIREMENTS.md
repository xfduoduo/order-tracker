# 订单追踪系统 — 需求文档 + 错误记录

> 2026-06-10 | Next.js 16 + React 19 + TypeScript + Prisma 7 + SQLite

---

## 一、项目概述

电商订单利润追踪系统。单表可编辑表格，26 字段，冻结列（序号/客户名称/地区/货品名称），自动利润计算，仪表盘，导入导出。

## 二、功能清单

可编辑表格、颜色药丸标签、斑马条纹、单表冻结列、列筛选、回车搜索、退货整组搬运、利润自动计算、CSV/Excel导出导入、批量删除/改状态、仪表盘、下拉选项管理、Zod白名单校验、CSV公式注入防护、移动端适配、standalone单文件版

---

## 三、错误记录

### 1. Zod .partial() + .default() 金额清零
**现象**：改一个金额，其他变 0。  
**根因**：`orderCreateSchema.partial()` 保留了 `.default(0)`。  
**规避**：更新 schema 独立声明 `.optional()`，不用 partial+default 组合。

### 2. 更新时未合并已有数据算利润
**现象**：改单字段后利润算错。  
**根因**：`calcOrderProfit` 从 body 取值，未传字段为 0。  
**规避**：先 `findUnique`，合并 `{...existing, ...body}` 再计算。

### 3. 异步请求竞态数据回退
**现象**：快速编辑两字段，前值消失。  
**根因**：两次 fetch 响应顺序不确定。  
**规避**：递增 `reqSeq`，仅当 `seq === reqSeq.current` 时应用响应。

### 4. 双表架构行错位
**现象**：左右两栏不对齐，滚动后差距更大。  
**根因**：两张独立 table，需 JS 同步行高+scrollTop+表头高，脆弱不可靠。  
**规避**：单表方案。冻结列用 `position: sticky` + 动态计算 left 偏移。行天生对齐。

### 5. border-collapse:collapse + sticky 渲染伪影
**现象**：checkbox 与序号列间可见缝隙/线条。  
**根因**：collapse 共享边框 + sticky 独立定位 = CSS 规范冲突 → 0.109px 微间隙。  
**规避**：`border-collapse: separate; border-spacing: 0`。每格边框独立。

### 6. 冻结列 left 硬编码重叠
**现象**：多列 sticky 堆叠。  
**根因**：`left-[120px]` 与实际列宽不匹配。  
**规避**：`useLayoutEffect` 动态测量 `offsetWidth`，绘制前写入 inline style。

### 7. td 缺 data-frozen 属性
**现象**：th 偏移对，td 不对。  
**根因**：Python 生成 JSX 只给 th 加了 data-frozen。  
**规避**：所有冻结 th/td 统一加属性。

### 8. XLSX CDN 同步阻塞
**现象**：standalone HTML 打开空白。  
**根因**：`<script>` 同步加载，网络慢时卡住。  
**规避**：`async` 加载 + 运行时 `typeof XLSX` 检查。

### 9. overflow-hidden 阻止滚动
**现象**：多行时无法滚动。  
**根因**：wrapper 设为 overflow-hidden。  
**规避**：单表用 `overflow: auto`。

### 10. Python 脚本生成 JSX 语法错
**现象**：replace 后括号不匹配、半行残留。  
**根因**：大段 JSX 字符串替换无法保证语法。  
**规避**：复杂 JSX 手写，配合 lint 即时验证。

---

## 四、启动

```bash
cd /Users/alexchen/code/order-tracker && npm run dev    # localhost:3000
```

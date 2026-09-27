# 纸间 · 简历 Studio

一个纯前端的结构化简历编辑器。简历数据与预览模板分离，编辑内容会自动保存在当前浏览器。

## 开发

```bash
npm install
npm run dev
```

## 当前能力

- 编辑个人信息、简介、工作经历、项目经历、教育背景与技能
- 新增、删除、排序和隐藏内容模块
- 以 A4 纸张尺寸实时预览，根据 DOM 实测内容块高度进行分页；过长的经历条目会按要点拆分
- 在浏览器打印对话框中保存为 PDF
- 将所有页面导出为一张纵向 PNG 图片
- 在本地创建、复制、重命名和删除多份简历
- 自动保存至 `localStorage`，支持 JSON 导入与导出

## 目录

- `src/resume/model.ts`：简历数据类型和空白简历
- `src/resume/sample.ts`：首次打开时展示的示例简历
- `src/resume/storage.ts`：本地文档读写
- `src/resume/ResumePreview.tsx`：模板渲染、A4 测量和分页
- `src/resume/export.ts`：PNG 导出
- `src/App.tsx`：编辑器与文档操作

PDF 使用浏览器打印功能输出 A4 页面；不同浏览器的打印对话框可能会显示各自的页眉页脚选项，保存时可按需关闭。

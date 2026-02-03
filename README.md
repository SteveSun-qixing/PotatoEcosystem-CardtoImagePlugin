# CardtoImagePlugin

薯片生态卡片转图片插件

## 简介

CardtoImagePlugin 是薯片生态文件转换系统的核心插件之一，负责将卡片文件（.card）渲染为图片格式。使用内置渲染引擎在内存中渲染卡片内容，然后截取渲染结果输出为图片。

## 功能特性

- 将卡片文件渲染为 PNG 或 JPG 格式图片
- 支持配置图片质量和分辨率
- 支持配置缩放比例
- 支持导出卡片封面或完整内容

## 安装

```bash
npm install @chips/cardto-image-plugin
```

## 使用方式

插件通过薯片 SDK 的转换 API 调用，无需直接实例化。

## 配置选项

- **format**: 输出格式，`png`（默认）或 `jpg`
- **quality**: 图片质量，0-100（仅 JPG 有效），默认 90
- **resolution**: 分辨率设置
- **scale**: 缩放比例，默认 1.0

## 依赖

- @chips/sdk
- @chips/foundation

## 许可证

MIT License

## 仓库

https://github.com/SteveSun-qixing/PotatoEcosystem-CardtoImagePlugin

/**
 * CardtoImagePlugin - 薯片卡片转图片插件
 *
 * 将薯片卡片文件（.card）渲染为图片格式（PNG/JPG）。
 * 采用两阶段转换架构：
 * 1. 依赖 CardtoHTMLPlugin 将卡片转换为 HTML
 * 2. 使用 Puppeteer 无头浏览器渲染并截图
 *
 * @packageDocumentation
 *
 * @remarks
 * ## 功能特性
 * - 支持 PNG 和 JPG 格式输出
 * - 支持高清（2x、3x）输出
 * - 支持透明背景（PNG）
 * - 支持自定义尺寸和缩放
 * - 支持进度回调
 *
 * ## 依赖要求
 * - @chips/cardto-html-plugin: 用于 HTML 转换
 * - puppeteer: 用于浏览器渲染（可选依赖）
 *
 * ## 基本使用
 *
 * ```typescript
 * import { CardtoImagePlugin } from '@chips/cardto-image-plugin';
 *
 * const plugin = new CardtoImagePlugin();
 *
 * // 转换为 PNG
 * const result = await plugin.convert(
 *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
 *   { format: 'png', scale: 2 }
 * );
 *
 * if (result.success) {
 *   console.log('转换成功');
 *   // result.data 包含图片二进制数据
 * }
 * ```
 *
 * ## 保存到文件
 *
 * ```typescript
 * const result = await plugin.convert(source, {
 *   format: 'jpg',
 *   quality: 85,
 *   outputPath: '/path/to/output.jpg'
 * });
 * ```
 */

// ============================================================================
// 导出插件主类和工厂函数
// ============================================================================

export { CardtoImagePlugin, createPlugin, plugin } from './plugin';

// ============================================================================
// 导出类型定义
// ============================================================================

export type {
  // 格式类型
  ImageFormat,

  // 选项和结果
  ImageConversionOptions,
  ImageConversionResult,
  ImageValidationResult,

  // 进度相关
  ImageConversionStatus,
  ImageProgressInfo,

  // 插件接口
  ImageConverterPlugin,

  // 共享类型（来自 CardtoHTMLPlugin）
  ConversionSource,
  ConversionError,
  ErrorCode,

  // 错误码类型
  ImageErrorCodeType,
} from './types';

// ============================================================================
// 导出错误码常量
// ============================================================================

export { ImageErrorCode } from './types';

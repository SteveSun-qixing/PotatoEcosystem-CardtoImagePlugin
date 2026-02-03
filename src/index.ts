/**
 * CardtoImagePlugin - 薯片卡片转图片插件
 *
 * 将薯片卡片文件（.card）渲染为图片格式（PNG/JPG）
 * 依赖 CardtoHTMLPlugin 先生成 HTML，再使用浏览器渲染
 *
 * @packageDocumentation
 */

export { CardtoImagePlugin, createPlugin, plugin } from './plugin';

export type {
  ImageFormat,
  ImageConversionOptions,
  ImageConversionResult,
} from './types';

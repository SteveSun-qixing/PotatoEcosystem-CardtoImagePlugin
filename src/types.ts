/**
 * CardtoImagePlugin 类型定义
 */

import type { ConversionSource, ConversionError } from '@chips/cardto-html-plugin';

/**
 * 图片格式
 */
export type ImageFormat = 'png' | 'jpg' | 'jpeg';

/**
 * 图片转换选项
 */
export interface ImageConversionOptions {
  /** 输出格式 */
  format?: ImageFormat;
  /** JPG 质量 (0-100) */
  quality?: number;
  /** 缩放比例 */
  scale?: number;
  /** 固定宽度 */
  width?: number;
  /** 固定高度 */
  height?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否透明背景（仅 PNG） */
  transparent?: boolean;
  /** 等待时间（毫秒） */
  waitTime?: number;
  /** 输出文件路径 */
  outputPath?: string;
  /** 主题 ID（传递给 HTML 转换） */
  themeId?: string;
  /** 进度回调 */
  onProgress?: (progress: ImageProgressInfo) => void;
}

/**
 * 进度信息
 */
export interface ImageProgressInfo {
  /** 任务 ID */
  taskId: string;
  /** 状态 */
  status: 'converting-html' | 'rendering' | 'capturing' | 'completed' | 'failed';
  /** 完成百分比 */
  percent: number;
  /** 当前步骤 */
  currentStep?: string;
}

/**
 * 图片转换结果
 */
export interface ImageConversionResult {
  /** 是否成功 */
  success: boolean;
  /** 任务 ID */
  taskId: string;
  /** 输出路径 */
  outputPath?: string;
  /** 图片数据（Buffer 或 Uint8Array） */
  data?: Uint8Array;
  /** 图片格式 */
  format?: ImageFormat;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 错误信息 */
  error?: ConversionError;
  /** 耗时（毫秒） */
  duration?: number;
}

/**
 * 转换器插件接口
 */
export interface ImageConverterPlugin {
  id: string;
  name: string;
  version: string;
  sourceTypes: string[];
  targetType: string;
  description?: string;

  convert(source: ConversionSource, options?: ImageConversionOptions): Promise<ImageConversionResult>;
  getDefaultOptions(): ImageConversionOptions;
}

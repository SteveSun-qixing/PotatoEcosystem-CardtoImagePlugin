/**
 * CardtoImagePlugin 类型定义
 *
 * 定义卡片转图片插件使用的所有数据结构和接口类型
 *
 * @packageDocumentation
 */

// ============================================================================
// 从 CardtoHTMLPlugin 导入共享类型
// ============================================================================

import type {
  ConversionSource,
  ConversionError,
  ErrorCode,
  ConversionAppearanceProfile,
  DeepPartial,
} from '@chips/cardto-html-plugin';

// 重新导出以便使用方导入
export type { ConversionSource, ConversionError, ErrorCode };

// ============================================================================
// 图片格式类型
// ============================================================================

/**
 * 图片输出格式
 *
 * @remarks
 * - png: 无损压缩，支持透明背景，适合需要后续合成的场景
 * - jpg/jpeg: 有损压缩，文件较小，适合分享和展示
 */
export type ImageFormat = 'png' | 'jpg' | 'jpeg';

// ============================================================================
// 转换选项
// ============================================================================

/**
 * 图片转换选项
 *
 * @remarks
 * 所有选项都是可选的，未指定的选项将使用默认值
 *
 * @example
 * ```typescript
 * const options: ImageConversionOptions = {
 *   format: 'png',
 *   quality: 90,
 *   scale: 2,
 *   width: 1920,
 *   transparent: false,
 * };
 * ```
 */
export interface ImageConversionOptions {
  /**
   * 输出格式
   * @defaultValue 'png'
   */
  format?: ImageFormat;

  /**
   * 图片质量 (1-100)
   *
   * @remarks
   * 仅对 JPG 格式有效。值越高质量越好，文件越大。
   *
   * @defaultValue 90
   */
  quality?: number;

  /**
   * 缩放比例
   *
   * @remarks
   * 设备像素比，用于高清输出。
   * - 1.0: 标准分辨率
   * - 2.0: 2x 高清（Retina）
   * - 3.0: 3x 高清
   *
   * @defaultValue 1
   */
  scale?: number;

  /**
   * 固定宽度（像素）
   *
   * @remarks
   * 设置后将覆盖自适应宽度计算
   */
  width?: number;

  /**
   * 固定高度（像素）
   *
   * @remarks
   * 设置后将覆盖自适应高度计算
   */
  height?: number;

  /**
   * 背景颜色
   *
   * @remarks
   * 支持 CSS 颜色值，如 '#ffffff'、'rgb(255,255,255)'、'white'
   *
   * @defaultValue '#ffffff'
   */
  backgroundColor?: string;

  /**
   * 是否透明背景
   *
   * @remarks
   * 仅对 PNG 格式有效。设置为 true 时忽略 backgroundColor。
   *
   * @defaultValue false
   */
  transparent?: boolean;

  /**
   * 等待时间（毫秒）
   *
   * @remarks
   * 页面加载完成后额外等待的时间，用于确保动态内容加载完成。
   * 对于包含动画或异步内容的卡片，可能需要增加此值。
   *
   * @defaultValue 1000
   */
  waitTime?: number;

  /**
   * 输出文件路径
   *
   * @remarks
   * 指定后将图片写入文件系统。不指定则返回 Uint8Array 数据。
   * 仅在 Node.js 环境中有效。
   */
  outputPath?: string;

  /**
   * 主题 ID
   *
   * @remarks
   * 覆盖卡片默认主题，传递给 CardtoHTMLPlugin 使用
   */
  themeId?: string;

  /**
   * 外观配置表 ID（由转换模块统一管理）
   */
  appearanceProfileId?: string;

  /**
   * 外观参数覆盖（用于后续扩展）
   */
  appearanceOverrides?: DeepPartial<Omit<ConversionAppearanceProfile, 'id' | 'description'>>;

  /**
   * 进度回调函数
   *
   * @param progress - 进度信息对象
   *
   * @example
   * ```typescript
   * const options: ImageConversionOptions = {
   *   onProgress: (progress) => {
   *     console.log(`${progress.currentStep}: ${progress.percent}%`);
   *   }
   * };
   * ```
   */
  onProgress?: (progress: ImageProgressInfo) => void;
}

// ============================================================================
// 进度信息
// ============================================================================

/**
 * 转换进度状态
 */
export type ImageConversionStatus =
  | 'converting-html' // 正在转换 HTML
  | 'rendering'       // 正在渲染页面
  | 'capturing'       // 正在截取图片
  | 'completed'       // 转换完成
  | 'failed';         // 转换失败

/**
 * 进度信息
 *
 * @remarks
 * 通过 onProgress 回调实时获取转换进度
 */
export interface ImageProgressInfo {
  /**
   * 任务唯一标识符
   */
  taskId: string;

  /**
   * 当前状态
   */
  status: ImageConversionStatus;

  /**
   * 完成百分比 (0-100)
   */
  percent: number;

  /**
   * 当前步骤描述
   */
  currentStep?: string;
}

// ============================================================================
// 转换结果
// ============================================================================

/**
 * 图片转换结果
 *
 * @remarks
 * 无论转换成功或失败，都会返回此结构。
 * 通过 success 字段判断是否成功。
 *
 * @example
 * ```typescript
 * const result = await plugin.convert(source, options);
 * if (result.success) {
 *   console.log(`转换成功，格式: ${result.format}`);
 *   if (result.data) {
 *     // 处理图片数据
 *   }
 * } else {
 *   console.error(`错误 ${result.error?.code}: ${result.error?.message}`);
 * }
 * ```
 */
export interface ImageConversionResult {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 任务唯一标识符
   */
  taskId: string;

  /**
   * 输出文件路径
   *
   * @remarks
   * 仅当指定了 outputPath 选项时返回
   */
  outputPath?: string;

  /**
   * 图片数据
   *
   * @remarks
   * 未指定 outputPath 时返回图片的二进制数据
   */
  data?: Uint8Array;

  /**
   * 输出的图片格式
   */
  format?: ImageFormat;

  /**
   * 图片宽度（像素）
   */
  width?: number;

  /**
   * 图片高度（像素）
   */
  height?: number;

  /**
   * 错误信息
   *
   * @remarks
   * 仅当 success 为 false 时存在
   */
  error?: ConversionError;

  /**
   * 转换耗时（毫秒）
   */
  duration?: number;
}

// ============================================================================
// 插件接口
// ============================================================================

/**
 * 图片转换器插件接口
 *
 * @remarks
 * 定义图片转换插件必须实现的方法和属性
 */
export interface ImageConverterPlugin {
  /**
   * 插件唯一标识符
   */
  readonly id: string;

  /**
   * 插件显示名称
   */
  readonly name: string;

  /**
   * 插件版本号
   */
  readonly version: string;

  /**
   * 支持的源文件类型列表
   */
  readonly sourceTypes: string[];

  /**
   * 目标文件类型
   */
  readonly targetType: string;

  /**
   * 插件描述
   */
  readonly description?: string;

  /**
   * 执行转换
   *
   * @param source - 转换源（文件路径或二进制数据）
   * @param options - 转换选项
   * @returns 转换结果
   *
   * @example
   * ```typescript
   * const result = await plugin.convert(
   *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
   *   { format: 'png', scale: 2 }
   * );
   * ```
   */
  convert(
    source: ConversionSource,
    options?: ImageConversionOptions
  ): Promise<ImageConversionResult>;

  /**
   * 获取默认选项
   *
   * @returns 默认的转换选项
   */
  getDefaultOptions(): ImageConversionOptions;

  /**
   * 验证转换选项
   *
   * @param options - 待验证的选项
   * @returns 验证结果
   */
  validateOptions(options: ImageConversionOptions): ImageValidationResult;
}

/**
 * 选项验证结果
 */
export interface ImageValidationResult {
  /**
   * 是否有效
   */
  valid: boolean;

  /**
   * 错误列表
   */
  errors?: string[];

  /**
   * 警告列表
   */
  warnings?: string[];
}

// ============================================================================
// 错误码扩展
// ============================================================================

/**
 * 图片转换专用错误码
 *
 * @remarks
 * 扩展 CardtoHTMLPlugin 的错误码
 */
export const ImageErrorCode = {
  /** Puppeteer 未安装 */
  PUPPETEER_NOT_INSTALLED: 'CONV-IMG-001',
  /** 浏览器启动失败 */
  BROWSER_LAUNCH_FAILED: 'CONV-IMG-002',
  /** 页面加载超时 */
  PAGE_LOAD_TIMEOUT: 'CONV-IMG-003',
  /** 截图失败 */
  SCREENSHOT_FAILED: 'CONV-IMG-004',
  /** 文件写入失败 */
  FILE_WRITE_FAILED: 'CONV-IMG-005',
  /** 无效的图片格式 */
  INVALID_FORMAT: 'CONV-IMG-006',
  /** 无效的质量参数 */
  INVALID_QUALITY: 'CONV-IMG-007',
  /** 无效的尺寸参数 */
  INVALID_DIMENSIONS: 'CONV-IMG-008',
} as const;

/**
 * 图片转换错误码类型
 */
export type ImageErrorCodeType =
  (typeof ImageErrorCode)[keyof typeof ImageErrorCode];

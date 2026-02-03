/**
 * CardtoImagePlugin 主类
 *
 * 将薯片卡片文件（.card）渲染为图片格式（PNG/JPG）。
 * 采用两阶段转换架构：先使用 CardtoHTMLPlugin 生成 HTML，
 * 再使用 Puppeteer 无头浏览器渲染并截图。
 *
 * @packageDocumentation
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversionSource } from '@chips/cardto-html-plugin';
import { CardtoHTMLPlugin } from '@chips/cardto-html-plugin';
import type {
  ImageFormat,
  ImageConversionOptions,
  ImageConversionResult,
  ImageConverterPlugin,
  ImageProgressInfo,
  ImageConversionStatus,
  ImageValidationResult,
} from './types';
import { ImageErrorCode } from './types';

// ============================================================================
// 插件元数据常量
// ============================================================================

/**
 * 插件元数据
 * @internal
 */
const PLUGIN_METADATA = {
  id: 'cardto-image-plugin',
  name: '卡片转图片插件',
  version: '0.1.0',
  sourceTypes: ['.card', 'card'],
  targetType: 'image',
  description: '将薯片卡片文件转换为 PNG 或 JPG 图片，支持高清输出和透明背景',
} as const;

/**
 * 默认转换选项
 * @internal
 */
const DEFAULT_OPTIONS: Required<
  Omit<ImageConversionOptions, 'outputPath' | 'themeId' | 'onProgress' | 'width' | 'height'>
> = {
  format: 'png',
  quality: 90,
  scale: 1,
  backgroundColor: '#ffffff',
  transparent: false,
  waitTime: 1000,
};

// ============================================================================
// 主插件类
// ============================================================================

/**
 * CardtoImagePlugin 转换器插件
 *
 * @remarks
 * 此插件将卡片文件转换为图片格式。内部依赖 CardtoHTMLPlugin
 * 先将卡片转换为 HTML，然后使用 Puppeteer 进行浏览器渲染和截图。
 *
 * @example
 * ```typescript
 * import { CardtoImagePlugin } from '@chips/cardto-image-plugin';
 *
 * const plugin = new CardtoImagePlugin();
 *
 * // 转换为 PNG
 * const result = await plugin.convert(
 *   { type: 'path', path: '/path/to/card.card', fileType: 'card' },
 *   { format: 'png', scale: 2, transparent: false }
 * );
 *
 * if (result.success && result.data) {
 *   // 处理图片数据
 *   console.log(`图片大小: ${result.data.length} bytes`);
 * }
 * ```
 */
export class CardtoImagePlugin implements ImageConverterPlugin {
  // ========== 公开只读属性 ==========

  /** 插件 ID */
  readonly id = PLUGIN_METADATA.id;

  /** 插件名称 */
  readonly name = PLUGIN_METADATA.name;

  /** 插件版本 */
  readonly version = PLUGIN_METADATA.version;

  /** 支持的源类型 */
  readonly sourceTypes = PLUGIN_METADATA.sourceTypes;

  /** 目标类型 */
  readonly targetType = PLUGIN_METADATA.targetType;

  /** 插件描述 */
  readonly description = PLUGIN_METADATA.description;

  // ========== 私有属性 ==========

  /** CardtoHTMLPlugin 实例 */
  private readonly _htmlPlugin: CardtoHTMLPlugin;

  // ========== 构造函数 ==========

  /**
   * 创建 CardtoImagePlugin 实例
   */
  constructor() {
    this._htmlPlugin = new CardtoHTMLPlugin();
  }

  // ========== 公开方法 ==========

  /**
   * 执行卡片到图片的转换
   *
   * @param source - 转换源，支持文件路径或二进制数据
   * @param options - 转换选项
   * @returns 转换结果，包含图片数据或输出路径
   *
   * @remarks
   * 转换过程分为以下阶段：
   * 1. HTML 生成：调用 CardtoHTMLPlugin 将卡片转换为 HTML
   * 2. 资源内联：将外部资源转换为 Base64 内嵌
   * 3. 浏览器渲染：启动 Puppeteer 加载 HTML 页面
   * 4. 截图输出：截取页面内容为图片
   *
   * @example
   * ```typescript
   * // 转换为高清 PNG
   * const result = await plugin.convert(source, {
   *   format: 'png',
   *   scale: 2,
   *   width: 1920
   * });
   *
   * // 转换为 JPG 并保存到文件
   * const result = await plugin.convert(source, {
   *   format: 'jpg',
   *   quality: 85,
   *   outputPath: '/path/to/output.jpg'
   * });
   * ```
   */
  async convert(
    source: ConversionSource,
    options?: ImageConversionOptions
  ): Promise<ImageConversionResult> {
    const taskId = uuidv4();
    const mergedOptions = this._mergeOptions(options);
    const startTime = Date.now();

    // 进度报告辅助函数
    const reportProgress = (
      status: ImageConversionStatus,
      percent: number,
      step?: string
    ): void => {
      if (mergedOptions.onProgress) {
        mergedOptions.onProgress({
          taskId,
          status,
          percent,
          currentStep: step,
        });
      }
    };

    try {
      // 验证选项
      const validation = this.validateOptions(mergedOptions);
      if (!validation.valid) {
        return this._createErrorResult(
          taskId,
          ImageErrorCode.INVALID_FORMAT,
          validation.errors?.join('; ') ?? '选项验证失败',
          startTime
        );
      }

      // 阶段 1: HTML 转换
      reportProgress('converting-html', 0, '正在解析卡片并生成 HTML');

      const htmlResult = await this._htmlPlugin.convert(source, {
        themeId: mergedOptions.themeId,
        includeAssets: true,
      });

      if (!htmlResult.success || !htmlResult.data) {
        reportProgress('failed', 0, 'HTML 转换失败');
        return {
          success: false,
          taskId,
          error: htmlResult.error ?? {
            code: 'CONV-HTML-002' as const,
            message: 'HTML 转换失败，未能获取有效数据',
          },
          duration: Date.now() - startTime,
        };
      }

      reportProgress('rendering', 30, 'HTML 生成完成，正在启动浏览器');

      // 阶段 2: 渲染并截图
      reportProgress('rendering', 40, '正在渲染页面');

      const { imageData, width, height } = await this._renderHTMLToImage(
        htmlResult.data.files,
        mergedOptions
      );

      reportProgress('capturing', 80, '正在生成图片');

      // 阶段 3: 输出处理
      if (mergedOptions.outputPath) {
        await this._writeToFile(imageData, mergedOptions.outputPath);
        reportProgress('completed', 100, '图片已保存到文件');
      } else {
        reportProgress('completed', 100, '转换完成');
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        taskId,
        outputPath: mergedOptions.outputPath,
        data: mergedOptions.outputPath ? undefined : imageData,
        format: mergedOptions.format as ImageFormat,
        width,
        height,
        duration,
      };
    } catch (error) {
      reportProgress('failed', 0, '转换过程发生错误');

      return this._createErrorResult(
        taskId,
        ImageErrorCode.SCREENSHOT_FAILED,
        error instanceof Error ? error.message : '图片渲染过程发生未知错误',
        startTime,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 获取默认选项
   *
   * @returns 默认的转换选项副本
   */
  getDefaultOptions(): ImageConversionOptions {
    return { ...DEFAULT_OPTIONS };
  }

  /**
   * 验证转换选项
   *
   * @param options - 待验证的选项
   * @returns 验证结果
   */
  validateOptions(options: ImageConversionOptions): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证格式
    if (options.format && !['png', 'jpg', 'jpeg'].includes(options.format)) {
      errors.push(`不支持的图片格式: ${options.format}，支持: png, jpg, jpeg`);
    }

    // 验证质量
    if (options.quality !== undefined) {
      if (options.quality < 1 || options.quality > 100) {
        errors.push(`质量参数必须在 1-100 之间，当前值: ${options.quality}`);
      }
      if (options.format === 'png') {
        warnings.push('PNG 格式忽略质量参数');
      }
    }

    // 验证缩放
    if (options.scale !== undefined) {
      if (options.scale <= 0 || options.scale > 4) {
        errors.push(`缩放比例必须在 0-4 之间，当前值: ${options.scale}`);
      }
    }

    // 验证尺寸
    if (options.width !== undefined && options.width <= 0) {
      errors.push(`宽度必须为正数，当前值: ${options.width}`);
    }
    if (options.height !== undefined && options.height <= 0) {
      errors.push(`高度必须为正数，当前值: ${options.height}`);
    }

    // 验证等待时间
    if (options.waitTime !== undefined && options.waitTime < 0) {
      errors.push(`等待时间不能为负数，当前值: ${options.waitTime}`);
    }

    // 透明背景警告
    if (options.transparent && options.format !== 'png') {
      warnings.push('透明背景仅对 PNG 格式有效');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ========== 私有方法 ==========

  /**
   * 合并用户选项与默认选项
   * @internal
   */
  private _mergeOptions(
    options?: ImageConversionOptions
  ): ImageConversionOptions {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * 创建错误结果
   * @internal
   */
  private _createErrorResult(
    taskId: string,
    code: string,
    message: string,
    startTime: number,
    cause?: Error
  ): ImageConversionResult {
    return {
      success: false,
      taskId,
      error: {
        code: code as never,
        message,
        cause,
      },
      duration: Date.now() - startTime,
    };
  }

  /**
   * 使用 Puppeteer 渲染 HTML 为图片
   *
   * @param files - HTML 文件映射
   * @param options - 转换选项
   * @returns 图片数据和尺寸
   * @internal
   */
  private async _renderHTMLToImage(
    files: Map<string, string | Uint8Array>,
    options: ImageConversionOptions
  ): Promise<{ imageData: Uint8Array; width: number; height: number }> {
    // 动态导入 Puppeteer
    let puppeteer: typeof import('puppeteer') | undefined;
    try {
      puppeteer = await import('puppeteer');
    } catch {
      throw new Error(
        '需要安装 puppeteer 才能渲染图片。请运行: npm install puppeteer'
      );
    }

    // 获取 index.html
    const indexHtml = files.get('index.html');
    if (!indexHtml || typeof indexHtml !== 'string') {
      throw new Error('未找到 index.html 文件，HTML 转换可能失败');
    }

    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();

      // 设置视口
      const viewportWidth = options.width ?? 800;
      const viewportHeight = options.height ?? 600;
      const deviceScaleFactor = options.scale ?? 1;

      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor,
      });

      // 内联资源并加载 HTML
      const htmlContent = this._inlineResources(indexHtml, files);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // 额外等待时间
      const waitTime = options.waitTime ?? 1000;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // 获取页面实际尺寸
      const dimensions = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return {
          width: Math.max(
            body.scrollWidth,
            body.offsetWidth,
            html.clientWidth,
            html.scrollWidth,
            html.offsetWidth
          ),
          height: Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          ),
        };
      });

      // 配置截图选项
      const screenshotOptions: Parameters<typeof page.screenshot>[0] = {
        type:
          options.format === 'jpg' || options.format === 'jpeg'
            ? 'jpeg'
            : 'png',
        fullPage: true,
      };

      // JPG 质量设置
      if (options.format === 'jpg' || options.format === 'jpeg') {
        screenshotOptions.quality = options.quality ?? 90;
      }

      // PNG 透明背景
      if (options.format === 'png') {
        screenshotOptions.omitBackground = options.transparent ?? false;
      }

      // 执行截图
      const screenshot = await page.screenshot(screenshotOptions);

      // 计算输出尺寸
      const outputWidth = Math.round(dimensions.width * deviceScaleFactor);
      const outputHeight = Math.round(dimensions.height * deviceScaleFactor);

      return {
        imageData: new Uint8Array(screenshot),
        width: outputWidth,
        height: outputHeight,
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * 将外部资源内联到 HTML
   *
   * @param html - 原始 HTML 内容
   * @param files - 文件映射
   * @returns 内联资源后的 HTML
   * @internal
   */
  private _inlineResources(
    html: string,
    files: Map<string, string | Uint8Array>
  ): string {
    let result = html;

    // 内联 theme.css
    const themeCss = files.get('theme.css');
    if (themeCss && typeof themeCss === 'string') {
      const styleTag = `<style type="text/css">\n${themeCss}\n</style>`;
      result = result.replace(
        /<link[^>]*href=["'][^"']*theme\.css["'][^>]*>/gi,
        styleTag
      );
    }

    // 内联其他 CSS 文件
    for (const [filePath, content] of files) {
      if (
        typeof content === 'string' &&
        filePath.endsWith('.css') &&
        filePath !== 'theme.css'
      ) {
        const filename = filePath.split('/').pop() ?? '';
        const styleTag = `<style type="text/css">\n${content}\n</style>`;
        result = result.replace(
          new RegExp(
            `<link[^>]*href=["'][^"']*${this._escapeRegex(filename)}["'][^>]*>`,
            'gi'
          ),
          styleTag
        );
      }
    }

    // 内联图片资源为 Base64
    for (const [filePath, content] of files) {
      if (content instanceof Uint8Array && this._isImagePath(filePath)) {
        const base64 = this._uint8ArrayToBase64(content);
        const mimeType = this._getMimeType(filePath);
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const filename = filePath.split('/').pop() ?? '';
        result = result.replace(
          new RegExp(
            `(src|href)=["']([^"']*${this._escapeRegex(filename)})["']`,
            'gi'
          ),
          `$1="${dataUrl}"`
        );
      }
    }

    return result;
  }

  /**
   * 判断路径是否为图片文件
   * @internal
   */
  private _isImagePath(path: string): boolean {
    return /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp)$/i.test(path);
  }

  /**
   * 根据文件扩展名获取 MIME 类型
   * @internal
   */
  private _getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      bmp: 'image/bmp',
    };
    return mimeTypes[ext] ?? 'application/octet-stream';
  }

  /**
   * Uint8Array 转 Base64 字符串
   * @internal
   */
  private _uint8ArrayToBase64(uint8Array: Uint8Array): string {
    // 在 Node.js 环境使用 Buffer
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(uint8Array).toString('base64');
    }

    // 浏览器环境使用 btoa
    let binary = '';
    const len = uint8Array.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]!);
    }
    return btoa(binary);
  }

  /**
   * 转义正则表达式特殊字符
   * @internal
   */
  private _escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 将数据写入文件
   * @internal
   */
  private async _writeToFile(
    data: Uint8Array,
    outputPath: string
  ): Promise<void> {
    // 检查 Node.js 环境
    if (typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('fs');
      const path = await import('path');

      // 确保目录存在
      const dir = path.dirname(outputPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // 写入文件
      await fs.promises.writeFile(outputPath, data);
    } else {
      throw new Error(
        '文件写入需要 Node.js 环境。在浏览器环境中，请使用返回的 data 字段。'
      );
    }
  }
}

// ============================================================================
// 工厂函数和默认实例
// ============================================================================

/**
 * 创建 CardtoImagePlugin 实例
 *
 * @returns 新的插件实例
 *
 * @example
 * ```typescript
 * import { createPlugin } from '@chips/cardto-image-plugin';
 *
 * const plugin = createPlugin();
 * const result = await plugin.convert(source);
 * ```
 */
export function createPlugin(): CardtoImagePlugin {
  return new CardtoImagePlugin();
}

/**
 * 默认插件实例
 *
 * @remarks
 * 提供一个预创建的插件实例，适合简单使用场景
 *
 * @example
 * ```typescript
 * import { plugin } from '@chips/cardto-image-plugin';
 *
 * const result = await plugin.convert(source, { format: 'png' });
 * ```
 */
export const plugin = createPlugin();

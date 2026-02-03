/**
 * CardtoImagePlugin 主类
 *
 * 将卡片转换为图片，依赖 CardtoHTMLPlugin 生成 HTML
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
} from './types';

/**
 * 插件元数据
 */
const PLUGIN_METADATA = {
  id: 'cardto-image-plugin',
  name: '卡片转图片插件',
  version: '0.1.0',
  sourceTypes: ['.card', 'card'],
  targetType: 'image',
  description: '将薯片卡片文件转换为 PNG 或 JPG 图片',
};

/**
 * 默认选项
 */
const DEFAULT_OPTIONS: ImageConversionOptions = {
  format: 'png',
  quality: 90,
  scale: 1,
  backgroundColor: '#ffffff',
  transparent: false,
  waitTime: 1000,
};

/**
 * CardtoImagePlugin 转换器插件
 */
export class CardtoImagePlugin implements ImageConverterPlugin {
  readonly id = PLUGIN_METADATA.id;
  readonly name = PLUGIN_METADATA.name;
  readonly version = PLUGIN_METADATA.version;
  readonly sourceTypes = PLUGIN_METADATA.sourceTypes;
  readonly targetType = PLUGIN_METADATA.targetType;
  readonly description = PLUGIN_METADATA.description;

  private _htmlPlugin: CardtoHTMLPlugin;

  constructor() {
    this._htmlPlugin = new CardtoHTMLPlugin();
  }

  /**
   * 执行转换
   */
  async convert(
    source: ConversionSource,
    options?: ImageConversionOptions
  ): Promise<ImageConversionResult> {
    const taskId = uuidv4();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    const reportProgress = (
      status: ImageProgressInfo['status'],
      percent: number,
      step?: string
    ): void => {
      if (mergedOptions.onProgress) {
        mergedOptions.onProgress({ taskId, status, percent, currentStep: step });
      }
    };

    try {
      // 1. 使用 CardtoHTMLPlugin 转换为 HTML
      reportProgress('converting-html', 0, '正在生成 HTML');

      const htmlResult = await this._htmlPlugin.convert(source, {
        themeId: mergedOptions.themeId,
        includeAssets: true,
      });

      if (!htmlResult.success || !htmlResult.data) {
        return {
          success: false,
          taskId,
          error: htmlResult.error ?? {
            code: 'CONV-HTML-002' as const,
            message: 'HTML 转换失败',
          },
        };
      }

      reportProgress('rendering', 30, 'HTML 生成完成，准备渲染');

      // 2. 使用 Puppeteer 渲染 HTML 为图片
      reportProgress('rendering', 40, '正在启动浏览器');

      const imageData = await this._renderHTMLToImage(
        htmlResult.data.files,
        mergedOptions
      );

      reportProgress('capturing', 80, '正在截取图片');

      // 3. 处理输出
      if (mergedOptions.outputPath) {
        await this._writeToFile(imageData, mergedOptions.outputPath);
      }

      reportProgress('completed', 100, '转换完成');

      const duration = Date.now() - startTime;

      return {
        success: true,
        taskId,
        outputPath: mergedOptions.outputPath,
        data: mergedOptions.outputPath ? undefined : imageData,
        format: mergedOptions.format,
        duration,
      };
    } catch (error) {
      reportProgress('failed', 0, '转换失败');

      return {
        success: false,
        taskId,
        error: {
          code: 'CONV-HTML-007' as const,
          message: error instanceof Error ? error.message : '图片渲染失败',
          cause: error instanceof Error ? error : undefined,
        },
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取默认选项
   */
  getDefaultOptions(): ImageConversionOptions {
    return { ...DEFAULT_OPTIONS };
  }

  /**
   * 渲染 HTML 为图片
   */
  private async _renderHTMLToImage(
    files: Map<string, string | Uint8Array>,
    options: ImageConversionOptions
  ): Promise<Uint8Array> {
    // 检查是否有 Puppeteer
    let puppeteer: typeof import('puppeteer') | undefined;
    try {
      puppeteer = await import('puppeteer');
    } catch {
      throw new Error(
        '需要安装 puppeteer 才能渲染图片。请运行: npm install puppeteer'
      );
    }

    // 获取 index.html 内容
    const indexHtml = files.get('index.html');
    if (!indexHtml || typeof indexHtml !== 'string') {
      throw new Error('未找到 index.html 文件');
    }

    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // 设置视口大小
      const viewport = {
        width: options.width ?? 800,
        height: options.height ?? 600,
        deviceScaleFactor: options.scale ?? 1,
      };
      await page.setViewport(viewport);

      // 创建临时 HTML 文件或使用 data URL
      const htmlContent = this._inlineResources(indexHtml, files);
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      // 等待额外时间
      if (options.waitTime && options.waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, options.waitTime));
      }

      // 截图
      const screenshotOptions: Parameters<typeof page.screenshot>[0] = {
        type: options.format === 'jpg' || options.format === 'jpeg' ? 'jpeg' : 'png',
        fullPage: true,
      };

      if (options.format === 'jpg' || options.format === 'jpeg') {
        screenshotOptions.quality = options.quality ?? 90;
      }

      if (options.format === 'png' && !options.transparent) {
        screenshotOptions.omitBackground = false;
      }

      const screenshot = await page.screenshot(screenshotOptions);

      return new Uint8Array(screenshot);
    } finally {
      await browser.close();
    }
  }

  /**
   * 内联资源到 HTML
   */
  private _inlineResources(
    html: string,
    files: Map<string, string | Uint8Array>
  ): string {
    let result = html;

    // 内联 theme.css
    const themeCss = files.get('theme.css');
    if (themeCss && typeof themeCss === 'string') {
      const styleTag = `<style>${themeCss}</style>`;
      result = result.replace(
        /<link[^>]*href=["'][^"']*theme\.css["'][^>]*>/gi,
        styleTag
      );
    }

    // 内联图片为 base64
    for (const [path, content] of files) {
      if (content instanceof Uint8Array && this._isImagePath(path)) {
        const base64 = this._uint8ArrayToBase64(content);
        const mimeType = this._getMimeType(path);
        const dataUrl = `data:${mimeType};base64,${base64}`;

        // 替换引用
        const filename = path.split('/').pop() ?? '';
        result = result.replace(
          new RegExp(`(src|href)=["'][^"']*${this._escapeRegex(filename)}["']`, 'gi'),
          `$1="${dataUrl}"`
        );
      }
    }

    return result;
  }

  /**
   * 判断是否为图片路径
   */
  private _isImagePath(path: string): boolean {
    return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path);
  }

  /**
   * 获取 MIME 类型
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
    };
    return mimeTypes[ext] ?? 'application/octet-stream';
  }

  /**
   * Uint8Array 转 Base64
   */
  private _uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]!);
    }
    return btoa(binary);
  }

  /**
   * 转义正则特殊字符
   */
  private _escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 写入文件
   */
  private async _writeToFile(data: Uint8Array, outputPath: string): Promise<void> {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('fs');
      await fs.promises.writeFile(outputPath, data);
    } else {
      throw new Error('文件写入需要 Node.js 环境');
    }
  }
}

/**
 * 创建插件实例
 */
export function createPlugin(): CardtoImagePlugin {
  return new CardtoImagePlugin();
}

/**
 * 默认插件实例
 */
export const plugin = createPlugin();

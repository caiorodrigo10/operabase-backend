import https from 'https';
import http from 'http';
import * as zlib from 'zlib';
import { load } from 'cheerio';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  isValid: boolean;
  error?: string;
}

export interface CrawlOptions {
  maxPages?: number;
  respectRobotsTxt?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
}

export class CrawlerService {
  constructor() {
    // No browser needed
  }

  private async fetchHTML(url: string, retryCount = 0): Promise<string> {
    const maxRetries = 3;
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      const currentUserAgent = userAgents[retryCount % userAgents.length];

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': currentUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/'
        },
        timeout: 30000
      };

      const req = protocol.request(options, (res) => {
        let data = '';

        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          return this.fetchHTML(redirectUrl, retryCount).then(resolve).catch(reject);
        }

        if (res.statusCode && res.statusCode !== 200) {
          if ((res.statusCode === 403 || res.statusCode === 429) && retryCount < maxRetries) {
            console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries + 1} para ${url} (${res.statusCode})`);
            setTimeout(() => {
              this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
            }, Math.pow(2, retryCount) * 1000); // Exponential backoff
          } else {
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
          return;
        }

        // Handle encoding and compression properly
        const chunks: Buffer[] = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const encoding = res.headers['content-encoding'];
          
          if (encoding === 'gzip') {
            zlib.gunzip(buffer, (err: Error | null, decompressed: Buffer) => {
              if (err) {
                reject(err);
              } else {
                resolve(decompressed.toString('utf8'));
              }
            });
          } else if (encoding === 'deflate') {
            zlib.inflate(buffer, (err: Error | null, decompressed: Buffer) => {
              if (err) {
                reject(err);
              } else {
                resolve(decompressed.toString('utf8'));
              }
            });
          } else if (encoding === 'br') {
            zlib.brotliDecompress(buffer, (err: Error | null, decompressed: Buffer) => {
              if (err) {
                reject(err);
              } else {
                resolve(decompressed.toString('utf8'));
              }
            });
          } else {
            // No compression or unknown compression
            resolve(buffer.toString('utf8'));
          }
        });
      });

      req.on('error', (error) => {
        if (retryCount < maxRetries) {
          console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries + 1} para ${url} (erro de rede)`);
          setTimeout(() => {
            this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
          }, Math.pow(2, retryCount) * 1000);
        } else {
          reject(error);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (retryCount < maxRetries) {
          console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries + 1} para ${url} (timeout)`);
          setTimeout(() => {
            this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
          }, 2000);
        } else {
          reject(new Error('Request timeout'));
        }
      });

      req.end();
    });
  }

  async crawlSinglePage(url: string): Promise<CrawledPage> {
    try {
      console.log(`🔍 Extraindo conteúdo da página: ${url}`);
      
      const html = await this.fetchHTML(url);
      const $ = load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, .ads, .advertisement, .sidebar, .menu, .navigation').remove();

      // Extract title
      const title = $('title').text().trim() || this.getTitleFromUrl(url);

      // Get main content, prioritizing semantic elements
      let contentElement = $('article').first();
      if (!contentElement.length) contentElement = $('main').first();
      if (!contentElement.length) contentElement = $('.content, #content').first();
      if (!contentElement.length) contentElement = $('.post, .entry').first();
      if (!contentElement.length) contentElement = $('body');

      const content = contentElement.text() || '';
      const cleanContent = this.cleanContent(content);

      return {
        url,
        title,
        content: cleanContent,
        wordCount: this.countWords(cleanContent),
        isValid: cleanContent.length > 50,
      };
    } catch (error) {
      console.error(`❌ Erro ao extrair página ${url}:`, error);
      
      return {
        url,
        title: 'Erro ao carregar',
        content: '',
        wordCount: 0,
        isValid: false,
        error: this.formatErrorMessage(error)
      };
    }
  }

  async crawlDomain(baseUrl: string, options: CrawlOptions = {}): Promise<CrawledPage[]> {
    try {
      console.log(`🕷️ Iniciando crawling do domínio: ${baseUrl}`);
      
      const {
        maxPages = 20,
        respectRobotsTxt = true,
        excludePatterns = [
          '/privacy', '/terms', '/cookie', '/legal',
          '.pdf', '.jpg', '.png', '.gif', '.css', '.js'
        ]
      } = options;

      // Primeiro, extrair a página inicial
      const initialPage = await this.crawlSinglePage(baseUrl);
      const pages: CrawledPage[] = [initialPage];

      if (!initialPage.isValid) {
        return pages;
      }

      // Extrair links internos da página inicial
      const internalLinks = await this.extractInternalLinks(baseUrl);
      console.log(`🔗 Encontrados ${internalLinks.length} links internos`);

      // Filtrar links baseado nos padrões de exclusão
      const filteredLinks = internalLinks
        .filter(link => !excludePatterns.some(pattern => link.includes(pattern)))
        .slice(0, maxPages - 1); // -1 porque já temos a página inicial

      // Crawlear cada link interno
      for (const link of filteredLinks) {
        try {
          const page = await this.crawlSinglePage(link);
          pages.push(page);
          
          // Pequena pausa para não sobrecarregar o servidor
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`⚠️ Falha ao processar ${link}:`, error);
        }
      }

      // Filtrar apenas páginas válidas
      const validPages = pages.filter(page => page.isValid);
      console.log(`✅ Crawling concluído: ${validPages.length} páginas válidas de ${pages.length} tentativas`);

      return validPages;
    } catch (error) {
      console.error('❌ Erro no crawling do domínio:', error);
      return [];
    }
  }

  private async extractInternalLinks(baseUrl: string): Promise<string[]> {
    try {
      const html = await this.fetchHTML(baseUrl);
      const $ = load(html);
      const domain = new URL(baseUrl).hostname;
      const urls = new Set<string>();

      // Extract from regular anchor tags
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        try {
          let fullUrl: string;
          
          if (href.startsWith('http')) {
            const linkDomain = new URL(href).hostname;
            if (linkDomain === domain) {
              fullUrl = href;
            } else {
              return; // Skip external links
            }
          } else if (href.startsWith('/')) {
            fullUrl = new URL(href, baseUrl).href;
          } else if (href.startsWith('#') || href === '') {
            return; // Skip anchors and empty hrefs
          } else {
            fullUrl = new URL(href, baseUrl).href;
          }

          // Avoid duplicates and the base URL itself
          if (fullUrl !== baseUrl && !urls.has(fullUrl)) {
            urls.add(fullUrl);
          }
        } catch {
          // Invalid URL, skip
          return;
        }
      });

      // Also try to extract from JavaScript-rendered content
      // Look for common patterns in the HTML source
      const scriptContent = $('script').text();
      const urlPatterns = [
        /["']([^"']*\/[^"']*?)["']/g,  // Quoted URLs with paths
        /url\s*:\s*["']([^"']+)["']/g,  // url: "path" patterns
        /href\s*:\s*["']([^"']+)["']/g, // href: "path" patterns
      ];

      for (const pattern of urlPatterns) {
        let match;
        while ((match = pattern.exec(scriptContent)) !== null) {
          const url = match[1];
          if (url && url.startsWith('/') && !url.includes('..') && url.length > 1) {
            try {
              const fullUrl = new URL(url, baseUrl).href;
              if (fullUrl !== baseUrl && !urls.has(fullUrl)) {
                urls.add(fullUrl);
              }
            } catch {
              // Invalid URL, skip
            }
          }
        }
      }

      // Add some common page paths for sites that don't expose links
      if (urls.size === 0) {
        const commonPaths = [
          '/about', '/sobre', '/contato', '/contact', '/servicos', '/services',
          '/produtos', '/products', '/blog', '/news', '/noticias', '/help', '/ajuda'
        ];
        
        for (const path of commonPaths) {
          const fullUrl = new URL(path, baseUrl).href;
          urls.add(fullUrl);
        }
      }

      console.log(`🔗 Encontrados ${urls.size} links internos`);
      return Array.from(urls);
    } catch (error) {
      console.error('❌ Erro ao extrair links internos:', error);
      return [];
    }
  }

  private cleanContent(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  private extractTitle(html: string): string | null {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  private getTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      if (path === '/' || path === '') {
        return urlObj.hostname;
      }
      
      const segments = path.split('/').filter(s => s.length > 0);
      const lastSegment = segments[segments.length - 1];
      
      return lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\.(html|php|asp|jsp)$/i, '')
        .replace(/\b\w/g, l => l.toUpperCase());
    } catch {
      return 'Página sem título';
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private formatErrorMessage(error: any): string {
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        return 'Site com proteção anti-bot - acesso bloqueado';
      } else if (error.message.includes('404')) {
        return 'Página não encontrada';
      } else if (error.message.includes('timeout')) {
        return 'Site muito lento - tempo limite excedido';
      } else if (error.message.includes('ENOTFOUND')) {
        return 'Site não encontrado - verifique a URL';
      } else if (error.message.includes('ECONNREFUSED')) {
        return 'Conexão recusada pelo servidor';
      } else {
        return error.message;
      }
    }
    return 'Erro desconhecido';
  }

  async close(): Promise<void> {
    // No cleanup needed for Node.js native approach
  }
}
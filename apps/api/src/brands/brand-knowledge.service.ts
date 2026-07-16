import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { BrandConfig, BrandKnowledge } from './brand.types';

const BRAND_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KNOWLEDGE_EXTENSIONS = new Set(['.md', '.txt']);

@Injectable()
export class BrandKnowledgeService {
  private readonly brandsRoot = resolve(
    process.env.BRAND_DATA_ROOT ?? join(process.cwd(), 'data', 'brands'),
  );

  async listBrands(): Promise<Pick<BrandConfig, 'id' | 'displayName'>[]> {
    const entries = await readdir(this.brandsRoot, { withFileTypes: true });
    const brands: Pick<BrandConfig, 'id' | 'displayName'>[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !BRAND_ID_PATTERN.test(entry.name)) {
        continue;
      }

      try {
        const brand = await this.loadBrand(entry.name);
        brands.push({
          id: brand.config.id,
          displayName: brand.config.displayName,
        });
      } catch {
        // Invalid or disabled brand directories are not publicly listed.
      }
    }

    return brands;
  }

  async loadBrand(brandId: string): Promise<BrandKnowledge> {
    const brandDirectory = this.resolveBrandDirectory(brandId);
    const config = await this.readConfig(brandDirectory);

    if (!config.enabled || config.id !== brandId) {
      throw new NotFoundException(`Brand "${brandId}" was not found.`);
    }

    const knowledgeFiles = await this.findKnowledgeFiles(brandDirectory);

    if (knowledgeFiles.length === 0) {
      throw new UnprocessableEntityException(
        `Brand "${brandId}" has no knowledge files.`,
      );
    }

    const sections = await Promise.all(
      knowledgeFiles.map(async (filePath) => {
        const content = await readFile(filePath, 'utf8');
        return `SOURCE: ${relative(brandDirectory, filePath)}\n${content.trim()}`;
      }),
    );

    return {
      config,
      context: sections.join('\n\n---\n\n'),
      sources: knowledgeFiles.map((filePath) =>
        relative(brandDirectory, filePath),
      ),
    };
  }

  isRelevant(message: string, config: BrandConfig): boolean {
    const normalizedMessage = this.normalize(message);
    if (
      /^(hi|hello|hey|good morning|good afternoon|good evening)$/.test(
        normalizedMessage,
      )
    ) {
      return true;
    }

    const searchableTerms = [
      ...config.aliases,
      ...config.relevance.keywords,
      ...config.relevance.genericBrandQuestions,
    ].map((term) => this.normalize(term));

    return searchableTerms.some((term) => normalizedMessage.includes(term));
  }

  private resolveBrandDirectory(brandId: string): string {
    if (!BRAND_ID_PATTERN.test(brandId)) {
      throw new NotFoundException(`Brand "${brandId}" was not found.`);
    }

    const brandDirectory = resolve(this.brandsRoot, brandId);
    if (!brandDirectory.startsWith(`${this.brandsRoot}${sep}`)) {
      throw new NotFoundException(`Brand "${brandId}" was not found.`);
    }

    return brandDirectory;
  }

  private async readConfig(brandDirectory: string): Promise<BrandConfig> {
    try {
      const configPath = join(brandDirectory, 'brand.json');
      const config = JSON.parse(
        await readFile(configPath, 'utf8'),
      ) as BrandConfig;
      this.validateConfig(config);
      return config;
    } catch {
      throw new NotFoundException(
        `Brand "${basename(brandDirectory)}" was not found.`,
      );
    }
  }

  private validateConfig(config: BrandConfig): void {
    if (
      !config.id ||
      !config.displayName ||
      !Array.isArray(config.aliases) ||
      !config.refusalMessage ||
      !config.insufficientInformationMessage ||
      !Array.isArray(config.relevance?.keywords) ||
      !Array.isArray(config.relevance?.genericBrandQuestions)
    ) {
      throw new Error('Invalid brand configuration.');
    }
  }

  private async findKnowledgeFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this.findKnowledgeFiles(path)));
      } else if (KNOWLEDGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(path);
      }
    }

    return files.sort();
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

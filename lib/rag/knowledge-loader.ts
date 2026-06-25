import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { KnowledgeChunk } from '@/lib/types';
import { splitTextToChunks } from './text-splitter';

const DEFAULT_KNOWLEDGE_DIR = 'knowledge';
const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt']);

async function collectKnowledgeFiles(directory: string): Promise<string[]> {
  let entries: import('node:fs').Dirent<string>[];

  try {
    entries = await fs.readdir(directory, { withFileTypes: true, encoding: 'utf-8' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const files = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) return collectKnowledgeFiles(fullPath);
      if (!entry.isFile()) return [];
      if (!SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) return [];

      return [fullPath];
    }),
  );

  return files.flat();
}

export async function loadKnowledgeChunks(options?: {
  knowledgeDir?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}): Promise<KnowledgeChunk[]> {
  const knowledgeDir = path.resolve(process.cwd(), options?.knowledgeDir ?? process.env.RAG_KNOWLEDGE_DIR ?? DEFAULT_KNOWLEDGE_DIR);
  const files = await collectKnowledgeFiles(knowledgeDir);
  const chunks: KnowledgeChunk[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const source = path.relative(knowledgeDir, file);

    chunks.push(
      ...splitTextToChunks(content, {
        source,
        chunkSize: options?.chunkSize,
        chunkOverlap: options?.chunkOverlap,
      }),
    );
  }

  return chunks;
}

import type { KnowledgeChunk } from '@/lib/types';

export type SplitTextOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
  source: string;
};

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 120;

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isMarkdownHeading(line: string) {
  return /^#{1,6}\s+\S/.test(line.trim());
}

function splitByHeading(text: string) {
  const sections: string[] = [];
  const lines = normalizeText(text).split('\n');
  let currentSection: string[] = [];
  let hasHeading = false;

  for (const line of lines) {
    if (isMarkdownHeading(line)) {
      hasHeading = true;

      const section = currentSection.join('\n').trim();
      if (section) sections.push(section);

      currentSection = [line];
      continue;
    }

    currentSection.push(line);
  }

  const section = currentSection.join('\n').trim();
  if (section) sections.push(section);

  return hasHeading ? sections : [];
}

function splitByParagraph(text: string) {
  return normalizeText(text)
    .split(/\n\s*\n/g)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
}

function splitLongParagraph(paragraph: string, chunkSize: number, chunkOverlap: number) {
  const chunks: string[] = [];
  const step = Math.max(1, chunkSize - chunkOverlap);

  for (let start = 0; start < paragraph.length; start += step) {
    const chunk = paragraph.slice(start, start + chunkSize).trim();
    if (chunk) chunks.push(chunk);

    if (start + chunkSize >= paragraph.length) break;
  }

  return chunks;
}

export function splitTextToChunks(text: string, options: SplitTextOptions): KnowledgeChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = Math.min(options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, chunkSize - 1);
  const headingSections = splitByHeading(text);
  const paragraphs = headingSections.length > 0 ? headingSections : splitByParagraph(text);
  const preserveBlockBoundaries = headingSections.length > 0;
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      chunks.push(...splitLongParagraph(paragraph, chunkSize, chunkOverlap));
      continue;
    }

    if (preserveBlockBoundaries) {
      chunks.push(paragraph.trim());
      continue;
    }

    const nextChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

    if (nextChunk.length <= chunkSize) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    currentChunk = paragraph;
  }

  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks.map((content, index) => ({
    id: `${options.source}#${index + 1}`,
    content,
    source: options.source,
    metadata: {
      chunkIndex: index,
    },
  }));
}

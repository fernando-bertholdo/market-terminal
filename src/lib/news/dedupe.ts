import type { NewsItem } from '@/types/market';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'to', 'with', 'after', 'amid', 'over',
]);

function normalizedTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/\s+-\s+(reuters|bloomberg).*$/i, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function similarity(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  return intersection / (a.size + b.size - intersection);
}

function numbersMatch(left: string[], right: string[]): boolean {
  const a = left.filter((token) => /\d/.test(token)).sort().join('|');
  const b = right.filter((token) => /\d/.test(token)).sort().join('|');
  return a === b;
}

export function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const sorted = [...items].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );
  const kept: Array<{ item: NewsItem; tokens: string[] }> = [];

  for (const item of sorted) {
    const tokens = normalizedTokens(item.title);
    const duplicate = kept.find((candidate) => {
      if (!numbersMatch(tokens, candidate.tokens)) return false;
      const shorter = Math.min(tokens.length, candidate.tokens.length);
      const threshold = shorter <= 5 ? 0.88 : 0.72;
      return similarity(tokens, candidate.tokens) >= threshold;
    });

    if (duplicate) {
      duplicate.item.duplicateCount = (duplicate.item.duplicateCount ?? 1) + 1;
      continue;
    }

    kept.push({ item: { ...item, duplicateCount: 1 }, tokens });
  }

  return kept.map(({ item }) => item);
}

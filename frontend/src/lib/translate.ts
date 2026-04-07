// ============================================================
// translate.ts — legacy compatibility helpers
// Deprecated: dynamic business-content translation now goes
// through resource detail fields + /api/translations/resolve.
// ============================================================

import { useEffect, useState } from 'react';

export async function translateText(text: string): Promise<string> {
  return text;
}

export async function translateBatch(texts: string[]): Promise<string[]> {
  return texts;
}

export function useTranslatedText(text: string): string {
  const [result, setResult] = useState(text);

  useEffect(() => {
    setResult(text);
  }, [text]);

  return result;
}

export function useTranslatedPosts<T extends { title?: string; content_markdown: string }>(posts: T[]): T[] {
  const [translated, setTranslated] = useState<T[]>(posts);

  useEffect(() => {
    setTranslated(posts);
  }, [posts]);

  return translated;
}

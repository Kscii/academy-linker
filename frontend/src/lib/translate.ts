// ============================================================
// translate.ts — 内容翻译工具
// 流程: 本地内存缓存 → 后端缓存 → DeepSeek AI 翻译
// ============================================================

import { useState, useEffect, useRef } from 'react';

// 本地内存缓存，避免重复请求同一内容
const localCache = new Map<string, string>();

function cacheKey(text: string, lang: string) {
  return `${lang}:${text}`;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string> {
  if (!text.trim() || targetLang === sourceLang) return text;

  const key = cacheKey(text, targetLang);
  if (localCache.has(key)) return localCache.get(key)!;

  try {
    const res = await fetch('/api/content/translate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_language: targetLang,
        source_language: sourceLang,
      }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    const translated: string = data.data.translated_text;
    localCache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

/** 批量翻译，并发请求 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  return Promise.all(texts.map(t => translateText(t, targetLang)));
}

/** Hook: 翻译单段文本，非英文时自动请求 */
export function useTranslatedText(text: string, lang: string): string {
  const [result, setResult] = useState(text);
  const prevRef = useRef({ text, lang });

  useEffect(() => {
    if (lang === 'en' || !text) {
      setResult(text);
      return;
    }
    let cancelled = false;
    // 先显示原文，翻译完成后替换
    setResult(text);
    translateText(text, lang).then(t => {
      if (!cancelled) setResult(t);
    });
    return () => { cancelled = true; };
  }, [text, lang]);

  // 语言切换时立即重置
  if (prevRef.current.lang !== lang || prevRef.current.text !== text) {
    prevRef.current = { text, lang };
  }

  return result;
}

/** Hook: 翻译帖子数组（title + content_markdown），返回翻译后的副本 */
export function useTranslatedPosts<T extends { title?: string; content_markdown: string }>(
  posts: T[],
  lang: string,
): T[] {
  const [translated, setTranslated] = useState<T[]>(posts);

  useEffect(() => {
    if (lang === 'en' || posts.length === 0) {
      setTranslated(posts);
      return;
    }
    let cancelled = false;

    const allTexts = posts.flatMap(p => [p.title ?? '', p.content_markdown]);
    translateBatch(allTexts, lang).then(results => {
      if (cancelled) return;
      const out = posts.map((p, i) => ({
        ...p,
        title: results[i * 2] || p.title,
        content_markdown: results[i * 2 + 1] || p.content_markdown,
      }));
      setTranslated(out);
    });

    return () => { cancelled = true; };
  }, [posts, lang]);

  return translated;
}

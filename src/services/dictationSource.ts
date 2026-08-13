// ============================================
// Nguồn câu cho dictation (PHASES Phase 6): pack passage / bài VOA đã lưu /
// câu Tatoeba theo band NGSL / dán text. Trả danh sách {en, vi?}.
// ============================================

import { parseSource, splitSentences } from '../core/sentences';
import { extractJson, normalizePack } from '../core/aiJson';
import { complete } from './ai/client';
import { getSentenceDeps } from './dataBundle';
import { listArticles, listPacks } from './db';
import type { PackEntry } from './db';
import type { VoaArticle } from './voa';

export interface DictItem {
  en: string;
  vi?: string;
}
export interface DictSource {
  title: string;
  items: DictItem[];
}

export async function fromPacks(): Promise<PackEntry[]> {
  return listPacks(20);
}

export function packToSource(p: PackEntry): DictSource {
  const items = p.pack.passage.length ? p.pack.passage : p.pack.phrases;
  return { title: p.pack.topic, items: items.map((x) => ({ en: x.en, vi: x.vi })) };
}

export async function savedArticles(): Promise<VoaArticle[]> {
  return listArticles(20);
}

export function articleToSource(a: VoaArticle): DictSource {
  return {
    title: a.title,
    items: a.sentences.map((en, i) => ({ en, vi: a.vi?.[i] })),
  };
}

/** N câu Tatoeba ngắn (đã lọc theo NGSL sẵn trong bundle), kèm dịch VI. */
export async function fromTatoeba(count = 10): Promise<DictSource | null> {
  const deps = await getSentenceDeps();
  if (!deps || deps.pairs.length === 0) return null;
  const picked = [...deps.pairs]
    .sort(() => 0.5 - Math.random())
    .slice(0, count)
    .map((p) => ({ en: p.en, vi: p.vi }));
  return { title: 'Tatoeba', items: picked };
}

export function fromText(raw: string): DictSource {
  return { title: 'Văn bản', items: splitSentences(parseSource(raw)).map((en) => ({ en })) };
}

/** AI tạo bài nghe ngắn theo chủ đề (dùng lại prompt practice, chỉ lấy passage). */
export async function fromAiTopic(topic: string, level: string): Promise<DictSource> {
  const raw = await complete({
    system:
      'You write a short, natural spoken monologue for a Vietnamese English learner to take dictation from. Return ONLY JSON: {"passage":[{"en":"one sentence","vi":"Vietnamese"}]} with 8-10 clear sentences.',
    prompt: `Topic: ${topic}\nLevel: ${level}`,
    tier: 'cheap',
  });
  const pack = normalizePack(extractJson(raw), topic);
  if (pack.passage.length === 0) throw new Error('Không tạo được bài — thử chủ đề khác.');
  return { title: topic, items: pack.passage.map((p) => ({ en: p.en, vi: p.vi })) };
}

/** Nhận xét ngắn cuối bài (tier good). Trả '' nếu lỗi/không key. */
export async function dictationFeedback(wrong: string[], score: number): Promise<string> {
  if (wrong.length === 0) return '';
  try {
    return await complete({
      system:
        'You are a kind English listening coach for a Vietnamese learner. Reply in Vietnamese, 2-3 short sentences: what the wrong words have in common (sounds/spelling) and one concrete tip. No preamble.',
      prompt: `Score: ${score}/100. Words missed: ${wrong.join(', ')}`,
      tier: 'good',
      maxTokens: 300,
    });
  } catch {
    return '';
  }
}

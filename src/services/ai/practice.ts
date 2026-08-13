// ============================================
// Sinh practice pack — 1 pack = ĐÚNG 1 call AI (generate-once-use-many §4.2);
// cache vĩnh viễn vào store `packs` (mở lại 0 token).
// ============================================

import { extractJson, normalizePack } from '../../core/aiJson';
import type { PracticePack } from '../../core/types';
import { getPack, putPack } from '../db';
import { complete } from './client';
import { buildPracticeText, PRACTICE_SYSTEM_PROMPT, PRACTICE_TEMPLATE } from './prompts';

export interface GenerateOpts {
  topic: string;
  level: string;
  words?: string[]; // ôn từ cụ thể (weak words)
}

export function packKey(opts: GenerateOpts): string {
  const w = opts.words?.length ? `|${[...opts.words].sort().join(',').slice(0, 80)}` : '';
  return `${opts.topic.trim().toLowerCase()}|${opts.level}${w}`;
}

export async function generatePractice(
  opts: GenerateOpts,
): Promise<{ pack: PracticePack; fromCache: boolean }> {
  const topic = opts.topic.trim();
  if (!topic) throw new Error('Hãy nhập chủ đề.');

  const key = packKey(opts);
  const cached = await getPack(key);
  if (cached) return { pack: cached.pack, fromCache: true };

  const text = buildPracticeText(topic, opts.level, opts.words?.filter(Boolean) ?? []);
  const raw = await complete({
    system: PRACTICE_SYSTEM_PROMPT,
    prompt: PRACTICE_TEMPLATE.replace('{text}', () => text),
    tier: 'cheap',
  });

  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Kết quả AI không hợp lệ — thử lại nhé.');
  }
  const pack = normalizePack(parsed, topic);
  if (pack.vocab.length === 0 && pack.phrases.length === 0) {
    throw new Error('Không tạo được nội dung. Thử chủ đề khác.');
  }

  await putPack({ key, pack, level: opts.level, createdAt: Date.now() });
  return { pack, fromCache: false };
}

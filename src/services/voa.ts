// ============================================
// VOA Learning English — nguồn đọc/nghe public domain (DATA.md §5).
// Mọi request đi qua proxy cùng origin /api/voa/* (worker/index.js, D11):
// không CORS, không phụ thuộc mạng người dùng tới voanews.com.
// Bài đã mở được cache vào IndexedDB (đọc offline); MP3 cache bởi SW.
// ============================================

import { splitSentences } from '../core/sentences';
import { extractJson } from '../core/aiJson';
import { complete } from './ai/client';
import { getArticle, listArticles, putArticle } from './db';

export interface VoaFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  audio?: string;
}

export interface VoaArticle {
  url: string;
  title: string;
  sentences: string[];
  audio?: string;
  vi?: string[]; // dịch song ngữ (AI, 1 call, cache mãi)
  fetchedAt: number;
}

export function proxied(kind: 'page' | 'audio', url: string): string {
  return `/api/voa/${kind}?url=${encodeURIComponent(url)}`;
}

/**
 * Các chương trình VOA Learning English. LƯU Ý: VOA ngừng sản xuất nội dung
 * mới từ 3/2025 (bị cắt ngân sách) — đây là KHO LƯU TRỮ, vẫn là tài liệu học
 * chất lượng (text + audio đọc chậm, public domain).
 */
export const VOA_PROGRAMS: { name: string; url: string }[] = [
  { name: 'As It Is', url: 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi' },
  { name: 'All About America', url: 'https://learningenglish.voanews.com/api/zbmroml-vomx-tpeqboo_' },
  { name: 'Arts & Culture', url: 'https://learningenglish.voanews.com/api/zpyp_l-vomx-tpe_rym' },
  { name: 'Ask a Teacher', url: 'https://learningenglish.voanews.com/api/zti_qvl-vomx-tpekgvqr' },
  { name: 'Everyday Grammar', url: 'https://learningenglish.voanews.com/api/zoroqql-vomx-tpeptpqq' },
  { name: 'Podcast (30 phút)', url: 'https://learningenglish.voanews.com/podcast/?zoneId=1689&format=RSS' },
];

/** Danh sách bài từ RSS một chương trình. Throw khi offline — caller fallback listArticles(). */
export async function fetchFeed(feedUrl?: string): Promise<VoaFeedItem[]> {
  const url = feedUrl ? `/api/voa/feed?url=${encodeURIComponent(feedUrl)}` : '/api/voa/feed';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`VOA feed: HTTP ${res.status}`);
  const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
  const items: VoaFeedItem[] = [];
  xml.querySelectorAll('item').forEach((it) => {
    const title = it.querySelector('title')?.textContent?.trim() || '';
    const link = it.querySelector('link')?.textContent?.trim() || '';
    const audio = it.querySelector('enclosure')?.getAttribute('url') || undefined;
    const pubDate = it.querySelector('pubDate')?.textContent?.trim() || undefined;
    if (title && (link || audio)) items.push({ title, link: link || audio!, pubDate, audio });
  });
  return items;
}

/** Lấy bài: cache trước, không có thì fetch qua proxy + parse + cache. */
export async function loadArticle(item: VoaFeedItem): Promise<VoaArticle> {
  const cached = await getArticle(item.link);
  if (cached) return cached;

  const res = await fetch(proxied('page', item.link));
  if (!res.ok) throw new Error(`VOA page: HTTP ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

  const title =
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    item.title;

  // Nội dung bài của Pangea CMS (VOA) nằm trong #article-content / .wsw
  const container =
    doc.querySelector('#article-content') || doc.querySelector('.wsw') || doc.body;
  const paras: string[] = [];
  container.querySelectorAll('p').forEach((p) => {
    const t = p.textContent?.replace(/\s+/g, ' ').trim() || '';
    // Cắt phần footer quen thuộc của Learning English
    if (/^_{2,}|^Words in This Story/i.test(t)) return;
    if (t) paras.push(t);
  });

  // VOA đặt src TRỰC TIẾP trên thẻ <audio> (không có <source> con);
  // link download có đuôi ?download=1 — bỏ đi để cache/Range hoạt động sạch.
  const rawAudio =
    doc.querySelector('audio[src]')?.getAttribute('src') ||
    doc.querySelector('audio source')?.getAttribute('src') ||
    doc.querySelector('a[href*=".mp3"]')?.getAttribute('href') ||
    item.audio ||
    undefined;
  const audio = rawAudio ? rawAudio.replace(/\?download=1.*$/, '') : undefined;

  const article: VoaArticle = {
    url: item.link,
    title,
    sentences: splitSentences(paras.join('\n')),
    audio: audio || undefined,
    fetchedAt: Date.now(),
  };
  if (article.sentences.length === 0) throw new Error('Không đọc được nội dung bài này.');
  await putArticle(article);
  return article;
}

/** Dịch song ngữ cả bài — 1 call AI tier cheap, lưu vào cache bài. */
export async function translateArticle(article: VoaArticle): Promise<VoaArticle> {
  if (article.vi?.length === article.sentences.length) return article;
  const raw = await complete({
    system:
      'You translate English sentences to natural Vietnamese for a language learner. Return ONLY a JSON array of strings, same length and order as the input array. No commentary.',
    prompt: JSON.stringify(article.sentences),
    tier: 'cheap',
  });
  const parsed = extractJson(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Kết quả dịch không hợp lệ — thử lại nhé.');
  }
  const vi = article.sentences.map((_, i) => String(parsed[i] ?? ''));
  const updated = { ...article, vi };
  await putArticle(updated);
  return updated;
}

/** Track cho global player: resolve MP3 lười (mở trang bài khi đến lượt phát). */
export function trackFor(item: VoaFeedItem): import('./audioPlayer').Track {
  return {
    title: item.title,
    link: item.link,
    url: item.audio ? proxied('audio', item.audio) : undefined,
    resolve: async () => {
      const art = await loadArticle(item);
      return art.audio ? proxied('audio', art.audio) : undefined;
    },
  };
}

export { listArticles };

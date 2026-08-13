// ============================================
// Worker chạy CÙNG deploy với static assets (D11): mọi path ngoài /api/*
// do assets/SPA phục vụ; /api/voa/* là proxy stateless đến VOA
// (public domain, DATA.md §5a) — fetch từ edge Cloudflare nên không phụ
// thuộc mạng người dùng và không dính CORS (cùng origin với app).
// KHÔNG lưu trữ gì — không vi phạm D2 (no-backend).
// ============================================

const FEED_DEFAULT =
  'https://learningenglish.voanews.com/podcast/?zoneId=1689&format=RSS';

/**
 * Chỉ proxy đến VOA — chặn mọi host khác (không thành open proxy).
 * LƯU Ý: audio của VOA nằm trên voa-audio.voanews.EU (không phải .com) —
 * thiếu .eu là 403 toàn bộ MP3 (bug đã gặp 2026-08-13).
 */
function isAllowed(target) {
  return /(^|\.)voanews\.(com|eu)$/.test(target.hostname) && target.protocol === 'https:';
}

async function proxy(targetUrl, request) {
  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    return new Response('Bad url', { status: 400 });
  }
  if (!isAllowed(target)) return new Response('Host not allowed', { status: 403 });

  // WAF của VOA trả 403 cho User-Agent lạ — giả trình duyệt đầy đủ.
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,audio/*;q=0.8,*/*;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  const range = request.headers.get('range');
  if (range) headers.Range = range; // seek audio

  const res = await fetch(target.toString(), {
    headers,
    cf: { cacheTtl: 1800, cacheEverything: true },
  });

  const out = new Headers();
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  out.set('Access-Control-Allow-Origin', '*');
  out.set('Cache-Control', 'public, max-age=1800');
  return new Response(res.body, { status: res.status, headers: out });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/api/voa/feed') {
      const custom = url.searchParams.get('url');
      return proxy(custom || FEED_DEFAULT, request);
    }
    if (url.pathname === '/api/voa/page' || url.pathname === '/api/voa/audio') {
      const target = url.searchParams.get('url');
      if (!target) return new Response('Missing url', { status: 400 });
      return proxy(target, request);
    }
    return new Response('Not found', { status: 404 });
  },
};

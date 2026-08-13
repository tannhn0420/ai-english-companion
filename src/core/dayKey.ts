/**
 * Khóa ngày cục bộ dạng 'YYYY-MM-DD' — dùng cho streak/heatmap (cùng shape với
 * `practiceDays` của extension). Nhận `now` làm tham số theo quy tắc core
 * (ARCHITECTURE §3.5): không gọi Date.now() bên trong.
 */
export function dayKey(now: number): string {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Số ngày nguyên chênh lệch giữa hai dayKey (b - a). */
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86_400_000);
}

// ============================================
// Chấm chính tả theo TỪ — căn chỉnh LCS giữa câu gốc và câu người dùng gõ,
// suy ra từng thao tác: đúng / sai / thiếu / thừa. Thuần, test được (§3.5).
// So khớp không phân biệt hoa-thường và dấu câu; hiển thị giữ nguyên bản gốc.
// ============================================

export type WordKind = 'ok' | 'wrong' | 'missing' | 'extra';

export interface WordDiff {
  kind: WordKind;
  expected?: string; // từ trong câu gốc (ok/wrong/missing)
  got?: string; // từ người dùng gõ (ok/wrong/extra)
}

/** Chuẩn hóa để so khớp: bỏ dấu câu quanh từ, về lowercase. */
export function normWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')
    .replace(/[’]/g, "'");
}

export function tokenize(s: string): string[] {
  return (s || '').trim().split(/\s+/).filter(Boolean);
}

/** Bảng LCS trên token đã chuẩn hóa. */
function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/**
 * So câu gốc (expected) với câu gõ (typed) → danh sách WordDiff theo thứ tự đọc.
 * Token khớp LCS = ok; expected bị bỏ = missing; typed thừa = extra;
 * một missing liền một extra được gộp thành "wrong" (gõ sai từ đó).
 */
export function gradeSentence(expected: string, typed: string): WordDiff[] {
  const eTok = tokenize(expected);
  const tTok = tokenize(typed);
  const e = eTok.map(normWord);
  const tn = tTok.map(normWord);
  const dp = lcs(e, tn);

  const raw: WordDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < e.length && j < tn.length) {
    if (e[i] === tn[j]) {
      raw.push({ kind: 'ok', expected: eTok[i], got: tTok[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ kind: 'missing', expected: eTok[i] });
      i++;
    } else {
      raw.push({ kind: 'extra', got: tTok[j] });
      j++;
    }
  }
  while (i < e.length) raw.push({ kind: 'missing', expected: eTok[i++] });
  while (j < tn.length) raw.push({ kind: 'extra', got: tTok[j++] });

  // Gộp missing + extra kề nhau → wrong (đã gõ nhưng sai từ)
  const out: WordDiff[] = [];
  for (let k = 0; k < raw.length; k++) {
    const cur = raw[k];
    const nxt = raw[k + 1];
    if (cur.kind === 'missing' && nxt?.kind === 'extra') {
      out.push({ kind: 'wrong', expected: cur.expected, got: nxt.got });
      k++;
    } else if (cur.kind === 'extra' && nxt?.kind === 'missing') {
      out.push({ kind: 'wrong', expected: nxt.expected, got: cur.got });
      k++;
    } else {
      out.push(cur);
    }
  }
  return out;
}

/** Điểm 0–100 = tỉ lệ từ đúng trên tổng từ câu gốc. */
export function scoreOf(diff: WordDiff[]): number {
  const expectedCount = diff.filter((d) => d.kind !== 'extra').length;
  if (expectedCount === 0) return 0;
  const ok = diff.filter((d) => d.kind === 'ok').length;
  return Math.round((100 * ok) / expectedCount);
}

/** Câu đúng hoàn toàn (dùng để tự chuyển câu). */
export function isPerfect(diff: WordDiff[]): boolean {
  return diff.length > 0 && diff.every((d) => d.kind === 'ok');
}

/** Từ gõ sai/thiếu — để đổ vào sổ tay lỗi (D12). */
export function wrongWords(diff: WordDiff[]): string[] {
  return diff.filter((d) => d.kind === 'wrong' || d.kind === 'missing').map((d) => d.expected!);
}

/**
 * Chế độ chạm-từ (mobile): xáo trộn các từ của câu thành lựa chọn.
 * `rng` là tham số để deterministic khi test.
 */
export function wordTapChoices(sentence: string, rng: () => number = Math.random): string[] {
  const words = tokenize(sentence);
  const arr = [...words];
  for (let k = arr.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [arr[k], arr[j]] = [arr[j], arr[k]];
  }
  return arr;
}

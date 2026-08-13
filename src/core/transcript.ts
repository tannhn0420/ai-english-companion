// ============================================
// Đồng bộ transcript theo audio KHÔNG có timestamp (VOA MP3 trần):
// ước lượng mốc bắt đầu mỗi câu theo tỉ lệ độ dài (số ký tự). VOA đọc chậm
// và đều nên xấp xỉ này đủ tốt cho karaoke; chạm câu để tua chính xác.
// ============================================

/** Offset (giây) bắt đầu mỗi câu, tỉ lệ theo độ dài, scale về tổng duration. */
export function estimateSentenceStarts(sentences: string[], duration: number): number[] {
  const weights = sentences.map((s) => Math.max(1, s.trim().length));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const starts: number[] = [];
  let acc = 0;
  for (const w of weights) {
    starts.push((acc / total) * duration);
    acc += w;
  }
  return starts;
}

/** Chỉ số câu đang phát tại thời điểm `time` (giây). -1 nếu chưa bắt đầu. */
export function activeSentence(starts: number[], time: number): number {
  let i = -1;
  for (let k = 0; k < starts.length; k++) {
    if (time >= starts[k]) i = k;
    else break;
  }
  return i;
}

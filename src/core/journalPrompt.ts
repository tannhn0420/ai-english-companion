// Gợi ý đề viết nhật ký mỗi ngày (`now` là tham số, §3.5).
// Đề mở, đời thường — khuyến khích viết 3–5 câu bằng tiếng Anh.

export const JOURNAL_PROMPTS = [
  'Hôm nay của bạn thế nào? Kể 3–5 câu.',
  'Bạn vừa ăn gì ngon? Tả lại bằng tiếng Anh.',
  'Kể về một việc khiến bạn vui hôm nay.',
  'Cuối tuần này bạn định làm gì?',
  'Mô tả nơi bạn đang ngồi lúc này.',
  'Một điều bạn biết ơn hôm nay là gì?',
  'Kể về một người bạn thân của bạn.',
  'Bộ phim/bài hát gần đây bạn thích? Vì sao?',
  'Nếu được đi du lịch tuần tới, bạn sẽ đi đâu?',
  'Một thói quen bạn muốn thay đổi.',
  'Công việc/việc học hôm nay có gì đáng nhớ?',
  'Kể về thời tiết hôm nay và cảm giác của bạn.',
  'Một mục tiêu nhỏ cho tháng này.',
  'Món ăn bạn muốn học nấu.',
];

export function journalPrompt(now: number): string {
  const day = Math.floor(now / 86_400_000);
  return JOURNAL_PROMPTS[day % JOURNAL_PROMPTS.length];
}

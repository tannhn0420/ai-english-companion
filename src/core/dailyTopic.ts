// Chủ đề gợi ý mỗi ngày — port từ PracticeApp của extension (`now` là tham số, §3.5).

export const DAILY_TOPICS = [
  'Gọi món ở nhà hàng', 'Đặt phòng khách sạn', 'Phỏng vấn xin việc', 'Hỏi đường', 'Mua sắm quần áo',
  'Ở sân bay', 'Đi khám bệnh', 'Cuộc họp công việc', 'Nói về sở thích', 'Kể về cuối tuần',
  'Đặt lịch hẹn', 'Than phiền dịch vụ', 'Giới thiệu bản thân', 'Nói về thời tiết', 'Gọi điện đặt bàn',
  'Thuê xe', 'Ở quán cà phê', 'Nói về gia đình', 'Hỏi giá và mặc cả', 'Ở ngân hàng',
  'Đặt vé xem phim', 'Kế hoạch du lịch', 'Small talk với đồng nghiệp', 'Đi siêu thị', 'Hỏi thông tin tàu xe',
  'Nói về công việc của bạn', 'Chúc mừng và lời mời', 'Nói về ước mơ', 'Gặp bạn cũ', 'Nói về một bộ phim',
];

export function dailyTopic(now: number): string {
  const day = Math.floor(now / 86_400_000);
  return DAILY_TOPICS[day % DAILY_TOPICS.length];
}

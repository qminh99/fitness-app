# Design system — core workout demo

Nguồn token: `src/ui/tokens.ts`. Nền stone #F5F3F0, surface trắng, chữ #242424/#625E5A, primary coral #B94736 với chữ trắng. System font, nhịp spacing4/8. Light theme; chưa có dark theme.

Ba tab Train/AI Coach/Progress. Luồng tập chính: catalog → hướng dẫn → phiên tập → kết quả → lịch sử. AI Coach là chat demo có một dòng báo chưa có AI thật dưới composer. Header có nút chat mới; Chat history thu gọn/mở lại, lưu trong RAM. Bubble trắng cho Coach, coral nhạt cho người dùng, hàng bài tập có thời lượng và mở chi tiết Train. Dùng cùng color/typography/spacing/radius tokens; composer ngoài vùng transcript cuộn. Nút chính có phản hồi nhấn và disabled semantics khi đang ghi dữ liệu. Nội dung mẫu được ghi nhãn; không tạo thành tích mẫu để trộn với buổi tập của người dùng.

Buttons tối thiểu56pt, text cho phép scaling; ScrollView và safe area cho nội dung. Reduced-motion hook điều khiển stack transition. Dùng Ionicons nhất quán; không dùng emoji làm icon cấu trúc. Tham khảo Bencho về ý tưởng phản hồi tiến độ, không sao chép code web.

Kiểm chứng native trước đây chỉ thuộc shell SDK57. Lượt core SDK58: Simulator hiện có Expo Go57 nên chưa kiểm tra được render mới. Cần iPhone13/Expo Go58, font lớn, landscape và screen reader smoke; không suy từ lint/bundle thành test thiết bị.

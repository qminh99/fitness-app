# Fitness App — local workout demo

React Native + Expo SDK58 + TypeScript. UI English, neutral/coral. Scope hiện tại: Train → chọn bài mẫu → phiên tập (sets, nghỉ, pause/resume/cancel) → kết quả → Progress/lịch sử local. Không có backend, AI, camera, sự kiện hoặc leaderboard trong lát cắt này.

Có thêm tab **AI Coach** ở chế độ UI preview, chưa kết nối MedGemma hoặc API. Thứ tự tab: Train → AI Coach → Progress. Không có tư vấn y tế cá nhân hóa.

## Mở trên iPhone

```sh
cd /Users/minh/Projects/fitness-app
npm ci
npm start -- --clear
```

Dùng Node24.22.2 theo `.nvmrc` (Node26.7.0 cũng đáp ứng engines). Máy tính và điện thoại cùng Wi-Fi. Mở Expo Go hỗ trợ **SDK58**, quét QR mới. Giữ Metro chạy; cho phép Local Network nếu iOS hỏi. Không cần API key hoặc Apple Developer trả phí. Nếu port8081 đã có Metro, dừng terminal cũ bằng Ctrl+C trước khi chạy lại.

Sau khi pull thay đổi có cập nhật `package-lock.json`, dừng Metro rồi chạy `npm ci` trước khi mở app lại. Trên iOS Simulator, dùng `npm run ios -- --clear`.

Dữ liệu chỉ lưu trong vùng dữ liệu của project trên máy bằng `expo-file-system`. Xóa Expo Go/xóa dữ liệu project có thể mất lịch sử. Chỉ hiện kết quả đã lưu sau khi ghi thành công; lỗi ghi có thể thử lại. Không hứa cold-start offline bằng Expo Go: cần Metro để tải bundle.

## Kiểm tra

```sh
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo export --platform all
```

## Demo khoảng 3 phút

1. Train: xem mục tiêu và chọn một bài trong thư viện; mở hướng dẫn và số hiệp/lần.
2. Bắt đầu phiên: timer chạy; hoàn thành hiệp đầu, xem nghỉ; pause/resume. Có thể bỏ qua thời gian nghỉ khi trình diễn.
3. Hoàn thành hiệp cuối rồi kết thúc; xem kết quả đã lưu.
4. Mở Progress và kiểm tra buổi tập xuất hiện đúng một lần. Mở Home và kiểm tra lịch đánh dấu ngày hoàn thành, Today’s Activity cộng thời lượng đã lưu, kể cả bài dưới một phút.
5. Reload hoặc đóng/mở app qua Expo Go: lịch sử còn. Thử bắt đầu một phiên rồi Back → Resume để thấy app giữ cùng phiên.

Bài tập/hướng dẫn là nội dung mẫu; set hoàn thành do người dùng tự xác nhận. Timer, lifecycle, lưu kết quả và Progress tính từ phiên local là chức năng thật. Chưa đo camera, chưa xác minh thành tích, chưa phải hướng dẫn cá nhân hóa.

## Cấu trúc

`app/` chỉ ghép screen/điều hướng. `exercise-catalog` sở hữu catalog mẫu; `workout-sessions` sở hữu snapshot versioned và lifecycle; Home và Progress đọc cùng snapshot. Home nhóm phiên theo ngày hoàn thành trên thiết bị và dùng cùng cách tính thời lượng với Progress. `src/ui` chỉ tokens và primitives. Các module nhập nhau qua public `index`.

Chi tiết trạng thái và giới hạn kiểm chứng: [docs/progress.md](docs/progress.md).

## Thử AI Coach preview

1. Mở **AI Coach** và gửi một tin nhắn. Bản demo trả cùng ba bài từ Train, không phân tích nội dung hoặc gọi AI.
2. Chạm một bài để mở đúng màn hướng dẫn như khi đi từ Train. Dùng Back để về cuộc chat; Start/Resume dùng luồng tập hiện có.
3. Chạm biểu tượng soạn tin để mở chat mới; mở **Chat history** để quay lại chat trước. Lịch sử chỉ ở RAM và mất khi đóng hẳn hoặc reload app.

Coach sở hữu transcript/draft; Train sở hữu catalog. Chat không ghi vào snapshot workout hay Progress. `requestGuidance` vẫn là điểm nối preview; các scenario kỹ thuật không còn trên giao diện. Chưa có HTTP adapter, auth hoặc consent server. Xem [hướng dẫn MedGemma](docs/medgemma-coach-handoff.md) cho định hướng tích hợp sau khi nội dung/policy chuyên môn đã được duyệt.

Test Coach kiểm tra gửi trùng, mở đúng bài qua callback và khôi phục đúng cuộc chat khi phản hồi đến sau khi chuyển chat. Các test này không xác nhận render, điều hướng native, bàn phím hoặc screen reader trên thiết bị.

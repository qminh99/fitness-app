# Tiến độ và hạn chế

Ngày 2026-11-07. Kế hoạch GĐ0 đã được duyệt. Lượt hiện tại triển khai foundation/app shell; toàn bộ luồng demo hackathon 08/11/2026 là lát cắt tiếp theo.

## Giai đoạn 0

- [x] Xác nhận root/repo trống; kiểm kê công cụ, skills và agents.
- [x] Đọc Karpathy/Chief of Staff; ghi thiếu dependency và fallback Impeccable.
- [x] AI Engineer phân tích read-only, protocol thiết bị và trust tiers.
- [x] Brief/flows, ownership/contracts, schema sơ bộ, stack/trade-off, design proposal, bootstrap và roadmap.
- [x] Hỏi gộp, cập nhật English/coral/độ tuổi/iPhone13/hackathon ngày mai.
- [x] Code Reviewer đọc proposal; agent chính xử lý ba findings, xem [review](review.md).
- [x] Kiểm tra local links, Markdown fences/whitespace, parse ba agent TOML và đối chiếu SHA-256 không đổi.
- [x] Người dùng duyệt scope 1A/stack/layout và yêu cầu Mobile App Builder → Code Reviewer → agent chính kiểm chứng.

## Foundation/app shell — hoàn tất milestone

- [x] Expo + TS strict + Expo Router/npm được pin theo registry thực tế; giữ `.codex/agents/` và tài liệu.
- [x] Hai tab Train/Progress, màn chi tiết bài mẫu, English/coral, routes mỏng và module public API.
- [x] Code Reviewer hoàn tất read-only sau retry usage; không thấy blocker. Agent chính review/kiểm chứng bổ sung; xem review.md.
- [x] Typecheck/lint, Expo config/dependency check, Metro và bundle iOS/Android.
- [x] README ghi lệnh chạy, native Simulator đã kiểm tra, giới hạn và việc tiếp theo.

Chỉ dựng shell ở lượt này: chưa tạo state machine phiên tập, persistence, backend, AI, camera hoặc XP. Không có nút Start giả cho workflow chưa triển khai.

## Trạng thái chạy/test

Đã có source app shell, dependencies và package-lock. Typecheck/lint PASS trên Node24.22.2; online Expo dependency check PASS; export bundle iOS/Android PASS. Metro mở app bằng Expo Go SDK57 trên iPhone17 Pro Simulator iOS26.2; Train→preview→Back→Progress→Explore Train hoạt động. Chưa test iPhone13 thật/Android runtime, font scale lớn nhất, VoiceOver/TalkBack đầy đủ, camera hoặc backend. Không có unit test session vì chưa triển khai nghiệp vụ phiên tập.

User xác nhận iPhone13/iOS18.6; chưa có Android model. Xcode26.2 thấp hơn yêu cầu của SDK đang xem; Java25 chưa validated; adb/Docker/Supabase/EAS CLI chưa có trong PATH. Không có Apple Developer trả phí; Expo account đã có. Expo Go là đường demo ưu tiên, vẫn cần smoke trên máy thật.

## Definition of done demo 1A (chưa bắt đầu)

- [ ] App mở trên iPhone13, English, Train/Progress; kiểm tra Android khi có máy và báo riêng kết quả.
- [ ] Start/pause/resume/complete/cancel đúng, manual sets/reps; app background/kill/reopen không mất phiên đã persist.
- [ ] Complete/retry không tạo hai history entry; write error không báo saved; reset demo rõ ràng.
- [ ] Double Start/Back→Start/reopen trả cùng active session ID; một snapshot nhất quán, Progress không có history store riêng.
- [ ] Fixture “Sample workout”, local history đúng từ phiên thực; không giả auth/AI/XP verified.
- [ ] Lint/typecheck/domain tests pass; font scaling/reduced motion/safe area/screen reader smoke; rehearsal 3–5 phút.

## Giới hạn phải mang sang lượt sau

Ngày mai không đủ để kiểm chứng toàn bộ tầm nhìn. Pose chưa qua integration; quyền sao chép Bencho chưa xác minh; AI sức khỏe chưa được chuyên gia duyệt; chưa có anti-cheat evidence. Hackathon không đồng nghĩa được trình bày mock như dữ liệu thật. Cổng người dùng chưa thành niên và phát hành vẫn là việc sau demo.

## Sửa mismatch Expo Go — SDK58

Người dùng thử iPhone thật và gửi lỗi Expo Go58/project57. Đã nâng Expo58.0.23, RN0.88.1, React19.3.0 và bộ native modules theo bundledNativeModules; React types19.3.x. Sửa tab icon dùng semantic color string theo focused để phù hợp kiểu RN mới. Dependency check, lint và typecheck PASS. Bundle iOS/Android được kiểm tra lại. Chưa xác nhận runtime SDK58 trên iPhone thật; kết quả Simulator trước đây thuộc SDK57.

## Core workout — phạm vi mới ngày 2026-11-07

Người dùng thu gọn ưu tiên về vòng tập khép kín, hoãn toàn bộ XP/leaderboard/events/AI/camera. Đang triển khai Train (catalog10 bài và filter), hướng dẫn, phiên tập/set/rest/pause/resume/cancel, kết quả đã lưu và Progress từ cùng snapshot. `workout-sessions` là owner dữ liệu; `exercise-catalog` sở hữu nội dung mẫu; Progress chỉ đọc. Storage boundary kiểm tra schemaVersion/invariants; không tự xóa file khi lỗi.

Dependency mới: expo-file-system58.0.13 (MIT), có trong Expo Go. Không thêm camera dependency. Host kiểm tra lần này Node26.7.0; project vẫn pin .nvmrc24.22.2. Dependency check theo bundled SDK58 PASS ở chế độ offline; chưa coi là kiểm tra online registry.

Simulator iPhone17 Pro/iOS26.2 chỉ có Expo Go57.0.9, đã mở và quan sát báo project cần Expo Go mới hơn. Chưa chạy được UI core SDK58 trong Simulator; chưa xác nhận iPhone13/iOS18.6 hoặc Android thật. Kết quả shell SDK57 trước đó không thay cho kiểm tra core mới.

### Kết quả core

- Hoàn tất Train/library10 bài + filter, detail/hướng dẫn, session timer/set/rest/skip-rest/pause/resume/cancel, summary, lịch sử và tổng tiến độ từ snapshot thật.
- Một phiên hiện hành; Start/re-entry trả cùng phiên. Complete terminal/idempotent; lưu thành công mới publish trạng thái. Read error giữ file và cho retry. Cancel không vào lịch sử hoàn tất.
- 8 domain/persistence tests PASS: reentry/reopen JSON, pause/rest, complete lặp, cancel, schema hỏng, failed-write/retry, concurrent20 starts/finishes, regression pause trước hiệp đầu.
- Typecheck/lint PASS trên Node26.7.0. Export iOS/Android PASS; chưa phải IPA/APK hoặc device smoke. Node test có warning MODULE_TYPELESS_PACKAGE_JSON, không ảnh hưởng kết quả.
- Chưa kiểm chứng runtime SDK58 trên iPhone/Android, đóng app thật trong lúc ghi, font scale lớn nhất/landscape/VoiceOver. Giới hạn Simulator ExpoGo57 nêu trên còn nguyên. Core là local self-report, không XP/AI/camera/sự kiện/leaderboard/backend.

## AI Coach preview — sửa review 2026-11-08

- Tab AI Coach nằm giữa Train và Progress, route mỏng, module sở hữu transcript/draft/intake trong RAM. Không gọi mạng/model hoặc ghi chat vào workout snapshot.
- Sửa gửi/xác nhận/retry liên tiếp: kiểm tra khóa đồng bộ trước khi đổi revision/thêm message. Request cũ sau reset không chèn phản hồi/lỗi hoặc mở khóa request mới; dọn callback khi unmount.
- Resolver dùng getExercise từ public API catalog thay danh sách squat viết cứng; ID không tồn tại không được điều hướng. Chuẩn hóa key fixture invalid_exercise_id.
- Coach dùng color/typography/spacing/radius tokens của app; vùng chạm tối thiểu48, feedback nhấn và reduced-motion cho cuộn. Scenario mới xóa draft để tách dữ liệu mẫu.
- README có walkthrough preview và điểm nối MedGemma; chưa có HTTP adapter/consent/auth server. DTO preview chưa phải contract backend hoàn chỉnh; phải map/validate theo hướng dẫn MedGemma ở bước sau.
- Kiểm chứng trên Node26.7.0, bộ dependency theo package-lock hiện tại: lint/typecheck PASS, 14 tests PASS (8 workout + 6 Coach). Test Coach transpile mã thật rồi chạy callback với hooks/native giả lập; không phải native rendering/E2E. Export bundle iOS/Android PASS ra thư mục tạm; không phải IPA/APK. Warning MODULE_TYPELESS_PACKAGE_JSON của test workout còn nguyên, không làm test fail.
- Chưa kiểm chứng render/keyboard/tab-back-state/font lớn/VoiceOver/TalkBack trên thiết bị của project. Simulator đang mở app khác (Forma Coach), không dùng làm bằng chứng runtime cho source này. Chưa chạy MedGemma hoặc đánh giá chuyên môn.

## AI Coach — bố cục chat ngày 2026-11-09

- Bỏ banner preview, nhãn mẫu và bảng scenario kỹ thuật khỏi màn hình. Giữ một dòng dưới composer cho biết đây là demo và chưa có AI thật.
- Gửi tin nhắn trả ba bài cố định từ Train; chạm hàng bài mở route workout dùng chung. Back trở về tab và cuộc chat nguồn.
- Chat mới và lịch sử đóng/mở do Coach giữ trong RAM. Không lưu qua reload hoặc đóng hẳn app; chưa lưu chat sức khỏe xuống đĩa.

## Home Today’s Activity — 2026-11-10

- Home và Progress đọc cùng snapshot do `workout-sessions` sở hữu. Home dùng ngày hoàn thành theo giờ thiết bị cho lịch và tổng trong ngày, cộng thời lượng phiên đã lưu trước khi làm tròn để hiển thị.
- Đã bỏ kho AsyncStorage riêng của Home. Các phiên từng xuất hiện trong Progress được Home đọc trực tiếp từ snapshot hiện có.
- Lint, typecheck và 12 test pass. Test hồi quy render Home với snapshot giả lập, gồm bài dưới một phút, phiên qua nửa đêm, phiên đã hủy và phiên còn đang chạy. Chưa kiểm tra trên điện thoại thật.

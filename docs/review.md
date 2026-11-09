# Review đề xuất Giai đoạn 0 — 2026-11-07

Code Reviewer là subagent thứ hai, chỉ đọc/phân tích sau khi AI Engineer hoàn tất và agent chính soạn proposal. Không sửa file, không chạy test, không mở agent khác. Agent chính đã cập nhật tài liệu dựa trên ba phát hiện có căn cứ.

| Phát hiện | Kịch bản rủi ro | Đã xử lý | Kiểm chứng khi có code |
|---|---|---|---|
| Local queue chưa xác định đơn vị lưu | Complete ghi active/history ở hai key; kill giữa hai write tạo trạng thái lệch | Một snapshot versioned thuộc sessions; Progress derive cùng dữ liệu; queue chung; chỉ báo saved sau write thành công | Tiêm write failure, kill trước/sau complete, reopen/retry; một history entry, không saved giả |
| Start/re-entry có thể tạo hai phiên | Double tap hoặc Back→Start tạo hai UUID, không được unique XP theo session chặn | Một phiên active/paused trên máy; serialized start trả cùng ID; Resume CTA; Back không thay lifecycle; mở rộng owner invariant phía server ở GĐ2 | Start đồng thời/reopen/Back dùng cùng ID; terminal mới cho ID mới |
| Hai owner cùng tên challenges | Social và verification dùng một bảng dễ coupling và sai grants | `verification_challenges` thuộc verification; `social_challenges`/members thuộc social | Social role không update/consume challenge verification |

Reviewer không thấy blocker cụ thể cho demo 1A từ tài liệu. Ownership, public API, server authority và entitlement business key được mô tả; đây **không phải** chứng nhận bảo mật, chống gian lận hay test implementation. Quyền, XP duplicate/reversal/concurrency vẫn phải test ở giai đoạn có backend.

Agent chính giữ scope sửa nhỏ trong tài liệu; không mở rộng demo sang backend/pose. Ba phát hiện đã được xử lý; không phát sinh vòng subagent thứ ba.

## Foundation — review mã thực tế

Mobile App Builder hoàn tất shell và sửa ESLint __dirname, pin peer dependency theo SDK57, accessibilityLabel của Button. Code Reviewer được gọi sau source freeze; lần đầu bị usage limit, lần tiếp tục đã hoàn tất read-only. Reviewer không thấy blocker/lỗi cụ thể cần sửa trong scope foundation; đã đọc toàn bộ source/config/lockfile và chạy 5/5 probes import boundary thành công. Không sửa file.

Agent chính đã đọc config Expo/package/TS/lint, routes, public exports, UI primitives và screens; không thấy blocker mã cho shell trong phạm vi đã kiểm tra. Native AX phát hiện icon glyph bị ghép tên Button; đã sửa label và xác nhận sau reload. Bốn probe ESLint alias deep import, relative deep import, public API và shared UI→domain cho kết quả đúng. Không có kiểm chứng nghiệp vụ session/XP vì chưa triển khai.

Lint/typecheck trên Node24.22.2 PASS. Online expo install --check PASS. Export iOS/Android PASS. Metro mở Train, preview, Back, Progress và Explore Train qua Expo Go SDK57/iPhone17 Pro Simulator/iOS26.2. Expo CLI tự mở cửa sổ bị lỗi macOS Automation sau khi app đã nạp; chạy Metro riêng và reload hoạt động. Chưa test thiết bị thật/largest font/VoiceOver đầy đủ. npm audit còn 14 findings theo Builder; không tự nâng SDK hoặc audit fix --force.

## Core workout — review một lượt cuối

Code Reviewer đọc source hiện tại, chỉ tìm lỗi làm hỏng demo. Phát hiện: pause trước hiệp đầu ghi đè thời gian nghỉ thành0. Đã sửa bằng tách thời gian nghỉ cấu hình và phần còn lại khi pause; regression test bao gồm pause trước hiệp đầu và nhiều khoảng nghỉ. Không mở thêm vòng review. Reviewer không thấy blocker khác qua đọc mã; không coi đó là kiểm chứng runtime thiết bị.

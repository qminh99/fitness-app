# Hướng dẫn tạo tab AI Coach — bước 1 trước khi tích hợp MedGemma

Ngày soạn: 08/11/2026. Dành cho người triển khai giao diện React Native/Expo.

## 1. Thứ tự thực hiện và phạm vi

Thực hiện theo thứ tự:

1. **Tài liệu này:** tạo tab AI Coach và luồng UI bằng dữ liệu mẫu, chưa gọi model/backend.
2. **[Hướng dẫn MedGemma](medgemma-coach-handoff.md):** xây backend, nội dung/policy đã duyệt và nối API vào giao diện đã có.

Chủ app hiện chỉ yêu cầu soạn tài liệu. Tab và mã mô tả dưới đây chưa được triển khai. Người nhận cần nhận đúng source app và được giao triển khai bước 1 trước khi sửa mã; tài liệu không tự cấp quyền triển khai cloud hay sử dụng dữ liệu sức khỏe thật.

Đầu ra bước 1: app có ba tab `Train → AI Coach → Progress`, màn chat thao tác được, render được câu hỏi và các loại kết quả mẫu, có điểm nối API rõ ràng cho bước 2. Chạy được với runtime Expo Go hiện tại của app, không thêm native dependency cho Coach.

Ngoài phạm vi: tải/chạy MedGemma, backend/auth thật, API key, chẩn đoán, gợi ý điều trị thật, lưu lịch sử chat, camera, voice input, file upload, streaming token, vector DB và trực tiếp thêm bài vào một plan/session mới.

## 2. Source và những phần phải giữ

Nhận source theo một commit/mốc cụ thể; giữ `package-lock.json`, `.nvmrc` và bộ phiên bản đang dùng. Tại thời điểm soạn: Expo58.0.23, RN0.88.1, React19.3.0, Expo Router~58.0.30. Không tạo project khác bằng latest để ghép ngược lại.

Đọc `docs/decisions.md`, `docs/progress.md`, `docs/architecture.md` và hướng dẫn MedGemma. Scope cũ có hai tab; yêu cầu mới ở đây là chuẩn bị hướng dẫn thêm AI Coach ở bước riêng, không biến AI thành tính năng đã hoàn tất.

Giữ nguyên luồng Train/Progress, snapshot phiên tập và `.codex/agents/`. Không reset dữ liệu, đổi global toolchain hoặc refactor module khác để làm màn chat.

## 3. File và ownership đề xuất

```text
app/(tabs)/_layout.tsx                  sửa: đăng ký tab ai-coach
app/(tabs)/ai-coach.tsx                 mới: route mỏng
src/modules/ai-coach/index.ts          mới: public API
src/modules/ai-coach/model.ts          mới: types và state thực sự dùng
src/modules/ai-coach/preview.ts         mới: fixture và hàm trả kết quả mẫu
src/modules/ai-coach/ui/CoachScreen.tsx mới: màn hình chat
```

Đây là danh sách gợi ý, không yêu cầu tạo file rỗng. Chỉ tách composer/message/card thành file riêng khi làm UI dễ đọc hơn. Không cần service framework, Redux, chatbot SDK hoặc thư viện chat mới.

- Route import `CoachScreen` từ `@/modules/ai-coach`, không chứa logic chat.
- Module AI Coach sở hữu transcript/draft/intake tạm trong RAM.
- Module không tự ghi file session/history, không sửa Progress hoặc trực tiếp đọc storage.
- Dùng public API catalog để resolve bài và public route để mở detail; không deep import implementation domain khác.

## 4. Thêm tab vào navigation

Trong `app/(tabs)/_layout.tsx`, giữ cấu hình Tabs hiện có và thêm screen `name="ai-coach"`, `title="AI Coach"` giữa Train và Progress.

Icon dùng Ionicons đã có, ví dụ `chatbubble-ellipses` khi active và `chatbubble-ellipses-outline` khi inactive. Kiểm tra tên icon với bộ đang cài trước khi dùng. Dùng cùng size và semantic color với tab hiện tại, không thêm thư viện icon/font khác.

Route mới chỉ ghép màn hình và callback điều hướng. Không chuyển SessionsProvider hoặc thay cấu trúc root navigator nếu không có nhu cầu thật. Chuyển tab không được pause/complete/cancel phiên tập đang chạy.

## 5. Bố cục màn hình

```text
AI Coach                          New chat
Preview — not connected
Sample replies only. No data is sent to an AI service.

[Trạng thái rỗng hoặc transcript cuộn]

  User: My leg hurts
  Coach: Sample follow-up question...
  [Các câu trả lời gợi ý / vùng nhập]

[Describe your concern…            ] [Send]

Train              AI Coach              Progress
```

UI English, theo tokens hiện có từ `@/ui`:

- Nền `colors.canvas`, card `colors.surface`, text chính/phụ theo token.
- Coral `colors.action`, vùng nhấn `colors.accentSurface`; không thêm bảng màu mới.
- Typography/spacing/radii dùng tokens hiện tại, không thêm font hoặc hiệu ứng trang trí riêng.
- Header, nhãn preview, danh sách message và composer có thứ bậc rõ.
- Bubble user/coach phân biệt cả nhãn người gửi, không chỉ màu; text selectable nếu phù hợp.
- Nội dung rỗng giải thích đây là bản xem trước, có nút `Try sample conversation`.

Nhãn preview phải luôn dễ thấy trong bước 1, kể cả khi transcript dài. Không hiển thị model “đang phân tích” hoặc tên MedGemma như thể đã kết nối.

## 6. Composer và hành vi gửi

- TextInput nhiều dòng; label/hint rõ, placeholder không thay thế toàn bộ label cho screen reader.
- Whitespace-only không gửi được; disable Send khi rỗng hoặc đang xử lý cùng lượt.
- Giới hạn đầu vào đề xuất 2.000 ký tự, hiển thị lỗi rõ; đồng bộ giới hạn với backend ở bước 2.
- Phím xuống dòng vẫn xuống dòng; có nút Send tường minh, không gây gửi nhầm khi nhập nhiều dòng.
- Sau gửi thành công, thêm đúng một user message và một preview reply, xóa draft.
- Double tap không nhân đôi cùng lượt. Khi lỗi, giữ nội dung để thử lại; không thêm user message lần hai khi retry cùng request.
- Không dùng timer, fake typing hoặc delay để tạo cảm giác inference thật. Hàm preview có thể trả Promise để khớp điểm nối, nhưng không thêm chờ giả.

Ở chế độ nhập tự do, phản hồi chỉ giải thích chưa kết nối, ví dụ:

> Preview only. AI responses are not connected yet. Use the sample conversation to explore the interface.

Không phân tích câu nhập, suy bệnh hoặc chọn bài cho triệu chứng bằng keyword trong bước UI. Không ghi văn bản người dùng vào log, analytics hoặc storage.

## 7. Luồng mẫu phải làm được

### A. Sample follow-up

`Try sample conversation` tạo một cuộc hội thoại riêng có nhãn `Sample conversation`, dùng người dùng giả định và câu “My leg hurts”.

1. Hiển thị câu mẫu hỏi vị trí đau.
2. Hiển thị answer chips, ví dụ Knee/Ankle/Calf/Not sure, kèm trạng thái selected và nút xác nhận khi cần.
3. Xác nhận câu trả lời thêm vào transcript và tăng intakeRevision.
4. Kết thúc bằng nội dung preview cho biết cần backend và protocol chuyên môn để tiếp tục; không đề xuất bài chữa đau.

Các câu hỏi là fixture minh họa bố cục, chưa phải bộ intake y khoa đã duyệt. Bản nhập tự do không được tự chuyển thành protocol tư vấn mẫu.

### B. Preview bốn loại response

Cho người review chọn fixture rõ nhãn `Preview scenarios`, không giả là kết luận từ câu nhập:

| Fixture | UI cần render |
|---|---|
| `needs_information` | Câu hỏi, lựa chọn trả lời, phương án Not sure |
| `seek_care` | Card hướng dẫn chuyển tuyến mẫu; không có bài tập |
| `review_required` | Thông báo ngoài phạm vi/cần xem xét; không có bài |
| `suggestions_available` | Card bài mẫu để kiểm tra giao diện, ghi rõ không dựa trên triệu chứng |

Với seek_care, dùng text trung tính như “Sample care-routing message — approved guidance will appear here after integration.” Chưa tạo hướng dẫn y tế tự viết. Không chỉ dựa vào màu đỏ/vàng để truyền đạt ý nghĩa.

Card bài mẫu lấy bài có thật trong catalog, ví dụ `bodyweight-squat`, hiển thị tên/nhóm và nút `View exercise`. Luôn ghi `Sample exercise — not a recommendation for your symptoms`. Tách scenario này khỏi hội thoại đau chân để không tạo cảm giác squat được chọn để chữa đau.

### C. Lỗi kỹ thuật

Fixture lỗi phải kích hoạt tường minh trong vùng preview: error, retry success, response sai ID và kết quả đến muộn. Không ngẫu nhiên báo lỗi hoặc giả mạng yếu. Không có vòng loading vô hạn.

## 8. Mở bài tập bằng route hiện có

App hiện có route `/workout` nhận query `exerciseId`. Khi chọn View exercise:

```text
/workout?exerciseId=bodyweight-squat
```

Ở route AI Coach, callback có thể dùng router.push với pathname `/workout` và params `exerciseId`. Trước khi điều hướng, resolve ID qua public API catalog; ID không hợp lệ phải hiển thị unavailable, không rơi về bài mặc định.

Bước 1 chỉ mở detail. Người dùng tự nhấn Start/Resume tại màn hiện có. App hiện có invariant một phiên đang tập; không viết đường start riêng để bỏ qua invariant.

Chưa hiển thị nút `Add to workout` nếu chưa có public API đúng ngữ nghĩa. API hiện tại `start(exerciseId)` khởi tạo/tiếp tục phiên, không phải thêm bài vào multi-exercise plan. Chức năng thêm bài cần scope riêng khi thật sự triển khai.

Khi Back từ detail, kiểm tra trở lại AI Coach với transcript còn nguyên. Header của route workout đang dùng back title Train; kiểm tra ngữ cảnh từ Coach, nếu cần chỉ chỉnh nhãn Back trung tính trong phạm vi navigation, không refactor màn tập.

## 9. State và điểm nối API cho bước 2

Tách state giao diện khỏi response nghiệp vụ:

```text
UI request state: idle | submitting | failed
Response status: needs_information | seek_care |
                 review_required | suggestions_available
Data source: preview | server
```

Message cần id, role, content và source; request cần requestId, conversation/intake ID và intakeRevision để bỏ response cũ. Không dùng một status chung cho lỗi mạng và quyết định chuyển khám.

Đề xuất một hàm nhỏ duy nhất mà màn hình gọi:

```text
requestGuidance(request, signal?) → Promise<GuidanceResponse>
```

Bước 1 ghép hàm preview thực sự dùng. Không tạo HTTP client/provider rỗng. Bước 2 thay điểm ghép bằng HTTP adapter theo contract của `medgemma-coach-handoff.md`, giữ renderer và state xử lý request.

Contract cần dùng thống nhất:

- Request: schemaVersion, requestId, intakeId, intakeRevision, locale, concern, answers; consentVersion chỉ được thêm với quy trình đồng ý thật ở bước 2.
- Response: schemaVersion, requestId, intakeId, intakeRevision, status, questions, suggestions; thêm metadata theo backend sau.
- Model/domain DTO không dùng trực tiếp làm message UI nếu cấu trúc khác; map tại boundary.
- Fixture có discriminator source=preview ở lớp UI; không tự tạo “đã consent” hoặc token người dùng giả.
- Preview card dùng Exercise ID thật; metadata version/dosage/policy chuyên môn chưa tồn tại không được bịa để vượt validator. Tách fixture hiển thị khỏi API response đạt chuẩn y tế.
- Khi bước 2 có endpoint, validate JSON và nghiệp vụ trước khi đưa vào renderer; TypeScript assertion không thay validation.

Không streaming hoặc tool calling trong bước 1. Chưa cần framework để chuyển nhiều model/provider.

## 10. State khi đổi tab, reset và background

- Giữ transcript và draft trong RAM khi chuyển giữa ba tab hoặc xem detail rồi quay lại.
- Bắt đầu bằng state tại screen; kiểm tra hành vi mount của navigator. Chỉ nâng state lên provider thuộc AI Coach nếu cần để đạt hành vi này, không lưu vào workout snapshot.
- Đóng app/reload sẽ mất chat ở bước 1; ghi rõ trong README và UI hỗ trợ nếu cần. Không hứa có lịch sử chat.
- `New chat` yêu cầu xác nhận khi có nội dung; Cancel giữ nguyên, Confirm xóa transcript/draft/answers và đổi intakeId.
- Reset hủy hoặc vô hiệu request đang chờ; callback cũ không được chèn vào cuộc hội thoại mới.
- Đổi scenario cũng tạo phạm vi mới; không trộn câu trả lời fixture vào intake nhập tự do.
- Khi nối mạng thật ở bước 2, xử lý timeout/background/abort và account change; bước 1 kiểm thử được stale-response bằng fixture có điều khiển.

## 11. Keyboard, accessibility và responsive

- Safe area và tab bar phải được tính đúng; composer không nằm dưới bàn phím/home indicator.
- Dùng layout có vùng transcript cuộn riêng, composer nằm ngoài vùng cuộn và keyboard avoidance phù hợp iOS/Android.
- `Screen` hiện tại đã bọc ScrollView; không đặt FlatList cùng chiều bên trong nó. Có thể dùng SafeAreaView/View riêng cho chat và tái sử dụng tokens/AppText/Button; không thay toàn bộ Screen dùng chung.
- Kiểm tra keyboard handling thực tế trên RN/Expo đang cài; không chỉ sao chép một giá trị offset từ tutorial.
- Khi người dùng đang đọc tin cũ, không liên tục ép cuộn xuống. Nếu đã gần cuối hoặc vừa tự gửi, cuộn tới tin mới; có thể có nút New message khi đang đọc phía trên.
- Send/New chat/chips/Retry có accessibilityLabel/role/state và vùng chạm ít nhất 44pt iOS, 48dp Android.
- Nhãn preview, lỗi và trạng thái không chỉ phân biệt bằng màu. Screen reader thông báo phản hồi mới hợp lý, không đọc lại toàn transcript mỗi lần render.
- Hỗ trợ font scaling, text dài, bàn phím mở, màn nhỏ và landscape; nút không bị cắt chữ.
- Dùng reduced-motion hiện có, không thêm animation bắt buộc. Giữ theme hiện tại, chưa mở scope dark mode.

## 12. Trình tự triển khai cho người nhận

1. Ghi mốc source và git status; đọc cấu trúc route/catalog/session thực tế.
2. Thêm route và tab, kiểm tra đủ ba tab trước khi làm chat.
3. Dựng layout từ tokens/primitives hiện có; xử lý keyboard/safe area.
4. Thêm composer, transcript, New chat và preview reply chung.
5. Thêm các scenario cố định, renderer câu hỏi/card/lỗi và View exercise.
6. Hoàn tất request IDs/revision/reset, giữ state qua tab/detail.
7. Chạy kiểm tra và cập nhật README/progress về đúng phạm vi UI preview.
8. Bàn giao source/UI trước. Sau nghiệm thu bước 1, dùng hướng dẫn MedGemma để xây và nối backend.

Không tự cài hệ sinh thái mới hoặc đổi cấu hình agents. Không gọi model/cloud để làm UI preview. Không xóa nhãn preview trước khi backend đã được nối và kiểm chứng; chế độ server phải báo lỗi thật, không tự rơi về câu trả lời giả khi API hỏng.

## 13. Checklist nghiệm thu bước 1

- [ ] Có Train / AI Coach / Progress theo thứ tự đã nêu, icon và tab active đúng.
- [ ] AI Coach có route/module riêng, English UI, đồng nhất neutral/coral.
- [ ] Nhãn Preview — not connected luôn rõ; không có network request từ Coach.
- [ ] Empty state, sample conversation và nhập tự do đều thao tác được.
- [ ] Send rỗng bị chặn; nhiều dòng/text dài không vỡ layout; gửi nhanh không lặp.
- [ ] Bốn response status render đúng fixture; seek_care/review_required không có bài tập.
- [ ] Card bài mẫu có nhãn, resolve ID thật và View exercise mở đúng detail.
- [ ] ID sai không mở bài mặc định; chưa có nút Add giả hoặc đường start mới.
- [ ] New chat confirm/cancel đúng; reset/đổi scenario không nhận callback cũ.
- [ ] Đổi tab và Back từ detail giữ transcript/draft; không tác động phiên tập hiện hành.
- [ ] Composer không bị keyboard/tab bar che trên thiết bị đã thử.
- [ ] Font scaling và screen reader smoke có kết quả thật; ghi rõ nền tảng chưa thử.
- [ ] Train → detail → session → summary → Progress không bị regression.
- [ ] Không lưu concern vào disk/log; không có secret hoặc backend thật trong bước này.

Lệnh hiện có để kiểm tra trên máy triển khai:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm start
```

Chạy npm ci khi setup, không cần chạy lại mỗi lần sửa. Thêm test hành vi nhỏ nếu có logic request/reset/retry: stale response sau New chat, retry không lặp message, trạng thái không được phép có suggestions. Không viết snapshot chỉ để phủ giao diện. Test core hiện có phải tiếp tục qua.

Record device model/OS, dependency/source version, walkthrough đã thử và giới hạn. Không nói đã kiểm thử iPhone13/Android khi mới export bundle hoặc xem source.

## 14. Gói bàn giao và bước tiếp theo

Gửi branch/commit hoặc ZIP source dựa trên mốc đã nhận, kèm:

- Danh sách file thay đổi, public UI/API contract và các fixture.
- README chạy preview, danh sách scenario và cách kiểm thử navigation/keyboard.
- Kết quả lint/typecheck/tests và screenshot/video từ app thật nếu có.
- Giới hạn: chưa kết nối AI, chưa có lịch sử chat bền vững, chưa tư vấn y tế thật.
- Vị trí ghép `requestGuidance` và các field cần nối với backend.

Sau khi bước 1 được nghiệm thu, thực hiện [medgemma-coach-handoff.md](medgemma-coach-handoff.md): nội dung/policy được duyệt → inference/backend → validate API → consent/auth → thay preview adapter → kiểm chứng end-to-end. Hai tài liệu là hai milestone nối tiếp, không phải hai chức năng đã chạy.

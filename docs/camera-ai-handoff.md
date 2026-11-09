# Hướng dẫn phát triển và bàn giao module Camera AI

Ngày soạn: 08/11/2026. Dự án: Fitness App — React Native + Expo + TypeScript.

Tài liệu này dùng để gửi cho người phát triển trên máy khác. Đây là yêu cầu triển khai thử nghiệm và hợp đồng tích hợp đề xuất; chưa có module camera hoặc kết quả kiểm thử để bàn giao. Không yêu cầu build trên máy đang giữ app chính.

## 1. Mục tiêu

Phát triển module dùng camera điện thoại để phát hiện khớp cơ thể, vẽ bộ xương lên preview và phân tích chuyển động theo bài tập người dùng đã chọn. Chạy inference trên thiết bị, không cần backend hoặc AI API key.

Đầu ra đầu tiên: một bài hoạt động hoàn chỉnh trên điện thoại thật, kèm source có thể ghép vào app hiện tại và hướng dẫn tái tạo build.

Ưu tiên đề xuất: `bodyweight-squat` (Bodyweight squat), vì đã có trong catalog. Nếu chọn bài khác, ghi rõ ID và thống nhất với người tích hợp trước khi thực hiện. Không mặc định phải triển khai cả catalog trong lần đầu.

Ảnh tham chiếu chỉ mô tả cách hiển thị landmark/bộ xương; không phải bằng chứng về thuật toán, độ chính xác hoặc quyền sử dụng ảnh. Không đưa ảnh đó vào sản phẩm nếu chưa rõ quyền sử dụng.

## 2. Source và môi trường đầu vào

Người giữ app cung cấp bản sao source tại một commit/mốc xác định, gồm `app/`, `src/`, assets, `docs/`, cấu hình Expo/TypeScript, `.nvmrc`, `package.json` và `package-lock.json`. Ghi mốc source này trong README bàn giao để tránh tích hợp lên hai phiên bản khác nhau.

Phiên bản đang khai báo tại thời điểm soạn:

| Thành phần | Phiên bản |
|---|---|
| Expo | 58.0.23 |
| React Native | 0.88.1 |
| React | 19.3.0 |
| TypeScript | ~6.0.3 |
| Package manager | npm, giữ một package-lock.json |
| Node | Theo `.nvmrc` của source được nhận |

Không tạo project bằng `latest` rồi giả định ghép được vào app. Không tự nâng Expo/React Native hoặc sửa cấu hình global để xử lý lỗi tương thích. Nếu có blocker, gửi log đã loại secret và đề xuất thay đổi cụ thể.

Không gửi `node_modules`, cache build, `.env` thật, certificate/private key hoặc provisioning credentials trong gói source.

Đọc trước `docs/architecture.md`, `docs/pose-spike.md`, `docs/decisions.md` và `docs/progress.md`. Tài liệu cũ có thể giữ bối cảnh SDK57; phiên bản source/lockfile được giao là căn cứ cho lần build này.

## 3. Kiến trúc cần thực hiện

```text
Camera điện thoại
  → frame native/worklet
  → MediaPipe Pose Landmarker
  → landmark + timestamp + trạng thái tracking
  → bộ phân tích cho exerciseId đã chọn
  → rep/thời gian giữ + trạng thái
  → UI camera và adapter vào phiên tập
```

Ứng viên theo hướng dự án: VisionCamera V5 + MediaPipe Pose Landmarker Lite. Đây chưa phải bộ dependency đã chứng minh tương thích với app. Người triển khai phải kiểm tra phiên bản, license và build thực tế trước khi khóa bộ thư viện.

- MediaPipe có model phát hiện 33 landmark sẵn; giai đoạn đầu dùng model đó và viết logic theo bài, chưa yêu cầu tự huấn luyện model.
- VisionCamera V5 dùng `useFrameOutput`; không ghép ví dụ V4 dùng `useFrameProcessor` vào V5.
- Ghi đầy đủ phiên bản camera, MediaPipe, Nitro/worklets và native SDK thực sự resolve trong build thành công.
- Nếu cần thay engine, báo lý do và ảnh hưởng trước khi đổi; không cài song song nhiều engine để dự phòng.
- Không truyền từng frame/base64 qua JS render thread. Chỉ chuyển kết quả nhỏ cần thiết sang UI.
- Giữ tối đa một inference đang xử lý; bỏ frame cũ khi bận thay vì tạo queue tăng độ trễ.
- Model phải được đóng gói hoặc có cơ chế chuẩn bị được mô tả rõ; bài test offline phải xác nhận không phụ thuộc tải model lúc tập.

Tách trách nhiệm vừa đủ:

| Phần | Trách nhiệm |
|---|---|
| Camera/native adapter | Permission, camera lifecycle, inference, chuẩn hóa kết quả |
| Logic bài tập | Landmark → pha chuyển động → rep/thời gian giữ |
| UI camera | Preview, skeleton, trạng thái, số đếm, hướng dẫn đặt máy |
| Adapter tích hợp | Chuyển kết quả hiệp cho public API của workout-sessions |

Giữ cấu trúc modular monolith. Module pose dự kiến ở `src/modules/pose-tracking/`, xuất hợp đồng công khai qua `index.ts`; chỉ tạo thư mục/file khi thực sự dùng. Native adapter có thể cần local native package phù hợp công cụ được chọn; ghi rõ cách autolink và cấu hình build.

`workout-sessions` vẫn sở hữu phiên tập, hiệp và persistence. Module pose không tự ghi lịch sử, sửa Progress, cấp XP hoặc quyết định verification. Routes chỉ ghép màn hình; không deep import implementation của domain khác.

## 4. Phân tích riêng theo bài

Người dùng chọn bài trước. Không yêu cầu tự phân loại tất cả động tác từ camera trong milestone đầu.

| Bài minh họa | Tín hiệu khởi đầu để thử | Kết quả |
|---|---|---|
| Bodyweight squat | Góc gối/hông, chu kỳ đứng → xuống → đứng | Rep |
| Wall push-up | Góc khuỷu và chuyển động thân tương đối với vị trí đứng | Rep |
| Plank — chưa có trong catalog | Điều kiện quan sát và trạng thái giữ đã định nghĩa | Thời gian |

Các tín hiệu trên là hướng thử nghiệm, chưa phải rubric hoặc ngưỡng đã xác nhận. Wall push-up khác floor push-up; không dùng chung bộ luật mà chưa thử. Không thêm ID bài ngoài catalog âm thầm.

Mỗi bài hỗ trợ phải có:

1. ID khớp catalog, phiên bản config và góc quay hỗ trợ.
2. Landmark bắt buộc, cách chọn bên cơ thể và điều kiện tín hiệu dùng được.
3. State machine theo pha; một chu kỳ hoàn chỉnh chỉ phát sinh một rep.
4. Hysteresis và điều kiện thời gian để giảm đếm lặp do rung quanh ngưỡng.
5. Quy tắc mất tracking, pause/resume, đổi bài, đổi hiệp và reset.
6. Bộ dữ liệu landmark mẫu/test chứng minh hành vi chính.

Chưa có ngưỡng góc cố định được duyệt. Tune trên tập calibration, khóa config trước khi đánh giá trên mẫu khác; không sửa ngưỡng theo test rồi báo đó là kết quả độc lập.

## 5. Hợp đồng tích hợp cần chốt

Các tên dưới đây là hợp đồng đề xuất, chưa phải API đã tồn tại trong app. Người triển khai và người tích hợp cần thống nhất trước khi viết adapter session.

### Đầu vào

- `exerciseId`: ID bài trong catalog.
- `trackingSessionId`: ID một lần bật theo dõi; thay khi bắt đầu lần mới để loại callback cũ.
- `setId`: ID hiệp hiện tại do phía session cung cấp.
- `configVersion`: bộ luật sử dụng.
- Lệnh `start`, `pause`, `resume`, `stop`; vòng đời của bộ đếm phải được mô tả rõ.

### Đầu ra

| Trường | Quy ước |
|---|---|
| `schemaVersion` | Phiên bản hợp đồng |
| `exerciseId`, `trackingSessionId`, `setId` | Khớp đầu vào, dùng để bỏ kết quả đến muộn |
| `timestampMs` | Capture timestamp đơn điệu; mô tả clock/origin, không dùng làm giờ server |
| `trackingStatus` | `searching`, `tracking`, `lost` |
| `phase` | Pha do từng bài định nghĩa; mô tả giá trị trong config |
| `metric` | Phân biệt kết quả `reps` hoặc `hold`; không suy loại từ trường bị thiếu |
| `repCount` | Với bài reps: tổng số nguyên không âm của hiệp, không phải delta |
| `holdDurationMs` | Với bài hold: tổng thời gian được tính của hiệp |
| `modelVersion`, `configVersion` | Phiên bản có thể đối chiếu từ gói bàn giao |
| `reason` | Khi không thể đếm: ví dụ thiếu khớp hoặc sai góc quan sát |

Landmark phục vụ skeleton gồm ID, x/y/z, visibility/presence nếu engine cung cấp. Ghi rõ đơn vị và hệ tọa độ; không gộp visibility thành xác suất tập đúng. Định nghĩa phép đổi từ tọa độ ảnh inference sang preview, bao gồm crop, rotation, aspect ratio và mirror. Không so sánh trực tiếp độ sâu chuẩn hóa với tọa độ world theo mét.

Validate kết quả tại native/module boundary: phiên bản, số hữu hạn, miền giá trị theo hệ tọa độ, ID và thứ tự timestamp. Không dùng type assertion thay validation. Adapter bỏ callback sai tracking session/hiệp hoặc đến sau stop.

Không ép bật camera cho mọi bài: xuất danh sách ID được hỗ trợ; bài chưa hỗ trợ và người từ chối quyền vẫn dùng luồng nhập thủ công hiện tại. Không tự động hoàn tất hiệp hoặc thay kết quả người dùng đã lưu nếu chưa thống nhất hành vi với người tích hợp.

## 6. Tracking và camera lifecycle

- Mục tiêu khởi đầu: một người, máy cố định, đủ khớp cần thiết trong khung.
- Thiếu dữ liệu thì dừng đếm ngay khi không đủ điều kiện; sau tối đa 500 ms mất liên tục, hủy chu kỳ dở.
- Không nối nửa rep trước mất tracking với nửa rep sau khi quay lại.
- Pause/background/stop phải dừng camera và inference, hủy chu kỳ dở; resume cần nhận diện lại. Rep đã hoàn chỉnh của hiệp được giữ theo hợp đồng.
- Đổi hiệp tạo phạm vi đếm mới; đổi bài không giữ state pha của bài trước.
- Dọn frame buffer, listener và model resources đúng vòng đời; tránh callback sau unmount.
- Khởi đầu có thể thử preview 30 fps, inference 10–15 fps; phải đo trên thiết bị và ghi kết quả thực tế.
- Frame chỉ ở RAM; không ghi/upload video mặc định, không yêu cầu microphone. Chỉ thu video test khi có đồng ý riêng và cách lưu/xóa rõ ràng, ngoài Git.

## 7. Build trên máy triển khai

Hướng native này cần development build. Expo Go không chứa native module tùy chỉnh. Giữ entry/build core không resolve/import native pose nếu vẫn cần duy trì Expo Go; chỉ đặt flag false quanh static import là chưa đủ. Ghi cụ thể entry hoặc cấu hình tách build trong README.

### Chuẩn bị

1. Nhận đúng source/mốc dự án; làm trên branch riêng, ví dụ `codex/pose-squat-spike`.
2. Dùng Node theo `.nvmrc`, chạy `npm ci`.
3. Chọn và ghi bộ phiên bản native tương thích; cài dependency và cấu hình permission/model/native integration.
4. Cài development client vào bản source thử nghiệm.

```bash
npm ci
npx expo install expo-dev-client
```

Các lệnh trên chưa cài hay tự tạo adapter MediaPipe. Cần hoàn tất integration native của thư viện đã chọn trước khi build.

### Android

Cần Android SDK/Android Studio và JDK phù hợp với Gradle/React Native đang dùng. Bật USB debugging trên điện thoại và kiểm tra kết nối.

```bash
npx expo run:android --device
```

### iOS

Local build cần Mac, Xcode tương thích và signing cho thiết bị. Không suy từ việc Android build được thành iOS build được.

```bash
npx expo run:ios --device
```

Chủ app hiện có iPhone13/iOS18.6, chưa có Apple Developer trả phí. Có thể thử cài local bằng Xcode Personal Team trong giới hạn Apple; cần thiết bị/provisioning phù hợp. Không coi Expo account là Apple signing account. IPA cho Simulator không cài được lên iPhone; IPA ký cho phạm vi khác không mặc định cài được lên máy người nhận. Chốt đường cài trước khi hứa bàn giao iOS.

### Phát triển tiếp sau khi cài development build

```bash
npx expo start --dev-client
```

JS/TS có thể phát triển qua Metro khi native runtime tương thích. Thay native dependency, permission hoặc model đóng gói có thể cần build native lại. Máy giữ app có thể ghép source rồi gửi về máy triển khai để build bản tích hợp cuối; không bắt buộc build native ở máy giữ app.

Nếu dùng EAS thay cho local build, ghi cấu hình và nhu cầu tài khoản/signing/chi phí; thống nhất với chủ app trước khi tải project lên dịch vụ hoặc dùng quota trả phí.

## 8. Checklist kiểm thử và nghiệm thu

### Tích hợp trên từng nền tảng được nhận làm

- [ ] Build từ source sạch theo README, cài và mở trên điện thoại thật.
- [ ] Camera preview + skeleton đúng vị trí, kiểm tra mirror/rotation/crop.
- [ ] Model chạy offline sau khi cài/chuẩn bị theo quy trình đã ghi.
- [ ] Permission deny/grant/revoke xử lý rõ, có đường dùng thủ công.
- [ ] Pause/resume, background/foreground, rời màn hình và quay lại không rò camera hoặc tạo đếm muộn.
- [ ] Đổi hiệp/đổi bài không mang bộ đếm cũ sang phạm vi mới.
- [ ] Không người, thiếu khớp, che khung, rời khung rồi trở lại không tạo rep nối sai.
- [ ] Hai người hoặc điều kiện ngoài hỗ trợ được mô tả và thử; không quảng bá khả năng chưa đạt.

### Logic và chất lượng

- [ ] Test chuỗi landmark: rep đầy đủ, nửa rep, rung quanh ngưỡng, timestamp cũ, mất tracking, pause/reset.
- [ ] Báo số rep thực và số app đếm; kiểm tra thời điểm rep để lỗi thừa/thiếu không triệt tiêu trong tổng.
- [ ] Có mẫu calibration và đánh giá tách biệt; ghi người/điều kiện kiểm thử bằng mã không định danh.
- [ ] Đo inference FPS, độ trễ, stall/crash và điều kiện đo trên thiết bị thật.
- [ ] Chạy lint, typecheck và tests phù hợp; ghi lệnh/kết quả thực tế.

Để đánh giá sâu hơn, dùng protocol và các gate đề xuất ở `docs/pose-spike.md`. Một clip demo hoặc một phiên 10 rep chưa đủ chứng minh accuracy. Nếu mới test Android, ghi iOS chưa xác minh; nếu chưa test iPhone13 thì ghi rõ.

## 9. Gói bàn giao bắt buộc

Ưu tiên branch/commit hoặc patch dựa trên mốc source đã nhận. ZIP source cũng được nếu có danh sách file thay đổi rõ ràng.

| Thành phần | Nội dung cần gửi |
|---|---|
| Source | TS/TSX, native Android/iOS, public API và UI thử nghiệm |
| Native config | Expo config/plugin, autolinking, build settings và mọi sửa đổi native thủ công |
| Model | File `.task` hoặc quy trình lấy đúng artifact; URL nguồn, version, SHA-256, license/notices |
| Dependency | package.json, package-lock.json; phiên bản SDK/toolchain thực sự dùng |
| Config bài | ID bài, góc quay, landmark, ngưỡng/state machine, configVersion |
| Test | Test logic và fixture landmark tối thiểu, không chứa dữ liệu cá nhân dư thừa |
| README | Setup, build, install, chạy, public API, lỗi đã biết và cách tái tạo native project |
| TEST-REPORT | Model/OS thiết bị, source/build/model/config version, phương pháp đo và kết quả |
| Bản thử | APK hoặc bản iOS có đường cài hợp lệ, nếu đã thỏa thuận; chỉ là bản kèm |

Chỉ gửi APK/IPA, file model đơn lẻ hoặc demo Python/webcam laptop không đáp ứng bàn giao để tích hợp mobile. Prototype Python có thể dùng nghiên cứu bộ luật, nhưng phải ghi rõ phần mobile còn thiếu.

Không thay `.codex/agents/`, không commit secret/token/certificate/raw video hoặc dữ liệu sức khỏe vào source/log.

## 10. Trình tự ghép vào app chính

1. Người giữ app review diff, dependency, license và hợp đồng đầu ra.
2. Ghép module qua public API; giữ workout-sessions là owner persistence.
3. Bật camera theo exerciseId hỗ trợ; giữ thao tác thủ công khi không dùng được camera.
4. Chạy kiểm tra core và logic pose; gửi source đã ghép về máy có toolchain để build native cuối.
5. Cài bản cuối lên điện thoại mục tiêu và kiểm tra lại luồng Train → bài tập → hiệp → kết quả → Progress.
6. Cập nhật docs về phiên bản, phạm vi hỗ trợ và giới hạn thực tế trước khi trình diễn.

Hoàn thành milestone khi một bài chạy xuyên suốt, build tái tạo được, gói source đủ tích hợp và báo cáo nêu đúng thiết bị đã thử. Việc mở rộng từng bài là các lát cắt tiếp theo.

## 11. Giới hạn tính năng

Đếm rep, phản hồi kỹ thuật và verification là ba năng lực khác nhau. Milestone đầu tập trung camera-assisted counting. Confidence của landmark không phải xác suất tập đúng, bằng chứng chống gian lận hoặc kết luận an toàn y khoa. Không thêm đánh giá đau/chấn thương hoặc verified XP trong module này.

## 12. Tài liệu chính thức

- [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker)
- [VisionCamera Frame Output V5](https://visioncamera.margelo.com/docs/frame-output)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo custom native code](https://docs.expo.dev/workflow/customizing/)
- [Apple developer account và membership](https://developer.apple.com/help/account/basics/about-your-developer-account)

Kiểm tra lại tài liệu, phiên bản và license tại thời điểm thực hiện. Các lệnh build trong tài liệu này là hướng dẫn cho máy triển khai, chưa được chạy để xác nhận module pose.

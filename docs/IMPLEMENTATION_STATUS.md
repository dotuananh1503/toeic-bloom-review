# Trạng thái triển khai TOEIC Bloom

Cập nhật 18/11/2026 sau đợt mở rộng Ngữ pháp và Từ vựng. Chi tiết các lượt nghiệm thu trước đó theo checkpoint nằm trong [CHECKPOINT_STATUS.md](CHECKPOINT_STATUS.md).

| Checkpoint | Trạng thái | Kết quả và phần còn lại |
| --- | --- | --- |
| CP0 | PASS Windows | Đã đọc hai tài liệu ở thư mục cha. Kiểm tra Node 22, SQLite FTS5 và quyền dữ liệu nguồn. |
| CP1 | PASS Windows | React/Vite, Node/Express, hai SQLite, Settings, localhost, lưu qua lần mở lại. |
| CP2 | PASS lõi | Schema migration, Zod, FK và FTS không dấu. Tiến độ lưu log và views. |
| CP3 | PARTIAL | Data Builder nhập TSL/NGSL/BSL, OEWN và FVDP. List, Word Detail và Flashcard lọc theo bộ từ. Còn 26.785 nghĩa tiếng Anh thiếu bản dịch theo nghĩa và toàn bộ nội dung mới chờ kiểm duyệt. Parser Kaikki có sẵn. |
| CP4 | PARTIAL | Giữ cả 10 chương V3.3. Thư viện có 38 bài, 286 cách dùng và 630 ví dụ theo cách dùng. Nhóm 12 thì gồm Hiện tại đơn và 11 bài chi tiết có câu luyện riêng theo thì. Còn bài tập riêng ở nhiều cách dùng và lượt kiểm duyệt độc lập. |
| CP5 | PARTIAL | 91 câu Part 1–7, Mini và Reading, autosave, nhóm, timer, điểm thô và sổ lỗi sai. Half/Full chưa đủ câu đã kiểm duyệt. |
| CP6 | PARTIAL | 32 WAV từ vựng US/UK, 6 WAV Listening, một ảnh CC0 và giọng máy/IPA US/UK tạo offline theo mục từ. Còn thiếu bản thu giọng người có quyền phân phối. |
| CP7 | PASS Windows, hai thiết bị dữ liệu | Full/Content/Progress ZIP. Thư viện 88.576 mục nghĩa đã chuyển, kiểm tra số liệu và nhập lặp. Lượt kiểm thử tiến độ hai chiều hội tụ 35 lượt ôn, FSRS, ghi chú và bài thi. Mac vật lý chưa thử. |
| CP8 | PASS kiểm thử Windows | Tiến độ và độ phủ dựa trên DB. Edge responsive 390/768/1440, keyboard, reduced motion và WCAG smoke. FTS thử với 8.000 bản ghi chỉ tồn tại trong test. |
| CP9 | BLOCKED xác thực | OpenAI có luồng chính thức cho client local OSS. Chưa có phiên xác thực đã kiểm chứng, UI/API trả trạng thái chưa kết nối. |
| CP10 | PARTIAL đa nền tảng | Windows pass lượt nghiệm thu cuối. macOS Apple Silicon chưa thử; chưa có bản .exe/.app. |

## Nội dung thực trong SQLite

- 5.243 mục từ duy nhất. Bộ học chứa 1.250 mục TSL, 2.809 mục NGSL và 1.744 mục BSL từ CSV chính thức. Một mục có thể nằm trong nhiều bộ.
- 88.576 mục nghĩa gồm 61.742 chú giải Anh–Việt FVDP và 26.834 mục có định nghĩa tiếng Anh. Trong số 26.834 mục này, 49 có bản dịch biên soạn gắn đúng nghĩa và 26.785 còn thiếu bản dịch. Tổng cộng 0 nghĩa được đánh dấu đã kiểm duyệt.
- 38 bài ngữ pháp, 286 cách dùng, 630 ví dụ Anh–Việt theo cách dùng và 0 bài được đánh dấu đã kiểm duyệt.
- 91 câu theo Part 1–7 là 1 / 3 / 3 / 3 / 64 / 4 / 13. Có hai cấu hình đề 20 câu là Mini và Reading.
- 39 tệp media gồm 38 WAV giọng máy và 1 ảnh CC0. Bộ tổng hợp US/UK chạy theo yêu cầu bằng Node.js cục bộ, trả WAV và IPA.

## Kiểm thử và bàn giao

- Windows x64, Node 22.14.0. Lượt mở rộng đã chạy `python scripts/prepare-study-sources.py`, `npm.cmd run data:build:study-vocabulary`, `db:seed`, `content:validate` (gồm SQLite, nhóm câu và asset), `lint`, `typecheck`, `test` (11/11), `build` và `test:e2e` (6/6 Edge).
- Dev UI chạy ở `127.0.0.1:5180`, API ở `127.0.0.1:4173`. Edge xác nhận đủ 12 bài theo thì, ba bộ từ, hai bản WAV và IPA của `airport`, byte range HTTP 206, không có page error và không có request ra ngoài loopback trong luồng kiểm tra.
- Kiểm thử ZIP trên ba thư mục SQLite độc lập với thư viện đã mở rộng. Content Update 11.688.101 byte, Full Backup 23.635.548 byte, Progress Transfer 710 byte. Xem trước không đổi SQLite, nhập xác nhận khôi phục 5.243 mục, 88.576 mục nghĩa và 39 media, nhập lặp ghi nhận 0 mục thêm và 0 mục cập nhật. Full Backup giữ hai sự kiện học khác nhau của hai thiết bị. Progress Transfer giữ đúng một sự kiện nguồn sau khi nhập hai lần.
- [Full Backup starter trước lần mở rộng ngữ pháp](../data/backups/TOEIC-Bloom-Starter-2026-11-18.zip) tạo từ DB mới, 4.425.492 byte, SHA-256 `4fd1a2ef1368748b6a4a2cbf14f1b7f2be23c7d5b309f7b5da0c087fcde4c046`. Gói đã verify, nhập vào DB trắng, đối chiếu số liệu và kiểm tra media. Gói chỉ chứa nội dung khởi tạo và thiết bị tạo gói.
- Ở lượt trước, `npm.cmd audit --omit=dev` không phát hiện lỗ hổng runtime. Audit cả dependency phát triển báo 11 cảnh báo mức cao qua picomatch.
- Kiểm thử macOS Apple Silicon cần máy thực, chưa chạy trong phiên này.

## Bước tiếp theo

Kiểm duyệt theo ID nghĩa và bài học. Ưu tiên đối chiếu bản dịch còn thiếu trong bộ TOEIC Service List và bổ sung bài tập riêng cho từng cách dùng của 11 thì mới. Chạy checklist [macOS và ZIP hai chiều](RELEASE_CHECKLIST.md) với cùng source và Full Backup. Bổ sung bản thu có quyền sử dụng và đủ nhóm câu hỏi cho Half/Full. Xác minh phiên ChatGPT chính thức và điều kiện credit trước khi bật AI.

# TOEIC Bloom

Ứng dụng học TOEIC Listening & Reading mục tiêu 700–800. React, Vite và TypeScript chạy qua Node.js trên loopback. Nội dung, media, lịch ôn và tiến độ nằm trên máy của bạn trong hai SQLite độc lập. Chuyển máy bằng ZIP.

## Khởi chạy trên Windows x64

Dùng Node.js 22 LTS x64. Đã kiểm thử với Node 22.14.0 và npm 10.9.2.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run build
npm.cmd run start
```

Mở [TOEIC Bloom](http://127.0.0.1:4173). Terminal hiển thị cổng thực tế. `npm.cmd run launch` gộp build, seed và start sau khi cài dependency. Trong PowerShell, dùng `npm.cmd` cho lệnh có tham số chuyển qua dấu `--`.

```powershell
npm.cmd run dev
```

Dev UI mặc định ở [http://127.0.0.1:5180](http://127.0.0.1:5180), API ở `http://127.0.0.1:4173`. Khi cần đổi cổng Vite, đặt `$env:BLOOM_DEV_PORT = '5181'` trong PowerShell trước khi khởi chạy. Đặt `BLOOM_PORT` để đổi cổng API. Production phục vụ UI cùng cổng API.

## Cấu trúc source

- `src/app/` chứa khung ứng dụng và điều hướng. `src/features/` chia giao diện theo tính năng. `src/shared/` chứa thành phần và logic dùng chung.
- `server/core/` chứa HTTP và kết nối SQLite. `server/features/` chứa API và logic theo từng tính năng như nội dung, đề thi, media, tiến độ và ZIP.
- `packages/shared/` chứa schema, kiểu dữ liệu và cấu hình local. `packages/data-builder/` xử lý nhập dữ liệu nguồn.

## macOS Apple Silicon

Dùng Node 22 LTS arm64. Cài từ lockfile ở máy đích rồi chạy lệnh tương đương. **NOT TESTED ON MAC** trong phiên triển khai này.

```bash
node -p "process.platform + ' ' + process.arch"
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm run start
```

Dùng cùng phiên bản source trên hai máy. Trên Mac, nhập Full Backup ZIP của Windows từ **Cài đặt → Sao lưu và chuyển dữ liệu**. Quy trình kiểm tra hai chiều nằm trong [checklist phát hành](docs/RELEASE_CHECKLIST.md). Trình duyệt kiểm thử trên Mac có thể cài bằng `npx playwright install chromium` khi có Internet.

## Nội dung và tiến độ

- Thư viện ngữ pháp có 38 bài, giữ đủ 10 chương từ HTML V3.3. Hiện tại đơn nằm trong nhóm 12 thì cùng 11 bài theo thì. Mỗi cách dùng có ít nhất hai ví dụ Anh–Việt, kèm công thức, lưu ý và phần so sánh trong từng bài.
- Từ vựng có 5.243 mục. Bộ lọc có TOEIC Service List, New General Service List và Business Service List. Có thể sắp theo hạng tần suất, xem định nghĩa tiếng Anh, chú giải Anh–Việt, biến thể và luyện theo nghĩa bằng Flashcard. Trang mục từ có nút US và UK, ưu tiên tệp trong máy và có thể tổng hợp âm thanh, IPA bằng eSpeak NG qua máy chủ localhost.
- Danh sách từ vựng tìm không dấu, chi tiết nhiều từ loại và nghĩa, flashcard và lịch FSRS riêng cho từng nghĩa.
- Luyện Part 1–7 có đáp án và lời giải. Mini Test 20 câu và đề luyện Reading 20 câu dùng ngân hàng hiện có. Half và Full chỉ mở khi đủ số câu, nhóm và media. Đề luyện lấy điểm thô.
- Phát media từ localhost, gồm giọng máy US/UK lưu thành WAV và một ảnh Part 1 có giấy phép CC0. Cài đặt cho phép tải lên bản thu mà bạn có quyền chuyển.
- Trang Tiến độ và Độ phủ đọc trực tiếp SQLite, hiển thị mục chờ kiểm duyệt, nghĩa thiếu bản dịch tương ứng và độ phủ audio lưu sẵn hoặc tạo tại chỗ.
- AI Tutor hiển thị trạng thái chưa kết nối. Xem [điều kiện xác thực](docs/AI_TUTOR.md).

## Thư mục dữ liệu

Mặc định `data/` nằm cạnh `package.json`. Đổi bằng biến `BLOOM_DATA_DIR` trước khi seed hoặc start. Cùng máy, các lệnh dùng cùng đường dẫn.

| Đường dẫn | Nội dung |
| --- | --- |
| `content.sqlite` | Nguồn, bài học, từ, nghĩa, ngân hàng câu hỏi và media manifest |
| `progress.sqlite` | Thiết bị, sự kiện học, FSRS, phiên thi, ghi chú, cài đặt, audit |
| `assets/` | Các tệp nội dung đã cài, theo SHA-256 |
| `backups/` | Điểm khôi phục được tạo trước khi nhập ZIP |
| `cache/` | Dump nguồn tải tùy chọn bởi Data Builder |

Các lệnh học thường ngày và seed từ nội dung đi kèm hoạt động với mạng Internet bị chặn. Cài package lần đầu hoặc tải lại nguồn OEWN tùy chọn cần Internet.

## Dữ liệu học và chuyển máy

Xem [quy trình Data Builder](docs/DATA_BUILDER.md), [nguồn và giấy phép](docs/DATA_SOURCES_AND_LICENSES.md) và [hướng dẫn ZIP](docs/BACKUP_AND_TRANSFER.md). Dùng các lệnh sau để xem dữ liệu và kiểm thử.

```powershell
npm.cmd run content:report
npm.cmd run content:validate
npm.cmd run content:review:queue
npm.cmd run asset:validate
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

Báo cáo theo checkpoint và công việc còn lại được lưu trong [IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

# Trạng thái checkpoint

## CP0 — PASS trên Windows
- Files: docs/IMPLEMENTATION_PLAN.md, package.json, package-lock.json.
- Audit: Node 22.14.0 x64, Git 2.37.3, repo ban đầu chỉ có README; hai tài liệu đầu vào ở thư mục cha.
- SQLite tích hợp Node thiếu FTS5; better-sqlite3 đã tạo được bảng FTS5. npm audit --omit=dev báo 0 lỗ hổng runtime. Audit dev tiếp tục ở CP10.
- Nội dung: 0 mục từ, nghĩa, bài học, câu hỏi hoặc media ở CP0.

## CP1 — PASS nền tảng Windows
- Files: src/, server/, migrations/*/001.sql, tests/foundation.test.ts.
- npm install, npm run test (1/1), npm run build (Vite tạo dist). Test TCP xác nhận bind loopback, chặn origin lạ, validate cài đặt và SQLite lưu được sau khi mở kết nối mới.
- Nội dung: 0 ở CP1. SQLite khởi tạo cấu hình thiết bị, dữ liệu học nhập ở CP3–CP6.
- Tiếp theo: schema và API CP2.

## CP2 — PASS phạm vi lõi
- Files: migrations/content/002.sql, packages/shared/content.ts, server/features/content/, tests/knowledge.test.ts.
- npm.cmd run test (2/2), npm.cmd run typecheck. Migration lặp, FK, idempotency, FTS không dấu và query nhập liệu đã chạy thử.
- Mô hình dùng các bảng quan hệ chính và JSON kiểm tra bằng Zod cho các phần tử con như ví dụ, lựa chọn và transcript.

## CP3 — PARTIAL
- Files: packages/data-builder/vocab.ts, content-source/vocabulary.ts, content-source/oewn-core.json, src/features/vocabulary/, server/features/progress/progress.ts, tests/vocab.test.ts.
- npm.cmd run data:import:vocab với XML.GZ OEWN đã đối chiếu SHA-256. npm.cmd run db:seed và npm.cmd run test (3/3), xác nhận direct có 3 từ loại và 24 nghĩa riêng biệt, FSRS lưu theo nghĩa.
- 16 mục từ, 86 nghĩa, 18 bản dịch chờ kiểm duyệt, 68 thiếu bản dịch, 0 nghĩa đã kiểm duyệt. Kaikki chưa nhập dump thật.

## CP4 — PARTIAL
- Files: content-source/present-simple.ts, conditionals.ts, word-forms.ts, server/features/content/course.ts, src/features/grammar/, tests/grammar.test.ts.
- npm.cmd run db:seed, npm.cmd run content:validate, npm.cmd run test (4/4), npm.cmd run typecheck.
- 3 bài, 43 trường hợp, 86 ví dụ Anh–Việt, 43 câu có liên kết đến đúng trường hợp. Chờ kiểm duyệt nội dung và mở rộng danh mục.

## CP5 — PARTIAL
- Files: content-source/practice.ts, server/features/exams/, src/features/exams/, migrations/progress/003.sql, tests/exam.test.ts.
- npm.cmd run typecheck, npm.cmd run test (5/5), npm.cmd run db:seed. Đã thử giữ group, chặn đề nghe thiếu tài nguyên, autosave, resume SQLite, chấm điểm, flag và liên kết bài giải.
- 70 câu Part 1–7 theo thứ tự 1/3/3/3/43/4/13. Đề Reading 20 câu chạy trước khi cài audio, Mini 20 câu mở sau CP6. Half/Full cần thêm nội dung.

## CP6 — PARTIAL
- Files: assets-source/, scripts/generate-audio.ts, scripts/media.ts, server/features/media/, src/features/settings/MediaSettings.tsx, tests/media.test.ts.
- npm.cmd run asset:generate, db:seed, asset:validate, typecheck, test (6/6 ở mốc CP6). Thử WAV MIME, checksum, ưu tiên US/UK, loại tệp giả và license chưa xác nhận. Edge phát WAV và load ảnh Part 1 qua localhost.
- 32 WAV từ vựng cho 16 từ ở hai giọng, 6 WAV nghe Part 1–4, 1 ảnh CC0. Bản thu giọng người có quyền chuyển chưa sẵn có.

## CP7 — PASS trên Windows với hai thiết bị dữ liệu độc lập
- Files: server/features/backup/, packages/shared/backup.ts, scripts/backup.ts, src/features/settings/BackupSettings.tsx và tests/backup.test.ts.
- npm.cmd run backup:export, backup:verify và backup:import đã chạy. Node tests (8/8 ở mốc CP7) đi qua cả ba loại gói. A có 20 lượt, B có 15 lượt, chuyển hai chiều và nhập lại hai lần mỗi bên, cả hai có 35 lượt và cùng FSRS. Hai bản ghi chú, điểm thi và câu sai còn đủ.
- ZIP sai SHA, thiếu asset, đuôi/path không hợp lệ, manifest sai, schema cao hơn, quá 128 MiB và FK lỗi bị từ chối. Tiến độ giữ nguyên khi lỗi. Kiểm tra trực tiếp snapshot xác nhận loại bỏ token.
- Giao dịch SQLite cross-database dùng rollback journal DELETE với synchronous FULL. Chưa thử trao đổi giữa hai máy vật lý Windows và Mac.

## CP8 — PASS kiểm thử Windows
- Files: server/features/progress/analytics.ts, src/features/progress/Progress.tsx, src/styles/app.css, tests/analytics.test.ts và tests/e2e/learning.spec.ts.
- npm.cmd run test (10/10), build và test:e2e (4/4 Edge). Responsive 390/768/1440, keyboard skip link và Escape, reduced motion, axe WCAG smoke. Luồng học giữ tất cả request trên loopback.
- FTS/pagination thử với 8.000 mục trong DB test tạm. Lần chạy nghiệm thu ghi nhận 686 ms import và 1,5 ms tra cứu. Bản ghi QA được xóa sau test.

## CP9 — BLOCKED xác thực thực tế
- Files: src/features/ai/AiTutor.tsx, server/features/ai/routes.ts và docs/AI_TUTOR.md.
- Tài liệu chính thức xác nhận luồng OSS local. Chưa có đăng nhập tài khoản được xác minh end-to-end và điều kiện tính credit chưa được xác nhận. UI vô hiệu hóa connect và gửi, API status trả disconnected. Playwright kiểm thử trạng thái và 0 request ngoài loopback trong luồng học.

## CP10 — PASS Windows, PARTIAL phát hành đa nền tảng
- Files: scripts/launch.mjs, README.md, docs/DATA_BUILDER.md, BACKUP_AND_TRANSFER.md, RELEASE_CHECKLIST.md, IMPLEMENTATION_STATUS.md.
- npm.cmd ci hoàn tất từ lockfile. db:migrate báo content schema 2 và progress schema 3. db:seed, content:validate, asset:validate, lint, typecheck đều thành công. npm.cmd run test 10/10, npm.cmd run test:e2e 4/4 Edge, Vite production build thành công.
- npm.cmd run dev và npm.cmd run launch lên ở cổng thử 5182 và 4183, cả UI và API trả HTTP 200. Edge render hai bản và load 202 mục từ, 1.165 nghĩa với 0 page errors.
- npm.cmd run data:build đọc XML.GZ nguồn thật có checksum, cài nội dung và media vào SQLite trắng. content:publish ghi phiên bản starter-2026.11.18. Full Backup đã được xác minh và merge vào DB mới bằng CLI, kiểm tra lại số liệu và asset.
- npm.cmd audit --omit=dev báo 0. Audit toàn bộ báo 11 cảnh báo mức cao trong cây dependency phát triển quy về picomatch; bản phát hành hiện tại dùng Vite và lint trong quy trình phát triển local.
- Dữ liệu cuối: 202 mục từ, 1.165 nghĩa, 18 đã dịch, 0 đã kiểm duyệt, 3 bài ngữ pháp, 43 cách dùng, 86 ví dụ, 70 câu hỏi, 2 loại đề luyện 20 câu khả dụng, 39 media.
- NOT TESTED ON MAC. Chưa đóng gói .exe/.app. Bước tiếp theo là chạy checklist giao nhận trên Mac, kiểm duyệt nội dung và bổ sung media/câu hỏi theo quyền sử dụng.

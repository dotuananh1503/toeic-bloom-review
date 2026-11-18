# Checklist phát hành

## Windows x64

Dùng Node 22 LTS và npm lockfile. Chạy `npm.cmd ci`, migrate, seed, validate, lint, typecheck, integration tests, build, test:e2e. Chạy production tại loopback và xác nhận response HTTP thực. Chạy `npm.cmd run dev` để xác nhận Vite proxy qua API. Áp dụng test backup trên hai thư mục thiết bị độc lập trước khi thực hiện chuyển máy.

## macOS Apple Silicon — NOT TESTED ON MAC

1. Chép source cùng phiên bản. Kiểm tra `node -p "process.arch"` trả `arm64`. Cài package bằng `npm ci` trên Mac.
2. Chạy `npm run db:migrate`, `npm run build`, `npm run start`.
3. Nhập Full Backup ZIP từ Windows vào Mac. Xem trước, xác nhận, mở một bài ngữ pháp và nghe hai giọng.
4. Ôn cùng một nghĩa trên hai máy khi offline. Xuất Progress Transfer của Mac và nhập về Windows. Xuất ngược từ Windows về Mac.
5. Nhập lại mỗi ZIP, kiểm tra số sự kiện, lịch ôn, ghi chú, câu sai và điểm thi.
6. Chạy `npx playwright install chromium` khi có mạng, sau đó `npm test` và `npm run test:e2e`. Có thể tùy chọn thay browser bằng `BLOOM_TEST_BROWSER`.
7. Kiểm tra trong Safari việc phát audio, tab keyboard và resize. Bài Playwright hiện chạy Edge trên Windows.

## Theo dõi release

- Ghi số nội dung từ `npm run content:report` và kết quả đã kiểm duyệt thực tế.
- Lưu Full Backup trước khi cập nhật source hoặc schema. Test migration và ZIP trên thư mục dữ liệu riêng.
- Soát license, provenance và kết quả kiểm thử e2e với Internet bị chặn ở trình duyệt. Kiểm tra báo cáo `npm audit --omit=dev` cho runtime.
- Bản hiện tại khởi chạy bằng script Node/npm. Việc ký, đóng gói .exe hoặc .app chưa được thực hiện.

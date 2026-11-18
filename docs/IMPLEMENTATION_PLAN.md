# TOEIC Bloom trên Windows và macOS

Repo ban đầu chỉ có README và lịch sử một commit. Đã khảo sát Master Prompt và HTML V3.3 tại thư mục cha. Dựng một ứng dụng React/Vite/TypeScript với Node/Express phục vụ cả API và bản build trên loopback. Giữ giao diện sáng, sidebar, gradient, thư viện từ, flashcard và bài ngữ pháp nhiều trường hợp. Các số liệu dùng dữ liệu SQLite.

| Checkpoint | Hạng mục và kiểm chứng |
| --- | --- |
| CP0 | Kiểm tra Node, Windows x64, FTS5, dependency và quyền nguồn |
| CP1 | API localhost, UI, migration, kiểm thử ghi/đọc sau khởi động lại |
| CP2 | Schema ổn định, liên kết kiến thức, FTS, kiểm tra FK |
| CP3 | Từ điển OEWN/Kaikki và provenance, search, danh sách, chi tiết, FSRS theo nghĩa |
| CP4 | Ba bài chuẩn, từng cách dùng có ví dụ song ngữ và bài luyện |
| CP5 | Ngân hàng Part 1–7, nhóm, bài thi, timer, autosave, lỗi sai |
| CP6 | Manifest media, phát local, US/UK, fallback có nhãn |
| CP7 | Ba dạng ZIP, preview, snapshot, giao dịch merge, test hai thiết bị |
| CP8 | Coverage, thống kê, keyboard, responsive, offline |
| CP9 | Kiểm tra điều kiện tích hợp ChatGPT chính thức, mặc định tắt |
| CP10 | Build/release, kiểm thử Windows và checklist chuyển sang macOS |

Dùng hai SQLite riêng, nội dung có revision và ID ổn định, tiến độ là log bất biến. Nhập ZIP kiểm tra cấu trúc, checksum và staging, bảo toàn lịch sử hai thiết bị. Tham khảo ETS cho cấu trúc và British Council/Cambridge cho quy tắc. Chỉ tích hợp dữ liệu có giấy phép và ví dụ biên soạn mới, ghi trạng thái kiểm duyệt riêng với kiểm tra cấu trúc.

Windows đang chạy Node 22.14.0. Bản node:sqlite trên máy báo thiếu FTS5, chọn better-sqlite3 và kiểm tra thực tế trước tiếp tục. macOS Apple Silicon cần kiểm thử riêng bằng npm ci và ZIP trao đổi với Windows.

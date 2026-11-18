# Nội dung học

- `oewn-core.json` là bản trích xuất có thể tái tạo từ Open English Wordnet 2025. Bao gồm các lemma đã bổ sung nội dung Anh–Việt và các mục được chọn theo ngữ cảnh công việc trong `office-lemmas.json`.
- `vocabulary.ts` chứa phần bổ sung riêng. Trạng thái `needs_review` áp dụng với nội dung đã biên soạn nhưng còn chờ kiểm duyệt. `needs_translation` giữ nguyên phần nghĩa tiếng Anh từ nguồn.
- `study-vocabulary.json.gz` là gói học offline từ TSL 1.2, NGSL 1.2, BSL 1.2, OEWN 2025 và FVDP. `workplace-vocabulary.ts` bổ sung các nghĩa dùng trong công việc bằng ví dụ Anh–Việt, collocations và họ từ do dự án biên soạn. Xem [Data Builder](../docs/DATA_BUILDER.md) và [nguồn, giấy phép](../docs/DATA_SOURCES_AND_LICENSES.md).
- Ba bài ngữ pháp chuyên sâu trong các file TypeScript có bài luyện riêng theo từng cách dùng. `v33-grammar.json` là dữ liệu trích xuất từ file HTML do người dùng cung cấp, gồm 10 chủ điểm, 92 cách dùng, 184 ví dụ Anh–Việt theo cách dùng và 10 câu kiểm tra. `v33-grammar.ts` gộp các chủ điểm trùng vào bài có sẵn và cài 7 chủ điểm còn lại.
- `grammar/tenses` có các bài cho 11 thì còn lại và một bài về các cách diễn đạt tương lai. `grammar/topics` bổ sung các chủ điểm nền tảng và nâng cao ngoài nhóm thì.
- Nội dung Part 1–7 và ngữ liệu nằm trong `practice.ts`. Trình đọc audio nguồn và ảnh địa phương nằm trong `assets-source`.
- Xem [nguồn và điều khoản](../docs/DATA_SOURCES_AND_LICENSES.md) trước khi bổ sung tài nguyên.

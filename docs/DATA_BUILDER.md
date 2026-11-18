# Data Builder

`npm run db:seed` cài nội dung và asset đã đóng gói bằng lệnh lặp an toàn. Dữ liệu thô OEWN lớn nằm ngoài Git. Tập lemma được khai báo trong `content-source/vocabulary.ts` và `office-lemmas.json`.

```powershell
npm.cmd run source:download
npm.cmd run data:build -- --file "D:\Sources\english-wordnet-2025.xml.gz"
npm.cmd run data:import:vocab -- --file "D:\Sources\english-wordnet-2025.xml.gz" --words "direct,invoice,record"
npm.cmd run content:report
npm.cmd run content:validate
npm.cmd run content:review:queue
npm.cmd run content:publish -- --version bloom-starter-2026.11.18
```

`data:build` lấy bản XML.GZ có checksum được ghim khi bỏ trống `--file`. Parser XML stream hai phần lexical entries và synsets, sinh ID từ sense key, bảo toàn từ loại và ví dụ. Dùng `--output content-source/oewn-core.json` với `data:import:vocab` để tái tạo bản trích xuất mặc định. Chạy `--help` cho cách truyền tham số.

## Bộ từ TOEIC, tiếng Anh thông dụng và tiếng Anh công việc

`content-source/study-vocabulary.json.gz` cài bằng `db:seed` và có thể cài khi mất mạng. Gói chứa hạng từ và biến thể TSL/NGSL/BSL, nghĩa OEWN, chú giải FVDP và ghi công theo nguồn. Tải bộ đầu vào dưới đây từ [trang TSL](https://www.newgeneralservicelist.com/toeic-service-list), [trang NGSL](https://www.newgeneralservicelist.com/new-general-service-list) và [trang BSL](https://www.newgeneralservicelist.com/business-service-list). Lấy file `vn_en_dictionary.db` từ [bản vnme-data 1.0.0](https://github.com/tecxmate/vnme-data/releases/tag/v1.0.0). Trình đọc FVDP dùng SQLite ở chế độ chỉ đọc, chọn các bản ghi `FVDP (GPL)` và giữ nghĩa theo từ loại.

| Tệp trong thư mục nguồn | SHA-256 |
| --- | --- |
| `TSL_12_stats.csv` | `2259df25a1077b04067ef0c0e9e4c98b46c91e4d539741dfaceba88651ff486d` |
| `TSL_12_definitions.xlsx` | `c218acb24db0734498a4e175205c96ebb4981bd30542029868d37b3c0a772e74` |
| `TSL_12_lemmatized_for_teaching.csv` | `aca322f1e8b55c9c85e8b9f04ea384a2fcb069019e6e77fff3eb141ee2b67929` |
| `NGSL_12_stats.csv` | `2098bab8955a120a9766c6282a51d7d578c6cb0a7d946600d2ffb73ba25a0b44` |
| `NGSL_12_with_English_definitions.xlsx` | `27f8bb4e0948719ffef01a42de0f9e01089b78a12bd576b480d5f14df5e3341c` |
| `NGSL_12_lemmatized_for_teaching.csv` | `b54e297244988237457e04f823aa8dca68e3d646938dc76d383e099f04cb7666` |
| `BSL_120_stats.csv` | `45055265eb4e74c65f5d26edabbc1a0da38c45bbb924cd9bd01fd391b74ff157` |
| `BSL_120_lemmatized_for_teaching.csv` | `0073a91b4186dc0bba0960f2ed9486bd117177403f4e0ac9f3738474f2b2a3c9` |
| `vn_en_dictionary.db` | `b030f464e3b451e410fbde74f354fead17ca19bf8ac6dda05a224f025cfe5dcc` |

```powershell
py -3.11 scripts/prepare-study-sources.py "D:\Sources" "D:\Sources\study-sources.json"
npm.cmd run data:build:study-vocabulary -- "D:\Sources\study-sources.json" "D:\Sources\english-wordnet-2025.xml.gz" "content-source/study-vocabulary.json.gz"
npm.cmd run db:seed
npm.cmd run content:validate
```

Phần chú giải FVDP có thể ôn như một thẻ Anh–Việt độc lập. Phần định nghĩa OEWN có bản dịch đầy đủ chỉ khi dự án đã biên soạn bản dịch đúng nghĩa theo ID. Các mục công việc với ví dụ, collocations và họ từ biên soạn thêm nằm trong `content-source/workplace-vocabulary.ts`.

## Kaikki

Chọn dump English Wiktionary hợp pháp có phiên bản và checksum. Khai báo registry JSON gồm `id`, `name`, `url`, `version`, `license`, `attribution` và `sha256`. Dùng định danh giấy phép như `CC-BY-SA-4.0` sau khi đối chiếu quyền của bản dump. JSONL hoặc JSONL.GZ mới được parse từ dòng checkpoint sau mỗi batch giao dịch. Giữ thuộc tính từ loại, tags, glosses, IPA và forms. Pipeline bỏ qua media chưa xác nhận quyền.

```powershell
npm.cmd run source:register -- --file "D:\Sources\kaikki-source.json"
npm.cmd run data:import:vocab -- --file "D:\Sources\kaikki.jsonl.gz" --source "D:\Sources\kaikki-source.json"
```

## Nội dung biên soạn và kiểm duyệt

Đăng ký nguồn trước khi dùng `data:import:grammar -- --file lessons.json` hoặc `data:import:questions -- --file questions.json`. Đầu vào grammar là mảng bài học. Đầu vào questions là object `{ "groups": [], "questions": [] }`. Schema Zod trong `packages/shared/content.ts` và bài biên soạn trong `content-source` minh họa đầy đủ các trường.

Bản sửa nghĩa, bài hoặc câu hỏi giữ nguyên ID và tăng revision. Giữ các mục liên quan đến tiến độ cũ; dùng trạng thái `retired` khi chủ động ngừng xuất bản. Chỉ gắn `reviewed` hoặc `published_reviewed` sau khi đối chiếu nội dung nguồn và kiểm duyệt. Bài ngữ pháp đã kiểm duyệt cần ngày rà soát. Validator kiểm tra schema và liên kết exercise, số lượng câu trong nhóm, integrity SQLite và manifest asset. Các bài kiểm thử kỹ thuật không tự đổi trạng thái nội dung.

## Nhập lại dữ liệu ngữ pháp từ HTML V3.3

Script đọc literal của các mảng ngữ pháp và ghi SHA-256 của HTML. Chạy hai lệnh dưới đây từ thư mục dự án nếu HTML nằm cạnh repo trong thư mục `design`.

```powershell
npm.cmd run data:extract:grammar-html -- --file "..\design\toeic-bloom-v3-3-present-simple-fixed.html" --output content-source/v33-grammar.json
npm.cmd run db:seed
```

Bản trích xuất đi kèm cho phép seed offline. Bài được gộp theo ID ổn định. 7 chủ điểm mới có câu kiểm tra có sẵn từ HTML. Các cách dùng chưa có bài tập riêng hiển thị trạng thái chờ bổ sung, và validator yêu cầu đủ bài tập khi đánh dấu bài đã kiểm duyệt.

`content-source/grammar/tenses` chứa bài cho 11 thì bên cạnh Hiện tại đơn đã có. `content-source/grammar/topics` chứa các bài theo chủ điểm. Danh sách phân nhóm 12 thì ở `packages/shared/tenses.ts`. Giữ ID bài, trường hợp và bài tập hiện có khi sửa nội dung để tiến độ đã lưu vẫn trỏ về đúng mục.

## Media

`asset:generate` tái tạo WAV bằng eSpeak NG cục bộ. `asset:install` cài manifest đi kèm. Tải ảnh qua đường dẫn trong [nguồn và giấy phép](DATA_SOURCES_AND_LICENSES.md) khi cần tái tạo nguồn. Dùng UI Cài đặt để nhập file cá nhân hoặc `asset:ingest -- --file recording.wav --meta media.json`. Metadata gồm ID tự chọn, usage (`vocabulary`, `listening`, `scene`), targetId, accent nếu cần và provenance `source`. CLI `asset:validate` kiểm tra tệp, MIME và SHA-256.

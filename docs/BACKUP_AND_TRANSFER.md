# Sao lưu và chuyển dữ liệu

Trong **Cài đặt → Sao lưu và chuyển dữ liệu**, chọn gói và tải ZIP. Trên máy đích chọn tệp, chọn **Xem trước**, đọc số mục thêm, sửa, trùng và xung đột, rồi **Xác nhận hợp nhất**. Dùng cùng phiên bản schema của ứng dụng.

| Gói | Phạm vi |
| --- | --- |
| Full Backup | Snapshot hai SQLite bằng `VACUUM INTO`, media, giấy phép, cài đặt học an toàn |
| Content Update | Nội dung và media mới hoặc cập nhật kể từ mốc tùy chọn, hoặc bản nền nếu bỏ trống mốc |
| Progress Transfer | Thiết bị và log tiến độ bất biến, bao gồm FSRS reviews, bài thi, ghi chú, bookmark và mục tiêu |

Dùng Full Backup lần đầu. Khi cả hai máy đã có bản nội dung, chuyển Progress Transfer cho mỗi lần học. Dùng Content Update với mốc UTC phù hợp khi máy đích đã có bản nền. Preview phát hiện phụ thuộc nội dung bị thiếu hoặc media thiếu. Gói Full Backup mang các cài đặt học an toàn vào máy đích khi máy đó chưa lưu lựa chọn riêng.

```powershell
npm.cmd run backup:export -- --type full --output "D:\Backups\Bloom-Full.zip"
npm.cmd run backup:export -- --type content --output "D:\Backups\Bloom-Content.zip" --since "2026-11-18T00:00:00.000Z"
npm.cmd run backup:export -- --type progress --output "D:\Backups\Bloom-Progress.zip"
npm.cmd run backup:verify -- --file "D:\Backups\Bloom-Full.zip"
npm.cmd run backup:import -- --file "D:\Backups\Bloom-Progress.zip" --mode merge
npm.cmd run backup:import -- --file "D:\Backups\Bloom-Progress.zip" --mode merge --confirm
```

Trên macOS, dùng `npm` với đường dẫn file trên Mac. Giới hạn mỗi ZIP là 128 MiB và dữ liệu giải nén 512 MiB. Tệp xuất cần tên mới để tránh ghi đè gói khác.

## Hợp nhất

- Mỗi thiết bị có UUID riêng. Sự kiện ghép bằng UUID; sequence theo thiết bị phát hiện bản sao thiết bị hoặc event có payload khác nhau. Các lịch FSRS liên quan được tính lại theo UTC, device ID và sequence.
- Cùng revision mà dữ liệu khác nhau giữ bản hiện tại theo mặc định. Chọn **Ưu tiên bản nhập đã kiểm duyệt** để lấy bản đã kiểm duyệt khi bản hiện tại chưa kiểm duyệt.
- Các phiên ghi chú khác nhau hiển thị trong chủ điểm hoặc mục từ. Dùng một phiên bản hoặc chỉnh nội dung đã gộp, rồi bấm **Hợp nhất ghi chú**.
- Import kiểm tra cấu trúc, tên tệp, checksum, license, giới hạn nén, schema và FK. App dùng SQLite rollback journal `DELETE` và giao dịch qua `ATTACH` để hợp nhất hai DB cùng một lần. Các media SHA-256 là tệp bất biến.
- Restore point nằm trong `data/backups`. Để kiểm tra lại trạng thái trước nhập, đặt `BLOOM_DATA_DIR` sang thư mục mới rồi nhập restore point vào đó. Full Backup hợp nhất và bảo toàn tiến độ sẵn có.
- Gói loại bỏ credentials và dữ liệu cache. Tệp ZIP chứa nội dung học cá nhân, nên lưu ở vị trí phù hợp trên thiết bị.

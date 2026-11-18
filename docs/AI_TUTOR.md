# AI Tutor

Đã kiểm tra tài liệu Sign in with ChatGPT của OpenAI ngày 18/11/2026. ChatGPT plan usage có luồng chính thức cho client local mã nguồn mở. Luồng yêu cầu đăng ký public client theo thiết bị, HTTPS của nhà cung cấp, callback loopback, PKCE, xác thực OIDC, kiểm tra scope và lưu token bằng cơ chế bảo vệ cục bộ. Việc xác minh end-to-end cần tài khoản ChatGPT đủ điều kiện chấp thuận quyền. Chưa có phiên xác thực đã được thử cho TOEIC Bloom.

Ứng dụng hiện trả trạng thái `available: false, connected: false` từ API loopback. UI vô hiệu hóa đăng nhập và gửi câu hỏi. Các flow mặc định đã được kiểm tra bằng trình duyệt với mọi request bên ngoài localhost bị chặn. Cấu hình phân bổ credit của tài khoản cần được xác minh trước khi kích hoạt inference.

- [ChatGPT plan usage cho ứng dụng local](https://developers.openai.com/siwc/token-sharing-open-source)
- [Đăng ký và đăng nhập](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Quản lý tài khoản, phiên và hạn mức](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [Giới hạn preview](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

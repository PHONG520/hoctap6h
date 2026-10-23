# StudyShelf — Nguyễn Như Phong

Website kho đề cương học tập cho hành trình từ lớp 6 đến lớp 9. Mỗi lớp có thư viện riêng; tài liệu lớp trước vẫn được giữ khi chuyển lớp.

## Chạy trên máy tính
Yêu cầu Node.js 18 trở lên:

```bash
npm install
npm start
```

Mở http://localhost:3000. Mật khẩu quản trị mặc định: `ADMIN6H`.

## Triển khai Render
- Build command: `npm install`
- Start command: `npm start`
- Mật khẩu quản trị mặc định là `ADMIN6H`. Có thể đặt biến môi trường `UPLOAD_PASSWORD` trong Render để thay bằng mật khẩu khác.
- Cấu hình mặc định dùng thư mục `data/` trong ứng dụng để tương thích Render Free và tránh lỗi khởi động do đường dẫn `/var/data` chưa được gắn ổ đĩa. Lưu ý: trên gói không có Persistent Disk, file đã tải lên có thể mất khi deploy/restart. Muốn lưu bền vững, cần gắn Persistent Disk (nếu gói hỗ trợ) tại `/var/data` và đặt biến `UPLOAD_DIR=/var/data/studyshelf`, hoặc dùng dịch vụ lưu trữ file ngoài.

## Cấu trúc
- `public/index.html`: HTML
- `public/css/style.css`: CSS và animation
- `public/js/app.js`: giao diện, tìm kiếm, lọc và quản trị
- `server.js`: API upload/download và lưu metadata
- `render.yaml`: cấu hình tham khảo

## Chuyển lớp
Trong mục Quản trị, nhập mật khẩu, chọn lớp hiện tại (6–9) và cập nhật. File các lớp trước không tự xóa. Khi tải lên, chọn đúng lớp và môn học.

Định dạng hỗ trợ: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT/MD, ZIP/RAR, JPG/PNG. Tối đa 10 file mỗi lần, 100 MB mỗi file.

© 2026 Nguyễn Như Phong. All rights reserved.

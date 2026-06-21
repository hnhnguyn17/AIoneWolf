# AIoneWolf (Dự án Ma Sói)

## Tổng quan
Dự án là một ứng dụng web thời gian thực (real-time) hỗ trợ chơi board game "Ma Sói" trực tuyến. Ứng dụng cung cấp nền tảng để một người làm "Quản trò" tạo phòng chơi, quản lý người chơi và chia bài (roles) ngẫu nhiên cho các thành viên tham gia. Hệ thống cũng hỗ trợ Progressive Web App (PWA) để cài đặt như một ứng dụng độc lập trên thiết bị di động.

## Công nghệ sử dụng
- **Backend:** Node.js kết hợp framework Express.js.
- **Giao tiếp thời gian thực:** Socket.IO (hỗ trợ WebSockets và Polling).
- **Frontend:** HTML/CSS/JavaScript thuần được đặt tĩnh trong thư mục `public`.
- **PWA:** Tích hợp Service Worker (`sw.js`) và tệp cấu hình `manifest.json`.

## Cấu trúc thư mục và tệp tin
- `server.js`: Tệp gốc xử lý logic backend. Đóng vai trò là máy chủ Socket.IO quản lý danh sách các phòng (rooms), điều hướng sự kiện của người chơi và quản trò.
- `package.json` & `package-lock.json`: Tệp khai báo thông tin dự án, phiên bản Node.js yêu cầu (>=18.0.0) và quản lý các thư viện phụ thuộc (`express`, `socket.io`).
- `public/`: Chứa mã nguồn phía giao diện người dùng.
  - `index.html`: Cung cấp giao diện chính, chia ra cho Quản trò (tạo phòng, chọn role, kick player) và Người chơi (nhập mã, xem role được chia).
  - `manifest.json`: Cấu hình thông tin PWA (tên ứng dụng, biểu tượng, hiển thị).
  - `sw.js`: Service Worker quản lý bộ nhớ đệm, giúp tăng tốc độ tải và khả năng offline phần nào cho ứng dụng.

## Các tính năng chính (Logic Backend)
- **Quản lý phòng (Room Management):**
  - Tạo phòng (`create_room`): Sinh ngẫu nhiên mã phòng gồm 4 ký tự in hoa dễ đọc.
  - Tham gia phòng (`join_room`): Người chơi vào phòng dựa trên mã code (hoặc QR).
  - Đóng phòng: Tự động xóa phòng khỏi bộ nhớ khi quản trò thoái xuất và không còn người chơi nào.
- **Chơi game (Gameplay events):**
  - Chia bài (`start_assign_roles`): Sử dụng thuật toán xáo trộn *Fisher-Yates Shuffle* để đảm bảo tính ngẫu nhiên khi phân bổ vai trò cho mỗi người chơi theo thiết lập của quản trò.
  - Tóm tắt (`role_summary`): Quản trò nhận được bảng danh sách vai trò bí mật của từng người để điều phối ban đêm.
  - Quản lý người chơi (`kick_player`): Quản trò có quyền loại bỏ người chơi khỏi phòng chờ.
  - Đặt lại (`reset_room`): Thu hồi tất cả các vai trò, làm trống trạng thái game để tiến hành chia lại từ đầu.

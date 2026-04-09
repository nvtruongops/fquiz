# Quiz Session Pages

## Cấu trúc

- `page.tsx` - Page desktop với layout ngang (sidebar + main content)
- `mobile/page.tsx` - Page mobile-optimized với layout dọc
- `/middleware.ts` (root) - Auto-detect mobile và redirect

## Auto-Detection

Middleware Next.js tự động detect:
- Mobile devices (Android, iPhone, iPod, BlackBerry, etc.)
- Tablets (iPad, Android tablets)
- User-Agent header

**Cách hoạt động:**
1. User truy cập `/quiz/[id]/session/[sessionId]`
2. Middleware check User-Agent
3. Nếu mobile/tablet → Auto redirect sang `/quiz/[id]/session/[sessionId]/mobile`
4. Nếu desktop → Giữ nguyên URL, dùng layout PC

## Tính năng Mobile Page

### Layout
- Layout dọc thay vì ngang (không có sidebar cố định)
- Header sticky với thông tin quiz và progress bar
- Bottom navigation với nút Previous/Next/Submit
- Question map trong dialog thay vì sidebar

### UI/UX Improvements
- Đáp án dạng card lớn, dễ touch
- Spacing rộng hơn cho mobile
- Icons và text size phù hợp với mobile
- Smooth transitions và animations
- Progress bar trực quan
- Touch-friendly buttons (min 44x44px)

### Responsive
- Tự động detect mobile device qua middleware
- Dialogs với padding phù hợp mobile (w-[calc(100vw-2rem)])
- ScrollArea cho nội dung dài

## Chế độ Quiz

### Immediate Mode (Luyện tập)
- Hiển thị đáp án đúng/sai ngay sau khi chọn
- Hiển thị giải thích (nếu có)
- Highlight đáp án đúng màu xanh, sai màu đỏ
- Không thể thay đổi đáp án sau khi submit

### Review Mode (Kiểm tra)
- Không hiển thị đáp án cho đến khi nộp bài
- Chỉ lưu câu trả lời
- Có thể thay đổi đáp án trước khi nộp
- Xem kết quả sau khi nộp bài

## Navigation
- Previous/Next buttons ở bottom bar
- Question map dialog để jump đến câu bất kỳ
- Progress tracking với visual progress bar
- Exit confirmation khi thoát giữa chừng
- Back button prevention với confirmation

## Testing

**Desktop:**
```
http://localhost:3000/quiz/[id]/session/[sessionId]
```

**Mobile (manual):**
```
http://localhost:3000/quiz/[id]/session/[sessionId]/mobile
```

**Mobile (auto-redirect):**
- Mở trên thiết bị mobile hoặc dùng Chrome DevTools Device Mode
- Truy cập URL desktop, sẽ tự động redirect sang /mobile

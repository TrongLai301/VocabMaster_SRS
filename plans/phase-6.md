# PHASE 6: TỐI ƯU HÓA HIỆU NĂNG, RESPONSIVE MOBILE & TRIỂN KHAI PRODUCTION

> **Thời gian dự kiến**: 2 - 3 ngày  
> **Mục tiêu**: Hoàn thiện toàn bộ chi tiết UX, tối ưu hóa tốc độ tải trang, đảm bảo trải nghiệm vuốt chạm hoàn hảo trên thiết bị di động và triển khai hệ thống lên môi trường Production (Vercel / GitHub Pages).

---

## 1. CHECKLIST CÔNG VIỆC CỤ THỂ

- [ ] **6.1. Tối Ưu UX, Loading States & Micro-interactions**:
  - Tạo Skeleton Loader cho bảng danh sách thẻ và thẻ Flashcard khi đang fetch dữ liệu từ Supabase.
  - Sử dụng Shadcn Sonner (`toast`) để thông báo tức thì: khi import TSV thành công, khi đồng bộ dữ liệu, khi đạt mốc Streak mới.
  - Tích hợp hiệu ứng âm thanh nhẹ: tiếng "woosh" khi lật thẻ, tiếng "ding" khi ghép đúng cặp hoặc trả lời đúng trắc nghiệm (có nút bật/tắt trong cài đặt).

- [ ] **6.2. Kiểm Thử & Tinh Chỉnh Responsive Mobile**:
  - Tích hợp cử chỉ vuốt chạm (Touch Swipe Gestures) cho `FlashcardViewer` trên điện thoại (vuốt trái: thẻ trước, vuốt phải: thẻ sau).
  - Tối ưu bảng Flat List dạng Card-view thu gọn trên màn hình < 640px.
  - Thiết kế thanh Bottom Navigation Bar cho giao diện Mobile để người dùng dễ thao tác bằng một tay.

- [ ] **6.3. Tối Ưu Hiệu Năng & SEO**:
  - Sử dụng React `lazy` và `Suspense` để code-splitting theo từng route (`/study`, `/quiz`, `/match`, `/analytics`).
  - Tối ưu bundle size bằng Vite build chunking.
  - Bổ sung Meta Tags đầy đủ (Title, Meta Description, OpenGraph Preview).
  - Đảm bảo điểm số Google Lighthouse đạt > 90 trên cả Desktop và Mobile.

- [ ] **6.4. Triển Khai Production (Vercel / GitHub Pages)**:
  - Cấu hình file `vercel.json` xử lý SPA rewrite tránh lỗi 404 khi tải lại trang:
    ```json
    {
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
    ```
  - Cấu hình các biến môi trường Production trên Vercel:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
  - Chạy build test cục bộ trước khi push:
    ```bash
    npm run build
    npm run preview
    ```

---

## 2. FILE CẤU HÌNH PRODUCTION

### 2.1. File: `vercel.json` (Đặt tại thư mục gốc của project)
```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2.2. File cấu hình GitHub Pages (Nếu chọn deploy qua GitHub Pages)
Trong `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/vocab/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```
Tạo thêm file `public/404.html` có nội dung sao chép từ `index.html` để hỗ trợ SPA Routing trên GitHub Pages.

---

## 3. CHECKLIST KIỂM THỬ TRƯỚC KHI BÀN GIAO (PRE-LAUNCH CHECKLIST)
- [ ] Mở ứng dụng trên điện thoại (iOS Safari và Android Chrome): Thao tác lật thẻ và phát âm Web Speech API hoạt động trơn tru.
- [ ] Đăng xuất và thử truy cập trực tiếp URL trang học: Hệ thống chuyển hướng về trang `/login` thành công.
- [ ] Thử nạp 200+ từ vựng qua file TSV: Hệ thống xử lý không bị treo và render mượt mà.
- [ ] Chạy kiểm thử build:
  ```bash
  npm run build
  ```
  Không có bất kỳ lỗi TypeScript nào (`tsc -b` pass 100%).
- [ ] Kiểm tra Google Lighthouse: Performance >= 90, Accessibility >= 95.

---

## 4. TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE - DOD)
1. Ứng dụng chạy mượt mà trên domain production (Vercel hoặc GitHub Pages).
2. Tải lại trang (F5) ở bất kỳ URL nào đều không bị lỗi 404.
3. Không có lỗi runtime nào trong Console trình duyệt.
4. Toàn bộ 5 tính năng cốt lõi (Auth, Study Sets & TSV Import, Flashcard 3D + Audio, SRS SM-2 Review, Quiz & Match Games) hoạt động hoàn hảo và đồng bộ với database Supabase.

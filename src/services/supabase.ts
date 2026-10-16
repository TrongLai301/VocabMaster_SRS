import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Tự động chuẩn hóa URL nếu bị dính /rest/v1 hoặc dấu gạch chéo ở cuối
let supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// TỰ ĐỘNG CHUYỂN HOÁ HOST CHO MOBILE / LAN TESTING:
// Khi mở web từ điện thoại (e.g. http://192.168.10.8:5173), nếu URL trỏ về 127.0.0.1 / localhost
// thì điện thoại sẽ không kết nối được. Tự động thay bằng IP host của trình duyệt hiện tại.
if (typeof window !== 'undefined' && window.location?.hostname) {
  const currentHost = window.location.hostname;
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    supabaseUrl = supabaseUrl.replace(/127\.0\.0\.1|localhost/, currentHost);
  }
}

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Chưa cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env. Vui lòng cấu hình để kết nối cơ sở dữ liệu.'
  );
}

// Khởi tạo Supabase client với fallback an toàn tránh crash app khi chưa có .env
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthContext';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Code Splitting with React.lazy for optimal chunk loading
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('@/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const StudySetsPage = lazy(() =>
  import('@/features/study-sets/pages/StudySetsPage').then((m) => ({ default: m.StudySetsPage }))
);
const StudySetDetailPage = lazy(() =>
  import('@/features/study-sets/pages/StudySetDetailPage').then((m) => ({ default: m.StudySetDetailPage }))
);
const StudyPage = lazy(() =>
  import('@/features/flashcards/pages/StudyPage').then((m) => ({ default: m.StudyPage }))
);
const DailyReviewPage = lazy(() =>
  import('@/features/srs/pages/DailyReviewPage').then((m) => ({ default: m.DailyReviewPage }))
);
const GamesPage = lazy(() =>
  import('@/features/games/pages/GamesPage').then((m) => ({ default: m.GamesPage }))
);
const AnalyticsPage = lazy(() =>
  import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);

const PageFallback: React.FC = () => (
  <div className="flex min-h-[65vh] items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-sm" />
      <span className="text-xs font-semibold text-muted-foreground animate-pulse">
        Đang tải trang...
      </span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors selection:bg-primary/20 pb-16 md:pb-0">
          <Navbar />
          
          <main className="flex-1">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* App Functional Routes */}
                <Route 
                  path="/sets" 
                  element={
                    <ProtectedRoute>
                      <StudySetsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/sets/:setId" 
                  element={
                    <ProtectedRoute>
                      <StudySetDetailPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/study/:setId" 
                  element={
                    <ProtectedRoute>
                      <StudyPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/review" 
                  element={
                    <ProtectedRoute>
                      <DailyReviewPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/games" 
                  element={
                    <ProtectedRoute>
                      <GamesPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <footer className="hidden md:block border-t py-6 text-center text-xs text-muted-foreground bg-muted/20">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>VocabMaster SRS &copy; {new Date().getFullYear()} - Ứng dụng học từ vựng tương tác hiện đại.</p>
              <p className="font-mono text-[11px] text-muted-foreground/75">OpenQuiz UI &bull; Anki SM-2 &bull; Mochi 5 Stages</p>
            </div>
          </footer>

          {/* Mobile Bottom Navigation Bar (Handy for one-handed phone use) */}
          <MobileBottomNav />

          {/* Sonner Toast Provider */}
          <Toaster richColors position="top-right" closeButton />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

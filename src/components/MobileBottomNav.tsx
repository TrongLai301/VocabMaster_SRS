import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  FolderKanban, 
  Layers, 
  Trophy, 
  BarChart3 
} from 'lucide-react';
import { fetchMemoryStageStats } from '@/services/api/srsService';

export const MobileBottomNav: React.FC = () => {
  const [dueCount, setDueCount] = useState<number | null>(null);

  useEffect(() => {
    fetchMemoryStageStats()
      .then((data) => setDueCount(data.totalDue))
      .catch(() => {});
  }, []);

  const navItems = [
    {
      to: '/',
      label: 'Trang chủ',
      icon: Home,
      exact: true,
    },
    {
      to: '/sets',
      label: 'Bộ thẻ',
      icon: FolderKanban,
    },
    {
      to: '/review',
      label: 'Ôn tập',
      icon: Layers,
      badge: dueCount && dueCount > 0 ? dueCount : undefined,
    },
    {
      to: '/games',
      label: 'Trò chơi',
      icon: Trophy,
    },
    {
      to: '/analytics',
      label: 'Thống kê',
      icon: BarChart3,
    },
  ];

  return (
    <nav 
      aria-label="Thanh điều hướng di động"
      className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background/90 backdrop-blur-lg flex items-center justify-around px-2 md:hidden select-none"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-16 py-1 transition-all ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

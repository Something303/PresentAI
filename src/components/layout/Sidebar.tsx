'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector, ThemeToggle } from '@/components/ui/LanguageThemeToggle';
import {
  LayoutDashboard,
  Plus,
  History,
  TrendingUp,
  Settings,
  LogOut,
  Presentation,
  ChevronRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',          icon: <LayoutDashboard className="w-5 h-5" />, labelKey: 'nav.dashboard' },
  { href: '/new-presentation',   icon: <Plus className="w-5 h-5" />,            labelKey: 'nav.newPresentation' },
  { href: '/history',            icon: <History className="w-5 h-5" />,         labelKey: 'nav.history' },
  { href: '/progress',           icon: <TrendingUp className="w-5 h-5" />,      labelKey: 'nav.progress' },
  { href: '/settings',           icon: <Settings className="w-5 h-5" />,        labelKey: 'nav.settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    toast.success(language === 'id' ? 'Berhasil keluar' : 'Logged out successfully');
    router.push('/');
  };

  const { language } = useLanguage();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 fixed top-0 left-0 bottom-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">PresentAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(isActive ? 'sidebar-link-active' : 'sidebar-link')}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        {/* Language & Theme */}
        <div className="flex items-center gap-2 px-1">
          <LanguageSelector compact />
          <ThemeToggle />
        </div>

        {/* User Profile */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name ?? 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}

// ── Mobile Top Bar ───────────────────────────────────────────
export function MobileTopBar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const currentItem = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Presentation className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100">PresentAI</span>
      </div>
      <div className="flex items-center gap-1">
        <LanguageSelector compact />
        <ThemeToggle />
      </div>
    </div>
  );
}

// ── Mobile Bottom Nav ────────────────────────────────────────
export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const mobileItems = NAV_ITEMS.slice(0, 4);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <span className={cn('transition-transform', isActive && 'scale-110')}>{item.icon}</span>
            <span className="leading-none">{t(item.labelKey).split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, LayoutDashboard, MapPin, Car, Route, 
  FileText, LogOut, ChevronLeft, Menu, Users 
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/stations', label: 'İstasyonlar', icon: MapPin },
  { to: '/admin/vehicles', label: 'Araçlar', icon: Car },
  { to: '/admin/route-planning', label: 'Rota Planlama', icon: Route },
  { to: '/admin/routes', label: 'Tüm Rotalar', icon: Truck },
  { to: '/admin/reports', label: 'Raporlar', icon: FileText },
  { to: '/admin/users', label: 'Kullanıcılar', icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Sidebar - Desktop */}
      <aside
        className={clsx(
          'hidden md:flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-dark-700">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-glow flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-display text-lg font-semibold text-dark-50">KargoSis</h1>
                <p className="text-xs text-dark-400">Yönetici Paneli</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                location.pathname === link.to
                  ? 'bg-primary-500/10 text-primary-400 border-l-4 border-primary-500'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
              )}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User & Collapse */}
        <div className="p-4 border-t border-dark-700 space-y-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <ChevronLeft className={clsx('w-5 h-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
            {!sidebarCollapsed && <span>Daralt</span>}
          </button>
          
          {!sidebarCollapsed && (
            <div className="px-4 py-2 text-sm text-dark-400 animate-fade-in">
              <p className="font-medium text-dark-200">{user?.full_name || user?.username}</p>
              <p className="text-xs">{user?.email}</p>
            </div>
          )}
          
          <button
            onClick={logout}
            className={clsx(
              'w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span>Çıkış Yap</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-dark-900 border-b border-dark-700">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-semibold text-dark-50">Admin</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-dark-400"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="bg-dark-900 border-t border-dark-700 p-4 space-y-1 animate-fade-in">
            {sidebarLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  location.pathname === link.to
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-dark-300'
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            ))}
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Çıkış Yap</span>
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}


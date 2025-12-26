import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Truck, MapPin, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function Layout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = isAuthenticated
    ? isAdmin
      ? [
          { to: '/admin', label: 'Yönetici Paneli', icon: User },
        ]
      : [
          { to: '/user', label: 'Panel', icon: User },
          { to: '/user/send', label: 'Kargo Gönder', icon: Package },
          { to: '/user/my-cargo', label: 'Kargolarım', icon: Truck },
        ]
    : [
        { to: '/track', label: 'Kargo Takip', icon: MapPin },
        { to: '/login', label: 'Giriş Yap', icon: User },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-dark-900/80 backdrop-blur-md border-b border-dark-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-lg transition-shadow">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-dark-50">KargoSis</h1>
                <p className="text-xs text-dark-400">Kocaeli Üniversitesi</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                    location.pathname === link.to
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              
              {isAuthenticated && (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-dark-700">
                  <span className="text-dark-400 text-sm">
                    Hoş geldin, <span className="text-primary-400">{user?.full_name || user?.username}</span>
                  </span>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış
                  </button>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-dark-400 hover:text-dark-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-dark-900 border-t border-dark-700 animate-fade-in">
            <nav className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200',
                    location.pathname === link.to
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}
              
              {isAuthenticated && (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Çıkış Yap
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-dark-900/50 border-t border-dark-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-dark-400">Kargo İşletme Sistemi</span>
            </div>
            <p className="text-dark-500 text-sm">
              © 2025 Kocaeli Üniversitesi - Yazılım Lab I Projesi
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


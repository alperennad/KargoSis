import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TrackCargoPage from './pages/TrackCargoPage';

// User Pages
import UserDashboard from './pages/user/UserDashboard';
import SendCargoPage from './pages/user/SendCargoPage';
import MyCargoPage from './pages/user/MyCargoPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StationsPage from './pages/admin/StationsPage';
import VehiclesPage from './pages/admin/VehiclesPage';
import RoutePlanningPage from './pages/admin/RoutePlanningPage';
import AllRoutesPage from './pages/admin/AllRoutesPage';
import ReportsPage from './pages/admin/ReportsPage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="track" element={<TrackCargoPage />} />
      </Route>

      {/* User Routes */}
      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="send" element={<SendCargoPage />} />
        <Route path="my-cargo" element={<MyCargoPage />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="stations" element={<StationsPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="route-planning" element={<RoutePlanningPage />} />
        <Route path="routes" element={<AllRoutesPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;


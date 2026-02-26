import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quotations from './pages/Quotations';
import CreateQuotation from './pages/CreateQuotation';
import QuotationDetail from './pages/QuotationDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Payments from './pages/Payments';
import Settings from './pages/Settings';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ minHeight: '100%' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div style={{ width: 48, height: 48, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-base)', display: 'flex' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: '100vh' }}>
        <TopBar />
        <main className="flex-1 overflow-auto page-ambient">
          <AnimatedRoutes />
        </main>
      </div>
    </div>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#152035',
              color: '#EDF2FF',
              border: '1px solid #1E2D47',
              borderRadius: '12px',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#070C18' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#070C18' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/new" element={<CreateQuotation />} />
            <Route path="/quotations/:id" element={<QuotationDetail />} />
            <Route path="/quotations/:id/edit" element={<CreateQuotation />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

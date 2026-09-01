import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Client/Home';
import './styles/App.css';
import './styles/landing-premium.css';

const Services = lazy(() => import('./pages/Client/Services'));
const Booking = lazy(() => import('./pages/Client/Booking'));
const Confirmation = lazy(() => import('./pages/Client/Confirmation'));
const Login = lazy(() => import('./pages/Admin/Login'));
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AppointmentsAdmin = lazy(() => import('./pages/Admin/AppointmentsAdmin'));
const TherapistsAdmin = lazy(() => import('./pages/Admin/TherapistsAdmin'));
const CabinsAdmin = lazy(() => import('./pages/Admin/CabinsAdmin'));
const ServicesAdmin = lazy(() => import('./pages/Admin/ServicesAdmin'));
const PackagesAdmin = lazy(() => import('./pages/Admin/PackagesAdmin'));
const Reports = lazy(() => import('./pages/Admin/Reports'));
const AdminBooking = lazy(() => import('./pages/Admin/AdminBooking'));
const UsersAdmin = lazy(() => import('./pages/Admin/UsersAdmin'));
const SettingsAdmin = lazy(() => import('./pages/Admin/SettingsAdmin'));
const WhatsAppAdmin = lazy(() => import('./pages/Admin/WhatsAppAdmin'));
const SedesAdmin = lazy(() => import('./pages/Admin/SedesAdmin'));
const BoletasPlaceholder = lazy(() => import('./pages/Admin/BoletasPlaceholder'));

function ModuleRoute({ module, children }) {
  const { hasModulePermission, user, selectedBranchId } = useApp();
  if (user?.role === 'admin') return children;
  if (!hasModulePermission(module, 'can_view', selectedBranchId)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isLogin = location.pathname === '/login';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isLogin && <Navbar />}
      <div style={{ flex: 1 }}>
        <Suspense fallback={<div className="page-loading">Cargando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/servicios" element={<Services />} />
            <Route path="/agendar" element={<Booking />} />
            <Route path="/confirmacion" element={<Confirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="citas" element={<ModuleRoute module="citas"><AppointmentsAdmin /></ModuleRoute>} />
              <Route path="terapeutas" element={<ModuleRoute module="terapeutas"><TherapistsAdmin /></ModuleRoute>} />
              <Route path="cabinas" element={<ModuleRoute module="cabinas"><CabinsAdmin /></ModuleRoute>} />
              <Route path="servicios" element={<ModuleRoute module="servicios"><ServicesAdmin /></ModuleRoute>} />
              <Route path="paquetes" element={<ModuleRoute module="paquetes"><PackagesAdmin /></ModuleRoute>} />
              <Route path="reportes" element={<ModuleRoute module="reportes"><Reports /></ModuleRoute>} />
              <Route path="agendar" element={<ModuleRoute module="citas"><AdminBooking /></ModuleRoute>} />
              <Route path="usuarios" element={<ModuleRoute module="usuarios"><UsersAdmin /></ModuleRoute>} />
              <Route path="whatsapp" element={<ModuleRoute module="usuarios"><WhatsAppAdmin /></ModuleRoute>} />
              <Route path="sedas" element={<ModuleRoute module="sedas"><SedesAdmin /></ModuleRoute>} />
              <Route path="configuracion" element={<SettingsAdmin />} />
              <Route path="boletas/:id" element={<BoletasPlaceholder />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
      {isHome && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

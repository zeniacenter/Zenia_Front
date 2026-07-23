import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Client/Home';
import Booking from './pages/Client/Booking';
import Confirmation from './pages/Client/Confirmation';
import Login from './pages/Admin/Login';
import AdminLayout from './pages/Admin/AdminLayout';
import Dashboard from './pages/Admin/Dashboard';
import AppointmentsAdmin from './pages/Admin/AppointmentsAdmin';
import TherapistsAdmin from './pages/Admin/TherapistsAdmin';
import CabinsAdmin from './pages/Admin/CabinsAdmin';
import ServicesAdmin from './pages/Admin/ServicesAdmin';
import PackagesAdmin from './pages/Admin/PackagesAdmin';
import Reports from './pages/Admin/Reports';
import AdminBooking from './pages/Admin/AdminBooking';
import UsersAdmin from './pages/Admin/UsersAdmin';
import SettingsAdmin from './pages/Admin/SettingsAdmin';
import WhatsAppAdmin from './pages/Admin/WhatsAppAdmin';
import SedesAdmin from './pages/Admin/SedesAdmin';
import BoletasPlaceholder from './pages/Admin/BoletasPlaceholder';
import './styles/App.css';
import './styles/landing-premium.css';

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
        <Routes>
          <Route path="/" element={<Home />} />
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

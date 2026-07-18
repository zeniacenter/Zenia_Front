import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { BarChart3, Calendar, Users, Home, Sparkles, Package, TrendingUp, User, Settings, MessageSquare, MapPin } from 'lucide-react';

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard', permission: 'dashboard' },
  { to: '/admin/citas', icon: Calendar, label: 'Citas', permission: 'citas' },
  { to: '/admin/terapeutas', icon: Users, label: 'Terapeutas', permission: 'terapeutas' },
  { to: '/admin/cabinas', icon: Home, label: 'Cabinas', permission: 'cabinas' },
  { to: '/admin/servicios', icon: Sparkles, label: 'Servicios', permission: 'servicios' },
  { to: '/admin/paquetes', icon: Package, label: 'Paquetes', permission: 'paquetes' },
  { to: '/admin/reportes', icon: TrendingUp, label: 'Reportes', permission: 'reportes' },
  { to: '/admin/usuarios', icon: User, label: 'Usuarios', permission: 'usuarios' },
  { to: '/admin/whatsapp', icon: MessageSquare, label: 'WhatsApp', permission: 'dashboard' },
  { to: '/admin/sedas', icon: MapPin, label: 'Sedes', permission: 'dashboard' },
  { to: '/admin/configuracion', icon: Settings, label: 'Configuración', adminOnly: true },
];

export default function AdminLayout() {
  const { isAdminLoggedIn, hasPermission, user } = useApp();
  const location = useLocation();

  if (!isAdminLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const visibleLinks = SIDEBAR_LINKS.filter((link) => {
    if (link.adminOnly) return user?.role === 'admin';
    return hasPermission(link.permission);
  });

  const currentLink = visibleLinks.find((l) => location.pathname === l.to || location.pathname.startsWith(l.to + '/'));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav className="admin-nav">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><link.icon size={18} /></span>
              <span className="admin-nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>

      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

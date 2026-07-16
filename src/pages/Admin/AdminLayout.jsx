import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard', permission: 'dashboard' },
  { to: '/admin/citas', icon: '📅', label: 'Citas', permission: 'citas' },
  { to: '/admin/terapeutas', icon: '👥', label: 'Terapeutas', permission: 'terapeutas' },
  { to: '/admin/cabinas', icon: '🏠', label: 'Cabinas', permission: 'cabinas' },
  { to: '/admin/servicios', icon: '💆', label: 'Servicios', permission: 'servicios' },
  { to: '/admin/paquetes', icon: '📦', label: 'Paquetes', permission: 'paquetes' },
  { to: '/admin/reportes', icon: '📈', label: 'Reportes', permission: 'reportes' },
  { to: '/admin/usuarios', icon: '👤', label: 'Usuarios', permission: 'usuarios' },
  { to: '/admin/configuracion', icon: '⚙️', label: 'Configuración', adminOnly: true },
];

export default function AdminLayout() {
  const { isAdminLoggedIn, hasPermission, user } = useApp();
  const location = useLocation();

  if (!isAdminLoggedIn) {
    return <Navigate to="/admin/login" replace />;
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
              <span className="admin-nav-icon">{link.icon}</span>
              <span className="admin-nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>

      </aside>
      <main className="admin-content">
        {currentLink && (
          <div className="admin-breadcrumb">
            <span>{currentLink.icon}</span>
            <span>{currentLink.label}</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

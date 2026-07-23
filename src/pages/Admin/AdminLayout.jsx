import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { BarChart3, Calendar, Users, Home, Sparkles, Package, TrendingUp, User, Settings, MessageSquare, MapPin, ChevronDown } from 'lucide-react';

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard', module: null },
  { to: '/admin/citas', icon: Calendar, label: 'Citas', module: 'citas' },
  { to: '/admin/terapeutas', icon: Users, label: 'Terapeutas', module: 'terapeutas' },
  { to: '/admin/cabinas', icon: Home, label: 'Cabinas', module: 'cabinas' },
  { to: '/admin/servicios', icon: Sparkles, label: 'Servicios', module: 'servicios' },
  { to: '/admin/paquetes', icon: Package, label: 'Paquetes', module: 'paquetes' },
  { to: '/admin/reportes', icon: TrendingUp, label: 'Reportes', module: 'reportes' },
  { to: '/admin/usuarios', icon: User, label: 'Usuarios', module: 'usuarios' },
  { to: '/admin/whatsapp', icon: MessageSquare, label: 'WhatsApp', adminOnly: true },
  { to: '/admin/sedas', icon: MapPin, label: 'Sedes', module: 'sedas' },
  { to: '/admin/configuracion', icon: Settings, label: 'Configuración', adminOnly: true },
];

export default function AdminLayout() {
  const { isAdminLoggedIn, hasModulePermission, user, userPermissions, selectedBranchId, selectBranch } = useApp();
  const location = useLocation();

  if (!isAdminLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const authorizedBranches = user?.role === 'admin' ? [] : (userPermissions?.branches || []);

  const visibleLinks = SIDEBAR_LINKS.filter((link) => {
    if (link.adminOnly) return user?.role === 'admin';
    if (!link.module) return true;
    return hasModulePermission(link.module, 'can_view');
  });

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        {authorizedBranches.length > 0 && (
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--adm-border)' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--adm-text-sec)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', fontWeight: 600 }}>Sucursal</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => selectBranch(Number(e.target.value))}
                style={{
                  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
                  border: '1px solid var(--adm-border)', background: '#fff',
                  color: 'var(--adm-text)', fontSize: '0.85rem', fontWeight: 500, appearance: 'none', cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {authorizedBranches.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: '#fff', color: 'var(--adm-text)' }}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={16} color="var(--adm-text-sec)" style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
        )}
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

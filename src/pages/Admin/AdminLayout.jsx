import { useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { BarChart3, Calendar, Users, Home, Sparkles, Package, TrendingUp, User, Settings, MessageSquare, MapPin, ChevronDown, FileText } from 'lucide-react';

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard', module: null },
  { to: '/admin/citas', icon: Calendar, label: 'Citas', module: 'citas', children: [
      { to: '/admin/comprobantes', icon: FileText, label: 'Comprobantes', module: 'citas' },
  ]},
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

function isLinkVisible(link, { user, hasModulePermission, selectedBranchId, settings }) {
  if (link.adminOnly) return user?.role === 'admin';
  if (!link.module) return true;
  if (link.module === 'cabinas' && !settings.cabinRequired) return false;
  if (link.module === 'sedas' && !settings.branchRequired) return false;
  return hasModulePermission(link.module, 'can_view', selectedBranchId);
}

export default function AdminLayout() {
  const { isAdminLoggedIn, hasModulePermission, user, userPermissions, selectedBranchId, selectBranch, settings } = useApp();
  const location = useLocation();

  const [openSections, setOpenSections] = useState(() => {
    const open = new Set();
    SIDEBAR_LINKS.forEach((link) => {
      if (link.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))) {
        open.add(link.to);
      }
    });
    return open;
  });

  if (!isAdminLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const authorizedBranches = user?.role === 'admin' ? [] : (userPermissions?.branches || []);

  const visibleLinks = SIDEBAR_LINKS.filter((link) =>
    isLinkVisible(link, { user, hasModulePermission, selectedBranchId, settings })
  );

  const toggleSection = (to) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(to)) {
        next.delete(to);
      } else {
        next.add(to);
      }
      return next;
    });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        {authorizedBranches.length > 0 && (
          <div style={{ padding: '0 0.75rem', marginBottom: '4px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--adm-text-sec)' }}><MapPin size={18} /></span>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => selectBranch(Number(e.target.value))}
                style={{
                  flex: 1, padding: '0.6rem 1.75rem 0.6rem 0.5rem', borderRadius: 'var(--r-md)',
                  border: 'none', background: 'transparent',
                  color: 'var(--adm-text-sec)', fontSize: 'var(--fs-sm)', fontWeight: 500,
                  appearance: 'none', cursor: 'pointer', outline: 'none',
                }}
              >
                {authorizedBranches.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: '#fff', color: 'var(--adm-text)' }}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} color="var(--adm-text-sec)" style={{ position: 'absolute', right: '0.4rem', pointerEvents: 'none' }} />
            </div>
          </div>
        )}
        <nav className="admin-nav">
          {visibleLinks.map((link) => {
            if (link.children) {
              const isOpen = openSections.has(link.to);
              const visibleChildren = link.children.filter((c) =>
                isLinkVisible(c, { user, hasModulePermission, selectedBranchId, settings })
              );
              if (visibleChildren.length === 0) return null;

              return (
                <div key={link.to} className="admin-nav-section">
                  <div className="admin-nav-section-head">
                    <NavLink
                      to={link.to}
                      className={({ isActive }) => `admin-nav-link section-link ${isActive ? 'active' : ''}`}
                    >
                      <span className="admin-nav-icon"><link.icon size={18} /></span>
                      <span className="admin-nav-label">{link.label}</span>
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => toggleSection(link.to)}
                      className="admin-nav-section-chev"
                      aria-label="Mostrar subsecciones"
                    >
                      <ChevronDown size={14} className={`section-chev ${isOpen ? 'open' : ''}`} />
                    </button>
                  </div>

                  {isOpen && visibleChildren.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) => `admin-nav-link sub ${isActive ? 'active' : ''}`}
                    >
                      <span className="admin-nav-icon" style={{ width: 24 }} />
                      <span className="admin-nav-label">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              );
            }

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="admin-nav-icon"><link.icon size={18} /></span>
                <span className="admin-nav-label">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

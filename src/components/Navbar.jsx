import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Flower2, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { isAdminLoggedIn, logoutAdmin, user } = useApp();
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (isAdminArea && isAdminLoggedIn) {
    return (
      <nav className="navbar navbar-admin-top">
        <NavLink to="/admin/dashboard" className="navbar-brand">
          <span className="brand-icon"><Flower2 size={22} /></span>
          Zenia Admin
        </NavLink>
        <div className="navbar-admin-right">
          <span className="navbar-admin-user">{user?.name}</span>
          <button className="btn btn-sm btn-admin-logout" onClick={logoutAdmin}>
            Cerrar Sesión
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`navbar-premium ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-premium-inner">
        <NavLink to="/" className="navbar-brand-premium">
          <span className="brand-icon-premium"><Flower2 size={20} /></span>
          <span className="brand-text">Zenia</span>
        </NavLink>

        <div className={`navbar-links-premium ${mobileOpen ? 'open' : ''}`}>
          <a href="#inicio" className="nav-link-premium">Inicio</a>
          <a href="#beneficios" className="nav-link-premium">Beneficios</a>
          <a href="#servicios" className="nav-link-premium">Servicios</a>
          <a href="#paquetes" className="nav-link-premium">Paquetes</a>
          <a href="#equipo" className="nav-link-premium">Equipo</a>
          <a href="#testimonios" className="nav-link-premium">Testimonios</a>
          <NavLink to="/agendar" className="nav-link-premium nav-link-cta">
            Agendar Cita
          </NavLink>
          <NavLink to="/admin" className="nav-link-premium nav-link-admin">
            Admin
          </NavLink>
        </div>

        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}

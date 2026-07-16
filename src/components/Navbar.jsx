import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Flower2 } from 'lucide-react';

export default function Navbar() {
  const { isAdminLoggedIn, logoutAdmin, user } = useApp();
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');

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
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="brand-icon"><Flower2 size={22} /></span>
        Zenia
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
          Inicio
        </NavLink>
        <NavLink to="/servicios" className={({ isActive }) => isActive ? 'active' : ''}>
          Servicios
        </NavLink>
        <NavLink to="/paquetes" className={({ isActive }) => isActive ? 'active' : ''}>
          Paquetes Especiales
        </NavLink>
        <NavLink to="/agendar" className={({ isActive }) => isActive ? 'active' : ''}>
          Agendar Cita
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
          Admin
        </NavLink>
      </div>
    </nav>
  );
}

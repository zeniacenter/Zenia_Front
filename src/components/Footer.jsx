import { Flower2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-premium">
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>
            <Flower2 size={28} />
            Zenia Center
          </h3>
          <p>
            Tu destino premium para el bienestar y la relajación.
            Experimenta la armonía perfecta entre cuerpo y mente
            con nuestros tratamientos exclusivos.
          </p>
        </div>

        <div className="footer-col">
          <h4>Servicios</h4>
          <ul>
            <li><a href="#servicios">Masajes Terapéuticos</a></li>
            <li><a href="#servicios">Relajación</a></li>
            <li><a href="#servicios">Tratamientos Faciales</a></li>
            <li><a href="#paquetes">Paquetes Especiales</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Empresa</h4>
          <ul>
            <li><a href="#beneficios">Sobre Nosotros</a></li>
            <li><a href="#equipo">Nuestro Equipo</a></li>
            {/* <li><a href="#testimonios">Testimonios</a></li> */}
            <li><a href="#inicio">Contacto</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/privacy">Política de Privacidad</Link></li>
            <li><Link to="/terms">Términos y Condiciones</Link></li>
            <li><Link to="/cookies">Política de Cookies</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 Zenia Center. Todos los derechos reservados.</p>
        <div className="footer-socials">
          <a href="#" className="footer-social-link" aria-label="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a href="#" className="footer-social-link" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a href="#" className="footer-social-link" aria-label="Twitter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

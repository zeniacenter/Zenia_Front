import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Packages() {
  const { packages, services, settings } = useApp();
  const activePackages = packages.filter((p) => p.active);

  const getServiceNames = (sessions) =>
    (sessions || []).map((s) => {
      const svc = services.find((sv) => sv.id === s.id);
      return svc ? `${svc.name} (${s.hours}h)` : 'N/A';
    }).join(', ');

  return (
    <div>
      <section className="hero" style={{ padding: '3rem 2rem' }}>
        <h1>Paquetes Especiales</h1>
        <p>Combina servicios y ahorra con nuestros paquetes diseñados para tu bienestar</p>
      </section>

      <section className="section">
        <div className="services-grid">
          {activePackages.map((pkg) => (
            <div className="card" key={pkg.id}>
              <img src={pkg.image} alt={pkg.name} className="card-image" />
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3 className="card-title" style={{ margin: 0 }}>{pkg.name}</h3>
                  {settings.priceVisible && (
                    <span className="badge badge-confirmed">
                      -{Math.round(((pkg.originalPrice - pkg.packagePrice) / pkg.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <p className="card-text">{pkg.description}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {(pkg.sessions || []).length > 0
                    ? `${pkg.sessions.length} sesiones incluidas`
                    : `${pkg.hours}h de duración`}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {settings.priceVisible && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                        S/ {pkg.originalPrice}
                      </span>
                      <span className="card-price">S/ {pkg.packagePrice}</span>
                    </div>
                  )}
                  <Link to={`/agendar?package=${pkg.id}`} className="btn btn-primary btn-sm">
                    Agendar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activePackages.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No hay paquetes disponibles</p>
          </div>
        )}
      </section>

      <section className="section" style={{ background: 'var(--accent)', borderRadius: '0', maxWidth: '100%', padding: '3rem 2rem' }}>
        <h2 className="section-title">¿No encontraste lo que buscas?</h2>
        <p className="section-subtitle">
          Crea tu propia combinación seleccionando servicios individuales
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/servicios" className="btn btn-outline">
            Ver Servicios
          </Link>
          <Link to="/agendar" className="btn btn-primary">
            Agendar Cita
          </Link>
        </div>
      </section>
    </div>
  );
}

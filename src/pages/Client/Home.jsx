import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Home() {
  const { services, packages } = useApp();
  const activePackages = packages.filter((p) => p.active);

  return (
    <div>
      <section className="hero">
        <h1>Bienvenido a Zenia Center</h1>
        <p>
          Descubre la tranquilidad y el bienestar que mereces. Nuestros expertos
          terapeutas te acompañarán en un viaje de relajación y armonía.
        </p>
        <Link to="/servicios" className="btn btn-secondary btn-lg">
          Ver Servicios
        </Link>
      </section>

      <section className="section">
        <h2 className="section-title">Nuestros Servicios</h2>
        <p className="section-subtitle">
          Explora nuestra variedad de tratamientos diseñados para tu bienestar integral
        </p>
        <div className="services-grid">
          {services.map((service) => (
            <div className="card" key={service.id}>
              <img src={service.image} alt={service.name} className="card-image" />
              <div className="card-body">
                <h3 className="card-title">{service.name}</h3>
                <p className="card-text">{service.description}</p>
                <div className="card-price">
                  S/ {service.pricePerHour} <span>/ hora</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activePackages.length > 0 && (
        <section className="section">
          <h2 className="section-title">Paquetes Especiales</h2>
          <p className="section-subtitle">
            Combina servicios y ahorra con nuestros paquetes diseñados para ti
          </p>
          <div className="services-grid">
            {activePackages.map((pkg) => (
              <div className="card" key={pkg.id}>
                <img src={pkg.image} alt={pkg.name} className="card-image" />
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>{pkg.name}</h3>
                    <span className="badge badge-confirmed">
                      -{Math.round(((pkg.originalPrice - pkg.packagePrice) / pkg.originalPrice) * 100)}%
                    </span>
                  </div>
                  <p className="card-text">{pkg.description}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {pkg.hours}h | {pkg.serviceIds.length} servicios incluidos
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      S/ {pkg.originalPrice}
                    </span>
                    <div className="card-price">S/ {pkg.packagePrice}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section" style={{ background: 'var(--accent)', borderRadius: '0', maxWidth: '100%', padding: '3rem 2rem' }}>
        <h2 className="section-title">¿Listo para relajarte?</h2>
        <p className="section-subtitle">
          Agenda tu cita ahora y déjate consentir por nuestros profesionales
        </p>
        <div style={{ textAlign: 'center' }}>
          <Link to="/agendar" className="btn btn-primary btn-lg">
            Agendar mi Cita
          </Link>
        </div>
      </section>
    </div>
  );
}

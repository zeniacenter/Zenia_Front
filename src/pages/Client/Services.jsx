import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Services() {
  const { services, settings } = useApp();

  return (
    <div>
      <section className="hero" style={{ padding: '3rem 2rem' }}>
        <h1>Nuestros Servicios</h1>
        <p>Cada tratamiento es una experiencia única diseñada para restaurar tu equilibrio</p>
      </section>

      <section className="section">
        <div className="services-grid">
          {services.map((service) => (
            <div className="card" key={service.id}>
              <img src={service.image} alt={service.name} className="card-image" />
              <div className="card-body">
                <h3 className="card-title">{service.name}</h3>
                <p className="card-text">{service.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  {settings.priceVisible && (
                    <div className="card-price">
                      S/ {service.pricePerHour} <span>/ hora</span>
                    </div>
                  )}
                  <Link to="/agendar" className="btn btn-primary btn-sm">
                    Agendar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { motion, useInView } from 'framer-motion';
import { Sparkles, Heart, Shield, Clock, Star, ArrowRight, CheckCircle2 } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function AnimatedSection({ children, className, viewportMargin = '-80px', ...props }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: viewportMargin });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const benefits = [
  {
    icon: <Sparkles size={28} />,
    title: 'Terapeutas Certificados',
    desc: 'Profesionales con años de experiencia y certificaciones internacionales.',
  },
  {
    icon: <Heart size={28} />,
    title: 'Bienestar Integral',
    desc: 'Tratamientos diseñados para armonizar cuerpo, mente y espíritu.',
  },
  {
    icon: <Shield size={28} />,
    title: 'Ambiente Seguro',
    desc: 'Instalaciones de primer nivel con los más altos estándares de higiene.',
  },
  {
    icon: <Clock size={28} />,
    title: 'Horarios Flexibles',
    desc: 'Adaptamos nuestras agendas para encajar en tu rutina diaria.',
  },
];

const testimonials = [
  {
    name: 'María García',
    role: 'Cliente frecuente',
    text: 'Una experiencia transformadora. El masaje de relajación fue exactamente lo que necesitaba. El ambiente y el personal son excepcionales.',
    rating: 5,
  },
  {
    name: 'Carlos Mendoza',
    role: 'Cliente desde 2023',
    text: 'Los terapeutas son increíblemente capacitados. Cada visita supera la anterior. Zenia Center se ha convertido en mi lugar de bienestar.',
    rating: 5,
  },
  {
    name: 'Ana Rodríguez',
    role: 'Primera visita',
    text: 'Quedé impresionada por la calidad del servicio y la atención al detalle. Definitivamente volveré. El mejor centro de masajes de la ciudad.',
    rating: 5,
  },
];

export default function Home() {
  const { services, packages, therapists } = useApp();
  const activePackages = packages.filter((p) => p.active);
  const featuredTherapists = therapists.slice(0, 3);

  return (
    <div className="landing-page">
      {/* ═══════════ HERO ═══════════ */}
      <section id="inicio" className="hero-premium">
        <div className="hero-bg-pattern" />
        <div className="hero-glow" />
        <div className="hero-glow hero-glow-2" />

        <motion.div
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* <motion.div className="hero-badge" variants={fadeUp} custom={0}>
            <Sparkles size={14} />
            <span>Experiencia Premium de Bienestar</span>
          </motion.div>
 */}
          <motion.h1 className="hero-title" variants={fadeUp} custom={1}>
            Descubre la <span className="text-accent">Armonía</span>
            <br />que Mereces
          </motion.h1>

          <motion.p className="hero-subtitle" variants={fadeUp} custom={2}>
            Sumérgete en una experiencia de relajación única. Nuestros expertos
            terapeutas te guiarán en un viaje hacia el equilibrio perfecto entre
            cuerpo y mente.
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp} custom={3}>
            <Link to="/agendar" className="btn-hero-primary">
              <span>Reservar Experiencia</span>
              <ArrowRight size={18} />
            </Link>
            <a href="#servicios" className="btn-hero-secondary">
              Explorar Servicios
            </a>
          </motion.div>

          <motion.div className="hero-stats" variants={fadeUp} custom={4}>
            <div className="hero-stat">
              <span className="hero-stat-number">15+</span>
              <span className="hero-stat-label">Años de Experiencia</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">5,000+</span>
              <span className="hero-stat-label">Clientes Satisfechos</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">4.9</span>
              <span className="hero-stat-label">Calificación Promedio</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ BENEFITS ═══════════ */}
      <section id="beneficios" className="section-benefits">
        <div className="container-premium">
          <AnimatedSection className="section-header">
            <motion.span className="section-label" variants={fadeUp}>
              ¿Por qué elegirnos?
            </motion.span>
            <motion.h2 className="section-title-lg" variants={fadeUp}>
              Tu Bienestar es Nuestra <span className="text-accent">Prioridad</span>
            </motion.h2>
            <motion.p className="section-desc" variants={fadeUp}>
              Nos dedicamos a brindarte una experiencia excepcional en cada visita
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="benefits-grid" viewportMargin="-60px">
            {benefits.map((b, i) => (
              <motion.div className="benefit-card" key={i} variants={fadeUp} custom={i}>
                <div className="benefit-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ SERVICES ═══════════ */}
      <section id="servicios" className="section-services">
        <div className="container-premium">
          <AnimatedSection className="section-header">
            <motion.span className="section-label" variants={fadeUp}>
              Nuestros Servicios
            </motion.span>
            <motion.h2 className="section-title-lg" variants={fadeUp}>
              Tratamientos <span className="text-accent">Exclusivos</span>
            </motion.h2>
            <motion.p className="section-desc" variants={fadeUp}>
              Explora nuestra selección de servicios diseñados para tu bienestar integral
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="services-showcase" viewportMargin="-60px">
            {services.map((service, i) => (
              <motion.div
                className="service-card-premium"
                key={service.id}
                variants={fadeUp}
                custom={i}
              >
                <div className="service-image-wrapper">
                  <img src={service.image} alt={service.name} />
                  <div className="service-image-overlay" />
                </div>
                <div className="service-content">
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <div className="service-footer">
                    <div className="service-price">
                      <span className="price-from">Desde</span>
                      <span className="price-value">S/ {service.pricePerHour}</span>
                      <span className="price-unit">/ hora</span>
                    </div>
                    <Link to="/agendar" className="service-cta">
                      Reservar
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>
      {activePackages.length > 0 && (
        <section id="paquetes" className="section-packages">
          <div className="container-premium">
            <AnimatedSection className="section-header">
              <motion.span className="section-label" variants={fadeUp}>
                Ofertas Especiales
              </motion.span>
              <motion.h2 className="section-title-lg" variants={fadeUp}>
                Paquetes <span className="text-accent">Exclusivos</span>
              </motion.h2>
              <motion.p className="section-desc" variants={fadeUp}>
                Combina servicios y ahorra con nuestros paquetes diseñados especialmente para ti
              </motion.p>
            </AnimatedSection>

            <AnimatedSection className="packages-grid" viewportMargin="-60px">
              {activePackages.map((pkg, i) => (
                <motion.div
                  className="package-card-premium"
                  key={pkg.id}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="package-badge">
                    -{Math.round(((pkg.originalPrice - pkg.packagePrice) / pkg.originalPrice) * 100)}%
                  </div>
                  <div className="package-image-wrapper">
                    <img src={pkg.image} alt={pkg.name} />
                  </div>
                  <div className="package-content">
                    <h3>{pkg.name}</h3>
                    <p>{pkg.description}</p>
                    <div className="package-meta">
                      <span>{pkg.hours}h de duración</span>
                      <span>{pkg.serviceIds.length} servicios incluidos</span>
                    </div>
                    <div className="package-pricing">
                      <span className="package-original">S/ {pkg.originalPrice}</span>
                      <span className="package-price">S/ {pkg.packagePrice}</span>
                    </div>
                    <Link to="/agendar" className="btn-package-cta">
                      Reservar Paquete
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ═══════════ THERAPISTS ═══════════ */}
      {featuredTherapists.length > 0 && (
        <section id="equipo" className="section-therapists">
          <div className="container-premium">
            <AnimatedSection className="section-header">
              <motion.span className="section-label" variants={fadeUp}>
                Nuestro Equipo
              </motion.span>
              <motion.h2 className="section-title-lg" variants={fadeUp}>
                Expertos en <span className="text-accent">Bienestar</span>
              </motion.h2>
              <motion.p className="section-desc" variants={fadeUp}>
                Conoce a los profesionales que harán de tu experiencia algo inolvidable
              </motion.p>
            </AnimatedSection>

            <AnimatedSection className="therapists-showcase" viewportMargin="-60px">
              {featuredTherapists.map((therapist, i) => (
                <motion.div
                  className="therapist-card-premium"
                  key={therapist.id}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="therapist-image-wrapper">
                    <img src={therapist.image} alt={therapist.name} />
                    <div className="therapist-image-ring" />
                  </div>
                  <h3>{therapist.name}</h3>
                  <span className="therapist-specialty">{therapist.specialty}</span>
                  <p className="therapist-exp">{therapist.experience}</p>
                </motion.div>
              ))}
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonios" className="section-testimonials">
        <div className="container-premium">
          <AnimatedSection className="section-header">
            <motion.span className="section-label" variants={fadeUp}>
              Testimonios
            </motion.span>
            <motion.h2 className="section-title-lg" variants={fadeUp}>
              Lo que Dicen Nuestros <span className="text-accent">Clientes</span>
            </motion.h2>
          </AnimatedSection>

          <AnimatedSection className="testimonials-grid" viewportMargin="-60px">
            {testimonials.map((t, i) => (
              <motion.div
                className="testimonial-card"
                key={i}
                variants={fadeUp}
                custom={i}
              >
                <div className="testimonial-stars">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="section-cta-final">
        <div className="cta-final-bg" />
        <div className="container-premium">
          <AnimatedSection className="cta-final-content">
            <motion.h2 variants={fadeUp}>
              ¿Listo para Transformar tu Experiencia de Bienestar?
            </motion.h2>
            <motion.p variants={fadeUp}>
              Reserva ahora y descubre por qué somos el centro de masajes preferido por miles de clientes.
            </motion.p>
            <motion.div className="cta-final-actions" variants={fadeUp}>
              <Link to="/agendar" className="btn-cta-final">
                <span>Agendar mi Cita</span>
                <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div className="cta-final-features" variants={fadeUp}>
              <span><CheckCircle2 size={16} /> Cancelación gratuita</span>
              <span><CheckCircle2 size={16} /> Confirmación inmediata</span>
              <span><CheckCircle2 size={16} /> Soporte 24/7</span>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}

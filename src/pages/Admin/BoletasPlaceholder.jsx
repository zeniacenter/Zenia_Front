import { useParams, Link } from 'react-router-dom';

export default function BoletasPlaceholder() {
  const { id } = useParams();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{
        fontSize: '4rem', marginBottom: '1rem',
      }}>🚧</div>
      <h2 style={{ color: '#3D2E24', marginBottom: '0.5rem' }}>EN PROCESO DE IMPLEMENTACION :P</h2>
      <p style={{ color: '#A89888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        La emisión de boletas para la cita #{id} estará disponible pronto.
      </p>
      <Link
        to="/admin/citas"
        className="btn btn-primary"
        style={{ marginTop: '1.5rem' }}
      >
        Volver a Citas
      </Link>
    </div>
  );
}

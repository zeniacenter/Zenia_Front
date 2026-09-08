import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBF7F0',
          padding: '2rem',
          fontFamily: 'inherit',
        }}>
          <div style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
            <h2 style={{ color: '#3D2E24', marginBottom: '0.5rem' }}>Ocurrió un error inesperado</h2>
            <p style={{ color: '#6B5B4E', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Puedes volver al inicio y reintentar la operación.
            </p>
            <p style={{
              fontSize: '0.75rem', color: '#A89888', background: '#FFF',
              border: '1px solid #E8E0D6', borderRadius: '8px', padding: '0.6rem',
              marginBottom: '1rem', overflowWrap: 'anywhere', textAlign: 'left',
            }}>
              {String(this.state.error.message || this.state.error)}
            </p>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                background: '#C9944A', color: '#fff', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
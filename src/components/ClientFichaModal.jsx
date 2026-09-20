import { useState, useEffect, useCallback } from 'react';
import useEscClose from '../hooks/useEscClose';
import { personAPI } from '../services/api';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Percent,
  Calendar,
  Clock,
  Heart,
  AlertTriangle,
  Activity,
  FileText,
  Package as PackageIcon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function ClientFichaModal({
  open,
  clientId,
  onClose,
  onEdit,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('citas'); // 'citas' | 'paquetes' | 'clinica'
  const [statusFilter, setStatusFilter] = useState('todas');

  useEscClose(open, onClose);

  const fetchFicha = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await personAPI.get(clientId);
      setData(res.data);
    } catch (err) {
      console.error('Error cargando ficha del cliente:', err);
      setError(err.response?.data?.message || 'Error al cargar la ficha del cliente.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (open && clientId) {
      fetchFicha();
      setActiveTab('citas');
      setStatusFilter('todas');
    } else {
      setData(null);
    }
  }, [open, clientId, fetchFicha]);

  if (!open) return null;

  const client = data?.client || {};
  const stats = data?.stats || {};
  const packages = data?.packages || [];
  const appointments = data?.appointments || [];

  // Initials for avatar
  const initials = [client.name?.[0], client.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'C';

  // Filtered appointments
  const filteredAppointments = appointments.filter((app) => {
    const st = (app.status || '').toLowerCase();
    if (statusFilter === 'todas') return true;
    if (statusFilter === 'realizadas') return st === 'realizada';
    if (statusFilter === 'agendadas') return st === 'confirmada' || st === 'pendiente';
    if (statusFilter === 'canceladas_inasistencias') return st === 'cancelada' || st === 'no_asistio' || st === 'postergada';
    return true;
  });

  const getStatusBadge = (status) => {
    const st = (status || '').toLowerCase();
    if (st === 'realizada') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 600 }}>
          <CheckCircle2 size={12} /> Realizada
        </span>
      );
    }
    if (st === 'confirmada' || st === 'pendiente') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 600 }}>
          <Clock size={12} /> Agendada
        </span>
      );
    }
    if (st === 'no_asistio') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 600 }}>
          <AlertCircle size={12} /> No asistió
        </span>
      );
    }
    if (st === 'cancelada') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#F3F4F6', color: '#6B7280', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 600 }}>
          <XCircle size={12} /> Cancelada
        </span>
      );
    }
    return (
      <span style={{ background: '#F3F4F6', color: '#4B5563', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 500 }}>
        {status}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const st = (status || '').toLowerCase();
    if (st === 'pagado') {
      return <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 7px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600 }}>Pagado</span>;
    }
    if (st === 'parcial') {
      return <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600 }}>Parcial</span>;
    }
    return <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 7px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600 }}>Pendiente</span>;
  };

  const cleanPhone = (client.phone || '').replace(/\D/g, '');
  const waUrl = cleanPhone ? `https://wa.me/51${cleanPhone.length === 9 ? cleanPhone : cleanPhone}` : null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal"
        style={{
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          background: '#FFFFFF',
        }}
      >
        {/* Top Hero / Client Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #3D2310 0%, #5C381E 100%)',
            color: '#FFFFFF',
            padding: '1.4rem 1.75rem',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1.25rem',
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            &times;
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
            {/* Initials Avatar */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #A88358 0%, #7A5730 100%)',
                color: '#FFFFFF',
                fontSize: '1.45rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid rgba(255,255,255,0.25)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            {/* Client Main Details */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {[client.name, client.last_name].filter(Boolean).join(' ') || 'Cliente'}
                </h2>
                {Number(client.discount_percent) > 0 && (
                  <span
                    style={{
                      background: '#FDF3E7',
                      color: '#8C5A20',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Percent size={12} /> {Number(client.discount_percent)}% Descuento VIP
                  </span>
                )}
                {client.allergies && (
                  <span
                    style={{
                      background: '#FEE2E2',
                      color: '#991B1B',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <AlertTriangle size={12} /> Alergias
                  </span>
                )}
              </div>

              {/* Meta tags: DNI, phone, email, address */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  marginTop: '0.5rem',
                  fontSize: '0.82rem',
                  color: '#E8DCD0',
                  flexWrap: 'wrap',
                }}
              >
                {client.dni && (
                  <span>
                    <strong style={{ color: '#FFFFFF' }}>DNI:</strong> {client.dni}
                  </span>
                )}
                {client.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Phone size={13} />
                    <span>{client.phone}</span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#4ADE80',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '2px',
                        }}
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </span>
                )}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#E8DCD0',
                      textDecoration: 'none',
                    }}
                  >
                    <Mail size={13} />
                    <span>{client.email}</span>
                  </a>
                )}
                {client.address && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} />
                    <span>{client.address}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Edit button */}
            <div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onEdit?.(client, 'general')}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                }}
              >
                <Edit3 size={15} />
                Editar Perfil / Ficha
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#8C6B45' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #E8E0D6', borderTopColor: '#8C6B45', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6B5B4E' }}>Cargando ficha histórica del cliente...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#B85C4C' }}>
            <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
            <p>{error}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={fetchFicha}>Reintentar</button>
          </div>
        ) : (
          <>
            {/* KPI Stats Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                padding: '0.9rem 1.75rem',
                background: '#FAF7F2',
                borderBottom: '1px solid #E8E0D6',
              }}
            >
              <div style={{ background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #EDE6DD' }}>
                <span style={{ fontSize: '0.72rem', color: '#7D6B5C', fontWeight: 600, display: 'block' }}>Total Citas</span>
                <strong style={{ fontSize: '1.25rem', color: '#3D2310' }}>{stats.total_appointments || 0}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #EDE6DD' }}>
                <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600, display: 'block' }}>Realizadas</span>
                <strong style={{ fontSize: '1.25rem', color: '#15803D' }}>{stats.completed_appointments || 0}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #EDE6DD' }}>
                <span style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600, display: 'block' }}>Agendadas</span>
                <strong style={{ fontSize: '1.25rem', color: '#B45309' }}>{stats.scheduled_appointments || 0}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #EDE6DD' }}>
                <span style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 600, display: 'block' }}>Inasistencias / Canc.</span>
                <strong style={{ fontSize: '1.25rem', color: '#B91C1C' }}>
                  {stats.no_show_appointments || 0} / {stats.cancelled_appointments || 0}
                </strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #EDE6DD' }}>
                <span style={{ fontSize: '0.72rem', color: '#7D6B5C', fontWeight: 600, display: 'block' }}>Cumplimiento</span>
                <strong style={{ fontSize: '1.25rem', color: '#3D2310' }}>{stats.attendance_rate || 100}%</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #EDE6DD' }}>
                <span style={{ fontSize: '0.72rem', color: '#7D6B5C', fontWeight: 600, display: 'block' }}>Total Invertido</span>
                <strong style={{ fontSize: '1.2rem', color: '#8C6B45' }}>
                  S/ {(stats.total_spent || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #E8E0D6',
                background: '#FFFFFF',
                padding: '0 1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('citas')}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'citas' ? '3px solid #8C6B45' : '3px solid transparent',
                  color: activeTab === 'citas' ? '#4A2E18' : '#7D6B5C',
                  fontWeight: activeTab === 'citas' ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Calendar size={16} />
                Historial de Citas ({appointments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paquetes')}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'paquetes' ? '3px solid #8C6B45' : '3px solid transparent',
                  color: activeTab === 'paquetes' ? '#4A2E18' : '#7D6B5C',
                  fontWeight: activeTab === 'paquetes' ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <PackageIcon size={16} />
                Paquetes y Sesiones ({packages.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('clinica')}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'clinica' ? '3px solid #8C6B45' : '3px solid transparent',
                  color: activeTab === 'clinica' ? '#4A2E18' : '#7D6B5C',
                  fontWeight: activeTab === 'clinica' ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Heart size={16} color={client.allergies ? '#B85C4C' : undefined} />
                Ficha Clínica & Preferencias
                {client.allergies && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B85C4C' }} />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem', background: '#FAF9F7' }}>
              {/* TAB 1: CITAS */}
              {activeTab === 'citas' && (
                <div>
                  {/* Status Filters */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'todas', label: `Todas (${appointments.length})` },
                      { id: 'realizadas', label: `Realizadas (${stats.completed_appointments || 0})` },
                      { id: 'agendadas', label: `Agendadas (${stats.scheduled_appointments || 0})` },
                      { id: 'canceladas_inasistencias', label: `Canceladas / Inasistencias (${(stats.cancelled_appointments || 0) + (stats.no_show_appointments || 0)})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.35rem 0.8rem',
                          borderRadius: '20px',
                          border: statusFilter === f.id ? '1px solid #8C6B45' : '1px solid #DDD2C4',
                          background: statusFilter === f.id ? '#8C6B45' : '#FFFFFF',
                          color: statusFilter === f.id ? '#FFFFFF' : '#6B5B4E',
                          fontWeight: statusFilter === f.id ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {filteredAppointments.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#A89888', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #EDE6DD' }}>
                      <Calendar size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No se encontraron citas en este filtro.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {filteredAppointments.map((app) => (
                        <div
                          key={app.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #EDE6DD',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                          }}
                        >
                          {/* Row 1: Date, Status, Price */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  background: '#FAF3EA',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '8px',
                                  border: '1px solid #EAE0D3',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: '#4A2E18',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Calendar size={14} />
                                {app.date}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  color: '#6B5B4E',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <Clock size={13} />
                                {app.start_time?.slice(0, 5)} - {app.end_time?.slice(0, 5)} ({app.hours}h)
                              </div>

                              {app.session_number && (
                                <span
                                  style={{
                                    background: '#F0F9FF',
                                    color: '#0369A1',
                                    border: '1px solid #BAE6FD',
                                    padding: '2px 7px',
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  Sesión {app.session_number} / {app.total_sessions || '?'}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              {getStatusBadge(app.status)}
                              {getPaymentBadge(app.payment_status)}
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#4A2E18' }}>
                                S/ {(app.total_price || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Services, Therapist, Branch, Cabin */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.83rem',
                              color: '#5C4A3E',
                              paddingTop: '0.4rem',
                              borderTop: '1px dashed #EDE6DD',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <strong>Servicio(s): </strong>
                              {app.services?.length > 0
                                ? app.services.map((s) => s.name).join(', ')
                                : app.package?.name || 'Servicio estándar'}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#7D6B5C', fontSize: '0.78rem' }}>
                              {app.therapist && (
                                <span>
                                  <strong>Terapeuta:</strong> {app.therapist.name}
                                </span>
                              )}
                              {app.branch && (
                                <span>
                                  <strong>Sede:</strong> {app.branch.name}
                                </span>
                              )}
                              {app.cabin && (
                                <span>
                                  <strong>Cabina:</strong> {app.cabin.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Notes / Cancellation Reason */}
                          {app.notes && (
                            <div style={{ fontSize: '0.76rem', color: '#7D6B5C', background: '#FAF7F2', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                              <strong>Nota:</strong> {app.notes}
                            </div>
                          )}
                          {app.cancellation_reason && (
                            <div style={{ fontSize: '0.76rem', color: '#B91C1C', background: '#FEE2E2', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                              <strong>Motivo cancelación:</strong> {app.cancellation_reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PAQUETES */}
              {activeTab === 'paquetes' && (
                <div>
                  {packages.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#A89888', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #EDE6DD' }}>
                      <PackageIcon size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>El cliente no tiene paquetes o multi-sesiones registrados.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {packages.map((pkg, idx) => {
                        const pct = pkg.total_sessions > 0 ? Math.round((pkg.sessions_completed / pkg.total_sessions) * 100) : 0;
                        return (
                          <div
                            key={pkg.group_id || idx}
                            style={{
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              border: '1px solid #EDE6DD',
                              padding: '1.25rem',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#4A2E18', fontWeight: 700 }}>
                                  {pkg.package_name}
                                </h4>
                                <span style={{ fontSize: '0.75rem', color: '#8C6B45', fontWeight: 600 }}>
                                  Grupo #{pkg.group_id?.slice(0, 8) || 'Multi-sesión'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                {pkg.is_completed ? (
                                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 700 }}>
                                    ✓ Completado ({pkg.sessions_completed}/{pkg.total_sessions})
                                  </span>
                                ) : (
                                  <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 700 }}>
                                    En curso ({pkg.sessions_completed}/{pkg.total_sessions} completadas)
                                  </span>
                                )}
                                {getPaymentBadge(pkg.payment_status)}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#6B5B4E', marginBottom: '0.3rem' }}>
                                <span>Progreso de sesiones ({pct}%)</span>
                                <span>
                                  {pkg.sessions_completed} realizadas • {pkg.sessions_pending} agendadas • {pkg.sessions_remaining_to_schedule} por agendar
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#EDE6DD', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#8C6B45', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                              </div>
                            </div>

                            {/* Sessions table */}
                            <div style={{ border: '1px solid #F0EAE2', borderRadius: '8px', overflow: 'hidden' }}>
                              <table className="table" style={{ margin: 0, fontSize: '0.8rem' }}>
                                <thead>
                                  <tr style={{ background: '#FAF7F2' }}>
                                    <th style={{ padding: '0.45rem 0.75rem' }}>Sesión</th>
                                    <th style={{ padding: '0.45rem 0.75rem' }}>Fecha</th>
                                    <th style={{ padding: '0.45rem 0.75rem' }}>Horario</th>
                                    <th style={{ padding: '0.45rem 0.75rem' }}>Terapeuta</th>
                                    <th style={{ padding: '0.45rem 0.75rem' }}>Sede</th>
                                    <th style={{ padding: '0.45rem 0.75rem' }}>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pkg.sessions?.map((s) => (
                                    <tr key={s.id}>
                                      <td style={{ fontWeight: 600, padding: '0.45rem 0.75rem' }}>
                                        Sesión {s.session_number || '-'}
                                      </td>
                                      <td style={{ padding: '0.45rem 0.75rem' }}>{s.date || 'Pendiente'}</td>
                                      <td style={{ padding: '0.45rem 0.75rem' }}>
                                        {s.start_time ? `${s.start_time.slice(0, 5)} - ${s.end_time?.slice(0, 5)}` : '-'}
                                      </td>
                                      <td style={{ padding: '0.45rem 0.75rem' }}>{s.therapist_name || '-'}</td>
                                      <td style={{ padding: '0.45rem 0.75rem' }}>{s.branch_name || '-'}</td>
                                      <td style={{ padding: '0.45rem 0.75rem' }}>{getStatusBadge(s.status)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FICHA CLÍNICA & PREFERENCIAS (Clean editorial layout without cards on cards) */}
              {activeTab === 'clinica' && (
                <div style={{ padding: '0.5rem 0.5rem 1.5rem 0.5rem' }}>
                  {/* 1. Alergias & Sensibilidades */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <AlertTriangle size={17} color={client.allergies ? '#DC2626' : '#8C6B45'} />
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: client.allergies ? '#991B1B' : '#2A1B10' }}>
                        Alergias o sensibilidades a productos
                      </h4>
                    </div>

                    {client.allergies ? (
                      <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#991B1B', fontWeight: 600, lineHeight: 1.45 }}>
                          ⚠️ {client.allergies}
                        </p>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#B91C1C', marginTop: '0.35rem' }}>
                          Aviso preventivo visible para terapeutas antes de aplicar aceites o esencias.
                        </span>
                      </div>
                    ) : (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#7D6B5C' }}>
                        Sin alergias o contraindicaciones registradas para este cliente.
                      </p>
                    )}
                  </div>

                  <hr style={{ height: '1px', background: '#EDE7DE', border: 'none', margin: '1.75rem 0' }} />

                  {/* 2. Zonas de Dolor Frecuente & Tensión */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <Activity size={17} color="#8C6B45" />
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#2A1B10' }}>
                        Zonas de dolor frecuente o tensión muscular
                      </h4>
                    </div>

                    {client.frequent_pain_zone ? (
                      <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {client.frequent_pain_zone.split(',').map((zone, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#FAF3EA',
                              color: '#5C381E',
                              border: '1px solid #E5D5C3',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                            }}
                          >
                            🎯 {zone.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#7D6B5C' }}>
                        No se han especificado zonas de molestia o sobrecarga corporal habituales.
                      </p>
                    )}
                  </div>

                  <hr style={{ height: '1px', background: '#EDE7DE', border: 'none', margin: '1.75rem 0' }} />

                  {/* 3. Presión de Masaje Preferida */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <Heart size={17} color="#8C6B45" />
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#2A1B10' }}>
                        Presión de masaje preferida
                      </h4>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      {client.preferred_pressure ? (
                        <span
                          style={{
                            background: '#FAF5EE',
                            color: '#4A2E18',
                            border: '1.5px solid #8C6B45',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'inline-block',
                          }}
                        >
                          💆 {client.preferred_pressure}
                        </span>
                      ) : (
                        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#7D6B5C' }}>
                          Sin preferencia de presión registrada (se coordina durante la sesión).
                        </p>
                      )}
                    </div>
                  </div>

                  <hr style={{ height: '1px', background: '#EDE7DE', border: 'none', margin: '1.75rem 0' }} />

                  {/* 4. Notas Clínicas y Antecedentes */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <FileText size={17} color="#8C6B45" />
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#2A1B10' }}>
                        Notas clínicas y antecedentes médicos
                      </h4>
                    </div>

                    {client.clinical_notes ? (
                      <p
                        style={{
                          margin: '0.5rem 0 0 0',
                          fontSize: '0.86rem',
                          color: '#2A1B10',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                        }}
                      >
                        {client.clinical_notes}
                      </p>
                    ) : (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#7D6B5C' }}>
                        Sin observaciones o antecedentes clínicos adicionales registrados.
                      </p>
                    )}
                  </div>

                  <div style={{ paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => onEdit?.(client, 'clinica')}
                      style={{
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#FFFFFF',
                      }}
                    >
                      ✏️ Modificar Ficha Clínica
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Close bar */}
            <div
              style={{
                padding: '0.85rem 1.75rem',
                borderTop: '1px solid #E8E0D6',
                background: '#FAF7F2',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                style={{ fontSize: '0.86rem', minWidth: '100px' }}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import useEscClose from '../hooks/useEscClose';
import { personAPI } from '../services/api';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Percent,
  Heart,
  AlertTriangle,
  Activity,
  FileText,
  Check,
  Sparkles,
  Trash2,
} from 'lucide-react';

const PRESSURE_OPTIONS = [
  { id: 'Suave / Relajante', label: 'Suave', desc: 'Presión ligera y sedante' },
  { id: 'Media / Equilibrada', label: 'Media', desc: 'Equilibrio y alivio' },
  { id: 'Firme / Intensa', label: 'Firme', desc: 'Tensión acumulada' },
  { id: 'Fuerte / Descontracturante Profunda', label: 'Profunda', desc: 'Descontracturante' },
];

const QUICK_BODY_ZONES = [
  'Cervical / Cuello',
  'Trapecios',
  'Espalda Alta',
  'Zona Lumbar',
  'Hombros',
  'Piernas y Pies',
];

const INITIAL_FORM = {
  name: '',
  last_name: '',
  dni: '',
  phone: '',
  email: '',
  address: '',
  discount_percent: 0,
  allergies: '',
  frequent_pain_zone: '',
  preferred_pressure: '',
  clinical_notes: '',
};

export default function ClientEditModal({
  open,
  client = null,
  isCreating = false,
  initialTab = 'general',
  onClose,
  onSaved,
  onDelete,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState(initialTab || 'general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEscClose(open && !scopeModalOpen, onClose);
  useEscClose(scopeModalOpen, () => setScopeModalOpen(false));

  useEffect(() => {
    if (open) {
      setError('');
      setScopeModalOpen(false);
      setPendingPayload(null);
      setActiveTab(initialTab || 'general');
      if (client && !isCreating) {
        setForm({
          name: client.name || '',
          last_name: client.last_name || '',
          dni: client.dni || '',
          phone: client.phone || '',
          email: client.email || '',
          address: client.address || '',
          discount_percent: client.discount_percent != null ? Number(client.discount_percent) : 0,
          allergies: client.allergies || '',
          frequent_pain_zone: client.frequent_pain_zone || '',
          preferred_pressure: client.preferred_pressure || '',
          clinical_notes: client.clinical_notes || '',
        });
      } else {
        setForm({ ...INITIAL_FORM });
      }
    }
  }, [open, client, isCreating, initialTab]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleZone = (zone) => {
    const current = form.frequent_pain_zone
      ? form.frequent_pain_zone.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let updated;
    if (current.includes(zone)) {
      updated = current.filter((z) => z !== zone);
    } else {
      updated = [...current, zone];
    }
    handleChange('frequent_pain_zone', updated.join(', '));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (saving) return;
    setError('');

    if (!form.name.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!form.phone.trim()) {
      setError('El teléfono del cliente es obligatorio.');
      return;
    }

    const newDiscount = Math.max(0, Math.min(100, parseFloat(form.discount_percent) || 0));
    const oldDiscount = client?.discount_percent != null ? Number(client.discount_percent) : 0;

    const basePayload = {
      name: form.name.trim(),
      last_name: form.last_name.trim() || null,
      dni: form.dni.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      discount_percent: newDiscount,
      allergies: form.allergies.trim() || null,
      frequent_pain_zone: form.frequent_pain_zone.trim() || null,
      preferred_pressure: form.preferred_pressure.trim() || null,
      clinical_notes: form.clinical_notes.trim() || null,
    };

    // Si es edición de un cliente existente y se modificó el descuento, preguntar si aplica a futuras o a todas
    if (!isCreating && client && newDiscount !== oldDiscount) {
      setPendingPayload(basePayload);
      setScopeModalOpen(true);
      return;
    }

    await doSave(basePayload);
  };

  const doSave = async (payloadWithScope) => {
    setSaving(true);
    setError('');
    try {
      let res;
      if (isCreating) {
        res = await personAPI.create(payloadWithScope);
      } else {
        res = await personAPI.update(client.id, payloadWithScope);
      }

      onSaved?.(res.data);
      setScopeModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error guardando cliente:', err);
      const msg =
        err.response?.data?.message ||
        (isCreating ? 'Error al registrar el cliente.' : 'Error al guardar los cambios.');
      setError(msg);
      setScopeModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid #DCD5CB',
    background: '#FFFFFF',
    color: '#2A1B10',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#4A3B30',
    marginBottom: '0.35rem',
  };

  const sectionHeadingStyle = {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: '#2A1B10',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    marginBottom: '0.2rem',
  };

  const sectionSubtextStyle = {
    fontSize: '0.78rem',
    color: '#7D6B5C',
    margin: '0 0 0.85rem 0',
    lineHeight: 1.4,
  };

  const dividerStyle = {
    height: '1px',
    background: '#EDE7DE',
    border: 'none',
    margin: '2.2rem 0',
  };

  const currentZones = form.frequent_pain_zone
    ? form.frequent_pain_zone.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(30, 20, 12, 0.45)' }}>
      <div
        className="modal"
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(35, 20, 10, 0.25)',
          background: '#FFFFFF',
          border: '1px solid #EBE4D8',
        }}
      >
        {/* Header: Clean, quiet, elegant without heavy banner */}
        <div
          style={{
            padding: '1.4rem 1.75rem 1rem 1.75rem',
            borderBottom: '1px solid #EDE7DE',
            background: '#FAF8F5',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8C6B45',
                fontWeight: 700,
                display: 'block',
                marginBottom: '0.2rem',
              }}
            >
              {isCreating ? 'Nuevo Registro' : 'Expediente Terapéutico'}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2A1B10', fontWeight: 700 }}>
              {isCreating ? 'Registrar nuevo cliente' : `Editar perfil: ${client?.name || ''} ${client?.last_name || ''}`}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#7D6B5C' }}>
              {isCreating
                ? 'Ingresa los datos personales, beneficios de fidelización y notas para los terapeutas.'
                : 'Modifica la información de contacto, descuentos y ficha clínica del cliente.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8C7B6D',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: '8px',
            }}
            title="Cerrar"
          >
            &times;
          </button>
        </div>

        {/* Tab switcher: Subtle, clean segmented line */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #EDE7DE',
            background: '#FFFFFF',
            padding: '0 1.75rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            style={{
              padding: '0.85rem 0.5rem',
              marginRight: '1.75rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2.5px solid #8C6B45' : '2.5px solid transparent',
              color: activeTab === 'general' ? '#2A1B10' : '#8C7B6D',
              fontWeight: activeTab === 'general' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
          >
            <User size={15} color={activeTab === 'general' ? '#8C6B45' : '#8C7B6D'} />
            Datos Personales y Contacto
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinica')}
            style={{
              padding: '0.85rem 0.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'clinica' ? '2.5px solid #8C6B45' : '2.5px solid transparent',
              color: activeTab === 'clinica' ? '#2A1B10' : '#8C7B6D',
              fontWeight: activeTab === 'clinica' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
          >
            <Heart size={15} color={form.allergies ? '#B91C1C' : activeTab === 'clinica' ? '#8C6B45' : '#8C7B6D'} />
            Ficha Clínica y Preferencias
            {form.allergies && (
              <span
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}
              >
                Alergia
              </span>
            )}
          </button>
        </div>

        {/* Form Body: Pure white canvas, ample vertical rhythm, NO cards-on-cards */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#991B1B',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} color="#DC2626" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: DATOS PERSONALES & CONTACTO (No nested cards) */}
            {activeTab === 'general' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1fr', gap: '1.25rem', marginBottom: '1.35rem' }}>
                  <div>
                    <label style={labelStyle}>Nombre *</label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="Ej. María"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Apellido</label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="Ej. Gómez"
                      value={form.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>DNI / Doc. Identidad</label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="45678912"
                      maxLength={15}
                      value={form.dni}
                      onChange={(e) => handleChange('dni', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.25rem', marginBottom: '1.35rem' }}>
                  <div>
                    <label style={labelStyle}>Teléfono celular *</label>
                    <input
                      type="tel"
                      style={inputStyle}
                      placeholder="999888777"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Correo electrónico</label>
                    <input
                      type="email"
                      style={inputStyle}
                      placeholder="cliente@ejemplo.com"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={labelStyle}>Dirección domiciliaria</label>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="Av. Las Camelias 450, San Isidro"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                {/* Clean divider before discount section */}
                <hr style={dividerStyle} />

                {/* Fidelización: Integrated cleanly without a card box */}
                <div>
                  <h4 style={sectionHeadingStyle}>
                    <Percent size={15} color="#8C6B45" />
                    Beneficio de fidelización permanente
                  </h4>
                  <p style={sectionSubtextStyle}>
                    Porcentaje de descuento asignado al cliente que se calculará automáticamente en cada nueva cita.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ position: 'relative', width: '130px' }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        style={{ ...inputStyle, paddingRight: '2rem', fontWeight: 600 }}
                        placeholder="0"
                        value={form.discount_percent}
                        onChange={(e) => handleChange('discount_percent', e.target.value)}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#7D6B5C',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        %
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#7D6B5C' }}>
                      {Number(form.discount_percent) > 0
                        ? `El cliente goza de un ${Number(form.discount_percent)}% de descuento sobre servicios individuales.`
                        : 'Coloca 0 si el cliente no cuenta con tarifa preferencial permanente.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FICHA CLÍNICA & PREFERENCIAS (Spacious, elegant flow, zero card nesting) */}
            {activeTab === 'clinica' && (
              <div style={{ padding: '0.25rem 0' }}>
                {/* 1. Alergias y Contraindicaciones */}
                <div>
                  <h4 style={{ ...sectionHeadingStyle, color: form.allergies ? '#991B1B' : '#2A1B10' }}>
                    <AlertTriangle size={16} color={form.allergies ? '#DC2626' : '#8C6B45'} />
                    Alergias o sensibilidades a productos
                  </h4>
                  <p style={sectionSubtextStyle}>
                    Especifica si tiene intolerancia a aceites esenciales de almendras, eucalipto, aromas cítricos o cremas específicas.
                  </p>
                  <input
                    type="text"
                    style={{
                      ...inputStyle,
                      borderColor: form.allergies ? '#FCA5A5' : '#DCD5CB',
                      background: form.allergies ? '#FFFBFB' : '#FFFFFF',
                    }}
                    placeholder="Ej. Alergia a aceites cítricos, piel atópica a cremas mentoladas..."
                    value={form.allergies}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                  />
                  {form.allergies && (
                    <span style={{ display: 'block', fontSize: '0.74rem', color: '#991B1B', marginTop: '0.4rem', fontWeight: 500 }}>
                      ⚠️ Este aviso se mostrará destacado a la terapeuta antes de la sesión.
                    </span>
                  )}
                </div>

                <hr style={dividerStyle} />

                {/* 2. Zonas de Dolor Frecuente & Tensión */}
                <div>
                  <h4 style={sectionHeadingStyle}>
                    <Activity size={16} color="#8C6B45" />
                    Zonas de dolor frecuente o tensión muscular
                  </h4>
                  <p style={sectionSubtextStyle}>
                    Áreas donde la persona suele presentar mayor sobrecarga postural o molestia frecuente.
                  </p>
                  <input
                    type="text"
                    style={{ ...inputStyle, marginBottom: '0.85rem' }}
                    placeholder="Ej. Cervical, lumbar, contractura en trapecios..."
                    value={form.frequent_pain_zone}
                    onChange={(e) => handleChange('frequent_pain_zone', e.target.value)}
                  />

                  {/* Clean toggleable chips without cards */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.74rem', color: '#8C7B6D', marginRight: '0.2rem' }}>
                      Sugerencias rápidas:
                    </span>
                    {QUICK_BODY_ZONES.map((zone) => {
                      const isSelected = currentZones.includes(zone);
                      return (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => handleToggleZone(zone)}
                          style={{
                            fontSize: '0.74rem',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: isSelected ? '1px solid #8C6B45' : '1px solid #E0D7CC',
                            background: isSelected ? '#FAF3EA' : '#FFFFFF',
                            color: isSelected ? '#5C381E' : '#6B5B4E',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {zone}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr style={dividerStyle} />

                {/* 3. Nivel de Presión Preferida: Segmented selector without card box */}
                <div>
                  <h4 style={sectionHeadingStyle}>
                    <Heart size={16} color="#8C6B45" />
                    Presión de masaje preferida
                  </h4>
                  <p style={sectionSubtextStyle}>
                    Intensidad habitual solicitada para adaptar la técnica desde el inicio del servicio.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                    {PRESSURE_OPTIONS.map((opt) => {
                      const isSelected = form.preferred_pressure === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleChange('preferred_pressure', opt.id)}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #8C6B45' : '1px solid #E5DDD3',
                            background: isSelected ? '#FAF5EE' : '#FFFFFF',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#3D2310' : '#4A3B30',
                            }}
                          >
                            {opt.label}
                          </span>
                          <span style={{ fontSize: '0.71rem', color: isSelected ? '#7A5730' : '#9E8D7F' }}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr style={dividerStyle} />

                {/* 4. Notas Clínicas & Antecedentes */}
                <div>
                  <h4 style={sectionHeadingStyle}>
                    <FileText size={16} color="#8C6B45" />
                    Notas clínicas y antecedentes médicos
                  </h4>
                  <p style={sectionSubtextStyle}>
                    Registro de cirugías recientes, hipertensión, prótesis, embarazo o recomendaciones especiales para el equipo.
                  </p>
                  <textarea
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '95px', lineHeight: 1.5 }}
                    placeholder="Escribe aquí observaciones relevantes para el equipo terapéutico..."
                    value={form.clinical_notes}
                    onChange={(e) => handleChange('clinical_notes', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions: Clean border, solid baseline */}
          <div
            style={{
              padding: '1.1rem 1.75rem',
              borderTop: '1px solid #EDE7DE',
              background: '#FAF8F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={saving}
                style={{ fontSize: '0.84rem', background: '#FFFFFF' }}
              >
                Cancelar
              </button>

              {!isCreating && onDelete && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onDelete(client)}
                  disabled={saving}
                  style={{
                    fontSize: '0.84rem',
                    color: '#B85C4C',
                    borderColor: '#F5D5D0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FCEEED';
                    e.currentTarget.style.borderColor = '#B85C4C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#F5D5D0';
                  }}
                  title="Eliminar cliente"
                >
                  <Trash2 size={14} />
                  Eliminar cliente
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              {activeTab === 'general' ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveTab('clinica')}
                  style={{ fontSize: '0.84rem', background: '#FFFFFF' }}
                >
                  Ficha Clínica & Preferencias →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveTab('general')}
                  style={{ fontSize: '0.84rem', background: '#FFFFFF' }}
                >
                  ← Datos Personales
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 600,
                }}
              >
                <Check size={16} />
                {saving ? 'Guardando...' : isCreating ? 'Crear Cliente' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {scopeModalOpen && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 1300,
            backgroundColor: 'rgba(30, 20, 12, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: '490px',
              width: '92%',
              borderRadius: '16px',
              padding: '1.75rem',
              background: '#FFFFFF',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              border: '1px solid #EDE7DE',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#FDF3E7',
                  color: '#8C6B45',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Percent size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#2A1B10', fontWeight: 700 }}>
                  Aplicar Descuento
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#7D6B5C' }}>
                  {client?.name} {client?.last_name || ''}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#4A3B30', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Has configurado un descuento del <strong>{pendingPayload?.discount_percent}%</strong>. ¿Deseas que este descuento aplique solo en citas futuras o en todas sus citas?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  border: '1.5px solid #DCD5CB',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => doSave({ ...pendingPayload, discount_scope: 'future' })}
                disabled={saving}
              >
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#2A1B10' }}>
                  📅 Solo en citas futuras
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7D6B5C' }}>
                  Aplica únicamente a las nuevas citas que se agenden de aquí en adelante. Las citas actuales no cambiarán.
                </div>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => doSave({ ...pendingPayload, discount_scope: 'all' })}
                disabled={saving}
              >
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF' }}>
                  ✨ En todas sus citas
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.88)' }}>
                  Aplica a citas futuras y actualiza el precio de las citas existentes que aún no han sido facturadas.
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.85rem', color: '#888' }}
                onClick={() => setScopeModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

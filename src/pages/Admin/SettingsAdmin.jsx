import { useApp } from '../../context/AppContext';

const HOUR_SELECT_OPTIONS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

export default function SettingsAdmin() {
  const { settings, updateSettings } = useApp();

  const handleWorkStart = (value) => {
    const updates = { workStart: value };
    if (value >= settings.workEnd) updates.workEnd = `${String(Math.min(23, parseInt(value, 10) + 1)).padStart(2, '0')}:00`;
    updateSettings(updates);
  };

  const handleWorkEnd = (value) => {
    const updates = { workEnd: value };
    if (value <= settings.workStart) updates.workStart = `${String(Math.max(0, parseInt(value, 10) - 1)).padStart(2, '0')}:00`;
    updateSettings(updates);
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Configuración</h2>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '600px' }}>
        <div className="settings-group">
          <div className="settings-row">
            <div className="settings-info">
              <h3>Mostrar Precios</h3>
              <p>Habilitar o deshabilitar la visualización de precios en las páginas del cliente (servicios, paquetes, agendar cita).</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.priceVisible}
                onChange={(e) => updateSettings({ priceVisible: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-row">
            <div className="settings-info">
              <h3>Selección de Cabina Obligatoria</h3>
              <p>Si está activado, el cliente debe elegir una cabina al agendar cita. Si está desactivado, la cabina es opcional.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.cabinRequired}
                onChange={(e) => updateSettings({ cabinRequired: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-row">
            <div className="settings-info">
              <h3>Selección de Sede Obligatoria</h3>
              <p>Si está activado, el cliente debe elegir una sede al agendar cita. Si está desactivado, la sede es opcional.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.branchRequired}
                onChange={(e) => updateSettings({ branchRequired: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-row">
            <div className="settings-info">
              <h3>Horario de Trabajo</h3>
              <p>Define la hora de inicio y el límite de la jornada laboral para los horarios de los terapeutas y el calendario del dashboard.</p>
              <p style={{ marginTop: '0.35rem', fontWeight: 600, color: '#8B6520' }}>
                {settings.workStart} - {settings.workEnd}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <select
                value={settings.workStart}
                onChange={(e) => handleWorkStart(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', color: '#3D2E24', fontSize: '0.85rem', outline: 'none' }}
              >
                {HOUR_SELECT_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span style={{ color: '#A89888', fontSize: '0.82rem' }}>a</span>
              <select
                value={settings.workEnd}
                onChange={(e) => handleWorkEnd(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', color: '#3D2E24', fontSize: '0.85rem', outline: 'none' }}
              >
                {HOUR_SELECT_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

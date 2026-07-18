import { useApp } from '../../context/AppContext';

export default function SettingsAdmin() {
  const { settings, updateSettings } = useApp();

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
        </div>
      </div>
    </div>
  );
}

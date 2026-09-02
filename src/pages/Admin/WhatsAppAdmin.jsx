import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, RefreshCw, Wifi, WifiOff, Send, MessageSquare, User, Save } from 'lucide-react';
import { getWhatsAppSocket } from '../../services/whatsappSocket';
import { whatsappAPI } from '../../services/api';

const labels = { Iniciando: 'Iniciando conexión', QR_Listo: 'Escanea el código QR', Conectado: 'WhatsApp conectado', Desconectado: 'WhatsApp desconectado' };

const DEFAULT_CONFIG = {
  menuServicios: true,
  menuTarifas: true,
  menuSedes: true,
  menuConsultarReserva: true,
  menuAgendar: true,
};

export default function WhatsAppAdmin() {
  const [state, setState] = useState({ status: 'Iniciando', qr: null, phoneNumber: null, pushName: null });
  const [socketOnline, setSocketOnline] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState(null);

  const [humanChats, setHumanChats] = useState([]);
  const [releasingPhone, setReleasingPhone] = useState(null);

  useEffect(() => {
    const socket = getWhatsAppSocket();
    const onConnect = () => setSocketOnline(true);
    const onDisconnect = () => setSocketOnline(false);
    const onStatus = (next) => setState((current) => ({ ...current, ...next }));
    const onQr = (qr) => setState((current) => ({ ...current, status: 'QR_Listo', qr }));
    const onHumanActivated = () => loadHumanChats();
    const onHumanReleased = () => loadHumanChats();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bot:status', onStatus);
    socket.on('bot:qr', onQr);
    socket.on('human-mode:activated', onHumanActivated);
    socket.on('human-mode:released', onHumanReleased);
    socket.connect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bot:status', onStatus);
      socket.off('bot:qr', onQr);
      socket.off('human-mode:activated', onHumanActivated);
      socket.off('human-mode:released', onHumanReleased);
      socket.disconnect();
    };
  }, []);

  const loadConfig = () => {
    whatsappAPI.getConfig()
      .then((res) => setConfig({ ...DEFAULT_CONFIG, ...(res.data?.config || {}) }))
      .catch(() => setConfigMsg({ ok: false, message: 'No se pudo cargar la configuración del bot' }))
      .finally(() => setConfigLoading(false));
  };

  const loadHumanChats = () => {
    whatsappAPI.listHumanChats()
      .then((res) => setHumanChats(res.data?.chats || []))
      .catch(() => setHumanChats([]));
  };

  useEffect(() => {
    loadConfig();
    loadHumanChats();
  }, []);

  const logout = () => {
    if (window.confirm('¿Cerrar la sesión de WhatsApp vinculada?')) {
      getWhatsAppSocket().emit('bot:logout');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendResult(null);
    const raw = phone.replace(/\D/g, '');
    const cleanPhone = raw.startsWith('51') ? raw : `51${raw}`;
    if (!cleanPhone || cleanPhone.length < 10) {
      setSendResult({ ok: false, message: 'Ingresa un número de teléfono válido' });
      return;
    }
    if (!message.trim()) {
      setSendResult({ ok: false, message: 'Ingresa un mensaje' });
      return;
    }
    setSending(true);
    try {
      await whatsappAPI.sendMessage(cleanPhone, message.trim());
      setSendResult({ ok: true, message: 'Mensaje enviado correctamente' });
      setMessage('');
    } catch (error) {
      const data = error.response?.data;
      setSendResult({ ok: false, message: data?.message || 'Error al enviar el mensaje' });
    } finally {
      setSending(false);
    }
  };

  const connected = socketOnline && state.status === 'Conectado';

  const toggleConfig = (key) => setConfig((prev) => ({ ...prev, [key]: !prev[key] }));

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      await whatsappAPI.saveConfig(config);
      setConfigMsg({ ok: true, message: 'Configuración del bot guardada correctamente' });
    } catch (error) {
      setConfigMsg({ ok: false, message: error.response?.data?.message || 'Error al guardar la configuración' });
    } finally {
      setConfigSaving(false);
    }
  };

  const releaseChat = async (chatPhone) => {
    if (!window.confirm(`¿Liberar este chat del modo humano y devolverlo al bot?\nNúmero: ${chatPhone}`)) return;
    setReleasingPhone(chatPhone);
    try {
      await whatsappAPI.releaseHumanChat(chatPhone);
      loadHumanChats();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al liberar el chat');
    } finally {
      setReleasingPhone(null);
    }
  };

  return (
    <div>
      <div className="admin-header">
        <h2><MessageSquare size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> WhatsApp del Spa</h2>
      </div>

      <section className="card whatsapp-panel">
        <div className="whatsapp-panel__header">
          <div>
            <h3 id="whatsapp-heading">Conexión</h3>
            <p role="status" aria-live="polite">
              {socketOnline ? labels[state.status] : 'No se puede conectar al microservicio'}
            </p>
          </div>
          <span className={`whatsapp-status whatsapp-status--${connected ? 'online' : 'offline'}`}>
            {connected ? <Wifi size={18} aria-hidden="true" /> : <WifiOff size={18} aria-hidden="true" />}
            {connected ? 'Conectado' : 'Pendiente'}
          </span>
        </div>

        {state.status === 'QR_Listo' && state.qr && (
          <div className="whatsapp-panel__qr">
            <QRCodeSVG value={state.qr} size={220} includeMargin title="Código QR para vincular WhatsApp" />
            <p>Abre WhatsApp en el teléfono del Spa y escanea este código.</p>
          </div>
        )}

        {connected && (
          <p className="whatsapp-panel__account">
            Vinculado: {state.pushName || 'Sin nombre'} · {state.phoneNumber || 'Número no disponible'}
          </p>
        )}

        <div className="whatsapp-panel__actions">
          <button type="button" className="btn btn-secondary" onClick={() => getWhatsAppSocket().connect()} aria-label="Reconectar al servidor de WhatsApp">
            <RefreshCw size={18} aria-hidden="true" /> Reconectar
          </button>
          <button type="button" className="btn btn-danger" onClick={logout} disabled={!connected}>
            <LogOut size={18} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1.5rem', padding: '2rem', maxWidth: '600px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.25rem', color: '#3D2E24' }}>Menú del Bot</h3>
        <p style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          Elige qué opciones se muestran a los clientes en el menú de WhatsApp.
        </p>
        {configLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando configuración...</p>
        ) : (
          <div className="settings-group">
            {[
              { key: 'menuServicios', title: 'Servicios', desc: 'Mostrar la opción de consultar los servicios del spa.' },
              { key: 'menuTarifas', title: 'Tarifas', desc: 'Mostrar la opción de consultar precios y paquetes.' },
              { key: 'menuSedes', title: 'Sedes', desc: 'Mostrar la opción de consultar las sedes disponibles.' },
              { key: 'menuConsultarReserva', title: 'Consultar Reserva', desc: 'Mostrar la opción de consultar las reservas del cliente.' },
              { key: 'menuAgendar', title: 'Agendar Cita', desc: 'Mostrar la opción de agendar una nueva cita por WhatsApp.' },
            ].map(({ key, title, desc }, i) => (
              <div key={key}>
                {i > 0 && <div className="settings-divider"></div>}
                <div className="settings-row">
                  <div className="settings-info">
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={() => toggleConfig(key)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
        {configMsg && (
          <p style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontWeight: 600,
            background: configMsg.ok ? '#F5EDE5' : '#FEE2E2',
            color: configMsg.ok ? '#6A4A3A' : '#991B1B'
          }}>
            {configMsg.message}
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={saveConfig}
          disabled={configLoading || configSaving}
        >
          <Save size={18} />
          {configSaving ? 'Guardando...' : 'Guardar configuración'}
        </button>
        <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Los cambios se aplican al menú del bot en unos segundos.
        </p>
      </section>

      <section className="card" style={{ marginTop: '1.5rem', padding: '2rem', maxWidth: '600px' }}>
        <div className="whatsapp-panel__header" style={{ marginBottom: '0.5rem' }}>
          <div>
            <h3 id="whatsapp-human-heading">Chats en Modo Humano</h3>
            <p>Chats donde un administrador intervino. Aquí puedes devolverlos al bot.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={loadHumanChats} aria-label="Actualizar lista de chats">
            <RefreshCw size={16} aria-hidden="true" /> Actualizar
          </button>
        </div>

        {humanChats.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay chats en modo humano en este momento.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {humanChats.map((chat) => (
              <li
                key={chat.phone}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.85rem 0',
                  borderBottom: '1px solid var(--adm-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <User size={18} style={{ color: 'var(--adm-text-sec)' }} aria-hidden="true" />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--adm-text)' }}>{chat.phone}</span>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--adm-text-sec)' }}>
                      {new Date(chat.activatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => releaseChat(chat.phone)}
                  disabled={releasingPhone === chat.phone}
                  style={{ fontSize: '0.85rem' }}
                >
                  {releasingPhone === chat.phone ? 'Liberando...' : 'Liberar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card whatsapp-send-form" style={{ marginTop: '1.5rem', padding: '1.5rem', maxWidth: '600px' }}>
        <h3 style={{ marginTop: 0, color: '#3D2E24' }}>Enviar Mensaje</h3>
        <form onSubmit={handleSend}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="wa-phone" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#3D2E24' }}>
              Teléfono
            </label>
            <input
              id="wa-phone"
              type="tel"
              className="form-input"
              placeholder="987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!connected || sending}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #D6CBC0', borderRadius: '8px', fontSize: '0.95rem' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="wa-message" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: '#3D2E24' }}>
              Mensaje
            </label>
            <textarea
              id="wa-message"
              className="form-input"
              placeholder="Escribe tu mensaje aquí..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!connected || sending}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #D6CBC0', borderRadius: '8px', fontSize: '0.95rem', resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!connected || sending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={18} />
            {sending ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </form>
        {sendResult && (
          <p style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontWeight: 600,
            background: sendResult.ok ? '#F5EDE5' : '#FEE2E2',
            color: sendResult.ok ? '#6A4A3A' : '#991B1B'
          }}>
            {sendResult.message}
          </p>
        )}
      </section>
    </div>
  );
}

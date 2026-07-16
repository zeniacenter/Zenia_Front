import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, RefreshCw, Wifi, WifiOff, Send, MessageSquare } from 'lucide-react';
import { getWhatsAppSocket } from '../../services/whatsappSocket';
import { whatsappAPI } from '../../services/api';

const labels = { Iniciando: 'Iniciando conexión', QR_Listo: 'Escanea el código QR', Conectado: 'WhatsApp conectado', Desconectado: 'WhatsApp desconectado' };

export default function WhatsAppAdmin() {
  const [state, setState] = useState({ status: 'Iniciando', qr: null, phoneNumber: null, pushName: null });
  const [socketOnline, setSocketOnline] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    const socket = getWhatsAppSocket();
    const onConnect = () => setSocketOnline(true);
    const onDisconnect = () => setSocketOnline(false);
    const onStatus = (next) => setState((current) => ({ ...current, ...next }));
    const onQr = (qr) => setState((current) => ({ ...current, status: 'QR_Listo', qr }));
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bot:status', onStatus);
    socket.on('bot:qr', onQr);
    socket.connect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bot:status', onStatus);
      socket.off('bot:qr', onQr);
      socket.disconnect();
    };
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
      const result = await whatsappAPI.sendMessage(cleanPhone, message.trim());
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
            background: sendResult.ok ? '#DCFCE7' : '#FEE2E2',
            color: sendResult.ok ? '#166534' : '#991B1B'
          }}>
            {sendResult.message}
          </p>
        )}
      </section>
    </div>
  );
}

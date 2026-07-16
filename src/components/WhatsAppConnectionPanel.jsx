import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { getWhatsAppSocket } from '../services/whatsappSocket';

const labels = { Iniciando: 'Iniciando conexión', QR_Listo: 'Escanea el código QR', Conectado: 'WhatsApp conectado', Desconectado: 'WhatsApp desconectado' };

export default function WhatsAppConnectionPanel() {
  const [state, setState] = useState({ status: 'Iniciando', qr: null, phoneNumber: null, pushName: null });
  const [socketOnline, setSocketOnline] = useState(false);
  useEffect(() => {
    const socket = getWhatsAppSocket();
    const onConnect = () => setSocketOnline(true);
    const onDisconnect = () => setSocketOnline(false);
    const onStatus = (next) => setState((current) => ({ ...current, ...next }));
    const onQr = (qr) => setState((current) => ({ ...current, status: 'QR_Listo', qr }));
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('bot:status', onStatus); socket.on('bot:qr', onQr); socket.connect();
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('bot:status', onStatus); socket.off('bot:qr', onQr); socket.disconnect(); };
  }, []);
  const logout = () => { if (window.confirm('¿Cerrar la sesión de WhatsApp vinculada?')) getWhatsAppSocket().emit('bot:logout'); };
  const connected = socketOnline && state.status === 'Conectado';
  return <section className="card whatsapp-panel" aria-labelledby="whatsapp-heading">
    <div className="whatsapp-panel__header"><div><h3 id="whatsapp-heading">WhatsApp del Spa</h3><p role="status" aria-live="polite">{socketOnline ? labels[state.status] : 'No se puede conectar al microservicio'}</p></div><span className={`whatsapp-status whatsapp-status--${connected ? 'online' : 'offline'}`}>{connected ? <Wifi size={18} aria-hidden="true" /> : <WifiOff size={18} aria-hidden="true" />}{connected ? 'Conectado' : 'Pendiente'}</span></div>
    {state.status === 'QR_Listo' && state.qr && <div className="whatsapp-panel__qr"><QRCodeSVG value={state.qr} size={220} includeMargin title="Código QR para vincular WhatsApp" /><p>Abre WhatsApp en el teléfono del Spa y escanea este código.</p></div>}
    {connected && <p className="whatsapp-panel__account">Vinculado: {state.pushName || 'Sin nombre'} · {state.phoneNumber || 'Número no disponible'}</p>}
    <div className="whatsapp-panel__actions"><button type="button" className="btn btn-secondary" onClick={() => getWhatsAppSocket().connect()} aria-label="Reconectar al servidor de WhatsApp"><RefreshCw size={18} aria-hidden="true" /> Reconectar</button><button type="button" className="btn btn-danger" onClick={logout} disabled={!connected}><LogOut size={18} aria-hidden="true" /> Cerrar sesión</button></div>
  </section>;
}

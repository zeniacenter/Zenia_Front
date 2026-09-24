import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { reportsAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import Skeleton from '../../components/Skeleton';
import NotificationModal from '../../components/NotificationModal';
import {
  BarChart3, DollarSign, Clock, Timer,
  Download, FileText, FileSpreadsheet, Filter, X, Search, CloudUpload,
  Users, Star, AlertTriangle, UserX, CalendarClock, MessageCircle,
} from 'lucide-react';
import { formatHours, formatDate, parseLocalDate } from '../../utils/hours';

const COLORS = ['#C9A96E', '#E6C992', '#9A7D52', '#5A8F6A', '#D46B5A', '#B5A898'];

const customTooltipStyle = {
  backgroundColor: '#352A20',
  border: '1px solid #4A3D30',
  borderRadius: '8px',
  color: '#F5EDE0',
  fontSize: '0.85rem',
};

const CHART_CARD = { padding: '1.5rem' };
const CHART_TITLE = { marginBottom: '1rem', fontSize: '1.1rem', color: '#F5EDE0' };

const STATUS_CONFIG = {
  confirmada: { label: 'Agendada', color: '#8B6A50', bg: '#F5EDE5' },
  realizada: { label: 'Realizada', color: '#2D7A3A', bg: '#E8F5E9' },
  no_asistio: { label: 'No asistió', color: '#C0392B', bg: '#FDEDEC' },
  cancelada: { label: 'Cancelada', color: '#888888', bg: '#F2F2F2' },
  postergada: { label: 'Postergada', color: '#4A7A9A', bg: '#EBF3F8' },
  pendiente: { label: 'Agendada', color: '#8B6A50', bg: '#F5EDE5' },
};

const PAYMENT_CONFIG = {
  pagado: { label: 'Pagado', color: '#2D7A3A', bg: '#E8F5E9' },
  pendiente: { label: 'Pendiente', color: '#B85C4C', bg: '#FCEEED' },
  parcial: { label: 'Parcial', color: '#B8860B', bg: '#FFF8E1' },
};

const badge = (cfg) => ({
  display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
  padding: '0.2rem 0.6rem', borderRadius: '12px',
  background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
});

const detailTh = {
  textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.04em', color: '#A89888', padding: '0.6rem 0.75rem', whiteSpace: 'nowrap',
};
const detailTd = { fontSize: '0.8rem', color: '#6B5B4E', padding: '0.55rem 0.75rem' };

const fmtMoney = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  return formatDate(d);
};

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

const INITIAL_FILTERS = {
  date_from: '', date_to: '', branch_id: '', therapist_id: '', status: '',
};

export default function Reports() {
  const { branches, therapists } = useApp();
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [breakdowns, setBreakdowns] = useState(null);
  const [clientDiscounts, setClientDiscounts] = useState(null);
  const [clientBehavior, setClientBehavior] = useState(null);
  const [behaviorFilter, setBehaviorFilter] = useState('todos');
  const [behaviorSearch, setBehaviorSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [driveMessage, setDriveMessage] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [notify, setNotify] = useState(null);

  const baseParams = useMemo(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    return params;
  }, [filters]);

  const fetchData = useCallback(async (filterParams = {}, targetPage = 1) => {
    setLoading(true);
    setError(false);
    try {
      const [dashRes, filteredRes, brkRes, cdRes, cbRes] = await Promise.all([
        reportsAPI.dashboardData(filterParams),
        reportsAPI.filtered({ ...filterParams, page: targetPage }),
        reportsAPI.breakdowns(filterParams),
        reportsAPI.clientDiscounts(filterParams),
        reportsAPI.clientBehavior(filterParams),
      ]);
      setData(dashRes.data);
      setDetail(filteredRes.data);
      setBreakdowns(brkRes.data);
      setClientDiscounts(cdRes.data);
      setClientBehavior(cbRes.data);
      setPage(targetPage);
    } catch {
      setError(true);
      setData(null);
      setDetail(null);
      setBreakdowns(null);
      setClientDiscounts(null);
      setClientBehavior(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilters = useCallback(() => {
    fetchData(baseParams, 1);
  }, [fetchData, baseParams]);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    fetchData({}, 1);
  }, [fetchData]);

  const goToPage = useCallback(async (target) => {
    try {
      const filteredRes = await reportsAPI.filtered({ ...baseParams, page: target });
      setDetail(filteredRes.data);
      setPage(target);
    } catch {
      setError(true);
    }
  }, [baseParams]);

  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([, v]) => v !== '').length,
    [filters]
  );

  const filteredBehaviorItems = useMemo(() => {
    if (!clientBehavior?.items) return [];
    let list = clientBehavior.items;

    if (behaviorFilter === 'vip') {
      list = list.filter((i) => i.prioridad === 'vip' || i.prioridad === 'habitual');
    } else if (behaviorFilter === 'canceladores') {
      list = list.filter((i) => i.prioridad === 'cancelador' || i.canceladas > 0);
    } else if (behaviorFilter === 'no_asistio') {
      list = list.filter((i) => i.no_asistio > 0);
    } else if (behaviorFilter === 'reprogramadores') {
      list = list.filter((i) => i.postergadas > 0);
    }

    if (behaviorSearch.trim()) {
      const q = behaviorSearch.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.dni && i.dni.includes(q)) ||
          (i.phone && i.phone.includes(q))
      );
    }

    return list;
  }, [clientBehavior, behaviorFilter, behaviorSearch]);

  const weeklyRevenue = useMemo(() => {
    if (!data?.weeklyRevenue?.length) return [];
    return data.weeklyRevenue.map(d => ({
      ...d,
      week_label: (parseLocalDate(d.week) || new Date(d.week)).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    }));
  }, [data?.weeklyRevenue]);

  const peakHours = useMemo(() => {
    if (!data?.peakHours?.length) return [];
    return data.peakHours.map(d => ({
      hour: `${String(d.hour).padStart(2, '0')}:00`,
      citas: Number(d.appointment_count),
      ingresos: Number(d.revenue),
    }));
  }, [data?.peakHours]);

  const categoryRevenue = useMemo(() => {
    if (!data?.categoryRevenue?.length) return [];
    return data.categoryRevenue.map(d => ({
      name: d.category,
      value: Number(d.revenue),
      citas: Number(d.appointment_count),
    }));
  }, [data?.categoryRevenue]);

  const occupancy = data?.occupancy;
  const occupancyPercent = occupancy?.occupancy_rate ?? 0;

  const peakHourLabel = useMemo(() => {
    if (peakHours.length === 0) return '--:--';
    return peakHours.reduce((max, h) => h.citas > max.citas ? h : max, peakHours[0]).hour;
  }, [peakHours]);

  const weeklyRevenueEstimate = useMemo(() => {
    if (!occupancy?.total_hours_booked) return '0';
    return (occupancy.total_hours_booked * 30).toFixed(0);
  }, [occupancy?.total_hours_booked]);

  const handleExport = useCallback(async (type) => {
    setExporting(type);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });

      const res = type === 'excel'
        ? await reportsAPI.exportExcel(params)
        : await reportsAPI.exportPdf(params);

      downloadBlob(res.data, `reporte-zenia.${type === 'excel' ? 'xlsx' : 'pdf'}`);
    } finally {
      setExporting(null);
    }
  }, [filters]);

  const handleUploadToDrive = useCallback(async () => {
    setDriveMessage('Subiendo...');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });
      const res = await reportsAPI.uploadToDrive(params);
      setDriveMessage(res.data?.message || 'Reporte subido a Google Drive.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al subir a Google Drive';
      setDriveMessage('');
      setNotify({ type: 'error', title: 'Error al subir a Google Drive', message: msg });
    } finally {
      setTimeout(() => setDriveMessage(''), 4000);
    }
  }, [filters]);

  if (loading) {
    return (
      <div className="reports-page">
        <div className="admin-header">
          <Skeleton width="160px" height="28px" />
        </div>
        <div className="stats-grid">
          {[0, 1, 2, 3].map((i) => (
            <div className="stat-card" key={i}>
              <div className="stat-info" style={{ width: '100%', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                <Skeleton width="70%" height="26px" />
                <Skeleton width="45%" height="14px" />
              </div>
            </div>
          ))}
        </div>
        <div className="charts-grid">
          {[0, 1, 2, 3].map((i) => (
            <div className="card" key={i} style={{ padding: '1.5rem', minHeight: 300 }}>
              <Skeleton width="50%" height="18px" style={{ marginBottom: '1.5rem' }} />
              <Skeleton height="200px" radius="10px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-page">
        <div className="admin-header"><h2>Reportes</h2></div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#B85C4C', fontSize: '1rem' }}>Error al cargar los reportes. Verifica la conexión con el servidor.</p>
          <button className="btn btn-primary btn-sm" onClick={() => fetchData()} style={{ marginTop: '1rem' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="admin-header reports-header">
        <h2>Reportes</h2>
        <div className="reports-actions">
          <button
            className={`btn btn-outline btn-sm filter-toggle ${activeFilters > 0 ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(s => !s)}
          >
            <Filter size={14} />
            Filtros {activeFilters > 0 && `(${activeFilters})`}
          </button>
          <div className="export-dropdown">
            <button className="btn btn-primary btn-sm" disabled={!!exporting}>
              <Download size={14} />
              {exporting ? 'Exportando...' : 'Exportar'}
            </button>
            <div className="export-menu">
              <button onClick={() => handleExport('pdf')} disabled={!!exporting}>
                <FileText size={14} /> PDF
              </button>
              <button onClick={() => handleExport('excel')} disabled={!!exporting}>
                <FileSpreadsheet size={14} /> Excel
              </button>
              <div className="export-divider" />
              <button onClick={handleUploadToDrive} disabled={!!exporting || !!driveMessage}>
                <CloudUpload size={14} /> Subir a Drive
              </button>
            </div>
          </div>
          {driveMessage && (
            <span className="drive-status">{driveMessage}</span>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="reports-filters">
          <div className="filter-group">
            <label>Desde</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Sede</label>
            <select
              className="form-control"
              value={filters.branch_id}
              onChange={e => setFilters(f => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="">Todas</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Terapeuta</label>
            <select
              className="form-control"
              value={filters.therapist_id}
              onChange={e => setFilters(f => ({ ...f, therapist_id: e.target.value }))}
            >
              <option value="">Todos</option>
              {therapists.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Estado</label>
            <select
              className="form-control"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">Todos los estados</option>
              <option value="confirmada">Agendadas</option>
              <option value="realizada">Realizadas</option>
              <option value="no_asistio">No asistió</option>
              <option value="cancelada">Canceladas</option>
              <option value="postergada">Postergadas</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>
              <Search size={14} /> Aplicar
            </button>
            {activeFilters > 0 && (
              <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold"><BarChart3 size={22} /></div>
          <div className="stat-info">
            <h4>{occupancyPercent}%</h4>
            <p>Ocupabilidad Semanal</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={22} /></div>
          <div className="stat-info">
            <h4>S/ {weeklyRevenueEstimate}</h4>
            <p>Ingresos Semana</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Clock size={22} /></div>
          <div className="stat-info">
            <h4>{peakHourLabel}</h4>
            <p>Hora Pico</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Timer size={22} /></div>
          <div className="stat-info">
            <h4>{formatHours(occupancy?.total_hours_booked ?? 0)}h</h4>
            <p>Horas Reservadas</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card" style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Ingresos por Semana</h3>
          {weeklyRevenue.length === 0 ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5A898' }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weeklyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A3D30" />
                <XAxis dataKey="week_label" stroke="#B5A898" fontSize={12} />
                <YAxis stroke="#B5A898" fontSize={12} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="#C9A96E" fill="rgba(201,169,110,0.2)" name="Ingresos (S/)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Horas Pico</h3>
          {peakHours.length === 0 ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5A898' }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A3D30" />
                <XAxis dataKey="hour" stroke="#B5A898" fontSize={12} />
                <YAxis stroke="#B5A898" fontSize={12} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend />
                <Bar dataKey="citas" fill="#C9A96E" name="Citas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ingresos" fill="#9A7D52" name="Ingresos (S/)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={CHART_CARD}>
          <h3 style={CHART_TITLE}>Ingresos por Categoría</h3>
          {categoryRevenue.length === 0 ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5A898' }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryRevenue}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryRevenue.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ ...CHART_CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={CHART_TITLE}>Ocupabilidad Semanal</h3>
          <div style={{
            width: 180, height: 180, borderRadius: '50%',
            background: `conic-gradient(#C9A96E ${occupancyPercent * 3.6}deg, #2A2018 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: '#352A20',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#C9A96E' }}>{occupancyPercent}%</span>
              <span style={{ fontSize: '0.85rem', color: '#B5A898' }}>ocupado</span>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#B5A898', fontSize: '0.9rem' }}>
              {formatHours(occupancy?.total_hours_booked ?? 0)}h reservadas de {formatHours(occupancy?.total_hours_available ?? 0)}h disponibles
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', minHeight: 200 }}>
          <Skeleton width="50%" height="18px" style={{ marginBottom: '1.5rem' }} />
          <Skeleton height="160px" radius="10px" />
        </div>
      ) : (
        <>
          <div className="report-block-header">
            <h3>Detalle de Citas</h3>
            <span>({detail?.total ?? 0} citas en el rango)</span>
          </div>
          {!detail || detail.appointments.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#B5A898' }}>
              Sin citas para los filtros seleccionados
            </div>
          ) : (
            <div className="card card-table" style={{ overflow: 'visible' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                      <th style={detailTh}>Fecha</th>
                      <th style={detailTh}>Hora</th>
                      <th style={detailTh}>Cliente</th>
                      <th style={detailTh}>Teléfono</th>
                      <th style={detailTh}>Servicio(s)</th>
                      <th style={detailTh}>Terapeuta</th>
                      <th style={detailTh}>Sede</th>
                      <th style={detailTh}>Cabina</th>
                      <th style={detailTh}>Horas</th>
                      <th style={detailTh} className="text-right">Total</th>
                      <th style={detailTh} className="text-right">Desc. %</th>
                      <th style={detailTh} className="text-right">Dcto.</th>
                      <th style={detailTh}>Estado</th>
                      <th style={detailTh}>Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.appointments.map((a) => {
                      const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendiente;
                      const ps = PAYMENT_CONFIG[a.payment_status] || PAYMENT_CONFIG.pendiente;
                      const name = [a.client_name, a.client_last_name].filter(Boolean).join(' ');
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                          <td style={detailTd}>{fmtDate(a.date)}</td>
                          <td style={detailTd}>{a.start_time} - {a.end_time}</td>
                          <td style={{ ...detailTd, fontWeight: 600, color: '#3D2E24' }}>{name || a.client_name}</td>
                          <td style={detailTd}>{a.client_phone || '-'}</td>
                          <td style={detailTd}>{a.client_services || '-'}</td>
                          <td style={detailTd}>{a.therapist_name}</td>
                          <td style={detailTd}>{a.branch_name || '-'}</td>
                          <td style={detailTd}>{a.cabin_name || '-'}</td>
                          <td style={detailTd}>{formatHours(a.hours)}</td>
                          <td style={{ ...detailTd, textAlign: 'right', fontWeight: 600, color: '#3D2E24' }}>{fmtMoney(a.total_price)}</td>
                          <td style={detailTd} className="text-right">{Number(a.discount_percent) > 0 ? `${Number(a.discount_percent)}%` : '-'}</td>
                          <td style={{ ...detailTd, textAlign: 'right', color: '#B85C4C' }}>{Number(a.discount_amount) > 0 ? `-${fmtMoney(a.discount_amount)}` : '-'}</td>
                          <td style={detailTd}><span style={badge(st)}>{st.label}</span></td>
                          <td style={detailTd}><span style={badge(ps)}>{ps.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {detail.totals && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #C9A96E' }}>
                        <td colSpan="8" style={{ ...detailTd, fontWeight: 700, color: '#3D2E24' }}>Totales (rango filtrado)</td>
                        <td style={{ ...detailTd, fontWeight: 700, color: '#3D2E24' }}>{formatHours(detail.totals.total_horas)}h</td>
                        <td style={{ ...detailTd, textAlign: 'right', fontWeight: 700, color: '#3D2E24' }}>{fmtMoney(detail.totals.total_ingresos)}</td>
                        <td style={{ ...detailTd, textAlign: 'right', fontWeight: 700, color: '#3D2E24' }}>{Number(detail.totals.total_descuentos) > 0 ? `-${fmtMoney(detail.totals.total_descuentos)}` : '-'}</td>
                        <td style={{ ...detailTd, fontWeight: 700, color: '#3D2E24' }}>{detail.totals.total_citas} citas</td>
                        <td style={detailTd}></td>
                        <td style={detailTd}></td>
                        <td style={detailTd}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 1rem', borderTop: '1px solid #E8E0D6', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B5B4E' }}>
                  Página {detail.current_page} de {detail.last_page}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={page <= 1 || loading}
                    onClick={() => goToPage(page - 1)}
                  >
                    ← Anterior
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={page >= detail.last_page || loading}
                    onClick={() => goToPage(page + 1)}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="report-breakdowns">
            <div className="card" style={CHART_CARD}>
              <h3 style={CHART_TITLE}>Ingresos por Servicio</h3>
              {(!breakdowns || breakdowns.serviceRevenue.length === 0) ? (
                <p style={{ color: '#B5A898', fontSize: '0.85rem' }}>Sin datos</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                      <th style={detailTh}>Servicio</th>
                      <th style={detailTh}>Citas</th>
                      <th style={detailTh} className="text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdowns.serviceRevenue.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F0EBE3' }}>
                        <td style={{ ...detailTd, color: '#3D2E24', fontWeight: 500 }}>{s.service}</td>
                        <td style={detailTd}>{s.appointment_count}</td>
                        <td style={{ ...detailTd, textAlign: 'right', fontWeight: 600, color: '#3D2E24' }}>{fmtMoney(s.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={CHART_CARD}>
              <h3 style={CHART_TITLE}>Ingresos por Terapeuta</h3>
              {(!breakdowns || breakdowns.therapistRevenue.length === 0) ? (
                <p style={{ color: '#B5A898', fontSize: '0.85rem' }}>Sin datos</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                      <th style={detailTh}>Terapeuta</th>
                      <th style={detailTh}>Citas</th>
                      <th style={detailTh}>Horas</th>
                      <th style={detailTh} className="text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdowns.therapistRevenue.map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F0EBE3' }}>
                        <td style={{ ...detailTd, color: '#3D2E24', fontWeight: 500 }}>{t.therapist}</td>
                        <td style={detailTd}>{t.appointment_count}</td>
                        <td style={detailTd}>{formatHours(t.total_hours)}</td>
                        <td style={{ ...detailTd, textAlign: 'right', fontWeight: 600, color: '#3D2E24' }}>{fmtMoney(t.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={CHART_CARD}>
              <h3 style={CHART_TITLE}>Detalle Financiero (Pagos)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['pendiente', 'parcial', 'pagado'].map((st) => {
                  const ps = PAYMENT_CONFIG[st] || { label: st, color: '#6B5B4E', bg: '#F0EBE3' };
                  const item = detail?.payment_summary?.[st] || { citas: 0, total_price: 0, paid_amount: 0 };
                  return (
                    <div key={st} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem', borderRadius: '8px', background: ps.bg,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: ps.color }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#3D2E24' }}>{ps.label}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6B5B4E' }}>({item.citas} citas)</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3D2E24' }}>{fmtMoney(item.total_price)}</span>
                    </div>
                  );
                })}
                {detail?.totals && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #E8E0D6' }}>
                    <span style={{ fontWeight: 700, color: '#3D2E24' }}>Total ingresos</span>
                    <span style={{ fontWeight: 700, color: '#C9A96E', fontSize: '1rem' }}>{fmtMoney(detail.totals.total_ingresos)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={CHART_CARD}>
              <h3 style={CHART_TITLE}>Control de Asistencia</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['realizada', 'confirmada', 'no_asistio', 'cancelada'].map((st) => {
                  const cfg = STATUS_CONFIG[st] || { label: st, color: '#6B5B4E', bg: '#F0EBE3' };
                  const item = detail?.status_summary?.[st] || { citas: 0, total_price: 0 };
                  return (
                    <div key={st} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem', borderRadius: '8px', background: cfg.bg,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cfg.color }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#3D2E24' }}>{cfg.label}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6B5B4E' }}>({item.citas} citas)</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3D2E24' }}>
                        {st === 'cancelada' ? `${item.citas} citas` : fmtMoney(item.total_price)}
                      </span>
                    </div>
                  );
                })}
                {detail?.total !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #E8E0D6' }}>
                    <span style={{ fontWeight: 700, color: '#3D2E24' }}>Total en rango</span>
                    <span style={{ fontWeight: 700, color: '#C9A96E', fontSize: '1rem' }}>{detail.total} citas</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={CHART_CARD}>
              <h3 style={CHART_TITLE}>Descuentos por Cliente</h3>
              {clientDiscounts && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ flex: '1', minWidth: '140px', padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#E8F5E9' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2D7A3A', textTransform: 'uppercase' }}>Con descuento</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2D7A3A' }}>{clientDiscounts.totals.clientes_con_descuento}</div>
                  </div>
                  <div style={{ flex: '1', minWidth: '140px', padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#F0EBE3' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B5B4E', textTransform: 'uppercase' }}>Sin descuento</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6B5B4E' }}>{clientDiscounts.totals.clientes_sin_descuento}</div>
                  </div>
                  <div style={{ flex: '1', minWidth: '160px', padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#FCEEED' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#B85C4C', textTransform: 'uppercase' }}>Total descontado</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#B85C4C' }}>{fmtMoney(clientDiscounts.totals.total_descontado)}</div>
                  </div>
                </div>
              )}
              {(!clientDiscounts || clientDiscounts.items.length === 0) ? (
                <p style={{ color: '#B5A898', fontSize: '0.85rem' }}>Sin citas realizadas con clientes registrados</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                        <th style={detailTh}>Cliente</th>
                        <th style={detailTh}>DNI</th>
                        <th style={detailTh}>Citas realizadas</th>
                        <th style={detailTh}>Desc. actual</th>
                        <th style={detailTh}>¿Aplica?</th>
                        <th style={detailTh} className="text-right">Total descontado</th>
                        <th style={detailTh} className="text-right">Total facturado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientDiscounts.items.map((c) => (
                        <tr key={c.person_id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                          <td style={{ ...detailTd, color: '#3D2E24', fontWeight: 500 }}>
                            {[c.client_name, c.client_last_name].filter(Boolean).join(' ')}
                          </td>
                          <td style={detailTd}>{c.client_dni || '-'}</td>
                          <td style={detailTd}>{c.citas_realizadas}</td>
                          <td style={detailTd}>{Number(c.current_discount_percent) > 0 ? `${Number(c.current_discount_percent)}%` : '–'}</td>
                          <td style={detailTd}>
                            {Number(c.current_discount_percent) > 0 ? (
                              <span style={badge({ color: '#2D7A3A', bg: '#E8F5E9' })}>Sí</span>
                            ) : (
                              <span style={badge({ color: '#6B5B4E', bg: '#F0EBE3' })}>No</span>
                            )}
                          </td>
                          <td style={{ ...detailTd, textAlign: 'right', color: '#B85C4C', fontWeight: 600 }}>
                            {Number(c.total_descontado) > 0 ? `-${fmtMoney(c.total_descontado)}` : fmtMoney(0)}
                          </td>
                          <td style={{ ...detailTd, textAlign: 'right', fontWeight: 600, color: '#3D2E24' }}>{fmtMoney(c.total_facturado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Mapeo y Prioridad de Clientes */}
          <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', color: '#3D2E24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="#8B6A50" />
                  Mapeo y Prioridad de Clientes (Hábitos de Asistencia)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#887B70' }}>
                  Segmentación automática para identificar clientes frecuentes (VIP), recurrentes en cancelaciones o inasistencias.
                </p>
              </div>
            </div>

            {/* Tarjetas resumen de segmentación */}
            {clientBehavior?.summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#F8F5F1', border: '1px solid #E8E0D6' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#887B70', textTransform: 'uppercase' }}>Total Clientes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3D2E24', marginTop: '0.2rem' }}>{clientBehavior.summary.total_clientes}</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#FEF9E7', border: '1px solid #F9E79F' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#B7950B', textTransform: 'uppercase' }}>⭐ VIP / Habituales</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#B7950B', marginTop: '0.2rem' }}>{clientBehavior.summary.vip}</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#FBEEE6', border: '1px solid #F5CBA7' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#D35400', textTransform: 'uppercase' }}>⚠️ Suelen Cancelar</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#D35400', marginTop: '0.2rem' }}>{clientBehavior.summary.canceladores}</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#FDEDEC', border: '1px solid #F5B7B1' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#C0392B', textTransform: 'uppercase' }}>🚫 No asistió</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#C0392B', marginTop: '0.2rem' }}>{clientBehavior.summary.no_asistio}</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#EBF5FB', border: '1px solid #AED6F1' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2980B9', textTransform: 'uppercase' }}>🔄 Suelen Postergar</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2980B9', marginTop: '0.2rem' }}>{clientBehavior.summary.reprogramadores}</div>
                </div>
              </div>
            )}

            {/* Barra de filtros y buscador */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'vip', label: '⭐ VIP / Habituales' },
                  { key: 'canceladores', label: '⚠️ Cancelan frecuente' },
                  { key: 'no_asistio', label: '🚫 No asistió' },
                  { key: 'reprogramadores', label: '🔄 Suelen postergar' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setBehaviorFilter(tab.key)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: behaviorFilter === tab.key ? '1px solid #8B6A50' : '1px solid #E8E0D6',
                      background: behaviorFilter === tab.key ? '#8B6A50' : '#FFFFFF',
                      color: behaviorFilter === tab.key ? '#FFFFFF' : '#6B5B4E',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ minWidth: '220px', maxWidth: '300px', flex: '1', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#A89888' }} />
                <input
                  type="text"
                  placeholder="Buscar cliente, DNI o teléfono..."
                  value={behaviorSearch}
                  onChange={(e) => setBehaviorSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.7rem 0.4rem 2rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #E8E0D6',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Tabla de clientes */}
            {(!filteredBehaviorItems || filteredBehaviorItems.length === 0) ? (
              <p style={{ color: '#B5A898', fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' }}>
                No se encontraron clientes para este filtro.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                      <th style={detailTh}>Cliente</th>
                      <th style={detailTh}>DNI</th>
                      <th style={detailTh}>Contacto</th>
                      <th style={detailTh}>Clasificación / Prioridad</th>
                      <th style={{ ...detailTh, textAlign: 'center' }}>Total Citas</th>
                      <th style={{ ...detailTh, textAlign: 'center' }}>Realizadas</th>
                      <th style={{ ...detailTh, textAlign: 'center' }}>Canceladas</th>
                      <th style={{ ...detailTh, textAlign: 'center' }}>No Asistió</th>
                      <th style={{ ...detailTh, textAlign: 'center' }}>Postergadas</th>
                      <th style={{ ...detailTh, textAlign: 'right' }}>Total Invertido</th>
                      <th style={{ ...detailTh, textAlign: 'center' }}>% Cumplimiento</th>
                      <th style={detailTh}>Última Cita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBehaviorItems.map((c) => {
                      const cleanPhone = (c.phone || '').replace(/\D/g, '');
                      const whatsappUrl = cleanPhone ? `https://wa.me/51${cleanPhone}` : null;
                      const cumpl = Number(c.tasa_cumplimiento ?? 100);
                      const cumplColor = cumpl >= 80 ? '#27AE60' : cumpl >= 50 ? '#D35400' : '#C0392B';
                      const cumplBg = cumpl >= 80 ? '#E8F8F5' : cumpl >= 50 ? '#FBEEE6' : '#FDEDEC';

                      return (
                        <tr key={c.person_id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                          <td style={{ ...detailTd, color: '#3D2E24', fontWeight: 600 }}>{c.name}</td>
                          <td style={detailTd}>{c.dni || '-'}</td>
                          <td style={detailTd}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>{c.phone || '-'}</span>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Enviar WhatsApp"
                                  style={{ color: '#27AE60', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  <MessageCircle size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td style={detailTd}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: c.tag_color,
                              background: c.tag_bg,
                              whiteSpace: 'nowrap',
                            }}>
                              {c.tag_label}
                            </span>
                          </td>
                          <td style={{ ...detailTd, textAlign: 'center', fontWeight: 600, color: '#3D2E24' }}>{c.total_citas}</td>
                          <td style={{ ...detailTd, textAlign: 'center', fontWeight: 600, color: '#27AE60' }}>{c.realizadas}</td>
                          <td style={{ ...detailTd, textAlign: 'center', fontWeight: c.canceladas > 0 ? 600 : 400, color: c.canceladas > 0 ? '#D35400' : '#A89888' }}>
                            {c.canceladas}
                          </td>
                          <td style={{ ...detailTd, textAlign: 'center', fontWeight: c.no_asistio > 0 ? 700 : 400, color: c.no_asistio > 0 ? '#C0392B' : '#A89888' }}>
                            {c.no_asistio}
                          </td>
                          <td style={{ ...detailTd, textAlign: 'center', fontWeight: c.postergadas > 0 ? 600 : 400, color: c.postergadas > 0 ? '#2980B9' : '#A89888' }}>
                            {c.postergadas}
                          </td>
                          <td style={{ ...detailTd, textAlign: 'right', fontWeight: 600, color: '#3D2E24' }}>
                            {fmtMoney(c.total_gastado)}
                          </td>
                          <td style={{ ...detailTd, textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: cumplColor,
                              background: cumplBg,
                            }}>
                              {cumpl}%
                            </span>
                          </td>
                          <td style={detailTd}>{fmtDate(c.ultima_cita)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <NotificationModal
        open={!!notify}
        type={notify?.type || 'info'}
        title={notify?.title || ''}
        message={notify?.message || ''}
        onClose={() => setNotify(null)}
      />
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { reportsAPI } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  BarChart3, DollarSign, Clock, Timer,
  Download, FileText, FileSpreadsheet, Filter, X, Search
} from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async (filterParams = {}) => {
    setLoading(true);
    setError(false);
    try {
      const res = await reportsAPI.dashboardData(filterParams);
      setData(res.data);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilters = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    fetchData(params);
  }, [filters, fetchData]);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    fetchData();
  }, [fetchData]);

  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([, v]) => v !== '').length,
    [filters]
  );

  const weeklyRevenue = useMemo(() => {
    if (!data?.weeklyRevenue?.length) return [];
    return data.weeklyRevenue.map(d => ({
      ...d,
      week_label: new Date(d.week).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
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

      let res;
      if (type === 'pdf-citas') res = await reportsAPI.exportPdf(params);
      else if (type === 'excel-citas') res = await reportsAPI.exportExcel(params);
      else if (type === 'pdf-resumen') res = await reportsAPI.exportSummaryPdf(params);
      else if (type === 'excel-resumen') res = await reportsAPI.exportSummaryExcel(params);

      downloadBlob(res.data, `reporte-${type}.${type.startsWith('pdf') ? 'pdf' : 'xlsx'}`);
    } finally {
      setExporting(null);
    }
  }, [filters]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Cargando reportes...
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
              <button onClick={() => handleExport('pdf-resumen')} disabled={!!exporting}>
                <FileText size={14} /> PDF - Resumen
              </button>
              <button onClick={() => handleExport('excel-resumen')} disabled={!!exporting}>
                <FileSpreadsheet size={14} /> Excel - Resumen
              </button>
              <div className="export-divider" />
              <button onClick={() => handleExport('pdf-citas')} disabled={!!exporting}>
                <FileText size={14} /> PDF - Citas
              </button>
              <button onClick={() => handleExport('excel-citas')} disabled={!!exporting}>
                <FileSpreadsheet size={14} /> Excel - Citas
              </button>
            </div>
          </div>
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
              <option value="">Todos</option>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
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
            <h4>{occupancy?.total_hours_booked ?? 0}h</h4>
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
              {occupancy?.total_hours_booked ?? 0}h reservadas de {occupancy?.total_hours_available ?? 0}h disponibles
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

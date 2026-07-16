import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import { reportsAPI } from '../../services/api';

const COLORS = ['#C9A96E', '#E6C992', '#9A7D52', '#5A8F6A', '#D46B5A', '#B5A898'];

const customTooltipStyle = {
  backgroundColor: '#352A20',
  border: '1px solid #4A3D30',
  borderRadius: '8px',
  color: '#F5EDE0',
  fontSize: '0.85rem',
};

export default function Reports() {
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [categoryRevenue, setCategoryRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wr, ph, oc, cr] = await Promise.all([
          reportsAPI.weeklyRevenue().catch(() => ({ data: [] })),
          reportsAPI.peakHours().catch(() => ({ data: [] })),
          reportsAPI.occupancy().catch(() => ({ data: null })),
          reportsAPI.revenueByCategory().catch(() => ({ data: [] })),
        ]);
        setWeeklyRevenue(wr.data.map(d => ({
          ...d,
          week_label: new Date(d.week).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        })));
        setPeakHours(ph.data.map(d => ({
          hour: `${String(d.hour).padStart(2, '0')}:00`,
          citas: Number(d.appointment_count),
          ingresos: Number(d.revenue),
        })));
        setOccupancy(oc.data);
        setCategoryRevenue(cr.data.map(d => ({
          name: d.category,
          value: Number(d.revenue),
          citas: Number(d.appointment_count),
        })));
      } catch {
        // Fallback demo data
        setWeeklyRevenue([
          { week_label: 'Jun 16', revenue: 450, appointment_count: 12 },
          { week_label: 'Jun 23', revenue: 620, appointment_count: 18 },
          { week_label: 'Jun 30', revenue: 580, appointment_count: 15 },
          { week_label: 'Jul 07', revenue: 750, appointment_count: 22 },
        ]);
        setPeakHours([
          { hour: '09:00', citas: 8, ingresos: 240 },
          { hour: '10:00', citas: 12, ingresos: 360 },
          { hour: '11:00', citas: 10, ingresos: 300 },
          { hour: '14:00', citas: 14, ingresos: 420 },
          { hour: '15:00', citas: 16, ingresos: 480 },
          { hour: '16:00', citas: 11, ingresos: 330 },
        ]);
        setOccupancy({ occupancy_rate: 68.5, total_hours_available: 120, total_hours_booked: 82.2 });
        setCategoryRevenue([
          { name: 'relajacion', value: 350, citas: 10 },
          { name: 'terapeutico', value: 280, citas: 8 },
          { name: 'deportivo', value: 180, citas: 5 },
          { name: 'drenaje', value: 150, citas: 4 },
          { name: 'oriental', value: 120, citas: 3 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Cargando reportes...
      </div>
    );
  }

  const occupancyPercent = occupancy?.occupancy_rate || 0;

  return (
    <div>
      <div className="admin-header">
        <h2>Reportes</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold">📊</div>
          <div className="stat-info">
            <h4>{occupancyPercent}%</h4>
            <p>Ocupabilidad Semanal</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-info">
            <h4>S/ {occupancy?.total_hours_booked ? (occupancy.total_hours_booked * 30).toFixed(0) : '0'}</h4>
            <p>Ingresos Semana</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🕐</div>
          <div className="stat-info">
            <h4>{peakHours.length > 0 ? peakHours.reduce((max, h) => h.citas > max.citas ? h : max, peakHours[0]).hour : 'N/A'}</h4>
            <p>Hora Pico</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⏱</div>
          <div className="stat-info">
            <h4>{occupancy?.total_hours_booked || 0}h</h4>
            <p>Horas Reservadas</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Weekly Revenue Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#F5EDE0' }}>Ingresos por Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A3D30" />
              <XAxis dataKey="week_label" stroke="#B5A898" fontSize={12} />
              <YAxis stroke="#B5A898" fontSize={12} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#C9A96E" fill="rgba(201,169,110,0.2)" name="Ingresos (S/)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#F5EDE0' }}>Horas Pico</h3>
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
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Category Revenue Pie */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#F5EDE0' }}>Ingresos por Categoría</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryRevenue}
                cx="50%"
                cy="50%"
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
        </div>

        {/* Occupancy gauge */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#F5EDE0' }}>Ocupabilidad Semanal</h3>
          <div style={{
            width: 180, height: 180, borderRadius: '50%',
            background: `conic-gradient(#C9A96E ${occupancyPercent * 3.6}deg, #2A2018 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
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
              {occupancy?.total_hours_booked || 0}h reservadas de {occupancy?.total_hours_available || 0}h disponibles
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

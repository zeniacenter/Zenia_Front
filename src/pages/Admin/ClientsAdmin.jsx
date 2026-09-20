import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { personAPI } from '../../services/api';
import { TableSkeleton } from '../../components/Skeleton';
import ClientEditModal from '../../components/ClientEditModal';
import ClientFichaModal from '../../components/ClientFichaModal';
import ConfirmModal from '../../components/ConfirmModal';
import {
  Search,
  User,
  Phone,
  Mail,
  Percent,
  FileText,
  Edit,
  AlertTriangle,
  Activity,
  Plus,
  Heart,
  Calendar,
  Trash2,
} from 'lucide-react';

export default function ClientsAdmin() {
  const { hasModulePermission } = useApp();
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [selectedFichaClient, setSelectedFichaClient] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editInitialTab, setEditInitialTab] = useState('general');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingClient, setDeletingClient] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await personAPI.list({ search: debouncedSearch, page });
      const data = res.data;
      if (data && Array.isArray(data.data)) {
        setClients(data.data);
        setMeta(data.meta);
      } else {
        setClients(data || []);
        setMeta({ page: 1, per_page: (data || []).length, total: (data || []).length, last_page: 1 });
      }
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreate = hasModulePermission('clientes', 'can_create');
  const canEdit = hasModulePermission('clientes', 'can_edit');
  const canDelete = hasModulePermission('clientes', 'can_delete') || hasModulePermission('clientes', 'can_edit');

  const handleDeleteClient = async () => {
    if (!deleteTarget) return;
    setDeletingClient(true);
    try {
      await personAPI.delete(deleteTarget.id);
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setMeta((prev) => ({ ...prev, total: Math.max(0, (prev.total || 1) - 1) }));
      if (selectedFichaClient?.id === deleteTarget.id) {
        setSelectedFichaClient(null);
      }
      if (editTarget?.id === deleteTarget.id) {
        setEditTarget(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error eliminando cliente:', err);
      alert(err.response?.data?.message || 'Error al eliminar el cliente');
    } finally {
      setDeletingClient(false);
    }
  };

  const handleClientSaved = (updatedClient) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? { ...c, ...updatedClient } : c))
    );
    // If the ficha modal was open for this client, update its reference
    if (selectedFichaClient && selectedFichaClient.id === updatedClient.id) {
      setSelectedFichaClient(updatedClient);
    }
  };

  const handleClientCreated = (newClient) => {
    setClients((prev) => [newClient, ...prev]);
    setMeta((prev) => ({ ...prev, total: (prev.total || 0) + 1 }));
  };

  const goToPage = (p) => {
    setPage(p);
  };

  return (
    <div>
      {/* Header */}
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#4A2E18' }}>Gestión de Clientes</h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#7D6B5C' }}>
            Directorio general, edición de datos, fidelización y fichas clínicas
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} />
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* Filter and stats bar */}
      <div
        className="card"
        style={{
          padding: '0.9rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EDE6DD',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '240px', maxWidth: '420px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', color: '#A89888' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.4rem', borderRadius: '8px', fontSize: '0.88rem' }}
            placeholder="Buscar por DNI, nombre, teléfono o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.84rem', color: '#6B5B4E', fontWeight: 500 }}>
            Total registrados: <strong style={{ color: '#4A2E18' }}>{meta.total}</strong> cliente{meta.total === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Clients Table */}
      {loading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : (
        <div className="table-container" style={{ borderRadius: '12px', border: '1px solid #EDE6DD', background: '#FFFFFF', overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr style={{ background: '#FAF7F2' }}>
                <th style={{ width: '110px' }}>DNI</th>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Ficha / Alertas</th>
                <th style={{ textAlign: 'center' }}>Descuento</th>
                <th style={{ textAlign: 'center' }}>Citas (Realiz / Total)</th>
                <th style={{ textAlign: 'right', minWidth: '170px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const pct = Number(c.discount_percent) || 0;
                const fullName = [c.name, c.last_name].filter(Boolean).join(' ') || 'Cliente sin nombre';
                const hasAllergies = Boolean(c.allergies && c.allergies.trim());
                const hasPainZone = Boolean(c.frequent_pain_zone && c.frequent_pain_zone.trim());
                const completedCitas = c.completed_appointments_count !== undefined && c.completed_appointments_count !== null
                  ? Number(c.completed_appointments_count)
                  : '-';
                const totalCitas = c.total_appointments_count !== undefined && c.total_appointments_count !== null
                  ? Number(c.total_appointments_count)
                  : '-';

                return (
                  <tr key={c.id} style={{ transition: 'background-color 0.15s' }}>
                    <td>
                      <span style={{ fontWeight: 600, color: '#4A2E18', fontSize: '0.84rem' }}>
                        {c.dni || 'S/DNI'}
                      </span>
                    </td>

                    <td>
                      <div
                        onClick={() => setSelectedFichaClient(c)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                        title="Hacer clic para ver la Ficha del Cliente"
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#FAF3EA',
                            color: '#8C6B45',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            border: '1px solid #EAE0D3',
                            flexShrink: 0,
                          }}
                        >
                          {c.name?.[0] || 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#2C1B0E', fontSize: '0.88rem' }}>
                            {fullName}
                          </div>
                          {c.address && (
                            <div style={{ fontSize: '0.74rem', color: '#8C7A6D', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {c.phone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4A2E18' }}>
                            <Phone size={12} color="#8C6B45" /> {c.phone}
                          </span>
                        )}
                        {c.email && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#7D6B5C', fontSize: '0.77rem' }}>
                            <Mail size={12} color="#A89888" /> {c.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {hasAllergies && (
                          <span
                            title={`Alergia: ${c.allergies}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '10px',
                            }}
                          >
                            <AlertTriangle size={11} /> Alergia
                          </span>
                        )}
                        {hasPainZone && (
                          <span
                            title={`Zonas de dolor: ${c.frequent_pain_zone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '10px',
                            }}
                          >
                            <Activity size={11} /> Dolor frecuente
                          </span>
                        )}
                        {c.preferred_pressure && (
                          <span
                            title={`Presión preferida: ${c.preferred_pressure}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#F3E8FF',
                              color: '#6B21A8',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '10px',
                            }}
                          >
                            <Heart size={11} /> {c.preferred_pressure.split('/')[0].trim()}
                          </span>
                        )}
                        {!hasAllergies && !hasPainZone && !c.preferred_pressure && (
                          <span style={{ color: '#B5A898', fontSize: '0.76rem' }}>Sin observaciones</span>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {pct > 0 ? (
                        <span className="badge badge-confirmed" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="badge badge-pending" style={{ fontSize: '0.75rem', opacity: 0.7 }}>0%</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#4A2E18' }}>
                        {completedCitas} / {totalCitas}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => setSelectedFichaClient(c)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.78rem',
                            padding: '0.35rem 0.65rem',
                          }}
                          title="Ver historial de citas, paquetes y ficha clínica"
                        >
                          <FileText size={14} />
                          Ficha
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setEditTarget(c);
                              setEditInitialTab('general');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.65rem',
                            }}
                            title="Editar todos los datos del cliente"
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setDeleteTarget(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.65rem',
                              color: '#B85C4C',
                              borderColor: '#F5D5D0',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FCEEED';
                              e.currentTarget.style.borderColor = '#B85C4C';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = '#F5D5D0';
                            }}
                            title="Eliminar cliente del sistema"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {clients.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#B5A898' }}>
              <User size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No se encontraron clientes registrados.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem 0', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: '#6B5B4E' }}>
            Página {meta.page} de {meta.last_page} (Total: {meta.total} clientes)
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= meta.last_page || loading}
              onClick={() => goToPage(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: FICHA HISTÓRICA DEL CLIENTE */}
      {selectedFichaClient && (
        <ClientFichaModal
          open={Boolean(selectedFichaClient)}
          clientId={selectedFichaClient.id}
          onClose={() => setSelectedFichaClient(null)}
          onEdit={(c, tab = 'general') => {
            setSelectedFichaClient(null);
            setEditTarget(c);
            setEditInitialTab(tab);
          }}
        />
      )}

      {/* MODAL 2: EDICIÓN COMPLETA DEL CLIENTE */}
      {editTarget && (
        <ClientEditModal
          open={Boolean(editTarget)}
          client={editTarget}
          initialTab={editInitialTab}
          isCreating={false}
          onClose={() => {
            setEditTarget(null);
            setEditInitialTab('general');
          }}
          onSaved={handleClientSaved}
          onDelete={(c) => {
            setEditTarget(null);
            setDeleteTarget(c);
          }}
        />
      )}

      {/* MODAL 3: CREAR NUEVO CLIENTE */}
      {showCreate && (
        <ClientEditModal
          open={showCreate}
          isCreating={true}
          onClose={() => setShowCreate(false)}
          onSaved={handleClientCreated}
        />
      )}

      {/* MODAL 4: CONFIRMAR ELIMINACIÓN DE CLIENTE */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Eliminar Cliente"
        message={deleteTarget ? `¿Estás seguro de que deseas eliminar a "${[deleteTarget.name, deleteTarget.last_name].filter(Boolean).join(' ')}"?\n\n${(deleteTarget.total_appointments_count || 0) > 0 ? `⚠️ Advertencia: Este cliente tiene ${deleteTarget.total_appointments_count} cita(s) registrada(s). Al eliminar este cliente, se eliminarán también sus citas asociadas del sistema.\n\n` : ''}Esta acción es permanente y no se puede deshacer.` : ''}
        confirmLabel={deletingClient ? 'Eliminando...' : 'Sí, eliminar cliente'}
        cancelLabel="Cancelar"
        onConfirm={handleDeleteClient}
        onCancel={() => !deletingClient && setDeleteTarget(null)}
      />
    </div>
  );
}
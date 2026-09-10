import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { personAPI } from '../../services/api';
import useEscClose from '../../hooks/useEscClose';
import { TableSkeleton } from '../../components/Skeleton';
import { Search } from 'lucide-react';

const EMPTY_CREATE = {
  name: '', last_name: '', dni: '', phone: '', email: '', address: '', discount_percent: '',
};

export default function ClientsAdmin() {
  const { hasModulePermission } = useApp();
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState(null);
  const [discountInput, setDiscountInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

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
        setClients(data);
        setMeta({ page: 1, per_page: data.length, total: data.length, last_page: 1 });
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

  useEscClose(!!editTarget, () => setEditTarget(null));
  useEscClose(showCreate, () => setShowCreate(false));

  const openEdit = (c) => {
    setEditTarget(c);
    setDiscountInput(String(Number(c.discount_percent) || 0));
  };

  const saveDiscount = async (e) => {
    e.preventDefault();
    if (!editTarget || saving) return;
    const value = Math.max(0, Math.min(100, parseFloat(discountInput) || 0));
    setSaving(true);
    try {
      await personAPI.updateDiscount(editTarget.id, value);
      setClients((prev) => prev.map((c) => (c.id === editTarget.id ? { ...c, discount_percent: value } : c)));
      setEditTarget(null);
    } catch (err) {
      console.error('Error actualizando descuento:', err);
      window.alert(err.response?.data?.message || 'Error al actualizar el descuento');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (createSaving) return;
    setCreateError('');

    if (!createForm.name.trim() || !createForm.phone.trim()) {
      setCreateError('Nombre y teléfono son obligatorios.');
      return;
    }
    if (createForm.dni.trim() && clients.some((c) => c.dni === createForm.dni.trim())) {
      setCreateError('Ya existe un cliente con ese DNI.');
      return;
    }

    setCreateSaving(true);
    try {
      const res = await personAPI.create({
        name: createForm.name.trim(),
        last_name: createForm.last_name.trim() || null,
        dni: createForm.dni.trim() || null,
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || null,
        address: createForm.address.trim() || null,
        discount_percent: parseFloat(createForm.discount_percent) || 0,
      });
      setClients((prev) => [res.data, ...prev]);
      setMeta((prev) => ({ ...prev, total: (prev.total || 0) + 1 }));
      setShowCreate(false);
      setCreateForm({ ...EMPTY_CREATE });
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Error al crear el cliente.');
    } finally {
      setCreateSaving(false);
    }
  };

  const goToPage = (p) => {
    setPage(p);
  };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
    border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24',
    fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: '#6B5B4E', marginBottom: '0.3rem',
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Clientes</h2>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Nuevo Cliente
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '220px', maxWidth: '380px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: '#A89888' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.2rem' }}
            placeholder="Buscar por DNI, nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.82rem', color: '#6B5B4E' }}>
          {meta.total} cliente{meta.total === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <TableSkeleton columns={5} rows={8} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Descuento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const pct = Number(c.discount_percent) || 0;
                return (
                  <tr key={c.id}>
                    <td>{c.dni || '-'}</td>
                    <td style={{ fontWeight: 500 }}>
                      {[c.name, c.last_name].filter(Boolean).join(' ') || 'N/A'}
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.email || '-'}</td>
                    <td>
                      {pct > 0 ? (
                        <span className="badge badge-confirmed" style={{ fontWeight: 700 }}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="badge badge-pending">0%</span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>
                          {pct > 0 ? 'Editar descuento' : 'Asignar descuento'}
                        </button>
                      ) : (
                        <span style={{ color: '#A89888', fontSize: '0.78rem' }}>Sin permiso</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {clients.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#B5A898' }}>
              No se encontraron clientes
            </div>
          )}
        </div>
      )}

      {meta.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 0', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#6B5B4E' }}>
            Página {meta.page} de {meta.last_page}
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
              disabled={page >= meta.last_page || loading}
              onClick={() => goToPage(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '580px', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Nuevo Cliente</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              {createError && (
                <p style={{ fontSize: '0.82rem', color: '#B85C4C', background: '#FCEEED', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  {createError}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>DNI</label>
                  <input type="text" style={inputStyle} placeholder="45678912" maxLength={15} value={createForm.dni} onChange={(e) => handleCreateChange('dni', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input type="text" style={inputStyle} placeholder="Juan" value={createForm.name} onChange={(e) => handleCreateChange('name', e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input type="text" style={inputStyle} placeholder="Pérez" value={createForm.last_name} onChange={(e) => handleCreateChange('last_name', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Teléfono *</label>
                  <input type="tel" style={inputStyle} placeholder="999888777" value={createForm.phone} onChange={(e) => handleCreateChange('phone', e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input type="email" style={inputStyle} placeholder="correo@ejemplo.com" value={createForm.email} onChange={(e) => handleCreateChange('email', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Dirección</label>
                  <input type="text" style={inputStyle} placeholder="Av. Principal 123" value={createForm.address} onChange={(e) => handleCreateChange('address', e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Descuento (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  style={{ ...inputStyle, maxWidth: '200px' }}
                  placeholder="0"
                  value={createForm.discount_percent}
                  onChange={(e) => handleCreateChange('discount_percent', e.target.value)}
                />
                <small style={{ color: '#A89888', fontSize: '0.72rem', display: 'block', marginTop: '0.3rem' }}>
                  Se aplicará automáticamente al precio de las citas. Deja en 0 si no aplica.
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createSaving}>
                  {createSaving ? 'Creando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Descuento del cliente</h3>
              <button className="modal-close" onClick={() => setEditTarget(null)}>&times;</button>
            </div>
            <form onSubmit={saveDiscount}>
              <p style={{ fontSize: '0.85rem', color: '#6B5B4E', marginBottom: '1rem' }}>
                Cliente: <strong>{[editTarget.name, editTarget.last_name].filter(Boolean).join(' ')}</strong>
                {editTarget.dni ? ` (DNI ${editTarget.dni})` : ''}
              </p>
              <div className="form-group">
                <label>Descuento (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="form-control"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  required
                />
                <small style={{ color: 'var(--land-text-muted)', fontSize: '0.72rem', display: 'block', marginTop: '0.3rem' }}>
                  Se aplicará automáticamente al precio de las citas de este cliente. Coloca 0 para quitar el descuento.
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditTarget(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
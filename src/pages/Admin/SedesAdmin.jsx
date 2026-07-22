import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';
import MultiSelect from '../../components/MultiSelect';

export default function SedesAdmin() {
  const { branches, therapists, services, addBranch, updateBranch, deleteBranch, hasModulePermission } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '', address: '', phone: '', is_active: true, therapistIds: [], serviceIds: [],
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', address: '', phone: '', is_active: true, therapistIds: [], serviceIds: [] });
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name, address: branch.address || '', phone: branch.phone || '',
      is_active: branch.is_active ?? true, therapistIds: branch.therapistIds || [], serviceIds: branch.serviceIds || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateBranch(editingId, form);
    } else {
      await addBranch(form);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => setDeleteTarget(id);
  const confirmDelete = () => { deleteBranch(deleteTarget); setDeleteTarget(null); };

  const getTherapistNames = (ids) => (ids || []).map((id) => therapists.find((t) => t.id === id)?.name || 'N/A').join(', ');
  const getServiceNames = (ids) => (ids || []).map((id) => services.find((s) => s.id === id)?.name || 'N/A').join(', ');

  const therapistOptions = therapists.filter((t) => t.is_available ?? t.available).map((t) => ({
    id: t.id,
    name: t.name + ' - ' + t.specialty,
  }));

  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name + ' - S/ ' + s.pricePerHour + '/h',
  }));

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Sedes</h2>
        {hasModulePermission('sedas', 'can_create') && (
          <button className="btn btn-primary" onClick={openNew}>+ Nueva Sede</button>
        )}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Terapeutas</th>
              <th>Servicios</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td><strong>{branch.name}</strong></td>
                <td>{branch.address || '-'}</td>
                <td>{branch.phone || '-'}</td>
                <td>
                  {branch.therapistIds?.length > 0 ? (
                    <span style={{ fontSize: '0.82rem' }}>{getTherapistNames(branch.therapistIds)}</span>
                  ) : <span style={{ color: 'var(--land-text-muted)' }}>-</span>}
                </td>
                <td>
                  {branch.serviceIds?.length > 0 ? (
                    <span style={{ fontSize: '0.82rem' }}>{getServiceNames(branch.serviceIds)}</span>
                  ) : <span style={{ color: 'var(--land-text-muted)' }}>-</span>}
                </td>
                <td>
                  <span className={`badge ${branch.is_active ? 'badge-success' : 'badge-secondary'}`}>
                    {branch.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {hasModulePermission('sedas', 'can_edit') && (
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(branch)}>Editar</button>
                    )}
                    {hasModulePermission('sedas', 'can_delete') && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(branch.id)}>Eliminar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {branches.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay sedes registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Sede' : 'Nueva Sede'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input type="text" className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="text" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Activa
                </label>
              </div>

              <div className="form-group">
                <label>Terapeutas asignados</label>
                <MultiSelect options={therapistOptions} value={form.therapistIds} onChange={(selected) => setForm((prev) => ({ ...prev, therapistIds: selected }))} placeholder="Buscar terapeuta..." />
              </div>

              <div className="form-group">
                <label>Servicios disponibles en esta sede</label>
                <MultiSelect options={serviceOptions} value={form.serviceIds} onChange={(selected) => setForm((prev) => ({ ...prev, serviceIds: selected }))} placeholder="Buscar servicio..." />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Sede'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleteTarget} title="Eliminar sede" message="¿Estás seguro de que deseas eliminar esta sede? Esta acción no se puede deshacer." onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

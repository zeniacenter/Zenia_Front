import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function SedesAdmin() {
  const { branches, addBranch, updateBranch, deleteBranch } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true,
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', address: '', phone: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      is_active: branch.is_active ?? true,
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

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    deleteBranch(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Sedes</h2>
        <button className="btn btn-primary" onClick={openNew}>
          + Nueva Sede
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Teléfono</th>
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
                  <span className={`badge ${branch.is_active ? 'badge-success' : 'badge-secondary'}`}>
                    {branch.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(branch)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(branch.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {branches.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                  No hay sedes registradas
                </td>
              </tr>
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
                <input
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Activa
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar sede"
        message="¿Estás seguro de que deseas eliminar esta sede? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

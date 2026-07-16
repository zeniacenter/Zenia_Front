import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';

export default function CabinsAdmin() {
  const { cabins, addCabin, updateCabin, deleteCabin } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: 1,
    image: '',
    is_available: true,
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', capacity: 1, image: '', is_available: true });
    setShowModal(true);
  };

  const openEdit = (cabin) => {
    setEditingId(cabin.id);
    setForm({
      name: cabin.name,
      description: cabin.description || '',
      capacity: cabin.capacity,
      image: cabin.image || '',
      is_available: cabin.is_available ?? cabin.available ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateCabin(editingId, form);
    } else {
      addCabin(form);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    deleteCabin(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Cabinas</h2>
        <button className="btn btn-primary" onClick={openNew}>
          + Nueva Cabina
        </button>
      </div>

      <div className="services-grid">
        {cabins.map((cabin) => (
          <div className="card" key={cabin.id}>
            {cabin.image && (
              <img src={cabin.image} alt={cabin.name} className="card-image" />
            )}
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>{cabin.name}</h3>
                <span className={`badge ${cabin.is_available ?? cabin.available ? 'badge-confirmed' : 'badge-cancelled'}`}>
                  {cabin.is_available ?? cabin.available ? 'Disponible' : 'No disponible'}
                </span>
              </div>
              <p className="card-text">{cabin.description || 'Sin descripción'}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Capacidad: {cabin.capacity} {cabin.capacity === 1 ? 'persona' : 'personas'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(cabin)}>
                  Editar
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cabin.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cabins.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay cabinas registradas</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Cabina' : 'Nueva Cabina'}</h3>
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
                <label>Descripción</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Capacidad (personas)</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={10}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  required
                />
              </div>
              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                imageableType="cabin"
                imageableId={editingId}
                label="Imagen de la cabina"
              />
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Disponible
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Cabina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar cabina"
        message="¿Estás seguro de que deseas eliminar esta cabina? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';

export default function ServicesAdmin() {
  const { services, addService, updateService, deleteService } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    pricePerHour: 30,
    pricePerHalfHour: 15,
    image: '',
    category: '',
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      pricePerHour: 30,
      pricePerHalfHour: 15,
      image: '',
      category: '',
    });
    setShowModal(true);
  };

  const openEdit = (service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      pricePerHour: service.pricePerHour,
      pricePerHalfHour: service.pricePerHalfHour,
      image: service.image,
      category: service.category,
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateService(editingId, form);
    } else {
      addService(form);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    deleteService(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Servicios</h2>
        <button className="btn btn-primary" onClick={openNew}>
          + Nuevo Servicio
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio/Hora</th>
              <th>Precio/30min</th>
              <th>Categoría</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <img
                    src={service.image}
                    alt={service.name}
                    style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                </td>
                <td><strong>{service.name}</strong></td>
                <td style={{ maxWidth: '250px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  {service.description}
                </td>
                <td><strong>S/ {service.pricePerHour}</strong></td>
                <td>S/ {service.pricePerHalfHour}</td>
                <td>{service.category}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(service)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(service.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
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
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Precio por Hora (S/)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={form.pricePerHour}
                    onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Precio por 30 min (S/)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={form.pricePerHalfHour}
                    onChange={(e) => setForm({ ...form, pricePerHalfHour: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                imageableType="service"
                imageableId={editingId}
                label="Imagen del servicio"
              />
              <div className="form-group">
                <label>Categoría</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: relajacion, terapeutico"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar servicio"
        message="¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

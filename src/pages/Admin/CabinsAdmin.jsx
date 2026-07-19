import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';

export default function CabinsAdmin() {
  const { cabins, services, addCabin, updateCabin, deleteCabin, updateEntityImage } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const imageRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: 1,
    image: '',
    is_available: true,
    serviceIds: [],
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', capacity: 1, image: '', is_available: true, serviceIds: [] });
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
      serviceIds: cabin.serviceIds || [],
    });
    setShowModal(true);
  };

  const toggleService = (serviceId) => {
    setForm((prev) => {
      const updated = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId];
      return { ...prev, serviceIds: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateCabin(editingId, form);
      if (imageRef.current) {
        const url = await imageRef.current.uploadPending(editingId);
        if (url) updateEntityImage('cabin', editingId, url);
      }
    } else {
      const newCabin = await addCabin(form);
      if (newCabin && newCabin.id && imageRef.current) {
        const url = await imageRef.current.uploadPending(newCabin.id);
        if (url) updateEntityImage('cabin', newCabin.id, url);
      }
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

  const getServiceNames = (ids) =>
    (ids || []).map((id) => services.find((s) => s.id === id)?.name || 'N/A').join(', ');

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
              <p style={{ fontSize: '0.85rem', color: 'var(--land-text-muted)', marginBottom: '0.5rem' }}>
                Capacidad: {cabin.capacity} {cabin.capacity === 1 ? 'persona' : 'personas'}
              </p>
              {cabin.serviceIds && cabin.serviceIds.length > 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--land-text-muted)', marginBottom: '1rem' }}>
                  Servicios: {getServiceNames(cabin.serviceIds)}
                </p>
              )}
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
          <p style={{ color: 'var(--land-text-muted)' }}>No hay cabinas registradas</p>
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

              <div className="form-group">
                <label>Servicios disponibles</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {services.map((svc) => (
                    <label
                      key={svc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--land-border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: form.serviceIds.includes(svc.id) ? 'rgba(201,148,74,0.1)' : 'var(--land-bg-card)',
                        borderColor: form.serviceIds.includes(svc.id) ? '#C9944A' : 'var(--land-border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(svc.id)}
                        onChange={() => toggleService(svc.id)}
                      />
                      <span style={{ flex: 1 }}>{svc.name}</span>
                      <span style={{ color: 'var(--land-text-muted)', fontSize: '0.82rem' }}>S/ {svc.pricePerHour}/h</span>
                    </label>
                  ))}
                </div>
              </div>

              <ImageUpload
                ref={imageRef}
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

import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';

export default function PackagesAdmin() {
  const { packages, services, addPackage, updatePackage, deletePackage, updateEntityImage } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const imageRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    serviceIds: [],
    hours: 1,
    originalPrice: 0,
    packagePrice: 0,
    image: '',
    active: true,
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      serviceIds: [],
      hours: 1,
      originalPrice: 0,
      packagePrice: 0,
      image: '',
      active: true,
    });
    setShowModal(true);
  };

  const openEdit = (pkg) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description,
      serviceIds: [...pkg.serviceIds],
      hours: pkg.hours,
      originalPrice: pkg.originalPrice,
      packagePrice: pkg.packagePrice,
      image: pkg.image,
      active: pkg.active,
    });
    setShowModal(true);
  };

  const toggleServiceInForm = (serviceId) => {
    setForm((prev) => {
      const updated = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId];

      const totalOriginal = updated.reduce((sum, id) => {
        const svc = services.find((s) => s.id === id);
        return sum + (svc ? svc.pricePerHour : 0);
      }, 0);

      return {
        ...prev,
        serviceIds: updated,
        originalPrice: totalOriginal * prev.hours,
      };
    });
  };

  const handleHoursChange = (newHours) => {
    setForm((prev) => {
      const totalOriginal = prev.serviceIds.reduce((sum, id) => {
        const svc = services.find((s) => s.id === id);
        return sum + (svc ? svc.pricePerHour : 0);
      }, 0);
      return {
        ...prev,
        hours: newHours,
        originalPrice: totalOriginal * newHours,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updatePackage(editingId, form);
      if (imageRef.current) {
        const url = await imageRef.current.uploadPending(editingId);
        if (url) updateEntityImage('package', editingId, url);
      }
    } else {
      const newPkg = await addPackage(form);
      if (newPkg && newPkg.id && imageRef.current) {
        const url = await imageRef.current.uploadPending(newPkg.id);
        if (url) updateEntityImage('package', newPkg.id, url);
      }
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    deletePackage(deleteTarget);
    setDeleteTarget(null);
  };

  const getServiceNames = (ids) =>
    ids.map((id) => services.find((s) => s.id === id)?.name || 'N/A').join(', ');

  const discount = (pkg) => {
    if (pkg.originalPrice === 0) return 0;
    return Math.round(((pkg.originalPrice - pkg.packagePrice) / pkg.originalPrice) * 100);
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Paquetes</h2>
        <button className="btn btn-primary" onClick={openNew}>
          + Nuevo Paquete
        </button>
      </div>

      <div className="services-grid">
        {packages.map((pkg) => (
          <div className="card" key={pkg.id}>
            <img src={pkg.image || 'https://via.placeholder.com/400x300'} alt={pkg.name} className="card-image" />
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>{pkg.name}</h3>
                {pkg.active ? (
                  <span className="badge badge-confirmed">Activo</span>
                ) : (
                  <span className="badge badge-cancelled">Inactivo</span>
                )}
              </div>
              <p className="card-text">{pkg.description}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Servicios: {getServiceNames(pkg.serviceIds)}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Duración: {pkg.hours} {pkg.hours === 1 ? 'hora' : 'horas'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                  S/ {pkg.originalPrice}
                </span>
                <span className="card-price">S/ {pkg.packagePrice}</span>
                <span className="badge badge-confirmed" style={{ fontSize: '0.7rem' }}>
                  -{discount(pkg)}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(pkg)}>
                  Editar
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pkg.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay paquetes creados</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Paquete' : 'Nuevo Paquete'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre del Paquete</label>
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
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Servicios incluidos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {services.map((svc) => (
                    <label
                      key={svc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #5a4a40',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: form.serviceIds.includes(svc.id) ? 'rgba(197,160,89,0.1)' : '#3a302c',
                        borderColor: form.serviceIds.includes(svc.id) ? '#C5A059' : '#5a4a40',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(svc.id)}
                        onChange={() => toggleServiceInForm(svc.id)}
                      />
                      <span style={{ flex: 1 }}>{svc.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>S/ {svc.pricePerHour}/h</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Horas del paquete</label>
                <input
                  type="number"
                  className="form-control"
                  min={0.5}
                  step={0.5}
                  value={form.hours}
                  onChange={(e) => handleHoursChange(Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Precio original (S/)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Se calcula auto</small>
                </div>
                <div className="form-group">
                  <label>Precio del paquete (S/)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={form.packagePrice}
                    onChange={(e) => setForm({ ...form, packagePrice: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <ImageUpload
                ref={imageRef}
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                imageableType="package"
                imageableId={editingId}
                label="Imagen del paquete"
              />

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Paquete activo
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar paquete"
        message="¿Estás seguro de que deseas eliminar este paquete? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

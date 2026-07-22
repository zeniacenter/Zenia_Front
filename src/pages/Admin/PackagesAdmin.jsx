import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';

export default function PackagesAdmin() {
  const { packages, services, branches, addPackage, updatePackage, deletePackage, updateEntityImage, hasModulePermission } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterBranch, setFilterBranch] = useState('');
  const imageRef = useRef(null);
  const [sessionMode, setSessionMode] = useState('services');
  const [form, setForm] = useState({
    name: '',
    description: '',
    sessions: [],
    hours: 1,
    originalPrice: 0,
    packagePrice: 0,
    image: '',
    active: true,
    branchId: '',
  });

  const openNew = () => {
    setEditingId(null);
    setSessionMode('services');
    setForm({
      name: '',
      description: '',
      sessions: [],
      hours: 1,
      originalPrice: 0,
      packagePrice: 0,
      image: '',
      active: true,
      branchId: '',
    });
    setShowModal(true);
  };

  const openEdit = (pkg) => {
    setEditingId(pkg.id);
    const sessions = pkg.sessions ? [...pkg.sessions.map((s) => ({ ...s }))] : (pkg.serviceIds || []).map((id) => ({ id, hours: 1 }));
    const hasDifferentHours = sessions.length > 1 && new Set(sessions.map((s) => s.hours)).size > 1;
    setSessionMode(hasDifferentHours ? 'sessions' : 'services');
    setForm({
      name: pkg.name,
      description: pkg.description,
      sessions,
      hours: pkg.hours,
      originalPrice: pkg.originalPrice,
      packagePrice: pkg.packagePrice,
      image: pkg.image,
      active: pkg.active,
      branchId: pkg.branchId || '',
    });
    setShowModal(true);
  };

  const addedServiceIds = [...new Set(form.sessions.map((s) => s.id))];
  const availableServices = services.filter((s) => (s.is_active ?? true) && !addedServiceIds.includes(s.id));

  const addServiceToPackage = (serviceId) => {
    setForm((prev) => {
      const updated = [...prev.sessions, { id: Number(serviceId), hours: 1, qty: 1 }];
      const totalOriginal = updated.reduce((sum, sess) => {
        const s = services.find((sv) => sv.id === sess.id);
        return sum + (s ? s.pricePerHour * sess.hours * (sess.qty || 1) : 0);
      }, 0);
      const totalHours = updated.reduce((sum, sess) => sum + sess.hours * (sess.qty || 1), 0);
      return { ...prev, sessions: updated, originalPrice: totalOriginal, hours: totalHours || 1 };
    });
  };

  const removeServiceFromPackage = (serviceId) => {
    setForm((prev) => {
      const updated = prev.sessions.filter((s) => s.id !== Number(serviceId));
      const totalOriginal = updated.reduce((sum, sess) => {
        const s = services.find((sv) => sv.id === sess.id);
        return sum + (s ? s.pricePerHour * sess.hours * (sess.qty || 1) : 0);
      }, 0);
      const totalHours = updated.reduce((sum, sess) => sum + sess.hours * (sess.qty || 1), 0);
      return { ...prev, sessions: updated, originalPrice: totalOriginal, hours: totalHours || 1 };
    });
  };

  const updateServiceField = (serviceId, field, value) => {
    setForm((prev) => {
      const updated = prev.sessions.map((s) => s.id === Number(serviceId) ? { ...s, [field]: value } : s);
      const totalOriginal = updated.reduce((sum, sess) => {
        const s = services.find((sv) => sv.id === sess.id);
        return sum + (s ? s.pricePerHour * sess.hours * (sess.qty || 1) : 0);
      }, 0);
      const totalHours = updated.reduce((sum, sess) => sum + sess.hours * (sess.qty || 1), 0);
      return { ...prev, sessions: updated, originalPrice: totalOriginal, hours: totalHours || 1 };
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

  const getServiceNames = (sessions) =>
    (sessions || []).map((s) => {
      const svc = services.find((sv) => sv.id === s.id);
      return svc ? `${svc.name} (${s.hours}h)` : 'N/A';
    }).join(', ');

  const getBranchName = (branchId) => {
    if (!branchId) return 'Sin sede';
    return branches.find((b) => b.id === branchId)?.name || 'N/A';
  };

  const discount = (pkg) => {
    if (pkg.originalPrice === 0) return 0;
    return Math.round(((pkg.originalPrice - pkg.packagePrice) / pkg.originalPrice) * 100);
  };

  const filteredPackages = filterBranch
    ? packages.filter((p) => !p.branchId || p.branchId === Number(filterBranch))
    : packages;

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Paquetes</h2>
        {hasModulePermission('paquetes', 'can_create') && (
          <button className="btn btn-primary" onClick={openNew}>
            + Nuevo Paquete
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: '#A89888' }}>Filtrar por sede:</span>
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', color: '#3D2E24', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="">Todas</option>
          {branches.filter((b) => b.is_active).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="services-grid">
        {filteredPackages.map((pkg) => (
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
              <p style={{ fontSize: '0.82rem', color: 'var(--land-text-muted)', marginBottom: '0.5rem' }}>
                Servicios: {getServiceNames(pkg.sessions)}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--land-text-muted)', marginBottom: '0.5rem' }}>
                Sede: {getBranchName(pkg.branchId)}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--land-text-muted)', marginBottom: '0.75rem' }}>
                Duración: {pkg.hours} {pkg.hours === 1 ? 'hora' : 'horas'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ textDecoration: 'line-through', color: 'var(--land-text-muted)' }}>
                  S/ {pkg.originalPrice}
                </span>
                <span className="card-price">S/ {pkg.packagePrice}</span>
                <span className="badge badge-confirmed" style={{ fontSize: '0.7rem' }}>
                  -{discount(pkg)}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {hasModulePermission('paquetes', 'can_edit') && (
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(pkg)}>
                    Editar
                  </button>
                )}
                {hasModulePermission('paquetes', 'can_delete') && (
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pkg.id)}>
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPackages.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--land-text-muted)' }}>No hay paquetes{filterBranch ? ' en esta sede' : ' creados'}</p>
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
                <label>Servicios del paquete</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.82rem', color: sessionMode === 'services' ? 'var(--amber)' : 'var(--land-text-muted)', fontWeight: sessionMode === 'services' ? 600 : 400 }}>Por servicios</span>
                  <div
                    onClick={() => setSessionMode((m) => m === 'services' ? 'sessions' : 'services')}
                    style={{ width: '40px', height: '22px', borderRadius: '11px', background: sessionMode === 'sessions' ? 'var(--amber)' : '#ccc', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: sessionMode === 'sessions' ? '20px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', color: sessionMode === 'sessions' ? 'var(--amber)' : 'var(--land-text-muted)', fontWeight: sessionMode === 'sessions' ? 600 : 400 }}>Por sesiones</span>
                </div>

                {sessionMode === 'services' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {form.sessions.map((sess) => {
                      const svc = services.find((s) => s.id === sess.id);
                      return (
                        <div key={sess.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #C9944A', borderRadius: '8px', background: 'rgba(201,148,74,0.08)' }}>
                          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{svc?.name || 'N/A'}</span>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={sess.hours}
                            onChange={(e) => updateServiceField(sess.id, 'hours', Number(e.target.value))}
                            style={{ width: '60px', padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid var(--land-border)', fontSize: '0.82rem', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.78rem', color: 'var(--land-text-muted)' }}>h</span>
                          <button type="button" onClick={() => removeServiceFromPackage(sess.id)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}>×</button>
                        </div>
                      );
                    })}
                    {availableServices.length > 0 && (
                      <select
                        onChange={(e) => { if (e.target.value) addServiceToPackage(e.target.value); e.target.value = ''; }}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px dashed var(--land-border)', background: 'var(--land-bg-card)', color: 'var(--land-text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="">+ Agregar servicio</option>
                        {availableServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>{svc.name} (S/ {svc.pricePerHour}/h)</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {form.sessions.map((sess) => {
                      const svc = services.find((s) => s.id === sess.id);
                      return (
                        <div key={sess.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', border: '1px solid #C9944A', borderRadius: '8px', background: 'rgba(201,148,74,0.08)' }}>
                          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{svc?.name || 'N/A'}</span>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={sess.hours}
                            onChange={(e) => updateServiceField(sess.id, 'hours', Number(e.target.value))}
                            style={{ width: '55px', padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid var(--land-border)', fontSize: '0.82rem', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--land-text-muted)' }}>h</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.25rem' }}>
                            <button type="button" onClick={() => updateServiceField(sess.id, 'qty', Math.max(1, (sess.qty || 1) - 1))} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--land-border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>−</button>
                            <span style={{ minWidth: '18px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 600 }}>{sess.qty || 1}</span>
                            <button type="button" onClick={() => updateServiceField(sess.id, 'qty', (sess.qty || 1) + 1)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--land-border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>+</button>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--land-text-muted)' }}>ses</span>
                          <button type="button" onClick={() => removeServiceFromPackage(sess.id)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}>×</button>
                        </div>
                      );
                    })}
                    {availableServices.length > 0 && (
                      <select
                        onChange={(e) => { if (e.target.value) addServiceToPackage(e.target.value); e.target.value = ''; }}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px dashed var(--land-border)', background: 'var(--land-bg-card)', color: 'var(--land-text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="">+ Agregar servicio</option>
                        {availableServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>{svc.name} (S/ {svc.pricePerHour}/h)</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Sede</label>
                <select
                  className="form-control"
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Todas las sedes</option>
                  {branches.filter((b) => b.is_active).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--land-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Si no seleccionas ninguna, el paquete estará en todas.</small>
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
                  <small style={{ color: 'var(--land-text-muted)' }}>Calculo automático</small>
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

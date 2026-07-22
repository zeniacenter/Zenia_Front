import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';
import MultiSelect from '../../components/MultiSelect';
import { Camera } from 'lucide-react';

export default function ServicesAdmin() {
  const { services, branches, addService, updateService, deleteService, updateEntityImage, hasModulePermission } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterBranch, setFilterBranch] = useState('');
  const imageRef = useRef(null);
  const [form, setForm] = useState({
    name: '', description: '', pricePerHour: 30, pricePerHalfHour: 15, image: '', category: '', branchIds: [],
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', pricePerHour: 30, pricePerHalfHour: 15, image: '', category: '', branchIds: [] });
    setShowModal(true);
  };

  const openEdit = (service) => {
    setEditingId(service.id);
    setForm({
      name: service.name, description: service.description, pricePerHour: service.pricePerHour,
      pricePerHalfHour: service.pricePerHalfHour, image: service.image, category: service.category,
      branchIds: service.branchIds || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateService(editingId, form);
      if (imageRef.current) {
        const url = await imageRef.current.uploadPending(editingId);
        if (url) updateEntityImage('service', editingId, url);
      }
    } else {
      const newService = await addService(form);
      if (newService && newService.id && imageRef.current) {
        const url = await imageRef.current.uploadPending(newService.id);
        if (url) updateEntityImage('service', newService.id, url);
      }
    }
    setShowModal(false);
  };

  const handleDelete = (id) => setDeleteTarget(id);
  const confirmDelete = () => { deleteService(deleteTarget); setDeleteTarget(null); };

  const getBranchNames = (ids) => (ids || []).map((id) => branches.find((b) => b.id === id)?.name || 'N/A').join(', ');

  const branchOptions = branches.filter((b) => b.is_active).map((b) => ({
    id: b.id,
    name: b.name + (b.address ? ` - ${b.address}` : ''),
  }));

  const filteredServices = filterBranch
    ? services.filter((s) => !s.branchIds?.length || s.branchIds.includes(Number(filterBranch)))
    : services;

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Servicios</h2>
        {hasModulePermission('servicios', 'can_create') && (
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Servicio</button>
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
              <th>Sedes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.id}>
                <td>
                  {service.image ? (
                    <img src={service.image} alt={service.name} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                  ) : (
                    <div style={{ width: '60px', height: '40px', borderRadius: '6px', background: '#f0ebe3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={18} color="#B5A898" /></div>
                  )}
                </td>
                <td><strong>{service.name}</strong></td>
                <td style={{ maxWidth: '250px', fontSize: '0.85rem', color: 'var(--text-light)' }}>{service.description}</td>
                <td><strong>S/ {service.pricePerHour}</strong></td>
                <td>S/ {service.pricePerHalfHour}</td>
                <td>{service.category}</td>
                <td>
                  {service.branchIds?.length > 0 ? (
                    <span style={{ fontSize: '0.82rem' }}>{getBranchNames(service.branchIds)}</span>
                  ) : (
                    <span style={{ color: 'var(--land-text-muted)', fontSize: '0.82rem' }}>Todas</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {hasModulePermission('servicios', 'can_edit') && (
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(service)}>Editar</button>
                    )}
                    {hasModulePermission('servicios', 'can_delete') && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(service.id)}>Eliminar</button>
                    )}
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
                <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Precio por Hora (S/)</label>
                  <input type="number" className="form-control" min={0} value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })} required />
                </div>
                <div className="form-group">
                  <label>Precio por 30 min (S/)</label>
                  <input type="number" className="form-control" min={0} value={form.pricePerHalfHour} onChange={(e) => setForm({ ...form, pricePerHalfHour: Number(e.target.value) })} required />
                </div>
              </div>
              <ImageUpload ref={imageRef} value={form.image} onChange={(url) => setForm({ ...form, image: url })} imageableType="service" imageableId={editingId} label="Imagen del servicio" />
              <div className="form-group">
                <label>Categoría</label>
                <input type="text" className="form-control" placeholder="Ej: relajacion, terapeutico" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Sedes donde se ofrece</label>
                <MultiSelect options={branchOptions} value={form.branchIds} onChange={(selected) => setForm((prev) => ({ ...prev, branchIds: selected }))} placeholder="Buscar sede..." />
                <small style={{ color: 'var(--land-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Si no seleccionas ninguna, el servicio estará en todas.</small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Servicio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleteTarget} title="Eliminar servicio" message="¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer." onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

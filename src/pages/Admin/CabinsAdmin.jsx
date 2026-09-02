import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import useEscClose from '../../hooks/useEscClose';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';
import MultiSelect from '../../components/MultiSelect';
import Pagination from '../../components/Pagination';
import { CardGridSkeleton } from '../../components/Skeleton';

export default function CabinsAdmin() {
  const { cabins, services, branches, addCabin, updateCabin, deleteCabin, updateEntityImage, hasModulePermission, loading } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterBranch, setFilterBranch] = useState('');
  const imageRef = useRef(null);
  const [form, setForm] = useState({
    name: '', description: '', capacity: 1, image: '', is_available: true, branchId: '', serviceIds: [],
  });

  useEscClose(showModal, () => setShowModal(false));

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', capacity: 1, image: '', is_available: true, branchId: '', serviceIds: [] });
    setShowModal(true);
  };

  const openEdit = (cabin) => {
    setEditingId(cabin.id);
    setForm({
      name: cabin.name, description: cabin.description || '', capacity: cabin.capacity,
      image: cabin.image || '', is_available: cabin.is_available ?? cabin.available ?? true,
      branchId: cabin.branchId || cabin.branch_id || '', serviceIds: cabin.serviceIds || [],
    });
    setShowModal(true);
  };

  const availableServices = form.branchId
    ? services.filter((s) => {
        const branch = branches.find((b) => b.id === Number(form.branchId));
        if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
        return branch.serviceIds.includes(s.id);
      })
    : services;

  const handleBranchChange = (e) => {
    const branchId = e.target.value ? Number(e.target.value) : '';
    setForm((prev) => {
      const newServices = prev.serviceIds.filter((sid) => {
        if (!branchId) return true;
        const branch = branches.find((b) => b.id === branchId);
        if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
        return branch.serviceIds.includes(sid);
      });
      return { ...prev, branchId, serviceIds: newServices };
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

  const handleDelete = (id) => setDeleteTarget(id);
  const confirmDelete = () => { deleteCabin(deleteTarget); setDeleteTarget(null); };

  const getServiceNames = (ids) => (ids || []).map((id) => services.find((s) => s.id === id)?.name || 'N/A').join(', ');
  const getBranchName = (branchId) => {
    if (!branchId) return 'Sin sede';
    return branches.find((b) => b.id === branchId)?.name || 'N/A';
  };

  const serviceOptions = availableServices.map((s) => ({
    id: s.id,
    name: s.name + ' - S/ ' + s.pricePerHour,
  }));

  const filteredCabins = filterBranch
    ? cabins.filter((c) => String(c.branchId || c.branch_id) === String(filterBranch))
    : cabins;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(9);
  useEffect(() => { setPage(0); }, [filterBranch]);
  const pagedCabins = filteredCabins.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Cabinas</h2>
        {hasModulePermission('cabinas', 'can_create') && (
          <button className="btn btn-primary" onClick={openNew}>+ Nueva Cabina</button>
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

      {loading ? (
        <CardGridSkeleton columns={3} rows={2} />
      ) : (
      <>
      <div className="services-grid">
        {pagedCabins.map((cabin) => (
          <div className="card" key={cabin.id}>
            {cabin.image && <img src={cabin.image} alt={cabin.name} className="card-image" loading="lazy" />}
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>{cabin.name}</h3>
                <span className={`badge ${cabin.is_available ?? cabin.available ? 'badge-confirmed' : 'badge-cancelled'}`}>
                  {cabin.is_available ?? cabin.available ? 'Disponible' : 'No disponible'}
                </span>
              </div>
              <p className="card-text">{cabin.description || 'Sin descripción'}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--land-text-muted)', marginBottom: '0.3rem' }}>
                Capacidad: {cabin.capacity} {cabin.capacity === 1 ? 'persona' : 'personas'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--land-text-muted)', marginBottom: '0.3rem' }}>
                Sede: {getBranchName(cabin.branchId)}
              </p>
              {cabin.serviceIds?.length > 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--land-text-muted)', marginBottom: '1rem' }}>
                  Servicios: {getServiceNames(cabin.serviceIds)}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {hasModulePermission('cabinas', 'can_edit') && (
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(cabin)}>Editar</button>
                )}
                {hasModulePermission('cabinas', 'can_delete') && (
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cabin.id)}>Eliminar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination
        total={filteredCabins.length}
        page={page}
        onPageChange={setPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
      />
      </>
      )}

      {cabins.length === 0 && !loading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--land-text-muted)' }}>No hay cabinas registradas</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Cabina' : 'Nueva Cabina'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Capacidad (personas)</label>
                <input type="number" className="form-control" min={1} max={10} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label>Sede *</label>
                <select className="form-control" value={form.branchId} onChange={handleBranchChange} required>
                  <option value="">Seleccionar sede...</option>
                  {branches.filter((b) => b.is_active).map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                {branches.filter((b) => b.is_active).length === 0 && (
                  <p style={{ color: '#e74c3c', fontSize: '0.82rem', marginTop: '0.3rem' }}>No hay sedes activas. Crea una sede primero.</p>
                )}
              </div>
              <div className="form-group">
                <label>Servicios disponibles{form.branchId ? ' (filtrados por sede)' : ''}</label>
                <MultiSelect options={serviceOptions} value={form.serviceIds} onChange={(selected) => setForm((prev) => ({ ...prev, serviceIds: selected }))} placeholder="Buscar servicio..." />
              </div>
              <ImageUpload ref={imageRef} value={form.image} onChange={(url) => setForm({ ...form, image: url })} imageableType="cabin" imageableId={editingId} label="Imagen de la cabina" />
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} style={{ marginRight: '8px' }} />
                  Disponible
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Cabina'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleteTarget} title="Eliminar cabina" message="¿Estás seguro de que deseas eliminar esta cabina? Esta acción no se puede deshacer." onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

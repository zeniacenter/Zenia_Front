import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import ImageUpload from '../../components/ImageUpload';
import ConfirmModal from '../../components/ConfirmModal';
import MultiSelect from '../../components/MultiSelect';

const defaultSchedule = {
  lunes: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  martes: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  miercoles: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  jueves: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  viernes: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  sabado: ['09:00', '10:00', '11:00', '12:00'],
  domingo: [],
};

const dayLabels = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const timeOptions = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

export default function TherapistsAdmin() {
  const { therapists, services, branches, addTherapist, updateTherapist, deleteTherapist, updateEntityImage } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterBranch, setFilterBranch] = useState('');
  const imageRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    experience: '',
    image: '',
    available: true,
    schedule: { ...defaultSchedule },
    serviceIds: [],
    branchIds: [],
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: '', specialty: '', experience: '', image: '', available: true,
      schedule: JSON.parse(JSON.stringify(defaultSchedule)), serviceIds: [], branchIds: [],
    });
    setShowModal(true);
  };

  const openEdit = (therapist) => {
    setEditingId(therapist.id);
    setForm({
      name: therapist.name, specialty: therapist.specialty, experience: therapist.experience,
      image: therapist.image, available: therapist.available,
      schedule: JSON.parse(JSON.stringify(therapist.schedule)),
      serviceIds: therapist.serviceIds || [], branchIds: therapist.branchIds || [],
    });
    setShowModal(true);
  };

  const toggleTimeSlot = (day, time) => {
    setForm((prev) => {
      const current = prev.schedule[day];
      const updated = current.includes(time) ? current.filter((t) => t !== time) : [...current, time].sort();
      return { ...prev, schedule: { ...prev.schedule, [day]: updated } };
    });
  };

  const availableServices = form.branchIds.length > 0
    ? services.filter((s) => {
        const branch = branches.find((b) => form.branchIds.includes(b.id));
        if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
        return branch.serviceIds.includes(s.id);
      })
    : services;

  const handleBranchChange = (selected) => {
    setForm((prev) => {
      const newServices = prev.serviceIds.filter((sid) => {
        if (selected.length === 0) return true;
        return selected.some((bid) => {
          const branch = branches.find((b) => b.id === bid);
          if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
          return branch.serviceIds.includes(sid);
        });
      });
      return { ...prev, branchIds: selected, serviceIds: newServices };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateTherapist(editingId, form);
      if (imageRef.current) {
        const url = await imageRef.current.uploadPending(editingId);
        if (url) updateEntityImage('therapist', editingId, url);
      }
    } else {
      const newTh = await addTherapist(form);
      if (newTh && newTh.id && imageRef.current) {
        const url = await imageRef.current.uploadPending(newTh.id);
        if (url) updateEntityImage('therapist', newTh.id, url);
      }
    }
    setShowModal(false);
  };

  const handleDelete = (id) => setDeleteTarget(id);
  const confirmDelete = () => { deleteTherapist(deleteTarget); setDeleteTarget(null); };

  const getServiceNames = (ids) => (ids || []).map((id) => services.find((s) => s.id === id)?.name || 'N/A').join(', ');
  const getBranchNames = (ids) => (ids || []).map((id) => branches.find((b) => b.id === id)?.name || 'N/A').join(', ');

  const branchOptions = branches.filter((b) => b.is_active).map((b) => ({
    id: b.id,
    name: b.name + (b.address ? ` - ${b.address}` : ''),
  }));

  const serviceOptions = availableServices.map((s) => ({
    id: s.id,
    name: s.name + ' - S/ ' + s.pricePerHour + '/h',
  }));

  const filteredTherapists = filterBranch
    ? therapists.filter((t) => !t.branchIds?.length || t.branchIds.includes(Number(filterBranch)))
    : therapists;

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Terapeutas</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Terapeuta</button>
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

      <div className="therapists-grid">
        {filteredTherapists.map((therapist) => (
          <div className="card therapist-card" key={therapist.id}>
            <img src={therapist.image || 'https://via.placeholder.com/100'} alt={therapist.name} />
            <h3>{therapist.name}</h3>
            <p className="specialty">{therapist.specialty}</p>
            <p className="experience">{therapist.experience}</p>
            <span className={`badge ${therapist.available ? 'badge-confirmed' : 'badge-cancelled'}`}>
              {therapist.available ? 'Disponible' : 'No disponible'}
            </span>
            {therapist.serviceIds?.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--land-text-muted)', marginTop: '0.5rem' }}>
                Servicios: {getServiceNames(therapist.serviceIds)}
              </p>
            )}
            {therapist.branchIds?.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--land-text-muted)' }}>
                Sedes: {getBranchNames(therapist.branchIds)}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(therapist)}>Editar</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(therapist.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Terapeuta' : 'Nuevo Terapeuta'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Especialidad</label>
                <input type="text" className="form-control" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Experiencia</label>
                <input type="text" className="form-control" placeholder="Ej: 5 años de experiencia" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} required />
              </div>
              <ImageUpload ref={imageRef} value={form.image} onChange={(url) => setForm({ ...form, image: url })} imageableType="therapist" imageableId={editingId} label="Foto del terapeuta" />
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} style={{ marginRight: '8px' }} />
                  Disponible
                </label>
              </div>

              <div className="form-group">
                <label>Sedes asignadas</label>
                <MultiSelect options={branchOptions} value={form.branchIds} onChange={handleBranchChange} placeholder="Buscar sede..." />
              </div>

              <div className="form-group">
                <label>Servicios que ofrece{form.branchIds.length > 0 ? ' (filtrados por sede)' : ''}</label>
                <MultiSelect options={serviceOptions} value={form.serviceIds} onChange={(selected) => setForm((prev) => ({ ...prev, serviceIds: selected }))} placeholder="Buscar servicio..." />
              </div>

              <h4 style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>Horarios de Disponibilidad</h4>
              {Object.keys(dayLabels).map((day) => (
                <div key={day} style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>{dayLabels[day]}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {timeOptions.map((time) => (
                      <button key={time} type="button" className={`btn btn-sm ${form.schedule[day]?.includes(time) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleTimeSlot(day, time)} style={{ minWidth: '60px', fontSize: '0.78rem' }}>{time}</button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Terapeuta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleteTarget} title="Eliminar terapeuta" message="¿Estás seguro de que deseas eliminar este terapeuta? Esta acción no se puede deshacer." onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

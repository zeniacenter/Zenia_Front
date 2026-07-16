import { useState } from 'react';
import { useApp, AVAILABLE_VIEWS } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function UsersAdmin() {
  const { users, addUser, updateUser, deleteUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recepcionista',
    permissions: [],
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', role: 'recepcionista', permissions: [] });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, permissions: u.permissions || [] });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      const updates = { name: form.name, email: form.email, role: form.role, permissions: form.permissions };
      if (form.password) updates.password = form.password;
      updateUser(editingId, updates);
    } else {
      addUser(form);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    deleteUser(deleteTarget);
    setDeleteTarget(null);
  };

  const toggleActive = (id, current) => {
    updateUser(id, { active: !current });
  };

  const togglePermission = (viewId) => {
    setForm((prev) => {
      const perms = prev.permissions.includes(viewId)
        ? prev.permissions.filter((p) => p !== viewId)
        : [...prev.permissions, viewId];
      return { ...prev, permissions: perms };
    });
  };

  const selectAllPermissions = () => {
    setForm((prev) => ({ ...prev, permissions: AVAILABLE_VIEWS.map((v) => v.id) }));
  };

  const clearAllPermissions = () => {
    setForm((prev) => ({ ...prev, permissions: [] }));
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'admin') return 'badge-admin';
    if (role === 'recepcionista') return 'badge-receptionist';
    return 'badge-therapist';
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Usuarios</h2>
        <button className="btn btn-primary" onClick={openNew}>
          + Nuevo Usuario
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Vistas Asignadas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                    {u.role === 'admin' ? 'Admin' : u.role === 'recepcionista' ? 'Recepcionista' : 'Terapeuta'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                    {(u.permissions || []).map((p) => {
                      const view = AVAILABLE_VIEWS.find((v) => v.id === p);
                      return view ? (
                        <span key={p} className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                          {view.icon && <view.icon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />} {view.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${u.active ? 'badge-confirmed' : 'badge-cancelled'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleActive(u.id, u.active)}
                  >
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>
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
          <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Juan Pérez"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="correo@zenia.pe"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{editingId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  className="form-control"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">Administrador</option>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="terapeuta">Terapeuta</option>
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Vistas permitidas</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-sm btn-outline" onClick={selectAllPermissions}>
                      Todas
                    </button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={clearAllPermissions}>
                      Ninguna
                    </button>
                  </div>
                </div>
                <div className="views-grid">
                  {AVAILABLE_VIEWS.map((view) => (
                    <label
                      key={view.id}
                      className={`view-checkbox ${form.permissions.includes(view.id) ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(view.id)}
                        onChange={() => togglePermission(view.id)}
                      />
                      <span className="view-check-icon">
                        {form.permissions.includes(view.id) ? '✓' : ''}
                      </span>
                      <span className="view-icon">{view.icon && <view.icon size={14} />}</span>
                      <span className="view-label">{view.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar usuario"
        message="¿Estás seguro de que deseas eliminar esta cuenta? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import { useState, Fragment } from 'react';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';
import { Settings, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

const MODULES = [
  { id: 'citas', label: 'Citas' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'terapeutas', label: 'Terapeutas' },
  { id: 'cabinas', label: 'Cabinas' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'sedas', label: 'Sedes' },
];

const PERMISSION_LABELS = {
  can_view: 'Ver',
  can_create: 'Crear',
  can_edit: 'Editar',
  can_delete: 'Eliminar',
};

export default function UsersAdmin() {
  const { users, addUser, updateUser, deleteUser, branches } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recepcionista',
    permissions: [],
    module_permissions: [],
  });
  const [expandedUser, setExpandedUser] = useState(null);

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'recepcionista',
      permissions: [],
      module_permissions: [],
    });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      permissions: u.permissions || [],
      module_permissions: u.module_permissions || [],
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      const updates = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: form.permissions,
        module_permissions: form.module_permissions,
      };
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

  const getRoleBadgeClass = (role) => {
    if (role === 'admin') return 'badge-admin';
    if (role === 'recepcionista') return 'badge-receptionist';
    return 'badge-therapist';
  };

  const addModulePermission = () => {
    setForm((prev) => ({
      ...prev,
      module_permissions: [
        ...prev.module_permissions,
        {
          branch_id: branches[0]?.id || '',
          module: MODULES[0].id,
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
        },
      ],
    }));
  };

  const updateModulePermission = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      module_permissions: prev.module_permissions.map((mp, i) =>
        i === index ? { ...mp, [field]: value } : mp
      ),
    }));
  };

  const removeModulePermission = (index) => {
    setForm((prev) => ({
      ...prev,
      module_permissions: prev.module_permissions.filter((_, i) => i !== index),
    }));
  };

  const toggleAllModulesForBranch = (branchId) => {
    const existingForBranch = form.module_permissions.filter(
      (mp) => mp.branch_id === branchId
    );

    if (existingForBranch.length === MODULES.length) {
      setForm((prev) => ({
        ...prev,
        module_permissions: prev.module_permissions.filter(
          (mp) => mp.branch_id !== branchId
        ),
      }));
    } else {
      const newPerms = MODULES.map((mod) => {
        const existing = existingForBranch.find((mp) => mp.module === mod.id);
        return existing || {
          branch_id: branchId,
          module: mod.id,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
        };
      });
      setForm((prev) => ({
        ...prev,
        module_permissions: [
          ...prev.module_permissions.filter((mp) => mp.branch_id !== branchId),
          ...newPerms,
        ],
      }));
    }
  };

  const getModulesByBranch = () => {
    const grouped = {};
    form.module_permissions.forEach((mp) => {
      if (!grouped[mp.branch_id]) grouped[mp.branch_id] = [];
      grouped[mp.branch_id].push(mp);
    });
    return grouped;
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
              <th>Sedes / Módulos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'recepcionista' ? 'Recepcionista' : 'Terapeuta'}
                    </span>
                  </td>
                  <td>
                    {u.role === 'admin' ? (
                      <span className="badge badge-pending">Acceso total</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                        {(() => {
                          const grouped = {};
                          (u.module_permissions || []).forEach((mp) => {
                            if (!grouped[mp.branch_id]) grouped[mp.branch_id] = [];
                            grouped[mp.branch_id].push(mp.module);
                          });
                          return Object.entries(grouped).map(([branchId, modules]) => {
                            const branch = branches.find((b) => b.id === parseInt(branchId));
                            return (
                              <span key={branchId} className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                                {branch?.name || `Sede ${branchId}`}: {modules.length} módulos
                              </span>
                            );
                          });
                        })()}
                      </div>
                    )}
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
                {expandedUser === u.id && u.role !== 'admin' && (
                  <tr key={`${u.id}-expanded`}>
                    <td colSpan="6" style={{ padding: '0.75rem 1rem', background: '#FDFCFA' }}>
                      <div style={{ fontSize: '0.8rem' }}>
                        <strong>Permisos por sede:</strong>
                        {Object.entries(
                          (u.module_permissions || []).reduce((acc, mp) => {
                            if (!acc[mp.branch_id]) acc[mp.branch_id] = [];
                            acc[mp.branch_id].push(mp);
                            return acc;
                          }, {})
                        ).map(([branchId, perms]) => {
                          const branch = branches.find((b) => b.id === parseInt(branchId));
                          return (
                            <div key={branchId} style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid #E8E0D6' }}>
                              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{branch?.name || `Sede ${branchId}`}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {perms.map((mp) => (
                                  <span key={mp.id} className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>
                                    {MODULES.find((m) => m.id === mp.module)?.label || mp.module}
                                    {mp.can_view ? ' 👁' : ''}
                                    {mp.can_create ? ' +' : ''}
                                    {mp.can_edit ? ' ✏' : ''}
                                    {mp.can_delete ? ' 🗑' : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '680px', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
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

              {form.role !== 'admin' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0 }}>Permisos por Sede y Módulo</label>
                    <button type="button" className="btn btn-sm btn-outline" onClick={addModulePermission}>
                      <Plus size={14} style={{ marginRight: '4px' }} /> Agregar
                    </button>
                  </div>

                  {branches.filter((b) => b.is_active).map((branch) => {
                    const branchPerms = form.module_permissions.filter(
                      (mp) => mp.branch_id === branch.id
                    );
                    const allModulesSelected = branchPerms.length === MODULES.length;
                    return (
                      <div key={branch.id} style={{ marginBottom: '1rem', border: '1px solid #E8E0D6', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{branch.name}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => toggleAllModulesForBranch(branch.id)}
                          >
                            {allModulesSelected ? 'Quitar todos' : 'Seleccionar todos'}
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                          {MODULES.map((mod) => {
                            const existing = branchPerms.find((mp) => mp.module === mod.id);
                            return (
                              <div key={mod.id} style={{ border: '1px solid #E8E0D6', borderRadius: '6px', padding: '0.5rem', background: existing ? '#F0EBE3' : '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{mod.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (existing) {
                                        const idx = form.module_permissions.indexOf(existing);
                                        removeModulePermission(idx);
                                      } else {
                                        setForm((prev) => ({
                                          ...prev,
                                          module_permissions: [
                                            ...prev.module_permissions,
                                            {
                                              branch_id: branch.id,
                                              module: mod.id,
                                              can_view: true,
                                              can_create: false,
                                              can_edit: false,
                                              can_delete: false,
                                            },
                                          ],
                                        }));
                                      }
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: existing ? '#B85C4C' : '#6B5B4E' }}
                                  >
                                    {existing ? <Trash2 size={14} /> : <Plus size={14} />}
                                  </button>
                                </div>
                                {existing && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', cursor: 'pointer' }}>
                                        <input
                                          type="checkbox"
                                          checked={existing[key]}
                                          onChange={(e) => {
                                            const idx = form.module_permissions.indexOf(existing);
                                            updateModulePermission(idx, key, e.target.checked);
                                          }}
                                        />
                                        {label}
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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

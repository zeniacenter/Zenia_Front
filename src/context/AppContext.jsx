import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, usersAPI, servicesAPI, packagesAPI, therapistsAPI, cabinsAPI, appointmentsAPI, branchesAPI, setBranchId } from '../services/api';
import { BarChart3, Calendar, Users, Home, Sparkles, Package, TrendingUp, Plus, User, MapPin } from 'lucide-react';

const AppContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;

export const AVAILABLE_VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'citas', label: 'Citas', icon: Calendar },
  { id: 'terapeutas', label: 'Terapeutas', icon: Users },
  { id: 'cabinas', label: 'Cabinas', icon: Home },
  { id: 'servicios', label: 'Servicios', icon: Sparkles },
  { id: 'paquetes', label: 'Paquetes', icon: Package },
  { id: 'reportes', label: 'Reportes', icon: TrendingUp },
  { id: 'agendar', label: 'Agendar Cita', icon: Plus },
  { id: 'usuarios', label: 'Usuarios', icon: User },
  { id: 'sedas', label: 'Sedes', icon: MapPin },
];

export function AppProvider({ children }) {
  const [services, setServices] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('zenia_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('zenia_token'));
  const [settings, setSettings] = useState({ priceVisible: true, cabinRequired: true, branchRequired: true });
  const [userPermissions, setUserPermissions] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const isAdminLoggedIn = !!token && !!user;

  const transformPackage = (pkg) => {
    const sessions = pkg.services
      ? pkg.services.map((s) => ({ id: s.id, name: s.name, hours: parseFloat(s.pivot?.hours) || 1 }))
      : [];
    return {
      ...pkg,
      sessions,
      serviceIds: sessions.map((s) => s.id),
      originalPrice: parseFloat(pkg.original_price) || 0,
      packagePrice: parseFloat(pkg.package_price) || 0,
      active: pkg.is_active ?? true,
      branchId: pkg.branch_id ?? pkg.branch?.id ?? null,
    };
  };

  const transformService = (svc) => ({
    ...svc,
    pricePerHour: parseFloat(svc.price_per_hour) || 0,
    pricePerHalfHour: parseFloat(svc.price_per_half_hour) || 0,
    branchIds: svc.branches ? svc.branches.map((b) => b.id) : [],
  });

  const transformTherapist = (th) => ({
    ...th,
    available: th.is_available ?? true,
    serviceIds: th.services ? th.services.map((s) => s.id) : [],
    branchIds: th.branches ? th.branches.map((b) => b.id) : [],
  });

  const transformCabin = (cab) => ({
    ...cab,
    available: cab.is_available ?? true,
    serviceIds: cab.services ? cab.services.map((s) => s.id) : [],
    branchId: cab.branch_id ?? cab.branch?.id ?? null,
  });

  const transformBranch = (br) => ({
    ...br,
    therapistIds: br.therapists ? br.therapists.map((t) => t.id) : [],
    serviceIds: br.services ? br.services.map((s) => s.id) : [],
    cabinCount: br.cabins ? br.cabins.length : 0,
  });

  useEffect(() => {
    if (token) return;
    Promise.all([
      servicesAPI.list(),
      therapistsAPI.list(),
      cabinsAPI.list(),
      packagesAPI.list(),
      branchesAPI.list(),
    ]).then(([s, t, c, p, b]) => {
      setServices(s.data.map(transformService));
      setTherapists(t.data.map(transformTherapist));
      setCabins(c.data.map(transformCabin));
      setPackages(p.data.map(transformPackage));
      setBranches(b.data.map(transformBranch));
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token) {
      const ok = (r) => r.status === 'fulfilled' ? r.value.data : null;

      Promise.allSettled([
        usersAPI.list(),
        servicesAPI.list(),
        therapistsAPI.list(),
        cabinsAPI.list(),
        packagesAPI.list(),
        branchesAPI.listAll(),
        appointmentsAPI.list(),
        usersAPI.myPermissions(),
      ]).then(([u, s, t, c, p, b, a, perms]) => {
        const uData = ok(u);
        const sData = ok(s);
        const tData = ok(t);
        const cData = ok(c);
        const pData = ok(p);
        const bData = ok(b);
        const aData = ok(a);
        const permsData = ok(perms);

        if (uData) setUsers(uData);
        if (sData) setServices(sData.map(transformService));
        if (tData) setTherapists(tData.map(transformTherapist));
        if (cData) setCabins(cData.map(transformCabin));
        if (pData) setPackages(pData.map(transformPackage));
        if (bData) setBranches(bData.map(transformBranch));
        if (aData) setAppointments(aData);
        if (permsData) {
          setUserPermissions(permsData);

          if (!permsData?.is_admin && permsData?.branches?.length > 0) {
            const firstBranchId = permsData.branches[0].id;
            setSelectedBranchId(firstBranchId);
            setBranchId(firstBranchId);
          }
        }
      });
    }
  }, [token]);

  useEffect(() => {
    if (!token || !selectedBranchId) return;

    const ok = (r) => r.status === 'fulfilled' ? r.value.data : null;

    Promise.allSettled([
      appointmentsAPI.list(),
      usersAPI.list(),
    ]).then(([a, u]) => {
      const aData = ok(a);
      const uData = ok(u);
      if (aData) setAppointments(aData);
      if (uData) setUsers(uData);
    });
  }, [token, selectedBranchId]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (userPermissions?.is_admin) return true;
    return user.permissions?.includes(permission) ?? false;
  }, [user, userPermissions]);

  const hasModulePermission = useCallback((module, action = 'can_view', branchId = null) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (userPermissions?.is_admin) return true;

    if (!userPermissions?.modules) return false;

    const checkBranch = (branchModules) => {
      const mod = branchModules.find((m) => m.module === module);
      return mod ? mod[action] : false;
    };

    if (branchId) {
      const branchData = userPermissions.modules.find((m) => m.branch_id === branchId);
      return branchData ? checkBranch(branchData.modules) : false;
    }

    return userPermissions.modules.some((branchData) => checkBranch(branchData.modules));
  }, [user, userPermissions]);

  const loginAdmin = useCallback(async (email, password) => {
    try {
      const res = await authAPI.login(email, password);
      setUser(res.data.user);
      setToken(res.data.token);
      sessionStorage.setItem('zenia_user', JSON.stringify(res.data.user));
      sessionStorage.setItem('zenia_token', res.data.token);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    if (token) {
      try { await authAPI.logout(); } catch {}
    }
    setUser(null);
    setToken(null);
    setSelectedBranchId(null);
    setBranchId(null);
    sessionStorage.removeItem('zenia_user');
    sessionStorage.removeItem('zenia_token');
  }, [token]);

  const selectBranch = useCallback((branchId) => {
    setSelectedBranchId(branchId);
    setBranchId(branchId);
  }, []);

  const addUser = useCallback(async (userData) => {
    try {
      const res = await usersAPI.create(userData);
      setUsers((prev) => [...prev, res.data]);
      return res.data;
    } catch (err) {
      console.error('Error creando usuario:', err);
      return null;
    }
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    try {
      const res = await usersAPI.update(id, updates);
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data : u)));
      return res.data;
    } catch (err) {
      console.error('Error actualizando usuario:', err);
      return null;
    }
  }, []);

  const deleteUser = useCallback(async (id) => {
    try {
      await usersAPI.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error('Error eliminando usuario:', err);
    }
  }, []);

  const addService = useCallback(async (service) => {
    const payload = {
      name: service.name,
      description: service.description,
      price_per_hour: service.pricePerHour,
      price_per_half_hour: service.pricePerHalfHour,
      category: service.category,
      image: service.image || '',
      is_active: service.is_active ?? true,
      branch_ids: service.branchIds || [],
    };
    try {
      const res = await servicesAPI.create(payload);
      setServices((prev) => [...prev, transformService(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando servicio:', err);
      return null;
    }
  }, []);

  const updateService = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      description: updates.description,
      price_per_hour: updates.pricePerHour,
      price_per_half_hour: updates.pricePerHalfHour,
      category: updates.category,
      image: updates.image || '',
      is_active: updates.is_active ?? true,
      branch_ids: updates.branchIds || [],
    };
    try {
      const res = await servicesAPI.update(id, payload);
      setServices((prev) => prev.map((s) => (s.id === id ? transformService(res.data) : s)));
    } catch (err) {
      console.error('Error actualizando servicio:', err);
    }
  }, []);

  const deleteService = useCallback(async (id) => {
    try {
      await servicesAPI.delete(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error eliminando servicio:', err);
    }
  }, []);

  const addTherapist = useCallback(async (therapist) => {
    const payload = {
      name: therapist.name,
      specialty: therapist.specialty,
      experience: therapist.experience,
      image: therapist.image || '',
      is_available: therapist.available ?? true,
      schedule: therapist.schedule,
      service_ids: therapist.serviceIds || [],
      branch_ids: therapist.branchIds || [],
    };
    try {
      const res = await therapistsAPI.create(payload);
      setTherapists((prev) => [...prev, transformTherapist(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando terapeuta:', err);
      return null;
    }
  }, []);

  const updateTherapist = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      specialty: updates.specialty,
      experience: updates.experience,
      image: updates.image || '',
      is_available: updates.available ?? true,
      schedule: updates.schedule,
      service_ids: updates.serviceIds || [],
      branch_ids: updates.branchIds || [],
    };
    try {
      const res = await therapistsAPI.update(id, payload);
      setTherapists((prev) => prev.map((t) => (t.id === id ? transformTherapist(res.data) : t)));
    } catch (err) {
      console.error('Error actualizando terapeuta:', err);
    }
  }, []);

  const deleteTherapist = useCallback(async (id) => {
    try {
      await therapistsAPI.delete(id);
      setTherapists((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error eliminando terapeuta:', err);
    }
  }, []);

  const addAppointment = useCallback(async (appointment) => {
    try {
      const res = await appointmentsAPI.create(appointment);
      const data = res.data;
      if (Array.isArray(data)) {
        setAppointments((prev) => [...prev, ...data]);
      } else {
        setAppointments((prev) => [...prev, data]);
      }
      return data;
    } catch (err) {
      console.error('Error creando cita:', err);
      throw err;
    }
  }, []);

  const updateAppointment = useCallback(async (id, updates) => {
    try {
      await appointmentsAPI.update(id, updates);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    } catch (err) {
      console.error('Error actualizando cita:', err);
    }
  }, []);

  const deleteAppointment = useCallback(async (id) => {
    try {
      await appointmentsAPI.delete(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error eliminando cita:', err);
    }
  }, []);

  const addCabin = useCallback(async (cabin) => {
    const payload = {
      name: cabin.name,
      description: cabin.description,
      capacity: cabin.capacity,
      image: cabin.image,
      is_available: cabin.available ?? cabin.is_available ?? true,
      branch_id: cabin.branchId || cabin.branch_id,
      service_ids: cabin.serviceIds || [],
    };
    try {
      const res = await cabinsAPI.create(payload);
      setCabins((prev) => [...prev, transformCabin(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando cabina:', err);
      return null;
    }
  }, []);

  const updateCabin = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      description: updates.description,
      capacity: updates.capacity,
      image: updates.image,
      is_available: updates.available ?? updates.is_available ?? true,
      branch_id: updates.branchId || updates.branch_id,
      service_ids: updates.serviceIds || [],
    };
    try {
      const res = await cabinsAPI.update(id, payload);
      setCabins((prev) => prev.map((c) => (c.id === id ? transformCabin(res.data) : c)));
    } catch (err) {
      console.error('Error actualizando cabina:', err);
    }
  }, []);

  const deleteCabin = useCallback(async (id) => {
    try {
      await cabinsAPI.delete(id);
      setCabins((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error eliminando cabina:', err);
    }
  }, []);

  const addPackage = useCallback(async (pkg) => {
    const sessions = pkg.sessions || [];
    const expandedIds = [];
    const expandedHours = {};
    sessions.forEach((s) => {
      const qty = s.qty || 1;
      for (let i = 0; i < qty; i++) {
        expandedIds.push(s.id);
        expandedHours[s.id] = s.hours || 1;
      }
    });
    const payload = {
      name: pkg.name,
      description: pkg.description,
      hours: pkg.hours,
      original_price: pkg.originalPrice,
      package_price: pkg.packagePrice,
      image: pkg.image || '',
      is_active: pkg.active ?? true,
      branch_id: pkg.branchId || null,
      service_ids: expandedIds,
      service_hours: expandedHours,
    };
    try {
      const res = await packagesAPI.create(payload);
      setPackages((prev) => [...prev, transformPackage(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando paquete:', err);
      return null;
    }
  }, []);

  const updatePackage = useCallback(async (id, updates) => {
    const sessions = updates.sessions || [];
    const expandedIds = [];
    const expandedHours = {};
    sessions.forEach((s) => {
      const qty = s.qty || 1;
      for (let i = 0; i < qty; i++) {
        expandedIds.push(s.id);
        expandedHours[s.id] = s.hours || 1;
      }
    });
    const payload = {
      name: updates.name,
      description: updates.description,
      hours: updates.hours,
      original_price: updates.originalPrice,
      package_price: updates.packagePrice,
      image: updates.image || '',
      is_active: updates.active ?? true,
      branch_id: updates.branchId || null,
      service_ids: expandedIds,
      service_hours: expandedHours,
    };
    try {
      const res = await packagesAPI.update(id, payload);
      setPackages((prev) => prev.map((p) => (p.id === id ? transformPackage(res.data) : p)));
    } catch (err) {
      console.error('Error actualizando paquete:', err);
    }
  }, []);

  const deletePackage = useCallback(async (id) => {
    try {
      await packagesAPI.delete(id);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error eliminando paquete:', err);
    }
  }, []);

  const addBranch = useCallback(async (branch) => {
    const payload = {
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: branch.is_active ?? true,
      therapist_ids: branch.therapistIds || [],
      service_ids: branch.serviceIds || [],
    };
    try {
      const res = await branchesAPI.create(payload);
      setBranches((prev) => [...prev, transformBranch(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando sede:', err);
      return null;
    }
  }, []);

  const updateBranch = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      address: updates.address,
      phone: updates.phone,
      is_active: updates.is_active ?? true,
      therapist_ids: updates.therapistIds || [],
      service_ids: updates.serviceIds || [],
    };
    try {
      const res = await branchesAPI.update(id, payload);
      setBranches((prev) => prev.map((b) => (b.id === id ? transformBranch(res.data) : b)));
    } catch (err) {
      console.error('Error actualizando sede:', err);
    }
  }, []);

  const deleteBranch = useCallback(async (id) => {
    try {
      await branchesAPI.delete(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Error eliminando sede:', err);
    }
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateEntityImage = useCallback((entityType, entityId, imageUrl) => {
    const setters = {
      service: setServices,
      package: setPackages,
      therapist: setTherapists,
      cabin: setCabins,
    };
    const setter = setters[entityType];
    if (setter) {
      setter((prev) => prev.map((item) =>
        item.id === entityId ? { ...item, image: imageUrl } : item
      ));
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        services, therapists, appointments, packages, cabins, branches,
        users, user, isAdminLoggedIn, settings, userPermissions,
        selectedBranchId, selectBranch,
        hasPermission, hasModulePermission,
        loginAdmin, logoutAdmin,
        updateSettings, updateEntityImage,
        addUser, updateUser, deleteUser,
        addService, updateService, deleteService,
        addTherapist, updateTherapist, deleteTherapist,
        addAppointment, updateAppointment, deleteAppointment,
        addCabin, updateCabin, deleteCabin,
        addPackage, updatePackage, deletePackage,
        addBranch, updateBranch, deleteBranch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

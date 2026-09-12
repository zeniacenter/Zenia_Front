import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI, usersAPI, servicesAPI, packagesAPI, therapistsAPI, cabinsAPI, appointmentsAPI, branchesAPI, settingsAPI, setBranchId } from '../services/api';
import { BarChart3, Calendar, Users, Home, Sparkles, Package, TrendingUp, Plus, User, MapPin } from 'lucide-react';

const AppContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = API_URL.replace(/\/api\/?$/, '');

// eslint-disable-next-line react/only-export-components
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return API_BASE + path;
};

const loadTherapistsForAdmin = () => therapistsAPI.listAll().catch(() => therapistsAPI.list());

const APPOINTMENT_RANGE_DAYS_PAST = 30;
const APPOINTMENT_RANGE_DAYS_FUTURE = 30;

const appointmentRange = () => {
  const to = new Date();
  to.setDate(to.getDate() + APPOINTMENT_RANGE_DAYS_FUTURE);
  const from = new Date();
  from.setDate(from.getDate() - APPOINTMENT_RANGE_DAYS_PAST);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
};

const getImagePath = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    try { return new URL(url).pathname; } catch { return url; }
  }
  return url;
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const firstDefined = (...values) => values.find((v) => v !== undefined && v !== null);

const toIdList = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (item && typeof item === 'object' && item.id !== undefined ? item.id : item))
    .filter((id) => id !== undefined && id !== null);
};

const normalizeCategory = (value) => {
  const prepared = String(value ?? '').trim();
  return prepared !== '' ? prepared : 'general';
};

const halfPrice = (price) => {
  const n = Number(price);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100 / 2) / 100 : null;
};

// eslint-disable-next-line react/only-export-components
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
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('zenia_settings'));
      return { priceVisible: true, cabinRequired: true, branchRequired: true, workStart: '08:00', workEnd: '19:00', ...saved };
    } catch {
      return { priceVisible: true, cabinRequired: true, branchRequired: true, workStart: '08:00', workEnd: '19:00' };
    }
  });
  const [userPermissions, setUserPermissions] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdminLoggedIn = !!token && !!user;

  const transformPackage = (pkg) => {
    const sessions = Array.isArray(pkg.services)
      ? pkg.services
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({ id: s.id, name: s.name, hours: parseFloat(s.pivot?.hours) || 1 }))
      : [];
    return {
      ...pkg,
      image: getImageUrl(pkg.image),
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
    image: getImageUrl(svc.image),
    pricePerHour: parseFloat(svc.price_per_hour) || 0,
    pricePerHalfHour: parseFloat(svc.price_per_half_hour) || 0,
    durationMin: svc.duration_min ?? 60,
    branchIds: svc.branches ? svc.branches.map((b) => b.id) : [],
  });

  const transformTherapist = (th) => ({
    ...th,
    image: getImageUrl(th.image),
    available: th.is_available ?? true,
    serviceIds: th.services ? th.services.map((s) => s.id) : [],
    branchIds: th.branches ? th.branches.map((b) => b.id) : [],
  });

  const transformCabin = (cab) => ({
    ...cab,
    image: getImageUrl(cab.image),
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
    localStorage.setItem('zenia_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    settingsAPI.get()
      .then((res) => {
        const s = res.data?.settings;
        if (s) {
          setSettings((prev) => ({ ...prev, ...s }));
        }
      })
      .catch(() => { });
  }, []);

  const queryClient = useQueryClient();

  // Catálogo público (visitante sin sesión). Solamente se refresca si los datos
  // están obsoletos, evitando descargas innecesarias y el refetch de 60s previo.
  const publicCatalog = useQuery({
    queryKey: ['catalog', 'public'],
    queryFn: async () => {
      const [s, t, c, p, b] = await Promise.all([
        servicesAPI.list(),
        therapistsAPI.list(),
        cabinsAPI.list(),
        packagesAPI.list(),
        branchesAPI.list(),
      ]);
      return {
        services: s.data.map(transformService),
        therapists: t.data.map(transformTherapist),
        cabins: c.data.map(transformCabin),
        packages: p.data.map(transformPackage),
        branches: b.data.map(transformBranch),
      };
    },
    enabled: !token,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Catálogo admin + permisos. Las peticiones se resuelven en paralelo y cada
  // dato se sincroniza conforme llega (sin bloquear el primer pintado).
  const adminData = useQuery({
    queryKey: ['catalog', 'admin', token],
    queryFn: async () => {
      const [u, s, t, c, p, b, perms] = await Promise.allSettled([
        usersAPI.list(),
        servicesAPI.listAll(),
        loadTherapistsForAdmin(),
        cabinsAPI.listAll(),
        packagesAPI.listAll(),
        branchesAPI.listAll(),
        usersAPI.myPermissions(),
      ]);
      const ok = (r) => r.status === 'fulfilled' ? r.value.data : null;
      const list = (r, transform) => {
        const d = ok(r);
        return Array.isArray(d) ? d.map(transform) : d;
      };
      return {
        users: ok(u),
        services: list(s, transformService),
        therapists: list(t, transformTherapist),
        cabins: list(c, transformCabin),
        packages: list(p, transformPackage),
        branches: list(b, transformBranch),
        permissions: ok(perms),
      };
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });

  const syncCatalog = useCallback((d, perms) => {
    if (!d) return;
    if (Array.isArray(d.services)) setServices(d.services);
    if (Array.isArray(d.therapists)) setTherapists(d.therapists);
    if (Array.isArray(d.cabins)) setCabins(d.cabins);
    if (Array.isArray(d.packages)) setPackages(d.packages);
    if (Array.isArray(d.branches)) setBranches(d.branches);
    if (Array.isArray(d.users)) setUsers(d.users);
    if (perms) {
      setUserPermissions(perms);
      if (!perms.is_admin && perms.branches?.length > 0 && !selectedBranchId) {
        const firstBranchId = perms.branches[0].id;
        setSelectedBranchId(firstBranchId);
        setBranchId(firstBranchId);
      }
    }
  }, [selectedBranchId]);

  // Sincroniza el catálogo admin a medida que llega.
  useEffect(() => {
    if (!adminData.data) return;
    syncCatalog(adminData.data, adminData.data.permissions);
    // Marca "listo" apenas llega el catálogo mínimo que necesitan las pantallas
    // principales (Dashboard/Citas), sin esperar a usuarios/permisos lentos.
    if (
      Array.isArray(adminData.data.services) && adminData.data.services.length > 0 &&
      Array.isArray(adminData.data.therapists) && adminData.data.therapists.length > 0
    ) {
      setLoading(false);
    } else if (adminData.isSuccess) {
      // Catálogo llegó pero puede estar vacío (sin datos o sin permisos): sal del skeleton.
      setLoading(false);
    }
  }, [adminData.data, adminData.isSuccess, syncCatalog]);

  // Sincroniza el catálogo público a medida que llega.
  useEffect(() => {
    if (!publicCatalog.data) return;
    syncCatalog(publicCatalog.data, null);
    setLoading(false);
  }, [publicCatalog.data, syncCatalog]);

  // Citas (solo admin): una sola fuente de revalidación. Al tener staleTime,
  // los remounts de Dashboard/Citas reutilizan el dato cacheado al instante.
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', selectedBranchId, token],
    queryFn: async () => {
      const a = await appointmentsAPI.list(appointmentRange());
      return a?.data ?? [];
    },
    enabled: !!token,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (Array.isArray(appointmentsQuery.data)) setAppointments(appointmentsQuery.data);
  }, [appointmentsQuery.data]);

  // Usuarios (solo admin): refresco ligero respaldado por caché.
  const usersQuery = useQuery({
    queryKey: ['users', token],
    queryFn: async () => (await usersAPI.list())?.data ?? [],
    enabled: !!token,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    if (Array.isArray(usersQuery.data) && usersQuery.data.length > 0) setUsers(usersQuery.data);
  }, [usersQuery.data]);

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

  const hasDashboardCard = useCallback((card) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (userPermissions?.is_admin) return true;
    const cards = userPermissions?.dashboard_cards;
    if (!Array.isArray(cards)) return true;
    return cards.includes(card);
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
      authAPI.logout().catch(() => { });
    }
    setUser(null);
    setToken(null);
    setUserPermissions(null);
    setSelectedBranchId(null);
    setBranchId(null);
    setServices([]);
    setTherapists([]);
    setAppointments([]);
    setPackages([]);
    setCabins([]);
    setUsers([]);
    setBranches([]);
    sessionStorage.removeItem('zenia_user');
    sessionStorage.removeItem('zenia_token');
    queryClient.clear();
  }, [token, queryClient]);

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
      description: service.description ?? '',
      price_per_hour: firstDefined(service.pricePerHour, service.price),
      price_per_half_hour: firstDefined(service.pricePerHalfHour, halfPrice(firstDefined(service.pricePerHour, service.price))),
      duration_min: firstDefined(service.durationMin, service.duration_min, 60),
      category: normalizeCategory(service.category),
      image: getImagePath(service.image) || '',
      is_active: firstDefined(service.is_active, service.active, true),
      branch_ids: toIdList(firstDefined(service.branchIds, service.branch_ids, [])),
    };
    try {
      const res = await servicesAPI.create(payload);
      const newService = transformService(res.data);
      setServices((prev) => [...prev, newService]);
      return res.data;
    } catch (err) {
      console.error('Error creando servicio:', err);
      throw err;
    }
  }, []);

  const updateService = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      description: updates.description,
      price_per_hour: updates.pricePerHour,
      duration_min: updates.durationMin ?? 60,
      category: normalizeCategory(updates.category),
      image: getImagePath(updates.image) || '',
    };
    if (hasOwn(updates, 'pricePerHour') || hasOwn(updates, 'price_per_hour')) {
      payload.price_per_hour = firstDefined(updates.pricePerHour, updates.price_per_hour);
    }
    if (hasOwn(updates, 'pricePerHalfHour') || hasOwn(updates, 'price_per_half_hour')) {
      payload.price_per_half_hour = firstDefined(updates.pricePerHalfHour, updates.price_per_half_hour);
    }
    if (hasOwn(updates, 'is_active') || hasOwn(updates, 'active')) {
      payload.is_active = firstDefined(updates.is_active, updates.active);
    }
    if (hasOwn(updates, 'branchIds') || hasOwn(updates, 'branch_ids')) {
      payload.branch_ids = toIdList(firstDefined(updates.branchIds, updates.branch_ids));
    }
    try {
      const res = await servicesAPI.update(id, payload);
      setServices((prev) => prev.map((s) => (s.id === id ? transformService(res.data) : s)));
    } catch (err) {
      console.error('Error actualizando servicio:', err);
      throw err;
    }
  }, []);

  const deleteService = useCallback(async (id) => {
    try {
      await servicesAPI.delete(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error eliminando servicio:', err);
      throw err;
    }
  }, []);

  const addTherapist = useCallback(async (therapist) => {
    const payload = {
      name: therapist.name,
      specialty: therapist.specialty,
      experience: therapist.experience,
      image: getImagePath(therapist.image) || '',
      is_available: firstDefined(therapist.available, therapist.is_available, true),
      schedule: therapist.schedule,
      service_ids: toIdList(firstDefined(therapist.serviceIds, therapist.service_ids)),
      branch_ids: toIdList(firstDefined(therapist.branchIds, therapist.branch_ids)),
    };
    try {
      const res = await therapistsAPI.create(payload);
      setTherapists((prev) => [...prev, transformTherapist(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando terapeuta:', err);
      throw err;
    }
  }, []);

  const updateTherapist = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      specialty: updates.specialty,
      experience: updates.experience,
      image: getImagePath(updates.image) || '',
      schedule: updates.schedule,
    };
    if (hasOwn(updates, 'available') || hasOwn(updates, 'is_available')) {
      payload.is_available = firstDefined(updates.available, updates.is_available);
    }
    if (hasOwn(updates, 'serviceIds') || hasOwn(updates, 'service_ids')) {
      payload.service_ids = toIdList(firstDefined(updates.serviceIds, updates.service_ids));
    }
    if (hasOwn(updates, 'branchIds') || hasOwn(updates, 'branch_ids')) {
      payload.branch_ids = toIdList(firstDefined(updates.branchIds, updates.branch_ids));
    }
    try {
      const res = await therapistsAPI.update(id, payload);
      setTherapists((prev) => prev.map((t) => (t.id === id ? transformTherapist(res.data) : t)));
      return res.data;
    } catch (err) {
      console.error('Error actualizando terapeuta:', err);
      throw err;
    }
  }, []);

  const deleteTherapist = useCallback(async (id) => {
    try {
      await therapistsAPI.delete(id);
      setTherapists((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error eliminando terapeuta:', err);
      throw err;
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

  const refreshAppointments = useCallback(async (params = {}) => {
    if (!token) return null;
    const key = ['appointments', selectedBranchId, token];
    try {
      const res = await appointmentsAPI.list({ ...appointmentRange(), ...params });
      if (res?.data) {
        setAppointments(res.data);
        queryClient.setQueryData(key, res.data);
      }
      return res?.data ?? null;
    } catch (err) {
      console.error('Error actualizando citas:', err);
      return null;
    }
  }, [token, selectedBranchId, queryClient]);

  const addCabin = useCallback(async (cabin) => {
    const payload = {
      name: cabin.name,
      description: cabin.description,
      capacity: cabin.capacity,
      image: getImagePath(cabin.image),
      is_available: firstDefined(cabin.available, cabin.is_available, true),
      branch_id: firstDefined(cabin.branchId, cabin.branch_id),
      service_ids: toIdList(firstDefined(cabin.serviceIds, cabin.service_ids)),
    };
    try {
      const res = await cabinsAPI.create(payload);
      setCabins((prev) => [...prev, transformCabin(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando cabina:', err);
      throw err;
    }
  }, []);

  const updateCabin = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      description: updates.description,
      capacity: updates.capacity,
      image: getImagePath(updates.image),
    };
    if (hasOwn(updates, 'available') || hasOwn(updates, 'is_available')) {
      payload.is_available = firstDefined(updates.available, updates.is_available);
    }
    if (hasOwn(updates, 'branchId') || hasOwn(updates, 'branch_id')) {
      payload.branch_id = firstDefined(updates.branchId, updates.branch_id);
    }
    if (hasOwn(updates, 'serviceIds') || hasOwn(updates, 'service_ids')) {
      payload.service_ids = toIdList(firstDefined(updates.serviceIds, updates.service_ids));
    }
    try {
      const res = await cabinsAPI.update(id, payload);
      setCabins((prev) => prev.map((c) => (c.id === id ? transformCabin(res.data) : c)));
      return res.data;
    } catch (err) {
      console.error('Error actualizando cabina:', err);
      throw err;
    }
  }, []);

  const deleteCabin = useCallback(async (id) => {
    try {
      await cabinsAPI.delete(id);
      setCabins((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error eliminando cabina:', err);
      throw err;
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
      image: getImagePath(pkg.image) || '',
      is_active: pkg.active ?? true,
      branch_id: pkg.branchId || null,
      service_ids: expandedIds,
      service_hours: expandedHours,
    };
    try {
      if (expandedIds.length === 0) {
        throw new Error('El paquete debe tener al menos un servicio. Agrega sesiones antes de guardar.');
      }
      const res = await packagesAPI.create(payload);
      setPackages((prev) => [...prev, transformPackage(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando paquete:', err);
      throw err;
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
      image: getImagePath(updates.image) || '',
    };
    if (hasOwn(updates, 'active') || hasOwn(updates, 'is_active')) {
      payload.is_active = firstDefined(updates.active, updates.is_active);
    }
    if (hasOwn(updates, 'branchId') || hasOwn(updates, 'branch_id')) {
      payload.branch_id = firstDefined(updates.branchId, updates.branch_id);
    }
    if (hasOwn(updates, 'sessions')) {
      payload.service_ids = expandedIds;
      payload.service_hours = expandedHours;
    }
    try {
      const res = await packagesAPI.update(id, payload);
      setPackages((prev) => prev.map((p) => (p.id === id ? transformPackage(res.data) : p)));
      return res.data;
    } catch (err) {
      console.error('Error actualizando paquete:', err);
      throw err;
    }
  }, []);

  const deletePackage = useCallback(async (id) => {
    try {
      await packagesAPI.delete(id);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error eliminando paquete:', err);
      throw err;
    }
  }, []);

  const addBranch = useCallback(async (branch) => {
    const payload = {
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: firstDefined(branch.is_active, branch.active, true),
      therapist_ids: toIdList(firstDefined(branch.therapistIds, branch.therapist_ids)),
      service_ids: toIdList(firstDefined(branch.serviceIds, branch.service_ids)),
    };
    try {
      const res = await branchesAPI.create(payload);
      setBranches((prev) => [...prev, transformBranch(res.data)]);
      return res.data;
    } catch (err) {
      console.error('Error creando sede:', err);
      throw err;
    }
  }, []);

  const updateBranch = useCallback(async (id, updates) => {
    const payload = {
      name: updates.name,
      address: updates.address,
      phone: updates.phone,
      is_active: firstDefined(updates.is_active, updates.active, true),
      therapist_ids: toIdList(firstDefined(updates.therapistIds, updates.therapist_ids)),
      service_ids: toIdList(firstDefined(updates.serviceIds, updates.service_ids)),
    };
    try {
      const res = await branchesAPI.update(id, payload);
      setBranches((prev) => prev.map((b) => (b.id === id ? transformBranch(res.data) : b)));
      return res.data;
    } catch (err) {
      console.error('Error actualizando sede:', err);
      throw err;
    }
  }, []);

  const deleteBranch = useCallback(async (id) => {
    try {
      await branchesAPI.delete(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Error eliminando sede:', err);
      throw err;
    }
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      if (token) {
        settingsAPI.save(next).catch(() => { });
      }
      return next;
    });
  }, [token]);

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
        users, user, isAdminLoggedIn, settings, userPermissions, loading,
        selectedBranchId, selectBranch,
        hasPermission, hasModulePermission, hasDashboardCard,
        loginAdmin, logoutAdmin,
        updateSettings, updateEntityImage,
        addUser, updateUser, deleteUser,
        addService, updateService, deleteService,
        addTherapist, updateTherapist, deleteTherapist,
        addAppointment, updateAppointment, deleteAppointment, refreshAppointments,
        addCabin, updateCabin, deleteCabin,
        addPackage, updatePackage, deletePackage,
        addBranch, updateBranch, deleteBranch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

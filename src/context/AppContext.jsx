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

const loadTherapistsForAdmin = () => therapistsAPI.listAll();

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

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const toIdList = (items) => Array.isArray(items)
  ? items.map((item) => (item && typeof item === 'object' ? item.id : item)).filter((id) => id !== undefined && id !== null)
  : [];

const setPayloadValue = (payload, key, value) => {
  if (value !== undefined) payload[key] = value;
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
      : Array.isArray(pkg.sessions)
        ? pkg.sessions.map((s) => ({ ...s, hours: parseFloat(s.hours) || 1 }))
        : Array.isArray(pkg.serviceIds)
          ? pkg.serviceIds.map((id) => ({ id, hours: 1 }))
          : [];
    return {
      ...pkg,
      image: getImageUrl(pkg.image),
      sessions,
      serviceIds: sessions.map((s) => s.id),
      originalPrice: parseFloat(pkg.original_price ?? pkg.originalPrice) || 0,
      packagePrice: parseFloat(pkg.package_price ?? pkg.packagePrice) || 0,
      active: pkg.is_active ?? pkg.active ?? true,
      branchId: pkg.branch_id ?? pkg.branchId ?? pkg.branch?.id ?? null,
    };
  };

  const transformService = (svc) => {
    const isActive = svc.is_active ?? svc.active ?? true;
    return {
      ...svc,
      image: getImageUrl(svc.image),
      pricePerHour: parseFloat(svc.price_per_hour ?? svc.pricePerHour ?? svc.price) || 0,
      pricePerHalfHour: parseFloat(svc.price_per_half_hour ?? svc.pricePerHalfHour) || 0,
      durationMin: svc.duration_min ?? svc.durationMin ?? 60,
      active: isActive,
      is_active: isActive,
      branchIds: Array.isArray(svc.branches) ? toIdList(svc.branches) : toIdList(svc.branchIds ?? svc.branch_ids),
    };
  };

  const transformTherapist = (th) => {
    const isAvailable = th.is_available ?? th.available ?? true;
    return {
      ...th,
      image: getImageUrl(th.image),
      available: isAvailable,
      is_available: isAvailable,
      serviceIds: Array.isArray(th.services) ? toIdList(th.services) : toIdList(th.serviceIds ?? th.service_ids),
      branchIds: Array.isArray(th.branches) ? toIdList(th.branches) : toIdList(th.branchIds ?? th.branch_ids),
    };
  };

  const transformCabin = (cab) => {
    const isAvailable = cab.is_available ?? cab.available ?? true;
    return {
      ...cab,
      image: getImageUrl(cab.image),
      available: isAvailable,
      is_available: isAvailable,
      serviceIds: Array.isArray(cab.services) ? toIdList(cab.services) : toIdList(cab.serviceIds ?? cab.service_ids),
      branchId: cab.branch_id ?? cab.branchId ?? cab.branch?.id ?? null,
    };
  };

  const transformBranch = (br) => {
    const isActive = br.is_active ?? br.active ?? true;
    return {
      ...br,
      is_active: isActive,
      active: isActive,
      therapistIds: Array.isArray(br.therapists) ? toIdList(br.therapists) : toIdList(br.therapistIds ?? br.therapist_ids),
      serviceIds: Array.isArray(br.services) ? toIdList(br.services) : toIdList(br.serviceIds ?? br.service_ids),
      cabinCount: Array.isArray(br.cabins) ? br.cabins.length : br.cabinCount ?? 0,
    };
  };

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

  // CatÃƒÂ¡logo pÃƒÂºblico (visitante sin sesiÃƒÂ³n). Solamente se refresca si los datos
  // estÃƒÂ¡n obsoletos, evitando descargas innecesarias y el refetch de 60s previo.
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

  // CatÃƒÂ¡logo admin + permisos. Las peticiones se resuelven en paralelo y cada
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
      const map = (value, transform) => Array.isArray(value) ? value.map(transform) : value;
      return {
        users: ok(u),
        services: map(ok(s), transformService),
        therapists: map(ok(t), transformTherapist),
        cabins: map(ok(c), transformCabin),
        packages: map(ok(p), transformPackage),
        branches: map(ok(b), transformBranch),
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

  // Sincroniza el catÃƒÂ¡logo admin a medida que llega.
  useEffect(() => {
    if (!adminData.data) return;
    syncCatalog(adminData.data, adminData.data.permissions);
    // Marca "listo" apenas llega el catÃƒÂ¡logo mÃƒÂ­nimo que necesitan las pantallas
    // principales (Dashboard/Citas), sin esperar a usuarios/permisos lentos.
    if (
      Array.isArray(adminData.data.services) && adminData.data.services.length > 0 &&
      Array.isArray(adminData.data.therapists) && adminData.data.therapists.length > 0
    ) {
      setLoading(false);
    }
  }, [adminData.data, syncCatalog]);

  // Sincroniza el catÃƒÂ¡logo pÃƒÂºblico a medida que llega.
  useEffect(() => {
    if (!publicCatalog.data) return;
    syncCatalog(publicCatalog.data, null);
    setLoading(false);
  }, [publicCatalog.data, syncCatalog]);

  // Citas (solo admin): una sola fuente de revalidaciÃƒÂ³n. Al tener staleTime,
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

  // Usuarios (solo admin): refresco ligero respaldado por cachÃƒÂ©.
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
    const selectedBranchIds = toIdList(firstDefined(service.branchIds, service.branch_ids, []));
    const payload = {
      name: service.name,
      description: service.description,
      price_per_hour: firstDefined(service.pricePerHour, service.price_per_hour, service.price, 0),
      duration_min: firstDefined(service.durationMin, service.duration_min, 60),
      category: service.category || 'general',
      image: getImagePath(service.image) || '',
      is_active: firstDefined(service.is_active, service.active, true),
      branch_ids: selectedBranchIds,
    };
    try {
      const res = await servicesAPI.create(payload);
      const newService = transformService(res.data);
      setServices((prev) => [...prev, newService]);

      const newId = newService.id;

      const activeBranches = branches.filter((b) => b.is_active ?? true);
      const targetBranches = selectedBranchIds.length > 0
        ? activeBranches.filter((b) => selectedBranchIds.includes(b.id))
        : activeBranches;
      await Promise.all(targetBranches.map(async (b) => {
        if ((b.serviceIds || []).includes(newId)) return;
        const branchServiceIds = [...new Set([...(b.serviceIds || []), newId])];
        try {
          const r = await branchesAPI.update(b.id, {
            name: b.name,
            address: b.address,
            phone: b.phone,
            is_active: b.is_active ?? true,
            service_ids: branchServiceIds,
          });
          setBranches((prev) => prev.map((x) => (x.id === b.id ? transformBranch(r.data) : x)));
        } catch (err) {
          console.error('Error asociando servicio a sede:', err);
        }
      }));

      return newService;
    } catch (err) {
      console.error('Error creando servicio:', err);
      throw err;
    }
  }, [branches]);

  const updateService = useCallback(async (id, updates) => {
    const payload = {};
    setPayloadValue(payload, 'name', updates.name);
    setPayloadValue(payload, 'description', updates.description);
    setPayloadValue(payload, 'price_per_hour', firstDefined(updates.pricePerHour, updates.price_per_hour, updates.price));
    setPayloadValue(payload, 'duration_min', firstDefined(updates.durationMin, updates.duration_min));
    if (hasOwn(updates, 'category') && updates.category !== '') payload.category = updates.category;
    if (hasOwn(updates, 'image')) payload.image = getImagePath(updates.image) || '';
    setPayloadValue(payload, 'is_active', firstDefined(updates.is_active, updates.active));
    if (hasOwn(updates, 'branchIds') || hasOwn(updates, 'branch_ids')) {
      payload.branch_ids = toIdList(firstDefined(updates.branchIds, updates.branch_ids, []));
    }
    try {
      const res = await servicesAPI.update(id, payload);
      const updatedService = transformService(res.data);
      setServices((prev) => prev.map((s) => (s.id === id ? updatedService : s)));
      return updatedService;
    } catch (err) {
      console.error('Error actualizando servicio:', err);
      throw err;
    }
  }, []);

  const deleteService = useCallback(async (id) => {
    await servicesAPI.delete(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addTherapist = useCallback(async (therapist) => {
    const payload = {
      name: therapist.name,
      specialty: therapist.specialty,
      experience: therapist.experience,
      image: getImagePath(therapist.image) || '',
      is_available: firstDefined(therapist.available, therapist.is_available, true),
      schedule: therapist.schedule,
      service_ids: toIdList(firstDefined(therapist.serviceIds, therapist.service_ids, [])),
      branch_ids: toIdList(firstDefined(therapist.branchIds, therapist.branch_ids, [])),
    };
    try {
      const res = await therapistsAPI.create(payload);
      const newTherapist = transformTherapist(res.data);
      setTherapists((prev) => [...prev, newTherapist]);
      return newTherapist;
    } catch (err) {
      console.error('Error creando terapeuta:', err);
      throw err;
    }
  }, []);

  const updateTherapist = useCallback(async (id, updates) => {
    const payload = {};
    setPayloadValue(payload, 'name', updates.name);
    setPayloadValue(payload, 'specialty', updates.specialty);
    setPayloadValue(payload, 'experience', updates.experience);
    if (hasOwn(updates, 'image')) payload.image = getImagePath(updates.image) || '';
    setPayloadValue(payload, 'is_available', firstDefined(updates.available, updates.is_available));
    setPayloadValue(payload, 'schedule', updates.schedule);
    if (hasOwn(updates, 'serviceIds') || hasOwn(updates, 'service_ids')) {
      payload.service_ids = toIdList(firstDefined(updates.serviceIds, updates.service_ids, []));
    }
    if (hasOwn(updates, 'branchIds') || hasOwn(updates, 'branch_ids')) {
      payload.branch_ids = toIdList(firstDefined(updates.branchIds, updates.branch_ids, []));
    }
    try {
      const res = await therapistsAPI.update(id, payload);
      const updatedTherapist = transformTherapist(res.data);
      setTherapists((prev) => prev.map((t) => (t.id === id ? updatedTherapist : t)));
      return updatedTherapist;
    } catch (err) {
      console.error('Error actualizando terapeuta:', err);
      throw err;
    }
  }, []);

  const deleteTherapist = useCallback(async (id) => {
    await therapistsAPI.delete(id);
    setTherapists((prev) => prev.filter((t) => t.id !== id));
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
      service_ids: toIdList(firstDefined(cabin.serviceIds, cabin.service_ids, [])),
    };
    try {
      const res = await cabinsAPI.create(payload);
      const newCabin = transformCabin(res.data);
      setCabins((prev) => [...prev, newCabin]);
      return newCabin;
    } catch (err) {
      console.error('Error creando cabina:', err);
      throw err;
    }
  }, []);

  const updateCabin = useCallback(async (id, updates) => {
    const payload = {};
    setPayloadValue(payload, 'name', updates.name);
    setPayloadValue(payload, 'description', updates.description);
    setPayloadValue(payload, 'capacity', updates.capacity);
    if (hasOwn(updates, 'image')) payload.image = getImagePath(updates.image);
    setPayloadValue(payload, 'is_available', firstDefined(updates.available, updates.is_available));
    setPayloadValue(payload, 'branch_id', firstDefined(updates.branchId, updates.branch_id) || null);
    if (hasOwn(updates, 'serviceIds') || hasOwn(updates, 'service_ids')) {
      payload.service_ids = toIdList(firstDefined(updates.serviceIds, updates.service_ids, []));
    }
    try {
      const res = await cabinsAPI.update(id, payload);
      const updatedCabin = transformCabin(res.data);
      setCabins((prev) => prev.map((c) => (c.id === id ? updatedCabin : c)));
      return updatedCabin;
    } catch (err) {
      console.error('Error actualizando cabina:', err);
      throw err;
    }
  }, []);

  const deleteCabin = useCallback(async (id) => {
    await cabinsAPI.delete(id);
    setCabins((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addPackage = useCallback(async (pkg) => {
    const sessions = Array.isArray(pkg.sessions)
      ? pkg.sessions
      : toIdList(firstDefined(pkg.serviceIds, pkg.service_ids, [])).map((id) => ({ id, hours: 1 }));
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
      hours: firstDefined(pkg.hours, 1),
      original_price: firstDefined(pkg.originalPrice, pkg.original_price, 0),
      package_price: firstDefined(pkg.packagePrice, pkg.package_price, 0),
      image: getImagePath(pkg.image) || '',
      is_active: firstDefined(pkg.active, pkg.is_active, true),
      branch_id: firstDefined(pkg.branchId, pkg.branch_id) || null,
      service_ids: expandedIds,
      service_hours: expandedHours,
    };
    try {
      const res = await packagesAPI.create(payload);
      const newPackage = transformPackage(res.data);
      setPackages((prev) => [...prev, newPackage]);
      return newPackage;
    } catch (err) {
      console.error('Error creando paquete:', err);
      throw err;
    }
  }, []);

  const updatePackage = useCallback(async (id, updates) => {
    const payload = {};
    setPayloadValue(payload, 'name', updates.name);
    setPayloadValue(payload, 'description', updates.description);
    setPayloadValue(payload, 'hours', updates.hours);
    setPayloadValue(payload, 'original_price', firstDefined(updates.originalPrice, updates.original_price));
    setPayloadValue(payload, 'package_price', firstDefined(updates.packagePrice, updates.package_price));
    if (hasOwn(updates, 'image')) payload.image = getImagePath(updates.image) || '';
    setPayloadValue(payload, 'is_active', firstDefined(updates.active, updates.is_active));
    if (hasOwn(updates, 'branchId') || hasOwn(updates, 'branch_id')) {
      payload.branch_id = firstDefined(updates.branchId, updates.branch_id) || null;
    }
    if (hasOwn(updates, 'sessions') || hasOwn(updates, 'serviceIds') || hasOwn(updates, 'service_ids')) {
      const sessions = Array.isArray(updates.sessions)
        ? updates.sessions
        : toIdList(firstDefined(updates.serviceIds, updates.service_ids, [])).map((serviceId) => ({ id: serviceId, hours: 1 }));
      const expandedIds = [];
      const expandedHours = {};
      sessions.forEach((s) => {
        const qty = s.qty || 1;
        for (let i = 0; i < qty; i++) {
          expandedIds.push(s.id);
          expandedHours[s.id] = s.hours || 1;
        }
      });
      payload.service_ids = expandedIds;
      payload.service_hours = expandedHours;
    }
    try {
      const res = await packagesAPI.update(id, payload);
      const updatedPackage = transformPackage(res.data);
      setPackages((prev) => prev.map((p) => (p.id === id ? updatedPackage : p)));
      return updatedPackage;
    } catch (err) {
      console.error('Error actualizando paquete:', err);
      throw err;
    }
  }, []);

  const deletePackage = useCallback(async (id) => {
    await packagesAPI.delete(id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addBranch = useCallback(async (branch) => {
    const payload = {
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: firstDefined(branch.is_active, branch.active, true),
      therapist_ids: toIdList(firstDefined(branch.therapistIds, branch.therapist_ids, [])),
      service_ids: toIdList(firstDefined(branch.serviceIds, branch.service_ids, [])),
    };
    try {
      const res = await branchesAPI.create(payload);
      const newBranch = transformBranch(res.data);
      setBranches((prev) => [...prev, newBranch]);
      return newBranch;
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
      therapist_ids: toIdList(firstDefined(updates.therapistIds, updates.therapist_ids, [])),
      service_ids: toIdList(firstDefined(updates.serviceIds, updates.service_ids, [])),
    };
    try {
      const res = await branchesAPI.update(id, payload);
      const updatedBranch = transformBranch(res.data);
      setBranches((prev) => prev.map((b) => (b.id === id ? updatedBranch : b)));
      return updatedBranch;
    } catch (err) {
      console.error('Error actualizando sede:', err);
      throw err;
    }
  }, []);

  const deleteBranch = useCallback(async (id) => {
    await branchesAPI.delete(id);
    setBranches((prev) => prev.filter((b) => b.id !== id));
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

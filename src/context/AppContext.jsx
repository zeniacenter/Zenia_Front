import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, usersAPI, servicesAPI, packagesAPI, therapistsAPI, cabinsAPI, appointmentsAPI } from '../services/api';
import { BarChart3, Calendar, Users, Home, Sparkles, Package, TrendingUp, Plus, User } from 'lucide-react';

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
];

export function AppProvider({ children }) {
  const [services, setServices] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('zenia_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('zenia_token'));
  const [settings, setSettings] = useState({ priceVisible: true, cabinRequired: true });
  const isAdminLoggedIn = !!token && !!user;

  const transformPackage = (pkg) => ({
    ...pkg,
    serviceIds: pkg.services ? pkg.services.map((s) => s.id) : [],
    originalPrice: parseFloat(pkg.original_price) || 0,
    packagePrice: parseFloat(pkg.package_price) || 0,
    active: pkg.is_active ?? true,
  });

  const transformService = (svc) => ({
    ...svc,
    pricePerHour: parseFloat(svc.price_per_hour) || 0,
    pricePerHalfHour: parseFloat(svc.price_per_half_hour) || 0,
  });

  const transformTherapist = (th) => ({
    ...th,
    available: th.is_available ?? true,
  });

  const transformCabin = (cab) => ({
    ...cab,
    available: cab.is_available ?? true,
    serviceIds: cab.services ? cab.services.map((s) => s.id) : [],
  });

  useEffect(() => {
    Promise.all([
      servicesAPI.list(),
      therapistsAPI.list(),
      cabinsAPI.list(),
      packagesAPI.list(),
    ]).then(([s, t, c, p]) => {
      setServices(s.data.map(transformService));
      setTherapists(t.data.map(transformTherapist));
      setCabins(c.data.map(transformCabin));
      setPackages(p.data.map(transformPackage));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (token) {
      Promise.all([
        usersAPI.list(),
        servicesAPI.list(),
        therapistsAPI.list(),
        cabinsAPI.list(),
        packagesAPI.list(),
        appointmentsAPI.list(),
      ]).then(([u, s, t, c, p, a]) => {
        setUsers(u.data);
        setServices(s.data.map(transformService));
        setTherapists(t.data.map(transformTherapist));
        setCabins(c.data.map(transformCabin));
        setPackages(p.data.map(transformPackage));
        setAppointments(a.data);
      }).catch(() => {});
    }
  }, [token]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) ?? false;
  }, [user]);

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
    sessionStorage.removeItem('zenia_user');
    sessionStorage.removeItem('zenia_token');
  }, [token]);

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
      setAppointments((prev) => [...prev, res.data]);
      return res.data;
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
    const payload = {
      name: pkg.name,
      description: pkg.description,
      hours: pkg.hours,
      original_price: pkg.originalPrice,
      package_price: pkg.packagePrice,
      image: pkg.image || '',
      is_active: pkg.active ?? true,
      service_ids: pkg.serviceIds || [],
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
    const payload = {
      name: updates.name,
      description: updates.description,
      hours: updates.hours,
      original_price: updates.originalPrice,
      package_price: updates.packagePrice,
      image: updates.image || '',
      is_active: updates.active ?? true,
      service_ids: updates.serviceIds || [],
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
        services, therapists, appointments, packages, cabins,
        users, user, isAdminLoggedIn, settings,
        hasPermission,
        loginAdmin, logoutAdmin,
        updateSettings, updateEntityImage,
        addUser, updateUser, deleteUser,
        addService, updateService, deleteService,
        addTherapist, updateTherapist, deleteTherapist,
        addAppointment, updateAppointment, deleteAppointment,
        addCabin, updateCabin, deleteCabin,
        addPackage, updatePackage, deletePackage,
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

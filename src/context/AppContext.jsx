import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, usersAPI, servicesAPI, packagesAPI, therapistsAPI, cabinsAPI, appointmentsAPI } from '../services/api';
import { initialServices, initialTherapists, initialAppointments, initialPackages, initialCabins } from '../data/mockData';

const AppContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;
const useApi = !!API_URL;

export const AVAILABLE_VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'citas', label: 'Citas', icon: '📅' },
  { id: 'terapeutas', label: 'Terapeutas', icon: '👥' },
  { id: 'cabinas', label: 'Cabinas', icon: '🏠' },
  { id: 'servicios', label: 'Servicios', icon: '💆' },
  { id: 'paquetes', label: 'Paquetes', icon: '📦' },
  { id: 'reportes', label: 'Reportes', icon: '📈' },
  { id: 'agendar', label: 'Agendar Cita', icon: '➕' },
  { id: 'usuarios', label: 'Usuarios', icon: '👤' },
];

const DEFAULT_USERS = [
  { id: 'usr-1', name: 'Admin', email: 'admin@zenia.pe', password: 'admin123', role: 'admin', permissions: AVAILABLE_VIEWS.map((v) => v.id), active: true },
  { id: 'usr-2', name: 'María García', email: 'maria@zenia.pe', password: 'maria123', role: 'recepcionista', permissions: ['citas', 'agendar', 'servicios', 'paquetes'], active: true },
  { id: 'usr-3', name: 'Carlos López', email: 'carlos@zenia.pe', password: 'carlos123', role: 'terapeuta', permissions: ['citas'], active: true },
];

export function AppProvider({ children }) {
  const [services, setServices] = useState(initialServices);
  const [therapists, setTherapists] = useState(initialTherapists);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [packages, setPackages] = useState(initialPackages);
  const [cabins, setCabins] = useState(initialCabins);
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('zenia_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('zenia_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('zenia_token'));
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('zenia_settings');
    return saved ? JSON.parse(saved) : { priceVisible: true, cabinRequired: true };
  });
  const isAdminLoggedIn = !!token && !!user;

  useEffect(() => {
    localStorage.setItem('zenia_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('zenia_settings', JSON.stringify(settings));
  }, [settings]);

  // Transform API data to frontend format
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
  });

  // Load public data on mount (for client pages)
  useEffect(() => {
    if (useApi) {
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
    }
  }, []);

  // Load admin data when logged in
  useEffect(() => {
    if (useApi && token) {
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
    if (!useApi) {
      const found = users.find((u) => u.email === email && u.password === password && u.active);
      if (found) {
        const allPerms = AVAILABLE_VIEWS.map((v) => v.id);
        const permissions = found.role === 'admin' ? allPerms : (found.permissions || []);
        const userData = { id: found.id, name: found.name, email: found.email, role: found.role, permissions };
        setUser(userData);
        setToken(`mock-token-${found.id}`);
        localStorage.setItem('zenia_user', JSON.stringify(userData));
        localStorage.setItem('zenia_token', `mock-token-${found.id}`);
        return true;
      }
      return false;
    }
    try {
      const res = await authAPI.login(email, password);
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('zenia_user', JSON.stringify(res.data.user));
      localStorage.setItem('zenia_token', res.data.token);
      return true;
    } catch {
      return false;
    }
  }, [users]);

  const logoutAdmin = useCallback(async () => {
    if (useApi && token) {
      try { await authAPI.logout(); } catch {}
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('zenia_user');
    localStorage.removeItem('zenia_token');
  }, [token]);

  const addUser = useCallback(async (userData) => {
    if (useApi) {
      try {
        const res = await usersAPI.create(userData);
        setUsers((prev) => [...prev, res.data]);
        return res.data;
      } catch (err) {
        console.error('Error creando usuario:', err);
        return null;
      }
    }
    const newUser = {
      ...userData,
      id: `usr-${Date.now()}`,
      permissions: userData.permissions || [],
      active: true,
    };
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  }, []);

  const updateUser = useCallback(async (id, updates) => {
    if (useApi) {
      try {
        const res = await usersAPI.update(id, updates);
        setUsers((prev) => prev.map((u) => (u.id === id ? res.data : u)));
        return res.data;
      } catch (err) {
        console.error('Error actualizando usuario:', err);
        return null;
      }
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  }, []);

  const deleteUser = useCallback(async (id) => {
    if (useApi) {
      try {
        await usersAPI.delete(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } catch (err) {
        console.error('Error eliminando usuario:', err);
      }
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }, []);

  const addService = useCallback(async (service) => {
    if (useApi) {
      const res = await servicesAPI.create(service);
      setServices((prev) => [...prev, res.data]);
    } else {
      setServices((prev) => [...prev, { ...service, id: `srv-${Date.now()}` }]);
    }
  }, []);

  const updateService = useCallback(async (id, updates) => {
    if (useApi) {
      await servicesAPI.update(id, updates);
    }
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteService = useCallback(async (id) => {
    if (useApi) {
      await servicesAPI.delete(id);
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addTherapist = useCallback(async (therapist) => {
    if (useApi) {
      const res = await therapistsAPI.create(therapist);
      setTherapists((prev) => [...prev, res.data]);
    } else {
      setTherapists((prev) => [...prev, { ...therapist, id: `th-${Date.now()}` }]);
    }
  }, []);

  const updateTherapist = useCallback(async (id, updates) => {
    if (useApi) {
      await therapistsAPI.update(id, updates);
    }
    setTherapists((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTherapist = useCallback(async (id) => {
    if (useApi) {
      await therapistsAPI.delete(id);
    }
    setTherapists((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAppointment = useCallback(async (appointment) => {
    if (useApi) {
      try {
        const res = await appointmentsAPI.create(appointment);
        setAppointments((prev) => [...prev, res.data]);
        return res.data;
      } catch (err) {
        console.error('Error creando cita:', err);
        throw err;
      }
    }
    const newApt = { ...appointment, id: `apt-${Date.now()}` };
    setAppointments((prev) => [...prev, newApt]);
    return newApt;
  }, []);

  const updateAppointment = useCallback(async (id, updates) => {
    if (useApi) {
      await appointmentsAPI.update(id, updates);
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAppointment = useCallback(async (id) => {
    if (useApi) {
      await appointmentsAPI.delete(id);
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addCabin = useCallback(async (cabin) => {
    if (useApi) {
      const res = await cabinsAPI.create(cabin);
      setCabins((prev) => [...prev, res.data]);
    } else {
      setCabins((prev) => [...prev, { ...cabin, id: `cab-${Date.now()}` }]);
    }
  }, []);

  const updateCabin = useCallback(async (id, updates) => {
    if (useApi) {
      await cabinsAPI.update(id, updates);
    }
    setCabins((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCabin = useCallback(async (id) => {
    if (useApi) {
      await cabinsAPI.delete(id);
    }
    setCabins((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addPackage = useCallback(async (pkg) => {
    if (useApi) {
      const res = await packagesAPI.create(pkg);
      setPackages((prev) => [...prev, res.data]);
    } else {
      setPackages((prev) => [...prev, { ...pkg, id: `pkg-${Date.now()}` }]);
    }
  }, []);

  const updatePackage = useCallback(async (id, updates) => {
    if (useApi) {
      await packagesAPI.update(id, updates);
    }
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePackage = useCallback(async (id) => {
    if (useApi) {
      await packagesAPI.delete(id);
    }
    setPackages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        services, therapists, appointments, packages, cabins,
        users, user, isAdminLoggedIn, settings,
        hasPermission,
        loginAdmin, logoutAdmin,
        updateSettings,
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

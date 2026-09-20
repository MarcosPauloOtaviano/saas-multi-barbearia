"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { demoAppointments, demoBarbers, demoClients, demoNotifications, demoServices, demoTeamMembers } from "@/lib/demo-data";
import { hasSchedulingConflict } from "@/lib/scheduling";
import type { AppNotification, Appointment, Barber, Client, MemberRole, Service, TeamMember } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type NewAppointment = Omit<Appointment, "id" | "status" | "source">;
type NewClient = Omit<Client, "id" | "visits" | "lastVisit">;
type NewService = Omit<Service, "id" | "active">;
type NewBarber = Pick<Barber, "name" | "color">;
type TeamInvite = Pick<TeamMember, "name" | "email" | "role"> & { color: string };

function barberMediaPath(publicUrl?: string) {
  if (!publicUrl) return null;
  const marker = "/storage/v1/object/public/barber-media/";
  const index = publicUrl.indexOf(marker);
  return index >= 0 ? decodeURIComponent(publicUrl.slice(index + marker.length)) : null;
}

type DemoContextValue = {
  appointments: Appointment[];
  customerAppointments: Appointment[];
  clients: Client[];
  services: Service[];
  barbers: Barber[];
  teamMembers: TeamMember[];
  notifications: AppNotification[];
  role: MemberRole;
  currentBarberId: string | null;
  canManage: boolean;
  setRole: (role: MemberRole) => void;
  addAppointment: (appointment: NewAppointment) => Promise<{ ok: boolean; message: string }>;
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => Promise<void>;
  rescheduleAppointment: (id: string, date: string, time: string) => Promise<{ ok: boolean; message: string }>;
  addClient: (client: NewClient) => Promise<void>;
  addService: (service: NewService) => Promise<{ ok: boolean; message: string }>;
  addBarber: (barber: NewBarber) => Promise<{ ok: boolean; message: string }>;
  inviteTeamMember: (member: TeamInvite) => Promise<{ ok: boolean; message: string }>;
  updateBarberAvatar: (barberId: string, file: File) => Promise<{ ok: boolean; message: string }>;
  toggleService: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);
const storageKey = "stilo-sampa-demo-v2";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [appointments, setAppointments] = useState(demoAppointments);
  const [clients, setClients] = useState(demoClients);
  const [services, setServices] = useState(demoServices);
  const [barbers, setBarbers] = useState(demoBarbers);
  const [teamMembers, setTeamMembers] = useState(demoTeamMembers);
  const [notifications, setNotifications] = useState(demoNotifications);
  const [role, setSessionRole] = useState<MemberRole>("owner");
  const [remoteBarberId, setRemoteBarberId] = useState<string | null>(null);
  const hydrated = useRef(false);
  const remoteTenantId = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (hasSupabaseEnv) {
        const path = window.location.pathname;
        if (["/login", "/cadastro", "/onboarding"].includes(path) || path.startsWith("/b/") || path.startsWith("/agendamento/")) return;
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: membership } = await supabase.from("memberships").select("id,barbershop_id,role,status").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
          if (!membership) { window.location.replace("/onboarding"); return; }
          setSessionRole(membership.role as MemberRole);
          remoteTenantId.current = membership.barbershop_id;
          const tenantId = membership.barbershop_id;
          const [{ data: shop }, { data: remoteServices }, { data: remoteBarbers }, { data: remoteClients }, { data: remoteAppointments }, { data: remoteNotifications }, { data: remoteMemberships }] = await Promise.all([
            supabase.from("barbershops").select("timezone").eq("id", tenantId).single(),
            supabase.from("services").select("id,name,description,duration_minutes,price_cents,active").eq("barbershop_id", tenantId).order("name"),
            supabase.from("barbers").select("id,membership_id,display_name,color,avatar_url,active").eq("barbershop_id", tenantId).order("display_name"),
            supabase.from("clients").select("id,name,phone,email,notes,created_at").eq("barbershop_id", tenantId).eq("active", true).order("name"),
            supabase.from("appointments").select("id,barber_id,client_id,starts_at,ends_at,status,source,clients(name),barbers(display_name),appointment_services(service_id,service_name,duration_minutes,price_cents)").eq("barbershop_id", tenantId).order("starts_at"),
            supabase.from("notifications").select("id,type,title,body,created_at,read_at,action_url").eq("barbershop_id", tenantId).order("created_at", { ascending: false }).limit(50),
            supabase.from("memberships").select("id,user_id,role,status").eq("barbershop_id", tenantId).order("created_at"),
          ]);
          const timezone = shop?.timezone ?? "America/Sao_Paulo";
          if (remoteServices) setServices(remoteServices.map((item) => ({ id: item.id, name: item.name, description: item.description ?? "", durationMinutes: item.duration_minutes, priceCents: item.price_cents, active: item.active })));
          if (remoteBarbers) {
            setBarbers(remoteBarbers.map((item) => ({ id: item.id, name: item.display_name, avatarUrl: item.avatar_url ?? undefined, role: "Barbeiro" as const, color: item.color, todayCount: 0, workingHours: "Ver disponibilidade", active: item.active })));
            setRemoteBarberId(remoteBarbers.find((item) => item.membership_id === membership.id)?.id ?? null);
          }
          if (remoteMemberships) {
            const userIds = remoteMemberships.map((item) => item.user_id);
            const { data: remoteProfiles } = userIds.length ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds) : { data: [] };
            setTeamMembers(remoteMemberships.map((item) => {
              const barber = remoteBarbers?.find((candidate) => candidate.membership_id === item.id);
              return {
                id: item.id,
                userId: item.user_id,
                name: remoteProfiles?.find((profile) => profile.id === item.user_id)?.full_name ?? barber?.display_name ?? "Pessoa da equipe",
                email: remoteProfiles?.find((profile) => profile.id === item.user_id)?.email ?? "E-mail protegido",
                role: item.role as MemberRole,
                status: item.status as TeamMember["status"],
                barberId: barber?.id,
                color: barber?.color,
              };
            }));
          }
          if (remoteClients) setClients(remoteClients.map((item) => ({ id: item.id, name: item.name, phone: item.phone ?? "", email: item.email ?? "", visits: 0, lastVisit: "Sem histórico", notes: item.notes ?? "" })));
          if (remoteAppointments) setAppointments(remoteAppointments.map((item) => {
            const client = Array.isArray(item.clients) ? item.clients[0] : item.clients;
            const barber = Array.isArray(item.barbers) ? item.barbers[0] : item.barbers;
            const service = Array.isArray(item.appointment_services) ? item.appointment_services[0] : item.appointment_services;
            const startsAt = new Date(item.starts_at);
            const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(startsAt);
            const part = (type: string) => dateParts.find((value) => value.type === type)?.value ?? "";
            const statusMap: Record<string, Appointment["status"]> = { cancelled_by_client: "cancelled", cancelled_by_shop: "cancelled" };
            return { id: item.id, clientId: item.client_id, clientName: client?.name ?? "Cliente", barberId: item.barber_id, barberName: barber?.display_name ?? "Barbeiro", serviceId: service?.service_id ?? "", serviceName: service?.service_name ?? "Atendimento", date: `${part("year")}-${part("month")}-${part("day")}`, time: new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(startsAt), durationMinutes: service?.duration_minutes ?? Math.round((new Date(item.ends_at).getTime() - startsAt.getTime()) / 60000), priceCents: service?.price_cents ?? 0, status: statusMap[item.status] ?? item.status as Appointment["status"], source: item.source as Appointment["source"] };
          }));
          if (remoteNotifications) setNotifications(remoteNotifications.map((item) => ({ id: item.id, type: item.type === "appointment_created" ? "booking" : item.type === "appointment_confirmed" ? "confirmation" : item.type === "appointment_cancelled" ? "cancellation" : item.type === "return_opportunity" ? "return" : "upcoming", title: item.title, body: item.body, time: new Date(item.created_at).toLocaleString("pt-BR"), read: Boolean(item.read_at), actionUrl: item.action_url ?? "/notificacoes" })));
          hydrated.current = true;
        } catch { /* Keep safe demo fixtures if the remote project is temporarily unavailable. */ }
        return;
      }
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<{
            appointments: Appointment[];
            clients: Client[];
            services: Service[];
            notifications: AppNotification[];
            teamMembers: TeamMember[];
            role: MemberRole;
          }>;
          if (parsed.appointments) setAppointments(parsed.appointments);
          if (parsed.clients) setClients(parsed.clients);
          if (parsed.services) setServices(parsed.services);
          if (parsed.notifications) setNotifications(parsed.notifications);
          if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
          if (parsed.role) setSessionRole(parsed.role);
        } else {
          window.localStorage.setItem(storageKey, JSON.stringify({ appointments: demoAppointments, clients: demoClients, services: demoServices, notifications: demoNotifications, teamMembers: demoTeamMembers, role: "owner" }));
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        hydrated.current = true;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv && hydrated.current) window.localStorage.setItem(storageKey, JSON.stringify({ appointments, clients, services, notifications, teamMembers, role }));
  }, [appointments, clients, services, notifications, teamMembers, role]);

  const currentBarberId = role === "barber" ? (hasSupabaseEnv ? remoteBarberId : "barber-leo") : null;
  const visibleAppointments = currentBarberId ? appointments.filter((item) => item.barberId === currentBarberId) : appointments;
  const visibleClientIds = new Set(visibleAppointments.map((item) => item.clientId));
  const visibleClients = currentBarberId ? clients.filter((item) => visibleClientIds.has(item.id)) : clients;
  const visibleAppointmentIds = new Set(visibleAppointments.map((item) => item.id));
  const visibleNotifications = currentBarberId
    ? notifications.filter((item) => !item.actionUrl.includes("appointment=") || [...visibleAppointmentIds].some((id) => item.actionUrl.includes(id)))
    : notifications;

  const value = useMemo<DemoContextValue>(() => ({
    appointments: visibleAppointments,
    customerAppointments: appointments,
    clients: visibleClients,
    services,
    barbers,
    teamMembers,
    notifications: visibleNotifications,
    role,
    currentBarberId,
    canManage: role === "owner" || role === "manager",
    setRole: (nextRole) => { if (!hasSupabaseEnv) setSessionRole(nextRole); },
    addAppointment: async (input) => {
      if (hasSupabaseEnv && remoteTenantId.current) {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("create_internal_appointment", { target_barbershop_id: remoteTenantId.current, selected_service_id: input.serviceId, selected_barber_id: input.barberId, selected_client_id: input.clientId, local_starts_at: `${input.date}T${input.time}:00`, appointment_notes: null });
        if (error) return { ok: false, message: error.code === "23P01" ? "Esse barbeiro já possui um atendimento nesse intervalo." : "Não foi possível criar o agendamento." };
        setAppointments((current) => [...current, { ...input, id: String(data), status: "pending", source: "internal" }]);
        return { ok: true, message: "Agendamento criado e lembretes programados." };
      }
      const overlaps = hasSchedulingConflict(appointments, input);
      if (overlaps) return { ok: false, message: "Esse intervalo já está ocupado para o barbeiro ou para o cliente." };
      setAppointments((current) => [
        ...current,
        { ...input, id: crypto.randomUUID(), status: "pending", source: "internal" },
      ]);
      return { ok: true, message: "Agendamento criado e lembretes programados." };
    },
    updateAppointmentStatus: async (id, status) => {
      if (hasSupabaseEnv && remoteTenantId.current) {
        const remoteStatus = status === "cancelled" ? "cancelled_by_shop" : status;
        await createClient().from("appointments").update({ status: remoteStatus }).eq("id", id).eq("barbershop_id", remoteTenantId.current);
      }
      setAppointments((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    },
    rescheduleAppointment: async (id, date, time) => {
      const appointment = appointments.find((item) => item.id === id);
      if (!appointment) return { ok: false, message: "Agendamento não encontrado." };
      const hasConflict = hasSchedulingConflict(appointments.filter((item) => item.id !== id), { ...appointment, date, time });
      if (hasConflict) return { ok: false, message: "Esse intervalo já está ocupado para o barbeiro ou para o cliente." };
      if (hasSupabaseEnv && remoteTenantId.current) {
        const { error } = await createClient().rpc("reschedule_appointment", { target_barbershop_id: remoteTenantId.current, target_appointment_id: id, local_starts_at: `${date}T${time}:00` });
        if (error) return { ok: false, message: error.code === "23P01" ? "Esse barbeiro já possui um atendimento nesse intervalo." : "Não foi possível remarcar o atendimento." };
      }
      setAppointments((current) => current.map((item) => item.id === id ? { ...item, date, time } : item));
      return { ok: true, message: "Atendimento remarcado e lembretes atualizados." };
    },
    addClient: async (client) => {
      let id = crypto.randomUUID();
      if (hasSupabaseEnv && remoteTenantId.current) {
        const { data, error } = await createClient().from("clients").insert({ barbershop_id: remoteTenantId.current, name: client.name, phone: client.phone, email: client.email, notes: client.notes }).select("id").single();
        if (error) return;
        id = data.id;
      }
      setClients((current) => [{ ...client, id, visits: 0, lastVisit: "Ainda não atendido" }, ...current]);
    },
    addService: async (service) => {
      let id = crypto.randomUUID();
      if (hasSupabaseEnv && remoteTenantId.current) {
        const supabase = createClient();
        const { data, error } = await supabase.from("services").insert({ barbershop_id: remoteTenantId.current, name: service.name, description: service.description, duration_minutes: service.durationMinutes, price_cents: service.priceCents }).select("id").single();
        if (error) return { ok: false, message: "Não foi possível cadastrar o serviço." };
        id = data.id;
        if (barbers.length) await supabase.from("barber_services").insert(barbers.map((barber) => ({ barbershop_id: remoteTenantId.current, barber_id: barber.id, service_id: id })));
      }
      setServices((current) => [...current, { ...service, id, active: true }]);
      return { ok: true, message: "Serviço cadastrado." };
    },
    addBarber: async (barber) => {
      let id = crypto.randomUUID();
      if (hasSupabaseEnv && remoteTenantId.current) {
        const supabase = createClient();
        const { data, error } = await supabase.from("barbers").insert({ barbershop_id: remoteTenantId.current, display_name: barber.name, color: barber.color }).select("id").single();
        if (error) return { ok: false, message: "Não foi possível adicionar o profissional." };
        id = data.id;
        const activeServices = services.filter((service) => service.active);
        if (activeServices.length) await supabase.from("barber_services").insert(activeServices.map((service) => ({ barbershop_id: remoteTenantId.current, barber_id: id, service_id: service.id })));
      }
      setBarbers((current) => [...current, { ...barber, id, role: "Barbeiro", todayCount: 0, workingHours: "09:00–18:00", active: true }]);
      return { ok: true, message: "Profissional adicionado." };
    },
    inviteTeamMember: async (member) => {
      if (hasSupabaseEnv && remoteTenantId.current) {
        const { data, error } = await createClient().functions.invoke("invite-team-member", {
          body: { barbershopId: remoteTenantId.current, fullName: member.name, email: member.email, role: member.role, color: member.color },
        });
        if (error || !data?.member) return { ok: false, message: "Não foi possível enviar o convite. Verifique se o e-mail já possui uma conta." };
        setTeamMembers((current) => [...current, data.member as TeamMember]);
        if (data.member.barberId) setBarbers((current) => [...current, { id: data.member.barberId, name: member.name, role: "Barbeiro", color: member.color, todayCount: 0, workingHours: "Definir horários", active: true }]);
        return { ok: true, message: "Convite enviado. O acesso só será ativado pelo link do e-mail." };
      }

      const duplicate = teamMembers.some((item) => item.email.toLowerCase() === member.email.toLowerCase());
      if (duplicate) return { ok: false, message: "Este e-mail já faz parte da equipe." };
      const membershipId = crypto.randomUUID();
      const barberId = member.role === "barber" ? crypto.randomUUID() : undefined;
      setTeamMembers((current) => [...current, { ...member, id: membershipId, userId: crypto.randomUUID(), status: "invited", barberId }]);
      if (barberId) setBarbers((current) => [...current, { id: barberId, name: member.name, role: "Barbeiro", color: member.color, todayCount: 0, workingHours: "Definir horários", active: true }]);
      return { ok: true, message: "Convite de demonstração criado com acesso pendente." };
    },
    updateBarberAvatar: async (barberId, file) => {
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowedTypes.has(file.type)) return { ok: false, message: "Use uma imagem JPG, PNG ou WebP." };
      if (file.size > 5 * 1024 * 1024) return { ok: false, message: "A foto deve ter no máximo 5 MB." };
      const barber = barbers.find((item) => item.id === barberId);
      if (!barber) return { ok: false, message: "Profissional não encontrado." };

      if (hasSupabaseEnv && remoteTenantId.current) {
        const supabase = createClient();
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${remoteTenantId.current}/avatars/${barberId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("barber-media").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
        if (uploadError) return { ok: false, message: "Não foi possível enviar a foto." };
        const { data: publicImage } = supabase.storage.from("barber-media").getPublicUrl(path);
        const { error: updateError } = await supabase.from("barbers").update({ avatar_url: publicImage.publicUrl }).eq("id", barberId).eq("barbershop_id", remoteTenantId.current);
        if (updateError) {
          await supabase.storage.from("barber-media").remove([path]);
          return { ok: false, message: "A foto foi enviada, mas o perfil não pôde ser atualizado." };
        }
        const previousPath = barberMediaPath(barber.avatarUrl);
        if (previousPath) await supabase.storage.from("barber-media").remove([previousPath]);
        setBarbers((current) => current.map((item) => item.id === barberId ? { ...item, avatarUrl: publicImage.publicUrl } : item));
        return { ok: true, message: `Foto de ${barber.name} atualizada.` };
      }

      const previewUrl = URL.createObjectURL(file);
      setBarbers((current) => current.map((item) => item.id === barberId ? { ...item, avatarUrl: previewUrl } : item));
      return { ok: true, message: `Foto de demonstração de ${barber.name} atualizada.` };
    },
    toggleService: async (id) => {
      const target = services.find((service) => service.id === id);
      if (!target) return;
      if (hasSupabaseEnv && remoteTenantId.current) await createClient().from("services").update({ active: !target.active }).eq("id", id).eq("barbershop_id", remoteTenantId.current);
      setServices((current) => current.map((service) => service.id === id ? { ...service, active: !service.active } : service));
    },
    markNotificationRead: async (id) => {
      if (hasSupabaseEnv && remoteTenantId.current) await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("barbershop_id", remoteTenantId.current);
      setNotifications((current) => current.map((note) => note.id === id ? { ...note, read: true } : note));
    },
    markAllNotificationsRead: async () => {
      if (hasSupabaseEnv && remoteTenantId.current) await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("barbershop_id", remoteTenantId.current).is("read_at", null);
      setNotifications((current) => current.map((note) => ({ ...note, read: true })));
    },
    resetDemo: () => {
      setAppointments(demoAppointments);
      setClients(demoClients);
      setServices(demoServices);
      setNotifications(demoNotifications);
      setTeamMembers(demoTeamMembers);
      setSessionRole("owner");
      window.localStorage.removeItem(storageKey);
    },
  }), [appointments, visibleAppointments, visibleClients, services, barbers, teamMembers, visibleNotifications, role, currentBarberId]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}

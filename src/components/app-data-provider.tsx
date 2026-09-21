"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { initialAppointments, initialBarbers, initialClients, initialNotifications, initialServices, initialTeamMembers } from "@/lib/initial-data";
import { hasSchedulingConflict } from "@/lib/scheduling";
import type { AppNotification, Appointment, Barber, Client, MemberRole, Service, TeamMember, WorkingHour, Product, ScheduleDay } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type NewAppointment = Omit<Appointment, "id" | "status" | "source">;
type NewClient = Omit<Client, "id" | "visits" | "lastVisit">;
type NewService = Omit<Service, "id" | "active">;
type EditableService = Omit<Service, "active">;
type NewBarber = Pick<Barber, "name" | "color">;
type TeamInvite = Pick<TeamMember, "name" | "email" | "role"> & { color: string; barberId?: string; initialPassword: string };
type ScheduleEntry = Pick<WorkingHour, "weekday" | "startsAt" | "endsAt" | "active">;

function barberMediaPath(publicUrl?: string) {
  if (!publicUrl) return null;
  const marker = "/storage/v1/object/public/barber-media/";
  const index = publicUrl.indexOf(marker);
  return index >= 0 ? decodeURIComponent(publicUrl.slice(index + marker.length)) : null;
}

type AppDataContextValue = {
  appointments: Appointment[];
  customerAppointments: Appointment[];
  clients: Client[];
  services: Service[];
  products: Product[];
  loading: boolean;
  loadError: string;
  shopHours: ScheduleDay[];
  bookingPaused: boolean;
  ownBarberId: string | null;
  saveShopSchedule: (schedule: ScheduleDay[], paused: boolean) => Promise<{ ok: boolean; message: string }>;
  saveProduct: (product: Omit<Product, "id"> & { id?: string }) => Promise<{ ok: boolean; message: string }>;
  setProductActive: (id: string, active: boolean) => Promise<{ ok: boolean; message: string }>;
  barbers: Barber[];
  teamMembers: TeamMember[];
  workingHours: WorkingHour[];
  notifications: AppNotification[];
  role: MemberRole;
  currentBarberId: string | null;
  currentUserName: string;
  shopName: string;
  canManage: boolean;
  addAppointment: (appointment: NewAppointment) => Promise<{ ok: boolean; message: string }>;
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => Promise<void>;
  rescheduleAppointment: (id: string, date: string, time: string) => Promise<{ ok: boolean; message: string }>;
  addClient: (client: NewClient) => Promise<void>;
  addService: (service: NewService) => Promise<{ ok: boolean; message: string }>;
  updateService: (service: EditableService) => Promise<{ ok: boolean; message: string }>;
  addBarber: (barber: NewBarber) => Promise<{ ok: boolean; message: string }>;
  inviteTeamMember: (member: TeamInvite) => Promise<{ ok: boolean; message: string }>;
  setBarberActive: (barberId: string, active: boolean) => Promise<{ ok: boolean; message: string }>;
  deleteBarber: (barberId: string) => Promise<{ ok: boolean; message: string }>;
  saveBarberSchedule: (barberId: string, schedule: ScheduleEntry[]) => Promise<{ ok: boolean; message: string }>;
  updateBarberAvatar: (barberId: string, file: File) => Promise<{ ok: boolean; message: string }>;
  toggleService: (id: string) => Promise<{ ok: boolean; message: string }>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);
const unavailable = { ok: false, message: "O banco de produção ainda não está conectado." };

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tenantSlug = !pathname.endsWith('/entrar') ? pathname.match(/^\/admin\/([^/]+)/)?.[1] ?? null : null;
  const [readyTenant, setReadyTenant] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [shopHours, setShopHours] = useState<ScheduleDay[]>([]);
  const [bookingPaused, setBookingPaused] = useState(false);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [clients, setClients] = useState(initialClients);
  const [services, setServices] = useState(initialServices);
  const [barbers, setBarbers] = useState(initialBarbers);
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [role, setRole] = useState<MemberRole>("barber");
  const [currentUserName, setCurrentUserName] = useState("Mantena");
  const [shopName, setShopName] = useState("Barbearia Stilo Sampa");
  const [remoteBarberId, setRemoteBarberId] = useState<string | null>(null);
  const remoteTenantId = useRef<string | null>(null);

  useEffect(() => {
    remoteTenantId.current = null;
    if (!hasSupabaseEnv || !tenantSlug) return;
    let cancelled = false;
    const slug = decodeURIComponent(tenantSlug);

    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('session unavailable');
        const { data: membership } = await supabase
          .from("memberships")
          .select("id,barbershop_id,role,status,barbershops!inner(name,slug,timezone,booking_paused)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("barbershops.slug", slug)
          .maybeSingle();
        if (!membership) throw new Error('membership unavailable');
        if (cancelled) return;

        const shopRecord = Array.isArray(membership.barbershops) ? membership.barbershops[0] : membership.barbershops;
        const tenantId = membership.barbershop_id;
        const timezone = shopRecord?.timezone ?? "America/Sao_Paulo";
        remoteTenantId.current = tenantId;
        setRole(membership.role as MemberRole);
        setShopName(shopRecord?.name ?? "Barbearia");
        setBookingPaused(Boolean(shopRecord?.booking_paused));

        const [{ data: profile }, { data: remoteServices }, { data: remoteBarbers }, { data: remoteClients }, { data: remoteAppointments }, { data: remoteNotifications }, { data: remoteMemberships }, { data: remoteWorkingHours }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
          supabase.from("services").select("id,name,description,duration_minutes,price_cents,active").eq("barbershop_id", tenantId).order("name"),
          supabase.from("barbers").select("id,membership_id,display_name,color,avatar_url,active").eq("barbershop_id", tenantId).order("display_name"),
          supabase.from("clients").select("id,name,phone,email,notes,created_at").eq("barbershop_id", tenantId).eq("active", true).order("name"),
          supabase.from("appointments").select("id,barber_id,client_id,starts_at,ends_at,status,source,clients(name),barbers(display_name),appointment_services(service_id,service_name,duration_minutes,price_cents)").eq("barbershop_id", tenantId).order("starts_at"),
          supabase.from("notifications").select("id,type,title,body,created_at,read_at,action_url").eq("barbershop_id", tenantId).order("created_at", { ascending: false }).limit(50),
          supabase.from("memberships").select("id,user_id,role,status").eq("barbershop_id", tenantId).order("created_at"),
          supabase.from("working_hours").select("id,barber_id,weekday,starts_at,ends_at,active").eq("barbershop_id", tenantId).order("weekday").order("starts_at"),
        ]);

        const [{ data: openingHours, error: hoursError }, { data: catalogProducts, error: productsError }] = await Promise.all([
          supabase.from('shop_hours').select('weekday,starts_at,ends_at,active').eq('barbershop_id',tenantId),
          supabase.from('products').select('id,name,description,price_cents,active').eq('barbershop_id',tenantId).order('name'),
        ]);
        if (hoursError || productsError || !remoteServices || !remoteBarbers || !remoteWorkingHours) throw new Error('data unavailable');
        if (cancelled) return;
        setShopHours((openingHours ?? []).map((h) => ({ weekday:h.weekday, startsAt:String(h.starts_at).slice(0,5), endsAt:String(h.ends_at).slice(0,5), active:h.active })));
        setProducts((catalogProducts ?? []).map((p) => ({ id:p.id,name:p.name,description:p.description,priceCents:p.price_cents,active:p.active })));

        setCurrentUserName(profile?.full_name ?? user.email?.split("@")[0] ?? "Equipe");
        setServices((remoteServices ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description ?? "", durationMinutes: item.duration_minutes, priceCents: item.price_cents, active: item.active })));
        const mappedBarbers = (remoteBarbers ?? []).map((item): Barber => ({ id: item.id, name: item.display_name, avatarUrl: item.avatar_url ?? undefined, role: remoteMemberships?.find((m) => m.id===item.membership_id)?.role === 'owner' ? 'Proprietário' : 'Barbeiro', color: item.color, todayCount: 0, workingHours: "Ver disponibilidade", active: item.active }));
        setBarbers(mappedBarbers);
        setRemoteBarberId((remoteBarbers ?? []).find((item) => item.membership_id === membership.id)?.id ?? null);

        const userIds = (remoteMemberships ?? []).map((item) => item.user_id);
        const { data: remoteProfiles } = userIds.length ? await supabase.from("profiles").select("id,full_name").in("id", userIds) : { data: [] };
        if (cancelled) return;
        setTeamMembers((remoteMemberships ?? []).map((item) => {
          const barber = (remoteBarbers ?? []).find((candidate) => candidate.membership_id === item.id);
          return { id: item.id, userId: item.user_id, name: remoteProfiles?.find((candidate) => candidate.id === item.user_id)?.full_name ?? barber?.display_name ?? "Pessoa da equipe", email: item.user_id === user.id ? user.email ?? "E-mail protegido" : "E-mail protegido", role: item.role as MemberRole, status: item.status as TeamMember["status"], barberId: barber?.id, color: barber?.color };
        }));
        setWorkingHours((remoteWorkingHours ?? []).map((item) => ({ id: item.id, barberId: item.barber_id, weekday: item.weekday, startsAt: String(item.starts_at).slice(0, 5), endsAt: String(item.ends_at).slice(0, 5), active: item.active })));
        setClients((remoteClients ?? []).map((item) => ({ id: item.id, name: item.name, phone: item.phone ?? "", email: item.email ?? "", visits: 0, lastVisit: "Sem histórico", notes: item.notes ?? "" })));
        setAppointments((remoteAppointments ?? []).map((item) => {
          const client = Array.isArray(item.clients) ? item.clients[0] : item.clients;
          const barber = Array.isArray(item.barbers) ? item.barbers[0] : item.barbers;
          const service = Array.isArray(item.appointment_services) ? item.appointment_services[0] : item.appointment_services;
          const startsAt = new Date(item.starts_at);
          const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(startsAt);
          const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
          const statusMap: Record<string, Appointment["status"]> = { cancelled_by_client: "cancelled", cancelled_by_shop: "cancelled" };
          return { id: item.id, clientId: item.client_id, clientName: client?.name ?? "Cliente", barberId: item.barber_id, barberName: barber?.display_name ?? "Barbeiro", serviceId: service?.service_id ?? "", serviceName: service?.service_name ?? "Atendimento", date: `${part("year")}-${part("month")}-${part("day")}`, time: new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(startsAt), durationMinutes: service?.duration_minutes ?? Math.round((new Date(item.ends_at).getTime() - startsAt.getTime()) / 60000), priceCents: service?.price_cents ?? 0, status: statusMap[item.status] ?? item.status as Appointment["status"], source: item.source as Appointment["source"] };
        }));
        setNotifications((remoteNotifications ?? []).map((item) => ({ id: item.id, type: item.type === "appointment_created" ? "booking" : item.type === "appointment_confirmed" ? "confirmation" : item.type === "appointment_cancelled" ? "cancellation" : item.type === "return_opportunity" ? "return" : "upcoming", title: item.title, body: item.body, time: new Date(item.created_at).toLocaleString("pt-BR"), read: Boolean(item.read_at), actionUrl: item.action_url ?? "/notificacoes" })));
        setLoadError("");
      } catch {
        if (cancelled) return;
        remoteTenantId.current = null;
        setLoadError("Não foi possível carregar os dados. Confira a conexão e tente novamente.");
        setAppointments([]); setClients([]); setServices([]); setNotifications([]); setBarbers([]); setTeamMembers([]); setWorkingHours([]);
      } finally {
        if (!cancelled) setReadyTenant(tenantSlug);
      }
    };
    void load();
    return () => { cancelled = true; remoteTenantId.current = null; };
  }, [tenantSlug]);

  const currentBarberId = role === "barber" ? remoteBarberId : null;
  const visibleAppointments = currentBarberId ? appointments.filter((item) => item.barberId === currentBarberId) : appointments;
  const visibleClientIds = new Set(visibleAppointments.map((item) => item.clientId));
  const visibleClients = currentBarberId ? clients.filter((item) => visibleClientIds.has(item.id)) : clients;
  const visibleAppointmentIds = new Set(visibleAppointments.map((item) => item.id));
  const visibleNotifications = currentBarberId ? notifications.filter((item) => !item.actionUrl.includes("appointment=") || [...visibleAppointmentIds].some((id) => item.actionUrl.includes(id))) : notifications;

  const value = useMemo<AppDataContextValue>(() => ({
    products, shopHours, bookingPaused, ownBarberId: remoteBarberId, loading: Boolean(tenantSlug && readyTenant !== tenantSlug), loadError,
    appointments: visibleAppointments, customerAppointments: appointments, clients: visibleClients, services, barbers, teamMembers, workingHours, notifications: visibleNotifications,
    role, currentBarberId, currentUserName, shopName, canManage: role === "owner" || role === "manager",
    saveShopSchedule: async (schedule, paused) => {
      if (!remoteTenantId.current) return unavailable;
      const { error } = await createClient().rpc('save_operating_schedule',{ target_barbershop_id:remoteTenantId.current,target_barber_id:null,schedule:schedule.map(d=>({weekday:d.weekday,starts_at:d.startsAt,ends_at:d.endsAt,active:d.active})),paused });
      if(error) return {ok:false,message:'Não foi possível salvar. Confira os horários de abertura e fechamento.'};
      setShopHours(schedule); setBookingPaused(paused);
      return {ok:true,message:'Funcionamento salvo.'};
    },
    saveProduct: async (product) => {
      if (!remoteTenantId.current) return unavailable;
      const values = {name:product.name,description:product.description,price_cents:product.priceCents,active:product.active};
      const db = createClient();
      const query = product.id ? db.from('products').update(values).eq('id',product.id).eq('barbershop_id',remoteTenantId.current) : db.from('products').insert({...values,barbershop_id:remoteTenantId.current});
      const {data,error} = await query.select('id').single();
      if(error || !data) return {ok:false,message:'Não foi possível salvar o produto. Tente novamente.'};
      setProducts(current=>[...current.filter(p=>p.id!==data.id),{...product,id:data.id}]);
      return {ok:true,message:'Produto salvo.'};
    },
    setProductActive: async (id,active) => {
      if (!remoteTenantId.current) return unavailable;
      const {data,error} = await createClient().from('products').update({active}).eq('id',id).eq('barbershop_id',remoteTenantId.current).select('id').single();
      if(error || !data) return {ok:false,message:'Não foi possível atualizar o produto.'};
      setProducts(current=>current.map(p=>p.id===id?{...p,active}:p));
      return {ok:true,message:active?'Produto ativado.':'Produto desativado.'};
    },
    addAppointment: async (input) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      if (hasSchedulingConflict(appointments, input)) return { ok: false, message: "Esse intervalo já está ocupado para o barbeiro ou para o cliente." };
      const { data, error } = await createClient().rpc("create_internal_appointment", { target_barbershop_id: remoteTenantId.current, selected_service_id: input.serviceId, selected_barber_id: input.barberId, selected_client_id: input.clientId, local_starts_at: `${input.date}T${input.time}:00`, appointment_notes: null });
      if (error) return { ok: false, message: error.code === "23P01" ? "Esse barbeiro já possui um atendimento nesse intervalo." : "Não foi possível criar o agendamento." };
      setAppointments((current) => [...current, { ...input, id: String(data), status: "pending", source: "internal" }]);
      return { ok: true, message: "Agendamento criado e lembretes programados." };
    },
    updateAppointmentStatus: async (id, status) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return;
      const remoteStatus = status === "cancelled" ? "cancelled_by_shop" : status;
      const { error } = await createClient().from("appointments").update({ status: remoteStatus }).eq("id", id).eq("barbershop_id", remoteTenantId.current);
      if (!error) setAppointments((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    },
    rescheduleAppointment: async (id, date, time) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const appointment = appointments.find((item) => item.id === id);
      if (!appointment) return { ok: false, message: "Agendamento não encontrado." };
      if (hasSchedulingConflict(appointments.filter((item) => item.id !== id), { ...appointment, date, time })) return { ok: false, message: "Esse intervalo já está ocupado para o barbeiro ou para o cliente." };
      const { error } = await createClient().rpc("reschedule_appointment", { target_barbershop_id: remoteTenantId.current, target_appointment_id: id, local_starts_at: `${date}T${time}:00` });
      if (error) return { ok: false, message: error.code === "23P01" ? "Esse barbeiro já possui um atendimento nesse intervalo." : "Não foi possível remarcar o atendimento." };
      setAppointments((current) => current.map((item) => item.id === id ? { ...item, date, time } : item));
      return { ok: true, message: "Atendimento remarcado e lembretes atualizados." };
    },
    addClient: async (client) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return;
      const { data, error } = await createClient().from("clients").insert({ barbershop_id: remoteTenantId.current, name: client.name, phone: client.phone, email: client.email, notes: client.notes }).select("id").single();
      if (!error) setClients((current) => [{ ...client, id: data.id, visits: 0, lastVisit: "Ainda não atendido" }, ...current]);
    },
    addService: async (service) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const supabase = createClient();
      const { data, error } = await supabase.from("services").insert({ barbershop_id: remoteTenantId.current, name: service.name, description: service.description, duration_minutes: service.durationMinutes, price_cents: service.priceCents }).select("id").single();
      if (error || !data?.id) return { ok: false, message: error?.code === "42501" ? "Seu perfil não tem permissão para cadastrar serviços." : "Não foi possível cadastrar o serviço." };
      // A trigger privada no banco vincula o serviço aos profissionais ativos
      // de forma atômica, evitando falhas intermitentes no celular.
      setServices((current) => [...current, { ...service, id: data.id, active: true }]);
      return { ok: true, message: "Serviço cadastrado." };
    },
    updateService: async (service) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const { data, error } = await createClient().from("services").update({
        name: service.name,
        description: service.description,
        duration_minutes: service.durationMinutes,
        price_cents: service.priceCents,
      }).eq("id", service.id).eq("barbershop_id", remoteTenantId.current).select('id').single();
      if (error || !data) return { ok: false, message: error?.code === "42501" ? "Seu perfil não tem permissão para editar serviços." : "Não foi possível salvar o serviço." };
      setServices((current) => current.map((item) => item.id === service.id ? { ...item, ...service } : item));
      return { ok: true, message: "Serviço atualizado." };
    },
    addBarber: async (barber) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const supabase = createClient();
      const { data, error } = await supabase.from("barbers").insert({ barbershop_id: remoteTenantId.current, display_name: barber.name, color: barber.color }).select("id").single();
      if (error) return { ok: false, message: "Não foi possível adicionar o profissional." };
      setBarbers((current) => [...current, { ...barber, id: data.id, role: "Barbeiro", todayCount: 0, workingHours: "Definir horários", active: true }]);
      return { ok: true, message: "Profissional adicionado." };
    },
    inviteTeamMember: async (member) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const { data, error } = await createClient().functions.invoke("invite-team-member", { body: { barbershopId: remoteTenantId.current, fullName: member.name, email: member.email, role: member.role, color: member.color, barberId: member.barberId, initialPassword: member.initialPassword } });
      if (error || !data?.member) return { ok: false, message: data?.error === "email_exists" ? "Este e-mail já possui acesso. Use outro endereço." : "Não foi possível criar o acesso. Verifique os dados e tente novamente." };
      setTeamMembers((current) => [...current, data.member as TeamMember]);
      if (data.member.barberId) setBarbers((current) => current.some(b=>b.id===data.member.barberId)?current:[...current, { id: data.member.barberId, name: member.name, role: "Barbeiro", color: member.color, todayCount: 0, workingHours: "Definir horários", active: true }]);
      return { ok: true, message: "Acesso criado. Entregue a senha inicial ao barbeiro por um canal seguro; no primeiro acesso ele deverá trocar a senha." };
    },
    setBarberActive: async (barberId, active) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const barber = barbers.find((item) => item.id === barberId);
      if (!barber) return { ok: false, message: "Profissional não encontrado." };
      const supabase = createClient();
      const { error: barberError } = await supabase.from("barbers").update({ active }).eq("id", barberId).eq("barbershop_id", remoteTenantId.current);
      if (barberError) return { ok: false, message: "Não foi possível atualizar o status do profissional." };
      const member = teamMembers.find((item) => item.barberId === barberId);
      if (member) {
        const { error: membershipError } = await supabase.from("memberships").update({ status: active ? "active" : "suspended" }).eq("id", member.id).eq("barbershop_id", remoteTenantId.current);
        if (membershipError) {
          await supabase.from("barbers").update({ active: !active }).eq("id", barberId).eq("barbershop_id", remoteTenantId.current);
          return { ok: false, message: "Não foi possível atualizar o acesso do profissional." };
        }
        setTeamMembers((current) => current.map((item) => item.id === member.id ? { ...item, status: active ? "active" : "suspended" } : item));
      }
      setBarbers((current) => current.map((item) => item.id === barberId ? { ...item, active } : item));
      return { ok: true, message: active ? "Profissional reativado." : "Profissional inativado e acesso suspenso." };
    },
    deleteBarber: async (barberId) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      if (role !== "owner") return { ok: false, message: "Somente o proprietário pode excluir perfis." };
      const barber = barbers.find((item) => item.id === barberId);
      if (!barber) return { ok: false, message: "Profissional não encontrado." };
      if (barber.active) return { ok: false, message: "Inative o profissional antes de excluir o perfil." };
      const supabase = createClient();
      const { error } = await supabase.from("barbers").delete().eq("id", barberId).eq("barbershop_id", remoteTenantId.current);
      if (error) return { ok: false, message: error.code === "23503" ? "Não é possível excluir um perfil com histórico de agendamentos. Mantenha-o inativo para preservar o histórico." : "Não foi possível excluir o perfil." };
      const member = teamMembers.find((item) => item.barberId === barberId);
      if (member) await supabase.from("memberships").delete().eq("id", member.id).eq("barbershop_id", remoteTenantId.current);
      setBarbers((current) => current.filter((item) => item.id !== barberId));
      if (member) setTeamMembers((current) => current.filter((item) => item.id !== member.id));
      return { ok: true, message: "Perfil excluído da equipe." };
    },
    saveBarberSchedule: async (barberId, schedule) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const { error } = await createClient().rpc("save_operating_schedule", {
        target_barbershop_id: remoteTenantId.current,
        target_barber_id: barberId,
        schedule: schedule.map(({ weekday, startsAt, endsAt, active }) => ({ weekday, starts_at: startsAt, ends_at: endsAt, active })),
      });
      if (error) return { ok: false, message: error.code === "42501" ? "Seu perfil não pode ajustar horários." : "Não foi possível salvar os horários." };
      setWorkingHours((current) => [...current.filter((item) => item.barberId !== barberId), ...schedule.map((item) => ({ ...item, barberId }))]);
      return { ok: true, message: "Horários salvos." };
    },
    updateBarberAvatar: async (barberId, file) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return { ok: false, message: "Use uma imagem JPG, PNG ou WebP." };
      if (file.size > 5 * 1024 * 1024) return { ok: false, message: "A foto deve ter no máximo 5 MB." };
      const barber = barbers.find((item) => item.id === barberId);
      if (!barber) return { ok: false, message: "Profissional não encontrado." };
      const supabase = createClient();
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${remoteTenantId.current}/avatars/${barberId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("barber-media").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) return { ok: false, message: "Não foi possível enviar a foto." };
      const { data: image } = supabase.storage.from("barber-media").getPublicUrl(path);
      const { error: updateError } = role === 'barber'
        ? await supabase.rpc('set_own_barber_photo',{target_barber_id:barberId,photo_url:image.publicUrl})
        : await supabase.from("barbers").update({ avatar_url: image.publicUrl }).eq("id", barberId).eq("barbershop_id", remoteTenantId.current).select('id').single();
      if (updateError) { await supabase.storage.from("barber-media").remove([path]); return { ok: false, message: "A foto foi enviada, mas o perfil não pôde ser atualizado." }; }
      const previousPath = barberMediaPath(barber.avatarUrl);
      if (previousPath) await supabase.storage.from("barber-media").remove([previousPath]);
      setBarbers((current) => current.map((item) => item.id === barberId ? { ...item, avatarUrl: image.publicUrl } : item));
      return { ok: true, message: `Foto de ${barber.name} atualizada.` };
    },
    toggleService: async (id) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return unavailable;
      const target = services.find((service) => service.id === id); if (!target) return unavailable;
      const { data, error } = await createClient().from("services").update({ active: !target.active }).eq("id", id).eq("barbershop_id", remoteTenantId.current).select('id').single();
      if (error || !data) return {ok:false,message:'Não foi possível alterar a disponibilidade.'};
      setServices((current) => current.map((service) => service.id === id ? { ...service, active: !service.active } : service));
      return {ok:true,message:target.active?'Serviço desativado.':'Serviço ativado.'};
    },
    markNotificationRead: async (id) => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return;
      const { error } = await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("barbershop_id", remoteTenantId.current);
      if (!error) setNotifications((current) => current.map((note) => note.id === id ? { ...note, read: true } : note));
    },
    markAllNotificationsRead: async () => {
      if (!hasSupabaseEnv || !remoteTenantId.current) return;
      const { error } = await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("barbershop_id", remoteTenantId.current).is("read_at", null);
      if (!error) setNotifications((current) => current.map((note) => ({ ...note, read: true })));
    },
  }), [appointments, visibleAppointments, visibleClients, services, barbers, teamMembers, workingHours, visibleNotifications, role, currentBarberId, currentUserName, shopName, products,shopHours,bookingPaused,remoteBarberId,tenantSlug,readyTenant,loadError]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}

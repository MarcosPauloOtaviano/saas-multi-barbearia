import type { AppNotification, Appointment, Barber, Client, Service, TeamMember } from "@/lib/types";

export const demoServices: Service[] = [
  { id: "service-cut", name: "Corte clássico", description: "Corte personalizado e finalização.", durationMinutes: 45, priceCents: 4500, active: true },
  { id: "service-beard", name: "Barba", description: "Toalha quente, desenho e acabamento.", durationMinutes: 30, priceCents: 3500, active: true },
  { id: "service-combo", name: "Corte + barba", description: "Experiência completa com corte e barba.", durationMinutes: 60, priceCents: 7500, active: true },
  { id: "service-kids", name: "Corte infantil", description: "Atendimento para crianças até 12 anos.", durationMinutes: 40, priceCents: 4000, active: true },
  { id: "service-brow", name: "Sobrancelha", description: "Acabamento com navalha.", durationMinutes: 15, priceCents: 1500, active: false },
];

export const demoBarbers: Barber[] = [
  { id: "barber-joao", name: "João Paulo", role: "Proprietário", color: "#c86f45", todayCount: 5, workingHours: "08:00–18:00", active: true },
  { id: "barber-leo", name: "Leonardo Lima", role: "Barbeiro", color: "#3f7b70", todayCount: 4, workingHours: "09:00–19:00", active: true },
  { id: "barber-caio", name: "Caio Mendes", role: "Barbeiro", color: "#5573a6", todayCount: 0, workingHours: "Folga hoje", active: true },
];

export const demoTeamMembers: TeamMember[] = [
  { id: "member-owner", userId: "user-owner", name: "Stilo Sampa", email: "admin@stilosampa.demo", role: "owner", status: "active", barberId: "barber-joao", color: "#c86f45" },
  { id: "member-leo", userId: "user-leo", name: "Leonardo Lima", email: "leo@stilosampa.demo", role: "barber", status: "active", barberId: "barber-leo", color: "#3f7b70" },
  { id: "member-caio", userId: "user-caio", name: "Caio Mendes", email: "caio@stilosampa.demo", role: "barber", status: "active", barberId: "barber-caio", color: "#5573a6" },
];

export const demoClients: Client[] = [
  { id: "client-rafael", name: "Rafael Nunes", phone: "(31) 99924-1608", email: "rafael@exemplo.com", visits: 14, lastVisit: "20 ago 2026", nextVisit: "Hoje, 09:00", averageReturnDays: 28, notes: "Prefere degradê baixo." },
  { id: "client-bruno", name: "Bruno Alves", phone: "(31) 98810-4421", email: "bruno@exemplo.com", visits: 7, lastVisit: "29 ago 2026", nextVisit: "Hoje, 10:20", averageReturnDays: 21 },
  { id: "client-caio", name: "Caio Ferreira", phone: "(31) 99145-7782", email: "caio@exemplo.com", visits: 11, lastVisit: "19 ago 2026", averageReturnDays: 30, notes: "Oportunidade de retorno." },
  { id: "client-matheus", name: "Matheus Rocha", phone: "(31) 98732-2019", email: "matheus@exemplo.com", visits: 3, lastVisit: "12 set 2026", nextVisit: "Hoje, 14:00", averageReturnDays: 35 },
  { id: "client-daniel", name: "Daniel Costa", phone: "(31) 99700-1834", email: "daniel@exemplo.com", visits: 1, lastVisit: "17 set 2026" },
  { id: "client-vitor", name: "Vitor Silva", phone: "(31) 98674-0911", email: "vitor@exemplo.com", visits: 9, lastVisit: "27 ago 2026", averageReturnDays: 25 },
];

export const demoAppointments: Appointment[] = [
  { id: "appt-1", clientId: "client-rafael", clientName: "Rafael Nunes", barberId: "barber-joao", barberName: "João Paulo", serviceId: "service-combo", serviceName: "Corte + barba", date: "2026-09-20", time: "09:00", durationMinutes: 60, priceCents: 7500, status: "confirmed", source: "internal" },
  { id: "appt-2", clientId: "client-bruno", clientName: "Bruno Alves", barberId: "barber-joao", barberName: "João Paulo", serviceId: "service-cut", serviceName: "Corte clássico", date: "2026-09-20", time: "10:20", durationMinutes: 45, priceCents: 4500, status: "pending", source: "public_booking" },
  { id: "appt-3", clientId: "client-matheus", clientName: "Matheus Rocha", barberId: "barber-leo", barberName: "Leonardo Lima", serviceId: "service-combo", serviceName: "Corte + barba", date: "2026-09-20", time: "11:00", durationMinutes: 60, priceCents: 7500, status: "confirmed", source: "internal" },
  { id: "appt-4", clientId: "client-daniel", clientName: "Daniel Costa", barberId: "barber-leo", barberName: "Leonardo Lima", serviceId: "service-beard", serviceName: "Barba", date: "2026-09-20", time: "12:30", durationMinutes: 30, priceCents: 3500, status: "confirmed", source: "public_booking" },
  { id: "appt-5", clientId: "client-vitor", clientName: "Vitor Silva", barberId: "barber-joao", barberName: "João Paulo", serviceId: "service-cut", serviceName: "Corte clássico", date: "2026-09-20", time: "14:00", durationMinutes: 45, priceCents: 4500, status: "confirmed", source: "internal" },
  { id: "appt-6", clientId: "client-caio", clientName: "Caio Ferreira", barberId: "barber-leo", barberName: "Leonardo Lima", serviceId: "service-kids", serviceName: "Corte infantil", date: "2026-09-20", time: "15:20", durationMinutes: 40, priceCents: 4000, status: "pending", source: "internal" },
  { id: "appt-7", clientId: "client-rafael", clientName: "Rafael Nunes", barberId: "barber-joao", barberName: "João Paulo", serviceId: "service-cut", serviceName: "Corte clássico", date: "2026-09-19", time: "09:30", durationMinutes: 45, priceCents: 4500, status: "completed", source: "internal" },
];

export const demoNotifications: AppNotification[] = [
  { id: "note-1", type: "booking", title: "Novo agendamento", body: "Daniel reservou Barba com Leonardo às 12:30.", time: "há 4 min", read: false, actionUrl: "/agenda?appointment=appt-4" },
  { id: "note-2", type: "confirmation", title: "Rafael confirmou", body: "O atendimento das 09:00 está confirmado.", time: "há 18 min", read: false, actionUrl: "/agenda?appointment=appt-1" },
  { id: "note-3", type: "return", title: "Oportunidade de retorno", body: "Caio costuma retornar a cada 30 dias e ainda não agendou.", time: "hoje, 08:02", read: false, actionUrl: "/clientes?client=client-caio" },
  { id: "note-4", type: "cancellation", title: "Horário liberado", body: "Um cancelamento abriu o horário de 16:30 com João.", time: "ontem, 18:41", read: true, actionUrl: "/agenda" },
  { id: "note-5", type: "upcoming", title: "Atendimento próximo", body: "Bruno está agendado para 10:20 e ainda não confirmou.", time: "ontem, 10:20", read: true, actionUrl: "/agenda?appointment=appt-2" },
];

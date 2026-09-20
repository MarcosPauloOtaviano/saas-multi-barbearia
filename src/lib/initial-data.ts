import type { AppNotification, Appointment, Barber, Client, Service, TeamMember } from "@/lib/types";

export const initialServices: Service[] = [];
export const initialClients: Client[] = [];
export const initialAppointments: Appointment[] = [];
export const initialNotifications: AppNotification[] = [];

export const initialBarbers: Barber[] = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Roberto",
    role: "Barbeiro",
    color: "#3f7b70",
    todayCount: 0,
    workingHours: "Horários ainda não definidos",
    active: true,
  },
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: "initial-owner-mantena",
    userId: "pending-production-user",
    name: "Mantena",
    email: "Acesso ainda não vinculado",
    role: "owner",
    status: "active",
    color: "#c86f45",
  },
];

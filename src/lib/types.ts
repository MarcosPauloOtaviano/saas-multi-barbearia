export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  /** ISO timestamp returned by the database; used to guard lifecycle actions. */
  endsAt?: string;
  durationMinutes: number;
  priceCents: number;
  status: AppointmentStatus;
  source: "internal" | "public_booking";
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  visits: number;
  lastVisit: string;
  nextVisit?: string;
  averageReturnDays?: number;
  notes?: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};

export type Product = Omit<Service, "durationMinutes">;
export type ScheduleDay = Pick<WorkingHour, "weekday" | "startsAt" | "endsAt" | "active">;

export type Barber = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: "Proprietário" | "Barbeiro" | "Gerente";
  color: string;
  todayCount: number;
  workingHours: string;
  active: boolean;
};

export type MemberRole = "owner" | "manager" | "barber" | "receptionist";

export type WorkingHour = {
  id?: string;
  barberId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "invited" | "active" | "suspended";
  barberId?: string;
  color?: string;
};

export type AppNotification = {
  id: string;
  type: "booking" | "confirmation" | "cancellation" | "upcoming" | "return";
  title: string;
  body: string;
  time: string;
  read: boolean;
  actionUrl: string;
};

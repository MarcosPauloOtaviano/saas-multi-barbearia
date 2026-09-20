import type { Appointment, Barber } from "./types";
import { timeToMinutes } from "./format";

export function hasSchedulingConflict(appointments: Appointment[], candidate: Pick<Appointment, "date" | "time" | "durationMinutes" | "barberId"> & Partial<Pick<Appointment, "clientId">>) {
  const candidateStart = timeToMinutes(candidate.time);
  const candidateEnd = candidateStart + candidate.durationMinutes;
  return appointments.some((item) => {
    if (item.date !== candidate.date) return false;
    const sameResource = item.barberId === candidate.barberId || (Boolean(candidate.clientId) && item.clientId === candidate.clientId);
    if (!sameResource) return false;
    if (["cancelled", "no_show"].includes(item.status)) return false;
    const itemStart = timeToMinutes(item.time);
    const itemEnd = itemStart + item.durationMinutes;
    return candidateStart < itemEnd && candidateEnd > itemStart;
  });
}

export function findFirstAvailableBarber(
  appointments: Appointment[],
  barbers: Pick<Barber, "id" | "name" | "active">[],
  candidate: Pick<Appointment, "date" | "time" | "durationMinutes">,
) {
  return findAvailableBarbers(appointments, barbers, candidate)[0];
}

export function findAvailableBarbers(
  appointments: Appointment[],
  barbers: Pick<Barber, "id" | "name" | "active">[],
  candidate: Pick<Appointment, "date" | "time" | "durationMinutes">,
) {
  return barbers.filter((barber) => barber.active && !hasSchedulingConflict(appointments, {
    ...candidate,
    barberId: barber.id,
  }));
}

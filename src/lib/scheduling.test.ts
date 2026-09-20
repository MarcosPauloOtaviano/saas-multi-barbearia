import { describe, expect, it } from "vitest";
import { findAvailableBarbers, findFirstAvailableBarber, hasSchedulingConflict } from "./scheduling";
import type { Appointment, Barber } from "./types";

const appointments: Appointment[] = [{ id: "1", clientId: "1", clientName: "Rafael", barberId: "barber-joao", barberName: "João", serviceId: "1", serviceName: "Corte", date: "2026-09-19", time: "09:00", durationMinutes: 60, priceCents: 4500, status: "confirmed", source: "internal" }];

describe("hasSchedulingConflict", () => {
  it("blocks an overlap for the same barber and day", () => {
    expect(hasSchedulingConflict(appointments, { date: "2026-09-19", time: "09:30", durationMinutes: 30, barberId: "barber-joao" })).toBe(true);
  });

  it("allows the same time for another barber", () => {
    expect(hasSchedulingConflict(appointments, { date: "2026-09-19", time: "09:30", durationMinutes: 30, barberId: "barber-leo" })).toBe(false);
  });

  it("blocks the same client from occupying two barbers at once", () => {
    expect(hasSchedulingConflict(appointments, { date: "2026-09-19", time: "09:30", durationMinutes: 30, barberId: "barber-leo", clientId: "1" })).toBe(true);
  });

  it("allows an adjacent slot", () => {
    expect(hasSchedulingConflict(appointments, { date: "2026-09-19", time: "10:00", durationMinutes: 20, barberId: "barber-joao" })).toBe(false);
  });
});

describe("findFirstAvailableBarber", () => {
  const barbers: Pick<Barber, "id" | "name" | "active">[] = [
    { id: "barber-mantena", name: "Mantena", active: true },
    { id: "barber-roberto", name: "Roberto", active: true },
  ];
  const busyAtThree: Appointment[] = [{
    id: "appt-mantena",
    clientId: "client-another",
    clientName: "Outro cliente",
    barberId: "barber-mantena",
    barberName: "Mantena",
    serviceId: "service-cut",
    serviceName: "Corte",
    date: "2026-09-20",
    time: "15:00",
    durationMinutes: 45,
    priceCents: 4500,
    status: "confirmed",
    source: "public_booking",
  }];

  it("assigns Roberto when Mantena is already busy at 15:00", () => {
    expect(findFirstAvailableBarber(busyAtThree, barbers, {
      date: "2026-09-20",
      time: "15:00",
      durationMinutes: 45,
    })?.name).toBe("Roberto");
  });

  it("returns no barber when everyone is busy", () => {
    const everyoneBusy = [...busyAtThree, { ...busyAtThree[0], id: "appt-roberto", barberId: "barber-roberto", barberName: "Roberto" }];
    expect(findFirstAvailableBarber(everyoneBusy, barbers, {
      date: "2026-09-20",
      time: "15:00",
      durationMinutes: 45,
    })).toBeUndefined();
  });

  it("keeps every free professional available for the customer to choose", () => {
    const fourBarbers = [
      ...barbers,
      { id: "barber-ana", name: "Ana", active: true },
      { id: "barber-bia", name: "Bia", active: true },
    ];
    expect(findAvailableBarbers([], fourBarbers, {
      date: "2026-09-20",
      time: "15:00",
      durationMinutes: 45,
    }).map((barber) => barber.name)).toEqual(["Mantena", "Roberto", "Ana", "Bia"]);
  });
});

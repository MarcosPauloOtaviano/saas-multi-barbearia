import Image from "next/image";
import { initials } from "@/lib/format";
import type { Barber } from "@/lib/types";

export function BarberAvatar({ barber, className, sizes = "44px" }: { barber: Pick<Barber, "name" | "color" | "avatarUrl">; className: string; sizes?: string }) {
  return <span className={`${className} barber-avatar`} style={{ background: barber.color }}>
    {barber.avatarUrl
      ? <Image src={barber.avatarUrl} alt={`Foto de ${barber.name}`} fill sizes={sizes} unoptimized={barber.avatarUrl.startsWith("blob:")} />
      : initials(barber.name)}
  </span>;
}

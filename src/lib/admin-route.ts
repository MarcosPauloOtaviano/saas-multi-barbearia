"use client";

import { usePathname } from "next/navigation";

export function useAdminBase() {
  const pathname = usePathname();
  const slug = pathname.match(/^\/admin\/([^/]+)/)?.[1] ?? "stilo-sampa";
  return `/admin/${slug}`;
}

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Vérifie sessionStorage pour une redirection post-authentification.
 * Si le cookie auth_redirect n'a pas survécu au round-trip OAuth,
 * ce composant effectue la redirection côté client.
 */
export function PostAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const target = sessionStorage.getItem("auth_redirect_path");
    if (target) {
      sessionStorage.removeItem("auth_redirect_path");
      if (target !== pathname) {
        router.replace(target);
      }
    }
  }, [pathname, router]);

  return null;
}

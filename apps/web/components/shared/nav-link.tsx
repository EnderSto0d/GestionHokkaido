"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  mobile?: boolean;
  adminOnly?: boolean;
  badge?: number;
};

export function NavLink({ href, children, mobile = false, adminOnly = false, badge }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  if (mobile) {
    return (
      <Link
        href={href}
        className={[
          "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
          isActive
            ? "text-red-400 bg-red-500/10"
            : adminOnly
            ? "text-amber-400/60 hover:text-amber-400"
            : "text-white/30 hover:text-white/60",
        ].join(" ")}
      >
        {children}
        {!!badge && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-[#0a0505]">
            {badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
        isActive
          ? adminOnly
            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
          ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
          : adminOnly
          ? "text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/5"
          : "text-white/40 hover:text-white/70 hover:bg-white/5",
      ].join(" ")}
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

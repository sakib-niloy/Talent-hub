"use client";

import { Compass, Home, PlusSquare, Settings, Shield, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useMe } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

function useItems(): Item[] {
  const { user } = useMe();
  const profileHref = user ? `/u/${user.handle}` : "/signin?next=/feed";
  const items: Item[] = [
    { href: "/feed", label: "Home", icon: Home, match: (p) => p === "/feed" || p.startsWith("/m/") },
    { href: "/explore", label: "Explore", icon: Compass, match: (p) => p.startsWith("/explore") },
    { href: "/upload", label: "Upload", icon: PlusSquare, match: (p) => p.startsWith("/upload") },
    {
      href: profileHref,
      label: "Profile",
      icon: User,
      match: (p) => !!user && p === `/u/${user.handle}`,
    },
    { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
  ];
  if (user?.role === "admin") {
    items.push({ href: "/admin", label: "Admin", icon: Shield, match: (p) => p.startsWith("/admin") });
  }
  return items;
}

function RailLinks({ pathname }: { pathname: string | null }) {
  const items = useItems();
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = pathname ? match(pathname) : false;
        return (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "text-primary")} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function RailLinksWithPath() {
  return <RailLinks pathname={usePathname()} />;
}

/** Desktop left-rail navigation. */
export function RailNav() {
  return (
    <nav aria-label="Main">
      <Suspense fallback={<RailLinks pathname={null} />}>
        <RailLinksWithPath />
      </Suspense>
    </nav>
  );
}

function TabLinks({ pathname }: { pathname: string | null }) {
  const items = useItems().filter((i) => ["Home", "Explore", "Upload", "Profile"].includes(i.label));
  return (
    <ul className="grid grid-cols-4">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = pathname ? match(pathname) : false;
        const isUpload = label === "Upload";
        return (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
                active && "text-foreground",
              )}
            >
              {isUpload ? (
                <span className="grid h-8 w-11 place-items-center rounded-xl bg-brand text-white shadow-md shadow-fuchsia-500/25">
                  <Icon className="size-5" aria-hidden />
                </span>
              ) : (
                <Icon className={cn("size-6", active && "text-primary")} aria-hidden />
              )}
              <span className={cn(isUpload && "sr-only")}>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TabLinksWithPath() {
  return <TabLinks pathname={usePathname()} />;
}

/** Mobile bottom tab bar. */
export function BottomTabs() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <Suspense fallback={<TabLinks pathname={null} />}>
        <TabLinksWithPath />
      </Suspense>
    </nav>
  );
}

"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ClipboardCheck,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { useAssumeEmployeeView } from "@/hooks/use-assume-employee-view";

type Tab = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileSidebarCloseOnNavigate() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  React.useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return null;
}

export function MobileBottomNav() {
  const tStatic = useStaticUiTranslations("static");
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const assumeEmployee = useAssumeEmployeeView();
  const staffLimited = assumeEmployee && isAdmin;

  const tabs: Tab[] = (() => {
    const core: Tab[] = [
      { id: "members", label: tStatic("1cb449c11266"), href: "/dashboard/members", icon: Users },
      { id: "payments", label: tStatic("80c37573afed"), href: "/dashboard/payments", icon: CreditCard },
      { id: "attendance", label: tStatic("185ea72876d1"), href: "/dashboard/attendance", icon: ClipboardCheck },
    ];

    if (staffLimited) return core;

    return [
      { id: "dashboard", label: tStatic("70f8bb9a8a53"), href: "/dashboard", icon: LayoutDashboard },
      ...core,
    ];
  })();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const active = isActivePath(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <LocalizedText id="57f5f5efbc59" leading={""} trailing={"\n        "} /></button>
      </div>
    </nav>
  );
}

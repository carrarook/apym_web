"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Bell,
  Calendar,
  Settings,
  UserPlus,
  DollarSign,
  FileText,
  Dumbbell,
  Trophy,
  ClipboardCheck,
  BarChart3,
  AlertCircle,
  Store,
  CalendarDays,
  MessageSquare,
  Target,
  Pill,
  Bot,
  ListTodo,
  History,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useTranslations, useTranslations as useStaticUiTranslations } from "next-intl"

import { APP_NAME, APP_TAGLINE } from "@/lib/site-config"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { WhatsAppStatusButton } from "@/components/whatsapp-status-button"
import { useSidebarCounts } from "@/hooks/use-sidebar-counts"
import { useAssumeEmployeeView } from "@/hooks/use-assume-employee-view"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const tStatic = useStaticUiTranslations("static");
  const t = useTranslations("sidebar")
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const assumeEmployee = useAssumeEmployeeView()
  const staffView = assumeEmployee && isAdmin
  const counts = useSidebarCounts()

  const navGroups = [
    ...(staffView
      ? [
          {
            label: tStatic("a4730a22cf49"),
            items: [
              { title: tStatic("1cb449c11266"), url: "/dashboard/members", icon: Users },
              { title: tStatic("44357ae55a21"), url: "/dashboard/payments", icon: CreditCard },
              { title: tStatic("b689313fc18c"), url: "/dashboard/attendance", icon: ClipboardCheck },
            ],
          },
        ]
      : [
    {
      label: tStatic("0efc2e6be4c2"),
      items: [
        {
          title: tStatic("d87f47b47e4d"),
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: tStatic("5a67d8ce27b2"),
          url: "/dashboard/workspace",
          icon: Bot,
        },
        {
          title: tStatic("25bc96295797"),
          url: "/dashboard/analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      label: tStatic("63cecca67b70"),
      items: [
        {
          title: tStatic("1cb449c11266"),
          url: "/dashboard/members",
          icon: Users,
          badge: counts.members.count,
          badge2: counts.members.activeMembers,
          badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        },
        {
          title: tStatic("f12ee6d3aaf3"),
          url: "/dashboard/leads",
          icon: Target,
        },
        {
          title: tStatic("44357ae55a21"),
          url: "/dashboard/payments",
          icon: CreditCard,
          badge: counts.payments.count,
          badge2: counts.payments.totalAmount > 0 ? `₹${Math.round(counts.payments.totalAmount / 1000)}k` : undefined,
          badgeColor: "bg-green-500/10 text-green-700 dark:text-green-400",
        },
        {
          title: tStatic("2ea2406a47b0"),
          url: "/dashboard/bills",
          icon: FileText,
        },
        {
          title: tStatic("33057b9a5153"),
          url: "/dashboard/supplements",
          icon: Pill,
        },
        {
          title: tStatic("3b73b33572da"),
          url: "/dashboard/finances",
          icon: DollarSign,
        },
        {
          title: tStatic("1c2680586b08"),
          url: "/dashboard/renewals",
          icon: Calendar,
          badge: counts.renewals,
          badgeColor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
        },
        {
          title: tStatic("25db080f9bfd"),
          url: "/dashboard/overdue",
          icon: AlertCircle,
          badge: counts.overdue,
          badgeColor: "bg-red-500/10 text-red-700 dark:text-red-400",
        },
        {
          title: tStatic("ae8c3939382f"),
          url: "/dashboard/reminders",
          icon: Bell,
        },
        {
          title: tStatic("01a23a288f60"),
          url: "/dashboard/campaigns",
          icon: Megaphone,
        },
        {
          title: tStatic("3691d1ee0676"),
          url: "/dashboard/wa-history",
          icon: History,
        },
        {
          title: tStatic("b336fc558722"),
          url: "/dashboard/bills/whatsapp",
          icon: MessageSquare,
        },
        {
          title: tStatic("ed1846afee3b"),
          url: "/dashboard/classes",
          icon: CalendarDays,
        },
        {
          title: tStatic("983095c0ea49"),
          url: "/dashboard/marketplace",
          icon: Store,
        },
        {
          title: tStatic("8c5b6be28fbd"),
          url: "/dashboard/employees",
          icon: UserPlus,
        },
      ],
    },
    {
      label: tStatic("aae59f9dbbc0"),
      items: [
        {
          title: tStatic("b689313fc18c"),
          url: "/dashboard/attendance",
          icon: ClipboardCheck,
        },
        {
          title: tStatic("ccb58b229959"),
          url: "/dashboard/workouts",
          icon: Dumbbell,
        },
        {
          title: tStatic("ff38765fb13e"),
          url: "/dashboard/challenges",
          icon: Trophy,
        },
      ],
    },
    ...(isAdmin && !staffView ? [{
      label: tStatic("4e7afebcfbae"),
      items: [
        {
          title: tStatic("090ec5f560fc"),
          url: "/dashboard/tasks",
          icon: ListTodo,
          badge: counts.adminTasks,
          badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
        },
        {
          title: tStatic("8fb5a5fe41f6"),
          url: "/dashboard/trainers",
          icon: Dumbbell,
        },
      ],
    }] : []),
    ...(isAdmin && !staffView
      ? [
          {
            label: tStatic("c7f73bb54d92"),
            items: [
              {
                title: tStatic("c7f73bb54d92"),
                url: "/dashboard/settings",
                icon: Settings,
                items: [
                  { title: tStatic("780ef0e55f01"), url: "/dashboard/settings?tab=users" },
                  { title: tStatic("753a22b2eb61"), url: "/dashboard/settings?tab=notifications" },
                  { title: tStatic("f7f1997c6cd1"), url: "/dashboard/settings?tab=session" },
                  { title: tStatic("81e912e0641a"), url: "/dashboard/settings?tab=plans" },
                  { title: tStatic("fdd273e5d3a9"), url: "/dashboard/settings?tab=logs" },
                ],
              },
            ],
          },
        ]
      : []),
    ]),
  ]

  const groupKeys: Record<string, string> = {
    Staff: "staff", Overview: "overview", Management: "management", Fitness: "fitness", Admin: "admin", Settings: "settings",
  }
  const itemKeys: Record<string, string> = {
    Members: "members", Payments: "payments", Attendance: "attendance", Dashboard: "dashboard", "Agent workspace": "workspace", Analytics: "analytics", Leads: "leads", "Bills & Receipts": "bills", "Supplements (GST)": "supplements", "Salaries & Expenses": "finances", Renewals: "renewals", "Overdue Tracking": "overdue", Reminders: "reminders", Campaigns: "campaigns", "WA History": "waHistory", WhatsApp: "whatsapp", Classes: "classes", Marketplace: "marketplace", Employees: "employees", Workouts: "workouts", Challenges: "challenges", Tasks: "tasks", Trainers: "trainers", Settings: "settings", "Team & access": "teamAccess", Notifications: "notifications", Session: "session", "Plans & pricing": "plans", "Action logs": "actionLogs",
  }
  const translatedGroups = navGroups.map((group) => ({
    ...group,
    label: t(`groups.${groupKeys[group.label] ?? group.label}`),
    items: group.items.map((item) => ({
      ...item,
      title: t(`items.${itemKeys[item.title] ?? item.title}`),
      items: "items" in item ? item.items?.map((subItem) => ({
        ...subItem,
        title: t(`items.${itemKeys[subItem.title] ?? subItem.title}`),
      })) : undefined,
    })),
  }))

  const user = {
    name: session?.user?.name || t("items.user"),
    email: (session?.user as any)?.contactNumber || "",
    avatar: "",
  }

  return (
    <Sidebar {...props} className="border-r-2 border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg">💪</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{APP_NAME}</span>
                  <span className="truncate text-xs">{APP_TAGLINE}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {translatedGroups.map((group, idx) => (
          <React.Fragment key={group.label}>
            {idx > 0 && <SidebarSeparator className="my-2" />}
            <NavMain label={group.label} items={group.items} />
          </React.Fragment>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border space-y-2">
        <div className="px-2 py-2">
          <WhatsAppStatusButton />
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

"use client"


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { LogOut, Moon, Sun } from "lucide-react"
import { GlobalUndoButton } from "@/components/global-undo-button"
import { useTheme } from "@/contexts/theme-context"
import { GymSelector, type GymOption } from "@/components/gym-selector"

export function SiteHeader({
  initialGyms = [],
  initialGymId = null,
}: {
  initialGyms?: GymOption[]
  initialGymId?: string | null
}) {
  const tStatic = useStaticUiTranslations("static");
  const { data: session } = useSession()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 h-4"
        />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            <LocalizedText id="240b82248b0e" leading={""} trailing={" "} />{session?.user?.name || tStatic("9f8a2389a20c")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {session?.user?.role === "ADMIN" ? tStatic("1eda23758be9") : tStatic("261fa1218100")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GlobalUndoButton />
          <GymSelector initialGyms={initialGyms} initialGymId={initialGymId} />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {theme === "light" ? tStatic("ae1ef0143294") : tStatic("a36ef8aba229")}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline"><LocalizedText id="e43d612e11f1" leading={""} trailing={""} /></span>
          </Button>
        </div>
      </div>
    </header>
  )
}

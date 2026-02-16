"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, BookOpen, Plus, MessageCircle, User } from "lucide-react"
import { useUI } from "@/lib/app-context"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/home", icon: CalendarDays, label: "Inicio" },
  { href: "/recipes", icon: BookOpen, label: "Recetas" },
  { href: "#add", icon: Plus, label: "Agregar", isCenter: true },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/profile", icon: User, label: "Perfil" },
]

export function BottomNavbar() {
  const pathname = usePathname()
  const { setAddMealDrawerOpen } = useUI()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl"
      role="navigation"
      aria-label="Navegacion principal"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <button
                key="add-center"
                onClick={() => setAddMealDrawerOpen(true)}
                className="relative -mt-5 flex flex-col items-center outline-none"
                aria-label={item.label}
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg shadow-foreground/10 transition-transform hover:scale-105 active:scale-95">
                  <Icon className="size-6" strokeWidth={2.5} />
                </div>
              </button>
            )
          }

          const isActive = pathname === item.href || (item.href !== "/home" && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors outline-none",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-0.5 size-1 rounded-full bg-foreground" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

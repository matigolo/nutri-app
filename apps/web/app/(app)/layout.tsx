"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useProfiles, useUI } from "@/lib/app-context"
import { BottomNavbar } from "@/components/bottom-navbar"
import { AddMealDrawer } from "@/components/add-meal-drawer"
import { formatDate } from "@/lib/nutrition-helpers"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, activeProfile } = useProfiles()
  const { addMealDrawerOpen, setAddMealDrawerOpen } = useUI()

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login")
    } else if (!activeProfile) {
      router.replace("/profiles")
    }
  }, [isLoggedIn, activeProfile, router])

  if (!isLoggedIn || !activeProfile) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  // On the home page, the drawer is handled locally (with selected date context).
  // On other pages, we use the global drawer with today's date.
  const isHomePage = pathname === "/home"

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNavbar />

      {!isHomePage && (
        <AddMealDrawer
          open={addMealDrawerOpen}
          onOpenChange={setAddMealDrawerOpen}
          selectedDate={formatDate(new Date())}
        />
      )}
    </div>
  )
}

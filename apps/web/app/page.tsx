"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProfiles } from "@/lib/app-context"

export default function RootPage() {
  const router = useRouter()
  const { isLoggedIn, activeProfile } = useProfiles()

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login")
    } else if (!activeProfile) {
      router.replace("/profiles")
    } else {
      router.replace("/home")
    }
  }, [isLoggedIn, activeProfile, router])

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
    </div>
  )
}

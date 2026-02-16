"use client"

import { useState, useMemo, useEffect } from "react"
import { useProfiles, useMeals, useWeights, useUI } from "@/lib/app-context"
import { formatDate, calculateDayTotals } from "@/lib/nutrition-helpers"
import { WeightInputModal } from "@/components/weight-input-modal"
import { AddMealDrawer } from "@/components/add-meal-drawer"
import { DayDetailDrawer } from "@/components/day-detail-drawer"
import { Button } from "@/components/ui/button"
import { Pencil, ChevronLeft, ChevronRight, Scale, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getStartDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function HomePage() {
  const { activeProfile } = useProfiles()
  const { getMealsByDate } = useMeals()
  const { addWeight, getWeightByDate } = useWeights()
  const { addMealDrawerOpen, setAddMealDrawerOpen } = useUI()

  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(formatDate(today))
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [addMealOpen, setAddMealOpen] = useState(false)
  const [dayDetailOpen, setDayDetailOpen] = useState(false)

  // Sync with global navbar "+" button
  useEffect(() => {
    if (addMealDrawerOpen) {
      setAddMealOpen(true)
      setAddMealDrawerOpen(false)
    }
  }, [addMealDrawerOpen, setAddMealDrawerOpen])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const startDay = getStartDayOfMonth(viewYear, viewMonth)

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const dayMeals = getMealsByDate(selectedDate)
  const dayTotals = useMemo(() => calculateDayTotals(dayMeals), [dayMeals])
  const dayWeight = getWeightByDate(selectedDate)

  const todayStr = formatDate(today)

  function handleSaveWeight(w: number) {
    if (!activeProfile) return
    addWeight({
      id: `w-${Date.now()}`,
      profileId: activeProfile.id,
      date: selectedDate,
      weight: w,
    })
  }

  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr)
    setDayDetailOpen(true)
  }

  function handleOpenAddMeal() {
    setDayDetailOpen(false)
    setAddMealOpen(true)
  }

  return (
    <div className="page-transition mx-auto max-w-lg px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hola, {activeProfile?.name}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={() => setAddMealOpen(true)}
          className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
          aria-label="Agregar comida"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
      </header>

      {/* Calendar */}
      <section className="mb-5 rounded-2xl border border-border bg-card p-4" aria-label="Calendario mensual">
        {/* Month Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Mes anterior">
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-sm font-semibold capitalize text-foreground">{monthLabel}</h2>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Mes siguiente">
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const weightForDay = getWeightByDate(dateStr)
            const mealsForDay = getMealsByDate(dateStr)
            const hasMeals = mealsForDay.length > 0

            return (
              <button
                key={day}
                onClick={() => handleDayClick(dateStr)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-all",
                  isSelected
                    ? "bg-foreground text-background"
                    : isToday
                      ? "border border-foreground/30 text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                aria-label={`${day} de ${monthLabel}${weightForDay ? `, ${weightForDay.weight}kg` : ""}`}
                aria-current={isToday ? "date" : undefined}
              >
                <span className="font-medium">{day}</span>
                {weightForDay && (
                  <span className={cn(
                    "text-[8px] tabular-nums leading-none",
                    isSelected ? "text-background/70" : "text-muted-foreground"
                  )}>
                    {weightForDay.weight}
                  </span>
                )}
                {hasMeals && !isSelected && (
                  <div className="absolute bottom-1 size-1 rounded-full bg-foreground/40" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Weight Card */}
      <section className="mb-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
              <Scale className="size-4 text-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Peso del dia</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {dayWeight ? `${dayWeight.weight.toFixed(1)} kg` : "Sin registro"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeightModalOpen(true)}
            className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Editar peso"
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      </section>

      {/* Daily Calorie Summary - always visible at bottom */}
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">Resumen del dia</p>
        {dayMeals.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Kcal", value: dayTotals.kcal, accent: true },
              { label: "Proteinas", value: `${dayTotals.protein.toFixed(1)}g` },
              { label: "Carbos", value: `${dayTotals.carbs.toFixed(1)}g` },
              { label: "Grasas", value: `${dayTotals.fat.toFixed(1)}g` },
            ].map((macro) => (
              <div key={macro.label} className="flex flex-col items-center rounded-xl bg-secondary px-2 py-3">
                <span className="text-[10px] text-muted-foreground">{macro.label}</span>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  macro.accent ? "text-foreground" : "text-foreground/70"
                )}>{macro.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2 text-center">
            <p className="text-sm text-muted-foreground">Sin comidas registradas</p>
            <button
              onClick={() => setAddMealOpen(true)}
              className="mt-1 text-xs text-foreground/70 underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Toca + para agregar
            </button>
          </div>
        )}
      </section>

      {/* Drawers */}
      <DayDetailDrawer
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
        selectedDate={selectedDate}
        onAddMeal={handleOpenAddMeal}
      />

      <AddMealDrawer
        open={addMealOpen}
        onOpenChange={setAddMealOpen}
        selectedDate={selectedDate}
      />

      <WeightInputModal
        open={weightModalOpen}
        onOpenChange={setWeightModalOpen}
        currentWeight={dayWeight?.weight}
        onSave={handleSaveWeight}
        date={selectedDate}
      />
    </div>
  )
}

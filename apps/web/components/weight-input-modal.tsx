"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

interface WeightInputModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentWeight?: number
  onSave: (weight: number) => void
  date: string
}

export function WeightInputModal({ open, onOpenChange, currentWeight, onSave, date }: WeightInputModalProps) {
  const [weight, setWeight] = useState(currentWeight ?? 70)

  useEffect(() => {
    if (open) {
      setWeight(currentWeight ?? 70)
    }
  }, [open, currentWeight])

  function adjustWeight(delta: number) {
    setWeight((prev) => Math.max(20, Math.round((prev + delta) * 10) / 10))
  }

  function handleSave() {
    onSave(weight)
    onOpenChange(false)
  }

  const displayDate = new Date(date + "T12:00:00")
  const dateStr = displayDate.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle className="text-center text-foreground">Registrar peso</DrawerTitle>
          <p className="text-center text-sm text-muted-foreground capitalize">{dateStr}</p>
        </DrawerHeader>

        <div className="flex flex-col items-center gap-6 px-6 py-4">
          {/* Weight Display */}
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold tabular-nums text-foreground">{weight.toFixed(1)}</span>
            <span className="text-lg text-muted-foreground">kg</span>
          </div>

          {/* Adjust Buttons */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustWeight(-1)}
              className="size-12 rounded-xl border-border"
              aria-label="Restar 1 kg"
            >
              <span className="text-sm font-medium text-foreground">-1</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustWeight(-0.1)}
              className="size-10 rounded-xl border-border"
              aria-label="Restar 0.1 kg"
            >
              <Minus className="size-4 text-foreground" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustWeight(0.1)}
              className="size-10 rounded-xl border-border"
              aria-label="Sumar 0.1 kg"
            >
              <Plus className="size-4 text-foreground" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustWeight(1)}
              className="size-12 rounded-xl border-border"
              aria-label="Sumar 1 kg"
            >
              <span className="text-sm font-medium text-foreground">+1</span>
            </Button>
          </div>

          {/* Manual Input */}
          <input
            type="number"
            value={weight}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v >= 20 && v <= 500) setWeight(v)
            }}
            step="0.1"
            min="20"
            max="500"
            className="w-32 rounded-xl border border-border bg-card px-3 py-2 text-center text-lg text-foreground tabular-nums outline-none focus:border-foreground/50"
            aria-label="Ingresar peso manualmente"
          />
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSave}
            className="h-11 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90"
          >
            Guardar
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" className="h-10 rounded-xl text-muted-foreground">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { useChat as useChatContext } from "@/lib/app-context"
import { ChatMessage as ChatMessageBubble, TypingIndicator } from "@/components/chat-message"
import { Button } from "@/components/ui/button"
import { SendHorizontal, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChatMessage } from "@/lib/types"

export default function ChatPage() {
  const { messages, addMessage, clearMessages } = useChatContext()
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    addMessage(userMsg)
    setInput("")
    setIsTyping(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })

      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: data.reply || "Hubo un error. Intenta de nuevo.",
        timestamp: new Date().toISOString(),
      }

      addMessage(aiMsg)
    } catch {
      addMessage({
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        content: "Error de conexion. Intenta de nuevo.",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsTyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="page-transition flex h-[calc(100dvh-4rem)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">NutriChat</h1>
          <p className="text-[11px] text-muted-foreground">IA de alimentacion y nutricion</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Limpiar chat"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isTyping && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
              <span className="text-2xl font-bold text-foreground">N</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Hola! Soy NutriChat</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Preguntame sobre alimentacion, nutricion, macros, recetas saludables...
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Cuanta proteina necesito?", "Que desayunar para bajar de peso?", "Beneficios de la avena"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta algo sobre alimentacion..."
            rows={1}
            className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/50"
            style={{ height: "auto", overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = Math.min(target.scrollHeight, 96) + "px"
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            size="icon"
            className="size-10 shrink-0 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30"
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

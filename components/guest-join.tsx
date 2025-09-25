"use client"

import type React from "react"

import { useState } from "react"
import { joinAsGuest } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"

// Lista de avatares aleatórios do DiceBear
const avatars = [
  { id: "default", url: null },
  { id: "avatar1", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Felix" },
  { id: "avatar2", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Whiskers" },
  { id: "avatar3", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Buddy" },
  { id: "avatar4", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Max" },
  { id: "avatar5", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Thumper" },
  { id: "avatar6", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Firefox" },
  { id: "avatar7", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Hedwig" },
  { id: "avatar8", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Pingu" },
  { id: "avatar9", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Po" },
  { id: "avatar10", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Simba" },
  { id: "avatar11", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Tigger" },
  { id: "avatar12", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Zoe" },
]

interface GuestJoinProps {
  roomId: string
  roomName: string
}

export default function GuestJoin({ roomId, roomName }: GuestJoinProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [guestName, setGuestName] = useState("")
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log("👤 Tentando entrar como convidado...")
    console.log("📝 Nome:", guestName)
    console.log("📝 Room ID:", roomId)
    console.log("📝 Avatar:", selectedAvatar)

    // Validações básicas
    if (!guestName || guestName.trim() === "") {
      setError("Nome é obrigatório")
      return
    }

    if (!roomId) {
      setError("ID da sala inválido")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("🚀 Chamando Server Action joinAsGuest...")
      const result = await joinAsGuest(roomId, guestName.trim(), selectedAvatar)
      console.log("📄 Resultado:", result)

      if (result.error) {
        console.log("❌ Erro retornado:", result.error)
        setError(result.error)
        toast({
          title: "Erro ao entrar na sala",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Bem-vindo!",
        description: `Você entrou na sala como ${guestName}`,
        variant: "success",
      })

      console.log("✅ Entrada como convidado bem-sucedida, recarregando página...")
      // Pequeno delay antes de recarregar para mostrar o toast
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      console.error("❌ Erro no handleSubmit:", err)
      console.error("❌ Stack trace:", err.stack)

      const errorMessage = err.message || "Ocorreu um erro ao entrar na sala. Tente novamente."
      setError(errorMessage)
      toast({
        title: "Erro ao entrar na sala",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isLoading && guestName.trim()) {
      e.preventDefault()
      const form = e.currentTarget.closest("form")
      if (form) {
        const formEvent = new Event("submit", { bubbles: true, cancelable: true })
        form.dispatchEvent(formEvent)
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Entrar na sala: {roomName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md flex items-start text-sm">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col items-center mb-4">
              <div className="mb-4">
                {selectedAvatar ? (
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <img src={selectedAvatar || "/placeholder.svg"} alt="Avatar" className="h-16 w-16" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => setShowAvatarDialog(true)}>
                Escolher avatar
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestName">Seu nome</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                placeholder="Digite seu nome para entrar no chat"
                maxLength={50}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full relative" disabled={!guestName.trim() || isLoading}>
              {isLoading ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="sr-only">Entrando...</span>
                  <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span>
                </span>
              ) : (
                "Entrar no chat"
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Já tem uma conta?{" "}
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                Faça login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha seu avatar</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <RadioGroup
              value={selectedAvatar || "default"}
              onValueChange={setSelectedAvatar}
              className="grid grid-cols-3 gap-4"
            >
              {avatars.map((avatar) => (
                <div key={avatar.id} className="flex flex-col items-center space-y-2">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {avatar.url ? (
                        <img src={avatar.url || "/placeholder.svg"} alt="Avatar" className="h-16 w-16" />
                      ) : (
                        <div className="h-16 w-16 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <RadioGroupItem
                      value={avatar.url || "default"}
                      id={avatar.id}
                      className="absolute bottom-0 right-0"
                    />
                  </div>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

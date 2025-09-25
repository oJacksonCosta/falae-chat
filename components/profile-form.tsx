"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateProfile } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { LoadingButton } from "@/components/ui/loading-button"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { User } from "@/lib/types"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

interface ProfileFormProps {
  user: User
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [username, setUsername] = useState(user.username || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState(user.photoURL || null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (password && password !== confirmPassword) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    try {
      const result = await updateProfile({
        username,
        password: password || undefined,
        photoURL: selectedAvatar,
      })

      if (result.error) {
        setError(result.error)
        toast({
          title: "Erro ao atualizar perfil",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso!",
        variant: "success",
      })

      router.refresh()
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err)
      setError("Ocorreu um erro ao atualizar o perfil. Tente novamente.")
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar o perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleBack() {
    router.push("/dashboard")
  }

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md flex items-start text-sm">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col items-center mb-4">
              <div className="mb-4">
                <UserAvatar user={{ ...user, photoURL: selectedAvatar }} size="lg" />
              </div>
              <Button type="button" variant="outline" onClick={() => setShowAvatarDialog(true)}>
                Alterar avatar
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova senha (deixe em branco para não alterar)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="flex w-full space-x-2">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <LoadingButton type="submit" className="flex-1" isLoading={isLoading} loadingText="Salvando...">
                Salvar alterações
              </LoadingButton>
            </div>
          </CardFooter>
        </form>
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
                        <UserAvatar user={{ id: user.id, username: user.username }} size="lg" />
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
    </>
  )
}

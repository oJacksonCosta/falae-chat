"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle, Camera } from "lucide-react"
import { LoadingButton } from "@/components/ui/loading-button"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
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

export default function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    console.log("📝 Formulário de registro submetido")

    setIsLoading(true)
    setError("")

    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    try {
      console.log("🚀 Chamando Server Action register...")
      const result = await register({
        username: formData.get("username") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        photoURL: selectedAvatar,
      })

      console.log("📄 Resultado da Server Action:", result)

      if (result.error) {
        console.log("❌ Erro retornado da Server Action:", result.error)
        setError(result.error)
        return
      }

      toast({
        title: "Conta criada",
        description: "Sua conta foi criada com sucesso!",
        variant: "success",
      })

      console.log("✅ Registro bem-sucedido, redirecionando...")
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      console.error("❌ Erro no handleSubmit:", err)
      setError("Ocorreu um erro ao criar a conta. Tente novamente.")

      toast({
        title: "Erro ao criar conta",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log("🏁 handleSubmit finalizado")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault()
      const form = e.currentTarget.closest("form")
      if (form) {
        const formData = new FormData(form)
        handleSubmit(formData)
      }
    }
  }

  return (
    <>
      <Card>
        <form action={handleSubmit}>
          <CardContent className="pt-6 space-y-4">
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
              <Label htmlFor="username">Nome de usuário</Label>
              <Input id="username" name="username" required onKeyDown={handleKeyDown} disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <LoadingButton type="submit" className="w-full" isLoading={isLoading} loadingText="Criando conta...">
              Criar conta
            </LoadingButton>

            <div className="text-sm text-center text-gray-600 dark:text-gray-400">
              Já tem uma conta?{" "}
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                Faça login
              </Link>
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
    </>
  )
}

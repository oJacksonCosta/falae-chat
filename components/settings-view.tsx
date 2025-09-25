"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Moon, Sun, Monitor, Bell, Shield, Trash2 } from "lucide-react"
import type { User } from "@/lib/types"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useNotification } from "@/hooks/use-notification"

interface SettingsViewProps {
  user: User
}

export default function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { permission, requestPermission } = useNotification()
  const [notifications, setNotifications] = useState(permission === "granted")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false)

  // Atualizar estado quando permissão mudar
  useEffect(() => {
    setNotifications(permission === "granted")
  }, [permission])

  function handleBack() {
    router.push("/dashboard")
  }

  function handleThemeChange(newTheme: string) {
    setTheme(newTheme)
    toast({
      title: "Tema alterado",
      description: `Tema alterado para ${newTheme === "light" ? "claro" : newTheme === "dark" ? "escuro" : "sistema"}`,
    })
  }

  async function handleNotificationToggle(enabled: boolean) {
    if (enabled) {
      const granted = await requestPermission()
      setNotifications(granted)
    } else {
      setNotifications(false)
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações. Para reativar, use as configurações do navegador.",
      })
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl min-h-screen">
      <header className="flex items-center mb-8">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
      </header>

      <div className="space-y-6">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserAvatar user={user} size="sm" className="mr-3" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Nome de usuário</Label>
                <p className="text-gray-600 dark:text-gray-400">{user.username}</p>
              </div>
              {user.email && (
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                </div>
              )}
              <Button variant="outline" onClick={() => router.push("/profile")}>
                Editar perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sun className="h-5 w-5 mr-2" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label className="text-sm font-medium">Tema</Label>
              <RadioGroup value={theme} onValueChange={handleThemeChange} className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex items-center cursor-pointer">
                    <Sun className="h-4 w-4 mr-2" />
                    Claro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center cursor-pointer">
                    <Moon className="h-4 w-4 mr-2" />
                    Escuro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="flex items-center cursor-pointer">
                    <Monitor className="h-4 w-4 mr-2" />
                    Sistema
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notificações push</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receber notificações quando não estiver na aba do chat
                  </p>
                </div>
                <Switch checked={notifications} onCheckedChange={handleNotificationToggle} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Sons de notificação</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reproduzir som ao receber mensagens</p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Privacidade e Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-exclusão de mensagens</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Excluir mensagens automaticamente após 24 horas
                  </p>
                </div>
                <Switch checked={autoDeleteMessages} onCheckedChange={setAutoDeleteMessages} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zona de Perigo */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5 mr-2" />
              Zona de Perigo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-red-600 dark:text-red-400">Excluir conta</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Funcionalidade em desenvolvimento",
                      description: "A exclusão de conta estará disponível em breve.",
                    })
                  }}
                >
                  Excluir conta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

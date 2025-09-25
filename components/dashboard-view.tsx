"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createRoom, getUserRooms, deletePermanentRoom } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AlertCircle,
  LogOut,
  Plus,
  Settings,
  UserIcon,
  MessageSquare,
  Loader2,
  Clock,
  Bookmark,
  RefreshCw,
  Trash2,
  Users,
  ExternalLink,
} from "lucide-react"
import { logout } from "@/lib/actions"
import type { User, Room } from "@/lib/types"
import { useAuth } from "@/components/firebase-auth-provider"
import { LoadingButton } from "@/components/ui/loading-button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardViewProps {
  user: User
}

export default function DashboardView({ user }: DashboardViewProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [roomLink, setRoomLink] = useState("")
  const [isTemporary, setIsTemporary] = useState(true)
  const [error, setError] = useState("")
  const [joinError, setJoinError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [ownedRooms, setOwnedRooms] = useState<Room[]>([])
  const [participatingRooms, setParticipatingRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingRooms, setDeletingRooms] = useState<Set<string>>(new Set())

  console.log("🏠 DashboardView renderizado", {
    user,
    authUser: authUser ? { id: authUser.id, username: authUser.username } : null,
  })

  // Carregar salas do usuário (criadas E participantes)
  const loadUserRooms = async () => {
    setLoadingRooms(true)
    try {
      console.log("🔄 Carregando salas do usuário...")
      const result = await getUserRooms()
      console.log("📄 Resultado da busca de salas:", result)

      if (result.ownedRooms && result.participatingRooms) {
        console.log("📄 Salas criadas carregadas:", result.ownedRooms)
        console.log("📄 Salas participantes carregadas:", result.participatingRooms)
        setOwnedRooms(result.ownedRooms)
        setParticipatingRooms(result.participatingRooms)
      } else if (result.error) {
        console.error("Erro ao carregar salas:", result.error)
        toast({
          title: "Erro ao carregar salas",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Erro ao carregar salas:", err)
      toast({
        title: "Erro ao carregar salas",
        description: "Não foi possível carregar suas salas.",
        variant: "destructive",
      })
    } finally {
      setLoadingRooms(false)
    }
  }

  // Função para atualizar manualmente as salas
  const refreshRooms = async () => {
    setIsRefreshing(true)
    await loadUserRooms()
    setIsRefreshing(false)
    toast({
      title: "Salas atualizadas",
      description: "A lista de salas foi atualizada.",
    })
  }

  // Função para extrair ID da sala do link
  const extractRoomIdFromLink = (link: string): string | null => {
    try {
      // Remover espaços em branco
      const cleanLink = link.trim()

      // Padrões possíveis:
      // https://falaechat.vercel.app/room/abc123
      // http://localhost:3000/room/abc123
      // /room/abc123
      // room/abc123
      // abc123 (apenas o ID)

      // Tentar extrair usando regex
      const patterns = [
        /\/room\/([a-zA-Z0-9_-]+)/, // /room/id
        /^([a-zA-Z0-9_-]+)$/, // apenas o ID
      ]

      for (const pattern of patterns) {
        const match = cleanLink.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }

      return null
    } catch (error) {
      console.error("Erro ao extrair ID da sala:", error)
      return null
    }
  }

  useEffect(() => {
    loadUserRooms()
  }, [])

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault()
    console.log("🏠 Iniciando criação de sala...")
    console.log("📝 Dados do formulário:", { roomName, isTemporary })

    setIsLoading(true)
    setError("")

    try {
      const result = await createRoom(roomName, isTemporary)
      console.log("📄 Resultado da criação:", result)

      if (result.error) {
        setError(result.error)
        toast({
          title: "Erro ao criar sala",
          description: result.error,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      toast({
        title: "Sala criada",
        description: `A sala "${roomName}" foi criada com sucesso!`,
        variant: "success",
      })

      // Se a sala não for temporária, recarregar a lista de salas
      if (!isTemporary) {
        console.log("🔄 Recarregando salas após criação...")
        await loadUserRooms()
      }

      // Limpar formulário
      setRoomName("")
      setIsTemporary(true)
      setIsCreating(false)

      setIsNavigating(true)
      router.push(`/room/${result.roomId}`)
    } catch (err: any) {
      console.error("❌ Erro ao criar sala:", err)
      setError("Ocorreu um erro ao criar a sala. Tente novamente.")
      toast({
        title: "Erro ao criar sala",
        description: "Ocorreu um erro ao criar a sala. Tente novamente.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault()
    console.log("🔗 Iniciando entrada na sala via link...")
    console.log("📝 Link fornecido:", roomLink)

    setIsJoiningRoom(true)
    setJoinError("")

    try {
      // Extrair ID da sala do link
      const roomId = extractRoomIdFromLink(roomLink)

      if (!roomId) {
        setJoinError("Link inválido. Verifique se o link está correto.")
        setIsJoiningRoom(false)
        return
      }

      console.log("📄 ID da sala extraído:", roomId)

      toast({
        title: "Entrando na sala",
        description: "Redirecionando para a sala...",
      })

      // Limpar formulário
      setRoomLink("")
      setIsJoining(false)

      // Redirecionar para a sala
      setIsNavigating(true)
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      console.error("❌ Erro ao entrar na sala:", err)
      setJoinError("Ocorreu um erro ao processar o link. Tente novamente.")
      toast({
        title: "Erro ao entrar na sala",
        description: "Ocorreu um erro ao processar o link. Tente novamente.",
        variant: "destructive",
      })
      setIsJoiningRoom(false)
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      })
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("❌ Erro ao fazer logout:", err)
      toast({
        title: "Erro ao fazer logout",
        description: "Ocorreu um erro ao sair da sua conta. Tente novamente.",
        variant: "destructive",
      })
      setIsLoggingOut(false)
    }
  }

  function handleNavigateToProfile() {
    router.push("/profile")
  }

  function handleNavigateToSettings() {
    router.push("/settings")
  }

  function handleNavigateToRoom(roomId: string) {
    setIsNavigating(true)
    router.push(`/room/${roomId}`)
  }

  async function handleDeletePermanentRoom(roomId: string, roomName: string) {
    if (!window.confirm(`Tem certeza que deseja excluir a sala "${roomName}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    setDeletingRooms((prev) => new Set(prev).add(roomId))

    try {
      const result = await deletePermanentRoom(roomId)

      if (result.error) {
        toast({
          title: "Erro ao excluir sala",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sala excluída",
        description: `A sala "${roomName}" foi excluída com sucesso.`,
        variant: "success",
      })

      // Recarregar a lista de salas
      await loadUserRooms()
    } catch (error: any) {
      console.error("Erro ao excluir sala:", error)
      toast({
        title: "Erro ao excluir sala",
        description: "Não foi possível excluir a sala. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setDeletingRooms((prev) => {
        const newSet = new Set(prev)
        newSet.delete(roomId)
        return newSet
      })
    }
  }

  // Usar o usuário do contexto de autenticação se disponível
  const currentUser = authUser || user

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl min-h-screen flex flex-col">
      <header className="flex justify-between items-center mb-6 md:mb-8">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Falaê Chat</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative rounded-full h-9 w-9 md:h-10 md:w-10 p-0">
              <UserAvatar user={currentUser} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center" onClick={handleNavigateToProfile}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Editar Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center" onClick={handleNavigateToSettings}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center text-red-600 focus:text-red-600"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Olá, {currentUser.username}</h2>
          <p className="text-gray-600 dark:text-gray-400">Crie uma nova sala ou acesse suas salas permanentes</p>
        </div>

        <div className="grid gap-6 w-full mx-auto">
          {/* Salas criadas por mim */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Bookmark className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Minhas Salas Criadas
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshRooms}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <CardDescription>Salas permanentes que você criou ({ownedRooms.length}/2)</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRooms ? (
                <div className="flex justify-center items-center py-6 md:py-8">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-gray-400" />
                </div>
              ) : ownedRooms.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ownedRooms.map((room) => (
                    <Card key={room.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          <Button
                            variant="ghost"
                            className="flex-1 h-full p-3 md:p-4 justify-start text-left flex flex-col items-start"
                            onClick={() => handleNavigateToRoom(room.id)}
                            disabled={isNavigating || deletingRooms.has(room.id)}
                          >
                            <div className="font-medium text-base md:text-lg mb-1 line-clamp-1">{room.name}</div>
                            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(room.createdAt).toLocaleDateString()}
                            </div>
                          </Button>
                          <div className="flex items-center p-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePermanentRoom(room.id, room.name)}
                              disabled={deletingRooms.has(room.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              {deletingRooms.has(room.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                  <p>Você ainda não criou salas permanentes</p>
                  <p className="text-sm mt-1">Crie uma sala não temporária para que ela apareça aqui</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Salas que participo */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Salas que Participo
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshRooms}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <CardDescription>Salas permanentes das quais você participa</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRooms ? (
                <div className="flex justify-center items-center py-6 md:py-8">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-gray-400" />
                </div>
              ) : participatingRooms.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {participatingRooms.map((room) => (
                    <Card key={room.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <Button
                          variant="ghost"
                          className="w-full h-full p-3 md:p-4 justify-start text-left flex flex-col items-start"
                          onClick={() => handleNavigateToRoom(room.id)}
                          disabled={isNavigating}
                        >
                          <div className="font-medium text-base md:text-lg mb-1 line-clamp-1">{room.name}</div>
                          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(room.createdAt).toLocaleDateString()}
                          </div>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8 text-gray-500 dark:text-gray-400">
                  <p>Você ainda não participa de salas permanentes</p>
                  <p className="text-sm mt-1">Entre em salas permanentes para que elas apareçam aqui</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Criar nova sala */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg md:text-xl">Nova sala</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {isCreating ? (
                  <form onSubmit={handleCreateRoom} className="space-y-4 w-full max-w-md">
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md flex items-start text-sm">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="roomName">Nome da sala</Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        required
                        className="w-full"
                        placeholder="Digite o nome da sala"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isTemporary"
                        checked={isTemporary}
                        onCheckedChange={(checked) => setIsTemporary(checked === true)}
                      />
                      <Label htmlFor="isTemporary" className="text-sm cursor-pointer">
                        Sala temporária
                      </Label>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isTemporary
                        ? "Salas temporárias são excluídas quando ficam vazias"
                        : `Salas permanentes ficam salvas (${ownedRooms.length}/2 usadas)`}
                    </div>

                    <div className="flex space-x-2">
                      <LoadingButton type="submit" isLoading={isLoading} loadingText="Criando..." className="flex-1">
                        Criar
                      </LoadingButton>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreating(false)
                          setRoomName("")
                          setError("")
                        }}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button onClick={() => setIsCreating(true)} className="w-full max-w-xs" size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar nova sala
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Entrar em sala via link */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg md:text-xl">Entrar em sala</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {isJoining ? (
                  <form onSubmit={handleJoinRoom} className="space-y-4 w-full max-w-md">
                    {joinError && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md flex items-start text-sm">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{joinError}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="roomLink">Link da sala</Label>
                      <Input
                        id="roomLink"
                        value={roomLink}
                        onChange={(e) => setRoomLink(e.target.value)}
                        required
                        className="w-full"
                        placeholder="Cole o link da sala aqui"
                      />
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Você pode colar o link completo ou apenas o ID da sala
                    </div>

                    <div className="flex space-x-2">
                      <LoadingButton
                        type="submit"
                        isLoading={isJoiningRoom}
                        loadingText="Entrando..."
                        className="flex-1"
                      >
                        Entrar
                      </LoadingButton>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsJoining(false)
                          setRoomLink("")
                          setJoinError("")
                        }}
                        disabled={isJoiningRoom}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button onClick={() => setIsJoining(true)} className="w-full max-w-xs" size="lg" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Entrar via link
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { deleteRoom } from "@/lib/actions"
import { addUserToRoom, removeUserFromRoom } from "@/lib/rooms"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { User, Message } from "@/lib/types"
import {
  ArrowLeft,
  Copy,
  Paperclip,
  Send,
  Trash,
  Camera,
  FileIcon,
  ImageIcon as ImageIconLucide,
  ImageIcon,
  Loader2,
  LogOut,
  ChevronDown,
  X,
  Flame,
} from "lucide-react"
import { MessageGroup } from "@/components/message-group"
import { TypingIndicator } from "@/components/typing-indicator"
import { EmojiPicker } from "@/components/emoji-picker"
import { ShareLink } from "@/components/share-link"
import { useAuth } from "@/components/firebase-auth-provider"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useNotification } from "@/hooks/use-notification"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { UserAvatar } from "@/components/ui/user-avatar"
import { v4 as uuidv4 } from "uuid"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ChatRoomProps {
  roomId: string
  roomName: string
  user: User
  isOwner: boolean
}

function formatFileSize(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Função para agrupar mensagens por usuário e tempo
function groupMessages(messages: Message[]): Array<{ messages: Message[]; showTime: boolean }> {
  const groups: Array<{ messages: Message[]; showTime: boolean }> = []
  let currentGroup: Message[] = []
  let lastSenderId = ""
  let lastTimestamp = 0

  messages.forEach((message, index) => {
    const messageTime = new Date(message.timestamp).getTime()
    const timeDiff = messageTime - lastTimestamp
    const isSameSender = message.senderId === lastSenderId
    const isWithinTimeWindow = timeDiff < 5 * 60 * 1000 // 5 minutos

    if (isSameSender && isWithinTimeWindow && currentGroup.length > 0) {
      // Adicionar à mensagem ao grupo atual
      currentGroup.push(message)
    } else {
      // Finalizar grupo anterior se existir
      if (currentGroup.length > 0) {
        groups.push({
          messages: [...currentGroup],
          showTime: true,
        })
      }
      // Iniciar novo grupo
      currentGroup = [message]
      lastSenderId = message.senderId
    }

    lastTimestamp = messageTime

    // Adicionar último grupo
    if (index === messages.length - 1 && currentGroup.length > 0) {
      groups.push({
        messages: [...currentGroup],
        showTime: true,
      })
    }
  })

  return groups
}

// Componente para exibir mensagem de arquivo em carregamento
function UploadingFileMessage({
  type,
  fileName,
  fileSize,
  user,
}: {
  type: "image" | "file"
  fileName?: string
  fileSize?: number
  user: User
}) {
  return (
    <div className="flex justify-end mb-6">
      <div className="max-w-[80%]">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-right">Enviando...</span>

          {type === "image" ? (
            <div className="bg-blue-500 bg-opacity-50 rounded-lg rounded-tr-none p-3 flex items-center justify-center h-[200px] w-[300px] backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                <span className="text-white text-sm">Enviando imagem...</span>
              </div>
            </div>
          ) : (
            <div className="bg-blue-500 bg-opacity-50 rounded-lg rounded-tr-none p-3 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <FileIcon className="h-8 w-8 text-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">{fileName || "Arquivo"}</p>
                  {fileSize && <p className="text-xs text-white opacity-80">{formatFileSize(fileSize)}</p>}
                </div>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ml-3 flex-shrink-0">
        <UserAvatar user={user} size="sm" />
      </div>
    </div>
  )
}

interface MessageGroupProps {
  messages: Message[]
  sender: User
  currentUser: User
  onReply: (message: Message) => void
}

export default function ChatRoom({ roomId, roomName, user, isOwner }: ChatRoomProps) {
  const router = useRouter()
  const { user: authUser, clearGuestSession } = useAuth()
  const { toast } = useToast()
  const { showNotification, requestPermission, permission } = useNotification()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: string; type: "image" | "file"; fileName?: string; fileSize?: number }[]
  >([])
  const [showShareLink, setShowShareLink] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isTakingPhoto, setIsTakingPhoto] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isDestructive, setIsDestructive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
  const unsubscribeRef = useRef<() => void | null>()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageCountRef = useRef(0)

  // Estados para controle de rolagem inteligente
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTopRef = useRef(0)

  // Usar o usuário do contexto de autenticação se disponível
  const currentUser = authUser || user

  // Hook para indicador de digitação
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(roomId, currentUser)

  // Função para marcar mensagens como lidas quando visualizadas
  const markMessagesAsRead = async (messagesToMark: Message[]) => {
    if (!currentUser?.id || !roomId) return

    try {
      const unreadMessages = messagesToMark.filter(
        (msg) => msg.senderId !== currentUser.id && (!msg.readBy || !msg.readBy.includes(currentUser.id)),
      )

      if (unreadMessages.length === 0) return

      console.log(`📖 Marcando ${unreadMessages.length} mensagens como lidas`)

      // Marcar todas as mensagens não lidas como lidas
      const batch = []
      for (const message of unreadMessages) {
        const messageRef = doc(db, "rooms", roomId, "messages", message.id)
        batch.push(
          updateDoc(messageRef, {
            readBy: arrayUnion(currentUser.id),
          }),
        )
      }

      await Promise.all(batch)
      console.log(`✅ ${unreadMessages.length} mensagens marcadas como lidas`)
    } catch (error) {
      console.error("❌ Erro ao marcar mensagens como lidas:", error)
    }
  }

  // Adicionar usuário à sala quando entrar
  useEffect(() => {
    if (!roomId || !currentUser?.id) return

    addUserToRoom(roomId, currentUser.id).catch((error) => {
      console.error("Erro ao adicionar usuário à sala:", error)
    })

    // Remover usuário da sala quando sair
    return () => {
      removeUserFromRoom(roomId, currentUser.id).catch((error) => {
        console.error("Erro ao remover usuário da sala:", error)
      })
    }
  }, [roomId, currentUser?.id])

  // Verificar visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible"
      setIsPageVisible(isVisible)
      console.log("👁️ Visibilidade da página mudou:", isVisible ? "visível" : "oculta")

      // Marcar mensagens como lidas quando a página ficar visível
      if (isVisible && messages.length > 0) {
        markMessagesAsRead(messages)
      }
    }

    const handleFocus = () => {
      console.log("👁️ Página ganhou foco")
      setIsPageVisible(true)
      if (messages.length > 0) {
        markMessagesAsRead(messages)
      }
    }

    const handleBlur = () => {
      console.log("👁️ Página perdeu foco")
      // Não alterar isPageVisible aqui, apenas logar
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [messages])

  // Solicitar permissão para notificações de forma mais robusta
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (permission === "default") {
        console.log("🔔 Solicitando permissão para notificações...")
        const result = await requestPermission()
        console.log("🔔 Resultado da solicitação:", result)
      } else {
        console.log("🔔 Permissão atual:", permission)
      }
    }

    // Pequeno delay para não interferir com o carregamento inicial
    const timeoutId = setTimeout(requestNotificationPermission, 2000)

    return () => clearTimeout(timeoutId)
  }, [permission, requestPermission])

  // Função para verificar se o usuário está no final do chat
  const isAtBottom = () => {
    if (!messagesContainerRef.current) return true

    const container = messagesContainerRef.current
    const threshold = 100 // pixels de tolerância

    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  const scrollToBottom = (force = false) => {
    if (!messagesEndRef.current) return

    console.log("📜 Tentando rolar para o final, forçado:", force)

    // Só rolar automaticamente se o usuário estiver no final ou se for forçado
    if (force || (!isUserScrolling && isAtBottom())) {
      console.log("📜 Executando rolagem para o final")
      try {
        messagesEndRef.current.scrollIntoView({ behavior: force ? "auto" : "smooth" })

        // Backup: definir scrollTop diretamente se necessário
        if (force && messagesContainerRef.current) {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
              console.log("📜 Rolagem forçada aplicada")
            }
          }, 50)
        }

        setShowScrollToBottom(false)
      } catch (error) {
        console.error("❌ Erro ao rolar para o final:", error)
      }
    }
  }

  // Detectar quando o usuário está rolando
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop
      const isScrollingUp = currentScrollTop < lastScrollTopRef.current

      // Se o usuário rolou para cima, marcar como scrolling
      if (isScrollingUp) {
        setIsUserScrolling(true)
        setShowScrollToBottom(!isAtBottom())
      } else if (isAtBottom()) {
        // Se chegou no final, não está mais scrolling
        setIsUserScrolling(false)
        setShowScrollToBottom(false)

        // Marcar mensagens como lidas quando chegar no final
        if (messages.length > 0) {
          markMessagesAsRead(messages)
        }
      } else {
        setShowScrollToBottom(true)
      }

      lastScrollTopRef.current = currentScrollTop

      // Limpar timeout anterior
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Definir que o usuário parou de rolar após 1 segundo
      scrollTimeoutRef.current = setTimeout(() => {
        if (isAtBottom()) {
          setIsUserScrolling(false)
          setShowScrollToBottom(false)
        }
      }, 1000)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [messages])

  // Marcar mensagens como lidas quando estão visíveis na tela
  useEffect(() => {
    if (messages.length > 0 && isPageVisible && isAtBottom()) {
      console.log("📖 Marcando mensagens como lidas (página visível + no final)")
      markMessagesAsRead(messages)
    }
  }, [messages, isPageVisible])

  // Rolagem automática inteligente - apenas para novas mensagens, uploads e digitação
  useEffect(() => {
    // Pequeno delay para garantir que o DOM foi atualizado
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [messages.length, uploadingFiles.length, typingUsers.length]) // Dependências específicas

  // Usar Firestore real-time listener para mensagens
  useEffect(() => {
    if (!roomId) return

    console.log("🔄 Configurando listener de mensagens para sala:", roomId)

    const messagesRef = collection(db, "rooms", roomId, "messages")
    const q = query(messagesRef, orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("📨 Recebidas atualizações de mensagens:", snapshot.docs.length)

        const newMessages = snapshot.docs.map((doc) => {
          const data = doc.data()

          const timestamp =
            data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()

          return {
            id: doc.id,
            roomId,
            content: data.content,
            type: data.type,
            sender: data.sender,
            senderId: data.senderId,
            timestamp,
            fileName: data.fileName,
            fileSize: data.fileSize,
            senderPhotoURL: data.senderPhotoURL,
            readBy: data.readBy || [],
            replyTo: data.replyTo || null,
            isDestructive: data.isDestructive || false,
            destructiveTimer: data.destructiveTimer,
          }
        })

        console.log("📄 Mensagens processadas:", newMessages.length)

        // Verificar se há novas mensagens para notificação
        const previousCount = lastMessageCountRef.current
        const currentCount = newMessages.length

        if (currentCount > previousCount && previousCount > 0) {
          const latestMessage = newMessages[newMessages.length - 1]
          console.log("🔔 Nova mensagem detectada:", latestMessage)

          // Verificar se não é uma mensagem própria
          if (latestMessage.senderId !== currentUser.id) {
            console.log("🔔 Página visível:", isPageVisible)
            console.log("🔔 Permissão de notificação:", permission)

            // Mostrar notificação se a página não estiver visível OU se estiver visível mas sem foco
            const shouldNotify = !isPageVisible || !document.hasFocus()

            if (shouldNotify) {
              console.log("🔔 Mostrando notificação para nova mensagem")
              showNotification({
                title: `${roomName} - ${latestMessage.sender}`,
                body:
                  latestMessage.type === "text"
                    ? latestMessage.content.length > 50
                      ? latestMessage.content.substring(0, 50) + "..."
                      : latestMessage.content
                    : latestMessage.type === "image"
                      ? "📷 Enviou uma imagem"
                      : "📎 Enviou um arquivo",
                onClick: () => {
                  window.focus()
                },
              })
            } else {
              console.log("🔔 Notificação não enviada - página visível e com foco")
            }
          }
        }

        // Atualizar contador e mensagens
        lastMessageCountRef.current = currentCount
        setMessages(newMessages)

        // Rolar para o final quando as mensagens forem carregadas inicialmente
        if (newMessages.length > 0 && previousCount === 0) {
          console.log("📜 Rolando para o final após carregar mensagens iniciais")
          setTimeout(() => {
            scrollToBottom(true)
            // Marcar mensagens como lidas após carregar
            markMessagesAsRead(newMessages)
          }, 100)
        }
      },
      (error) => {
        console.error("❌ Erro ao receber mensagens:", error)
        console.error("❌ Código do erro:", error.code)
        console.error("❌ Mensagem do erro:", error.message)
        toast({
          title: "Erro ao receber mensagens",
          description: "Ocorreu um erro ao receber as mensagens. Tente recarregar a página.",
          variant: "destructive",
        })
      },
    )

    unsubscribeRef.current = unsubscribe

    return () => {
      console.log("🔄 Removendo listener de mensagens")
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      stopTyping()
    }
  }, [roomId, currentUser?.id, showNotification, permission, roomName])

  // Limpar listener ao desmontar o componente
  useEffect(() => {
    return () => {
      console.log("🧹 Limpando recursos do chat...")
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      stopTyping()
    }
  }, [])

  useEffect(() => {
    // Rolar para o final quando o componente montar
    console.log("📜 Componente montado, configurando rolagem inicial")
    const initialScrollTimeout = setTimeout(() => {
      console.log("📜 Executando rolagem inicial")
      scrollToBottom(true)
    }, 500) // Tempo suficiente para o DOM renderizar

    return () => clearTimeout(initialScrollTimeout)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [newMessage])

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()

    if (!newMessage.trim() || !currentUser?.id || !roomId) return

    setIsLoading(true)
    stopTyping() // Parar indicador de digitação

    try {
      console.log("💬 Enviando mensagem de texto:", newMessage.substring(0, 20) + "...")

      const messageData: any = {
        content: newMessage,
        type: "text",
        sender: currentUser.name,
        senderId: currentUser.id,
        timestamp: serverTimestamp(),
        senderPhotoURL: currentUser.photoURL || null,
        readBy: [currentUser.id], // Marcar como lida pelo remetente
        isDestructive,
      }

      // Adicionar timer destrutivo se habilitado
      if (isDestructive) {
        messageData.destructiveTimer = Date.now() + 10 * 1000 // 10 segundos
      }

      // Adicionar informações de resposta se estiver respondendo
      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo.id,
          content: replyingTo.content,
          sender: replyingTo.senderName,
          type: replyingTo.type,
        }
      }

      const messagesRef = collection(db, "rooms", roomId, "messages")
      await addDoc(messagesRef, messageData)

      console.log("✅ Mensagem enviada com sucesso")
      setNewMessage("")
      setReplyingTo(null)
      setIsDestructive(false)

      // Forçar rolagem para o final quando enviar mensagem
      setTimeout(() => {
        scrollToBottom(true)
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 100)
    } catch (error: any) {
      console.error("❌ Erro ao enviar mensagem:", error)
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível enviar sua mensagem. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para fazer upload de arquivo usando Vercel Blob
  async function uploadFile(file: File) {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao fazer upload do arquivo")
      }

      const data = await response.json()
      return { url: data.url }
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error)
      throw error
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUser?.id || !roomId) return

    setIsUploading(true)

    const uploadId = uuidv4()
    const fileType = file.type.startsWith("image/") ? "image" : "file"
    setUploadingFiles((prev) => [
      ...prev,
      {
        id: uploadId,
        type: fileType,
        fileName: file.name,
        fileSize: file.size,
      },
    ])

    try {
      console.log("📁 Iniciando upload de arquivo:", file.name)
      const result = await uploadFile(file)

      if (result.url) {
        console.log("💬 Enviando mensagem com arquivo:", file.name)

        const messageData: any = {
          content: result.url,
          type: fileType,
          fileName: file.name,
          fileSize: file.size,
          sender: currentUser.name,
          senderId: currentUser.id,
          timestamp: serverTimestamp(),
          senderPhotoURL: currentUser.photoURL || null,
          readBy: [currentUser.id], // Marcar como lida pelo remetente
        }

        // Adicionar informações de resposta se estiver respondendo
        if (replyingTo) {
          messageData.replyTo = {
            messageId: replyingTo.id,
            content: replyingTo.content,
            sender: replyingTo.senderName,
            type: replyingTo.type,
          }
          setReplyingTo(null)
        }

        const messagesRef = collection(db, "rooms", roomId, "messages")
        await addDoc(messagesRef, messageData)

        console.log("✅ Mensagem com arquivo enviada com sucesso")
      }
    } catch (error: any) {
      console.error("❌ Erro ao fazer upload do arquivo:", error)
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Não foi possível enviar seu arquivo. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadId))
      setIsUploading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function handleDeleteRoom() {
    if (!isOwner) return

    if (window.confirm("Tem certeza que deseja excluir esta sala? Esta ação não pode ser desfeita.")) {
      setIsDeleting(true)

      try {
        const result = await deleteRoom(roomId)

        if (result.error) {
          throw new Error(result.error)
        }

        toast({
          title: "Sala excluída",
          description: "A sala foi excluída com sucesso.",
          variant: "success",
        })

        // Redirecionar baseado no tipo de usuário - convidados SEMPRE para home
        if (currentUser.isGuest) {
          router.push("/")
        } else {
          router.push("/dashboard")
        }
      } catch (error: any) {
        console.error("Erro ao excluir sala:", error)
        toast({
          title: "Erro ao excluir sala",
          description: error.message || "Não foi possível excluir a sala. Tente novamente.",
          variant: "destructive",
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  function handleBack() {
    console.log("🔙 Botão voltar clicado, usuário:", currentUser)

    // Convidados SEMPRE vão para a página inicial
    if (currentUser.isGuest) {
      console.log("👤 Usuário é convidado, limpando sessão e redirecionando para home")
      clearGuestSession()
      setIsNavigating(true)
      router.push("/")
    } else {
      console.log("👤 Usuário logado, redirecionando para dashboard")
      setIsNavigating(true)
      router.push("/dashboard")
    }
  }

  function handleGuestLogout() {
    console.log("🚪 Convidado saindo da sala")
    clearGuestSession()
    toast({
      title: "Sessão encerrada",
      description: "Você saiu da sala como convidado.",
    })
    router.push("/")
  }

  async function startCamera() {
    try {
      console.log("Solicitando acesso à câmera...")

      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Acesso à câmera concedido")

      setCameraStream(stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Garantir que o vídeo esteja carregado antes de tentar tirar uma foto
        videoRef.current.onloadedmetadata = () => {
          console.log("Vídeo carregado, dimensões:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight)
          if (videoRef.current) {
            videoRef.current.play().catch((err) => {
              console.error("Erro ao reproduzir vídeo:", err)
            })
          }
        }
      } else {
        console.error("Referência de vídeo não disponível")
        throw new Error("Erro ao inicializar câmera")
      }
    } catch (error) {
      console.error("Erro ao acessar câmera:", error)
      toast({
        title: "Erro ao acessar câmera",
        description: "Não foi possível acessar sua câmera. Verifique as permissões.",
        variant: "destructive",
      })
      setShowCameraDialog(false)
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCameraDialog(false)
  }

  async function takePhoto() {
    if (!videoRef.current || !canvasRef.current || !currentUser?.id || !roomId) {
      console.error("Referências de vídeo ou canvas não disponíveis")
      return
    }

    setIsTakingPhoto(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        console.error("Contexto do canvas não disponível")
        return
      }

      // Definir as dimensões do canvas para corresponder ao vídeo
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      console.log("Dimensões do vídeo:", video.videoWidth, "x", video.videoHeight)
      console.log("Dimensões do canvas:", canvas.width, "x", canvas.height)

      // Desenhar o quadro atual do vídeo no canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Converter o canvas para blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob)
          },
          "image/jpeg",
          0.95,
        )
      })

      if (!blob) {
        throw new Error("Não foi possível capturar a foto")
      }

      console.log("Foto capturada com sucesso, tamanho:", blob.size, "bytes")

      // Criar um arquivo a partir do blob
      const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: "image/jpeg" })
      const uploadId = uuidv4()

      // Adicionar à lista de arquivos em upload
      setUploadingFiles((prev) => [
        ...prev,
        {
          id: uploadId,
          type: "image",
          fileName: file.name,
          fileSize: file.size,
        },
      ])

      // Fechar a câmera
      stopCamera()

      // Fazer upload do arquivo
      console.log("Iniciando upload da foto...")
      const result = await uploadFile(file)

      if (result.url) {
        console.log("Upload concluído, URL:", result.url)

        const messageData: any = {
          content: result.url,
          type: "image",
          fileName: file.name,
          fileSize: file.size,
          sender: currentUser.name,
          senderId: currentUser.id,
          timestamp: serverTimestamp(),
          senderPhotoURL: currentUser.photoURL || null,
          readBy: [currentUser.id], // Marcar como lida pelo remetente
        }

        // Adicionar informações de resposta se estiver respondendo
        if (replyingTo) {
          messageData.replyTo = {
            messageId: replyingTo.id,
            content: replyingTo.content,
            sender: replyingTo.senderName,
            type: replyingTo.type,
          }
          setReplyingTo(null)
        }

        // Adicionar mensagem com a imagem
        const messagesRef = collection(db, "rooms", roomId, "messages")
        await addDoc(messagesRef, messageData)

        console.log("Mensagem com imagem enviada com sucesso")
      }

      // Remover da lista de uploads
      setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadId))
    } catch (error: any) {
      console.error("Erro ao capturar foto:", error)
      toast({
        title: "Erro ao capturar foto",
        description: error.message || "Não foi possível capturar a foto. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsTakingPhoto(false)
    }
  }

  // Verificar se os dados necessários estão disponíveis
  if (!roomId || !roomName || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Carregando sala...</h2>
          <p className="text-gray-500">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  // Agrupar mensagens
  const messageGroups = groupMessages(messages)

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {/* CONVIDADOS NÃO TÊM BOTÃO VOLTAR - eles não têm dashboard */}
            {!currentUser.isGuest && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2" disabled={isNavigating}>
                {isNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{roomName}</h1>
              {currentUser.isGuest && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Você está como convidado: {currentUser.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowShareLink(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>

            {currentUser.isGuest && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGuestLogout}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteRoom}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 relative bg-transparent"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : (
                  <>
                    <Trash className="h-4 w-4 mr-2" />
                    Excluir sala
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 relative" ref={messagesContainerRef}>
        <div className="container mx-auto max-w-4xl">
          {messageGroups.length === 0 && uploadingFiles.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Nenhuma mensagem ainda. Seja o primeiro a enviar!
            </div>
          ) : (
            <>
              {messageGroups.map((group, index) => (
                <div key={`${group.messages[0].id}-${index}`} className="mb-6">
                  <MessageGroup
                    messages={group.messages}
                    sender={{
                      id: group.messages[0].senderId,
                      name: group.messages[0].senderName,
                      email: "",
                      isGuest: group.messages[0].senderId.startsWith("guest_"),
                    }}
                    currentUser={currentUser}
                    onReply={handleReply}
                  />
                </div>
              ))}

              {uploadingFiles.map((file) => (
                <UploadingFileMessage
                  key={file.id}
                  type={file.type}
                  fileName={file.fileName}
                  fileSize={file.fileSize}
                  user={currentUser}
                />
              ))}
            </>
          )}

          {/* Indicador de digitação */}
          <TypingIndicator users={typingUsers} />

          <div ref={messagesEndRef} />
        </div>

        {/* Botão para rolar para o final */}
        {showScrollToBottom && (
          <Button
            onClick={() => scrollToBottom(true)}
            className="fixed bottom-20 right-6 rounded-full w-12 h-12 p-0 shadow-lg z-10 bg-blue-500 hover:bg-blue-600 text-white"
            size="icon"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3 border-l-4 border-blue-500">
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Respondendo para {replyingTo.senderName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {replyingTo.type === "text"
                    ? replyingTo.content
                    : replyingTo.type === "image"
                      ? "📷 Imagem"
                      : "📎 Arquivo"}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelReply} className="ml-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mb-1"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isUploading}
                  className="mb-1 bg-transparent"
                >
                  <ImageIconLucide className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowCameraDialog(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  <span>Câmera</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*"
                      fileInputRef.current.click()
                    }
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  <span>Galeria</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  if (e.target.value.trim()) {
                    startTyping()
                  } else {
                    stopTyping()
                  }
                }}
                placeholder={replyingTo ? `Respondendo para ${replyingTo.senderName}...` : "Digite sua mensagem..."}
                disabled={isLoading || isUploading}
                className="flex-1 min-h-[40px] max-h-[120px] resize-none pr-20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                  if (e.key === "Escape" && replyingTo) {
                    cancelReply()
                  }
                }}
                onBlur={stopTyping}
                rows={1}
              />

              {/* Botões dentro do input */}
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={isLoading || isUploading} />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDestructive(!isDestructive)}
                  disabled={isLoading || isUploading}
                  className={`h-8 w-8 p-0 ${
                    isDestructive
                      ? "text-red-500 hover:text-red-600"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                  title="Mensagem destrutiva (10s)"
                >
                  <Flame className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={isLoading || isUploading || !newMessage.trim()}
              className="relative mb-1"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </div>

      {/* Share Link Modal */}
      {showShareLink && <ShareLink roomId={roomId} roomName={roomName} onClose={() => setShowShareLink(false)} />}

      {/* Camera Dialog */}
      <Dialog
        open={showCameraDialog}
        onOpenChange={(open) => {
          if (!open) stopCamera()
          setShowCameraDialog(open)
          if (open) startCamera()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tirar foto</DialogTitle>
            <DialogDescription>Use sua câmera para tirar uma foto e enviar no chat.</DialogDescription>
          </DialogHeader>
          <div className="relative bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto rounded-md"
              style={{ maxHeight: "60vh" }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {isTakingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex justify-center mt-4">
            <Button
              onClick={takePhoto}
              disabled={isTakingPhoto}
              className="rounded-full w-16 h-16 p-0 flex items-center justify-center relative"
            >
              {isTakingPhoto ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full border-4 border-white" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

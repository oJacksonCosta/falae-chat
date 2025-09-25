"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { formatTime } from "@/lib/utils"
import { Check, CheckCheck, Download, Flame } from "lucide-react"
import { deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Message, User } from "@/lib/types"

interface MessageGroupProps {
  messages: Message[]
  sender: User
  currentUser: User
  onReply: (message: Message) => void
}

interface DestructiveTimerProps {
  message: Message
  onDestroy: () => void
}

function DestructiveTimer({ message, onDestroy }: DestructiveTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    if (!message.isDestructive || !message.destructiveTimer) return

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, message.destructiveTimer! - now)
      const seconds = Math.ceil(remaining / 1000)

      setTimeLeft(seconds)

      if (remaining <= 0) {
        onDestroy()
      }
    }

    // Atualizar imediatamente
    updateTimer()

    // Atualizar a cada segundo
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [message.isDestructive, message.destructiveTimer, onDestroy])

  if (!message.isDestructive || timeLeft <= 0) return null

  return (
    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <Flame className="h-3 w-3" />
      <span className="min-w-[32px] tabular-nums">{timeLeft}s</span>
    </div>
  )
}

export function MessageGroup({ messages, sender, currentUser, onReply }: MessageGroupProps) {
  const isOwnMessage = sender.id === currentUser.id
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({})
  const [destroyedMessages, setDestroyedMessages] = useState<Set<string>>(new Set())

  const handleMessageClick = (message: Message) => {
    const currentCount = clickCounts[message.id] || 0
    const newCount = currentCount + 1

    setClickCounts((prev) => ({
      ...prev,
      [message.id]: newCount,
    }))

    // Responder apenas no segundo clique
    if (newCount === 2) {
      onReply(message)
      // Reset do contador após responder
      setClickCounts((prev) => ({
        ...prev,
        [message.id]: 0,
      }))
    }

    // Reset do contador após 2 segundos se não houver segundo clique
    setTimeout(() => {
      setClickCounts((prev) => ({
        ...prev,
        [message.id]: 0,
      }))
    }, 2000)
  }

  const handleDestroyMessage = async (messageId: string, roomId: string) => {
    try {
      await deleteDoc(doc(db, "rooms", roomId, "messages", messageId))
      setDestroyedMessages((prev) => new Set([...prev, messageId]))
    } catch (error) {
      console.error("Erro ao destruir mensagem:", error)
    }
  }

  const downloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderMessageContent = (message: Message) => {
    if (destroyedMessages.has(message.id)) {
      return <div className="text-gray-500 italic text-sm opacity-75 animate-pulse">Esta mensagem foi destruída</div>
    }

    if (message.type === "image" && message.content) {
      return (
        <div className="relative">
          <img
            src={message.content || "/placeholder.svg"}
            alt={message.fileName || "Imagem"}
            className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.content, "_blank")}
          />
          {message.fileName && (
            <div className="absolute bottom-2 right-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadFile(message.content!, message.fileName!)
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )
    }

    if (message.type === "file" && message.content) {
      return (
        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-xs">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                {message.fileName?.split(".").pop()?.toUpperCase() || "FILE"}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.fileName}</p>
            {message.fileSize && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(message.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => downloadFile(message.content!, message.fileName!)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )
    }

    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>
  }

  const getReadStatus = (message: Message) => {
    if (!isOwnMessage) return null

    // Verificar se há outros usuários que leram a mensagem (excluindo o remetente)
    const readByOthers = message.readBy?.filter((userId) => userId !== currentUser.id) || []
    const isRead = readByOthers.length > 0

    return (
      <div className="flex items-center justify-end mt-1">
        {isRead ? (
          <CheckCheck className="h-3 w-3 text-green-500" title="Visualizado" />
        ) : (
          <Check className="h-3 w-3 text-gray-400" title="Enviado" />
        )}
      </div>
    )
  }

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex ${isOwnMessage ? "flex-row-reverse" : "flex-row"} items-end max-w-[70%]`}>
        {/* Avatar sempre visível com espaçamento aumentado */}
        <div className={`flex-shrink-0 ${isOwnMessage ? "ml-3" : "mr-3"}`}>
          <UserAvatar
            user={{
              id: isOwnMessage ? currentUser.id : sender.id,
              username: isOwnMessage ? currentUser.username : sender.username,
              photoURL: isOwnMessage ? currentUser.photoURL : messages[0].senderPhotoURL,
              email: "",
              isGuest: isOwnMessage ? currentUser.isGuest : sender.isGuest,
            }}
            size="sm"
            className="mb-1"
          />
        </div>

        <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} space-y-1 flex-1`}>
          {!isOwnMessage && <span className="text-xs text-gray-500 dark:text-gray-400 px-2">{sender.username}</span>}

          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1
            const clickCount = clickCounts[message.id] || 0
            const isDestroyed = destroyedMessages.has(message.id)

            return (
              <div
                key={message.id}
                className="relative group cursor-pointer"
                onClick={() => !isDestroyed && handleMessageClick(message)}
              >
                {/* Reply indicator */}
                {message.replyTo && !isDestroyed && (
                  <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{message.replyTo.sender}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {message.replyTo.type === "image"
                        ? "📷 Imagem"
                        : message.replyTo.type === "file"
                          ? "📎 Arquivo"
                          : message.replyTo.content}
                    </div>
                  </div>
                )}

                <div
                  className={`px-3 py-2 rounded-lg transition-all ${
                    clickCount === 1 ? "ring-2 ring-blue-400 ring-offset-2" : ""
                  } ${
                    isOwnMessage
                      ? `bg-blue-500 text-white ${isLastMessage ? "rounded-br-none" : "rounded-br-lg"} ${
                          message.isDestructive && !isDestroyed ? "border border-red-300" : ""
                        }`
                      : `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${
                          isLastMessage ? "rounded-bl-none" : "rounded-bl-lg"
                        } ${message.isDestructive && !isDestroyed ? "border-red-200 bg-red-50 dark:bg-red-950/20" : ""}`
                  }`}
                >
                  {renderMessageContent(message)}

                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                      {formatTime(message.timestamp)}
                    </span>
                    {getReadStatus(message)}
                  </div>

                  {/* Timer destrutivo */}
                  {message.isDestructive && !isDestroyed && (
                    <DestructiveTimer
                      message={message}
                      onDestroy={() => handleDestroyMessage(message.id, message.roomId || "")}
                    />
                  )}
                </div>

                {/* Tooltip de resposta no hover */}
                {!isDestroyed && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {clickCount === 1 ? "Clique novamente para responder" : "Clique duas vezes para responder"}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

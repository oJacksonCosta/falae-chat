"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  onClick?: () => void
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const { toast } = useToast()

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    console.log("🔔 Solicitando permissão para notificações...")

    if (!("Notification" in window)) {
      console.warn("🔔 Este navegador não suporta notificações")
      return "denied"
    }

    if (permission === "granted") {
      console.log("🔔 Permissão já concedida")
      return "granted"
    }

    try {
      const result = await Notification.requestPermission()
      console.log("🔔 Resultado da solicitação:", result)
      setPermission(result)

      if (result === "granted") {
        console.log("🔔 Permissão concedida com sucesso")
        // Mostrar notificação de teste
        setTimeout(() => {
          try {
            const testNotification = new Notification("Falaê Chat", {
              body: "Notificações ativadas com sucesso!",
              icon: "/favicon.png",
              tag: "test-notification",
            })
            setTimeout(() => testNotification.close(), 3000)
          } catch (error) {
            console.error("🔔 Erro na notificação de teste:", error)
          }
        }, 500)
      }

      return result
    } catch (error) {
      console.error("🔔 Erro ao solicitar permissão:", error)
      return "denied"
    }
  }, [permission])

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      console.log("🔔 Tentando mostrar notificação:", options.title)
      console.log("🔔 Permissão atual:", permission)
      console.log("🔔 Suporte a notificações:", "Notification" in window)

      if (!("Notification" in window)) {
        console.log("🔔 Navegador não suporta notificações, usando toast")
        // Fallback to toast
        toast({
          title: options.title,
          description: options.body,
        })
        return
      }

      if (permission === "granted") {
        try {
          console.log("🔔 Criando notificação...")
          const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || "/favicon.png",
            badge: "/favicon.png",
            tag: "chat-notification",
            requireInteraction: false,
            silent: false,
          })

          console.log("🔔 Notificação criada com sucesso")

          notification.onclick = () => {
            console.log("🔔 Notificação clicada")
            window.focus()
            notification.close()
            options.onClick?.()
          }

          notification.onerror = (error) => {
            console.error("🔔 Erro na notificação:", error)
          }

          // Auto-close after 5 seconds
          setTimeout(() => {
            notification.close()
          }, 5000)
        } catch (error) {
          console.error("🔔 Erro ao criar notificação:", error)
          // Fallback to toast
          toast({
            title: options.title,
            description: options.body,
          })
        }
      } else if (permission === "denied") {
        console.log("🔔 Permissão negada, usando toast")
        // Fallback to toast
        toast({
          title: options.title,
          description: options.body,
        })
      } else {
        console.log("🔔 Permissão padrão, solicitando permissão")
        // Request permission first
        requestPermission().then((result) => {
          console.log("🔔 Nova permissão:", result)
          if (result === "granted") {
            showNotification(options)
          } else {
            toast({
              title: options.title,
              description: options.body,
            })
          }
        })
      }
    },
    [permission, requestPermission, toast],
  )

  return {
    permission,
    requestPermission,
    showNotification,
  }
}

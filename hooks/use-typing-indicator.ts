"use client"

import { useState, useEffect, useRef } from "react"
import { doc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User, TypingUser } from "@/lib/types"

export function useTypingIndicator(roomId: string, user: User | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Função para iniciar indicador de digitação
  const startTyping = async () => {
    if (!user?.id || !roomId || isTypingRef.current) return

    try {
      isTypingRef.current = true
      const typingRef = doc(db, "rooms", roomId, "typing", user.id)
      await setDoc(typingRef, {
        id: user.id,
        name: user.name || user.id,
        timestamp: serverTimestamp(),
      })

      // Limpar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Parar de digitar após 3 segundos de inatividade
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 3000)
    } catch (error) {
      console.error("Erro ao iniciar indicador de digitação:", error)
    }
  }

  // Função para parar indicador de digitação
  const stopTyping = async () => {
    if (!user?.id || !roomId || !isTypingRef.current) return

    try {
      isTypingRef.current = false
      const typingRef = doc(db, "rooms", roomId, "typing", user.id)
      await deleteDoc(typingRef)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    } catch (error) {
      console.error("Erro ao parar indicador de digitação:", error)
    }
  }

  // Listener para usuários digitando
  useEffect(() => {
    if (!roomId) return

    const typingRef = collection(db, "rooms", roomId, "typing")
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const users: TypingUser[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        // Não incluir o próprio usuário na lista
        if (data.id !== user?.id) {
          users.push({
            id: data.id,
            name: data.name || "Usuário",
            timestamp: data.timestamp?.toMillis() || Date.now(),
          })
        }
      })

      // Filtrar usuários que estão digitando há mais de 5 segundos
      const now = Date.now()
      const activeUsers = users.filter((u) => now - u.timestamp < 5000)

      setTypingUsers(activeUsers)
    })

    return () => {
      unsubscribe()
    }
  }, [roomId, user?.id])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      stopTyping()
    }
  }, [])

  return {
    typingUsers,
    startTyping,
    stopTyping,
  }
}

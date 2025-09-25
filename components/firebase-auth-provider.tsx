"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  loading: boolean
  clearGuestSession: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  clearGuestSession: () => {},
})

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Função para limpar a sessão do convidado
  const clearGuestSession = () => {
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    setUser(null)
  }

  useEffect(() => {
    console.log("🔐 Configurando listener de autenticação...")

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🔐 Estado de autenticação alterado:", firebaseUser ? "Usuário logado" : "Usuário deslogado")

      if (firebaseUser) {
        console.log("👤 Dados do usuário Firebase:", {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isAnonymous: firebaseUser.isAnonymous,
        })

        // Converter usuário do Firebase para nosso formato de usuário
        const userData = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || "Usuário",
          email: firebaseUser.email || undefined,
          isGuest: firebaseUser.isAnonymous,
          photoURL: firebaseUser.photoURL || undefined,
        }

        console.log("👤 Dados do usuário convertidos:", userData)
        setUser(userData)
      } else {
        console.log("👤 Nenhum usuário autenticado no Firebase")

        // Verificar se há uma sessão de convidado no cookie
        const sessionCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("session="))
          ?.split("=")[1]

        if (sessionCookie) {
          try {
            const sessionData = JSON.parse(decodeURIComponent(sessionCookie))
            if (sessionData.user && sessionData.user.isGuest) {
              console.log("👤 Sessão de convidado encontrada:", sessionData.user)
              setUser(sessionData.user)
            } else {
              setUser(null)
            }
          } catch (error) {
            console.error("❌ Erro ao decodificar sessão de convidado:", error)
            setUser(null)
          }
        } else {
          setUser(null)
        }
      }

      setLoading(false)
      console.log("🔐 Loading definido como false")
    })

    return () => {
      console.log("🔐 Removendo listener de autenticação")
      unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading, clearGuestSession }}>{children}</AuthContext.Provider>
}

// Modificado para evitar logs excessivos
export const useAuth = () => {
  return useContext(AuthContext)
}

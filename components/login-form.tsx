"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { login } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { LoadingButton } from "@/components/ui/loading-button"
import { useToast } from "@/hooks/use-toast"

export default function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(formData: FormData) {
    console.log("📝 Formulário de login submetido")

    setIsLoading(true)
    setError("")

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log("📝 Dados do formulário:", {
      email,
      password: password ? "***" : "vazio",
    })

    try {
      console.log("🚀 Chamando Server Action login...")
      const result = await login(formData)
      console.log("📄 Resultado da Server Action:", result)

      if (result.error) {
        console.log("❌ Erro retornado da Server Action:", result.error)
        setError(result.error)
        return
      }

      toast({
        title: "Login realizado",
        description: "Você entrou na sua conta com sucesso!",
        variant: "success",
      })

      console.log("✅ Login bem-sucedido, redirecionando...")
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      console.error("❌ Erro no handleSubmit:", err)
      setError("Ocorreu um erro ao fazer login. Tente novamente.")

      toast({
        title: "Erro ao fazer login",
        description: "Ocorreu um erro ao fazer login. Tente novamente.",
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
    <Card>
      <form action={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md flex items-start text-sm">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              autoComplete="current-password"
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <LoadingButton type="submit" className="w-full" isLoading={isLoading} loadingText="Entrando...">
            Entrar
          </LoadingButton>

          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
              Registre-se
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

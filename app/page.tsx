import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import LoginForm from "@/components/login-form"

export default async function Home() {
  const session = await getSession()

  // Só redirecionar para dashboard se há sessão E não é convidado
  if (session && !session.user.isGuest) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Falaê Chat</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Entre para começar a conversar</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}

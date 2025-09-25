import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import RegisterForm from "@/components/register-form"

export default async function Register() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Criar Conta</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Registre-se para começar a conversar</p>
        </div>
        <RegisterForm />
      </div>
    </main>
  )
}

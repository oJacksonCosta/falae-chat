import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import ProfileForm from "@/components/profile-form"

export default async function Profile() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  // BLOQUEAR CONVIDADOS - eles não podem acessar o perfil
  if (session.user.isGuest) {
    console.log("❌ Convidado tentou acessar perfil, redirecionando para home")
    redirect("/")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Editar Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Atualize suas informações</p>
        </div>
        <ProfileForm user={session.user} />
      </div>
    </main>
  )
}

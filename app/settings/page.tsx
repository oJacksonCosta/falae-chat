import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import SettingsView from "@/components/settings-view"

export default async function Settings() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  // BLOQUEAR CONVIDADOS - eles não podem acessar configurações
  if (session.user.isGuest) {
    console.log("❌ Convidado tentou acessar configurações, redirecionando para home")
    redirect("/")
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <SettingsView user={session.user} />
    </main>
  )
}

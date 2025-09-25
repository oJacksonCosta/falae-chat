import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import DashboardView from "@/components/dashboard-view"

export default async function Dashboard() {
  console.log("🏠 Renderizando página Dashboard...")

  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  // BLOQUEAR CONVIDADOS - eles não podem acessar o dashboard
  if (session.user.isGuest) {
    console.log("❌ Convidado tentou acessar dashboard, redirecionando para home")
    redirect("/")
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <DashboardView user={session.user} />
    </main>
  )
}

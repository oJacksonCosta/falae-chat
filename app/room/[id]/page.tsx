import { getSession } from "@/lib/auth"
import { getRoomById } from "@/lib/rooms"
import ChatRoom from "@/components/chat-room"
import GuestJoin from "@/components/guest-join"
import Link from "next/link"

export default async function Room({ params }: { params: { id: string } }) {
  console.log("🏠 Carregando página Room com ID:", params.id)

  try {
    // Validar parâmetros
    if (!params?.id) {
      console.error("❌ ID da sala não fornecido")
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-4">Link inválido</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">O link que você está tentando acessar é inválido.</p>
            <div className="flex justify-center">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Voltar para o início
              </Link>
            </div>
          </div>
        </div>
      )
    }

    console.log("🏠 Buscando dados da sala...")
    const room = await getRoomById(params.id)
    console.log("📄 Sala:", room ? `Encontrada: ${room.name}` : "Não encontrada")

    // Se a sala não foi encontrada
    if (!room) {
      console.log("❌ Sala não encontrada ou foi excluída")
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-4">Sala não encontrada</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              A sala que você está tentando acessar não existe, foi excluída ou o link expirou.
            </p>
            <div className="flex justify-center">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Voltar para o início
              </Link>
            </div>
          </div>
        </div>
      )
    }

    console.log("🔐 Verificando sessão do usuário...")
    const session = await getSession()
    console.log("📄 Sessão:", session ? "Encontrada" : "Não encontrada")

    // VERIFICAR SE É SALA PERMANENTE E EXIGIR LOGIN
    if (room.isTemporary === false && !session) {
      console.log("🔒 Sala permanente requer login, mostrando tela de login")
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-4">Login necessário</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Esta é uma sala permanente. Você precisa estar logado para acessá-la.
            </p>
            <div className="flex flex-col space-y-3">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Fazer login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      )
    }

    // Se não estiver logado E for sala temporária, mostrar tela para entrar como convidado
    if (!session && room.isTemporary !== false) {
      console.log("👤 Usuário não logado em sala temporária, mostrando tela de convidado")
      return <GuestJoin roomId={params.id} roomName={room.name} />
    }

    // Se estiver logado, mostrar o chat E adicionar usuário à sala permanente
    console.log("👤 Usuário logado, mostrando chat")

    // ADICIONAR USUÁRIO À SALA PERMANENTE para que apareça no dashboard
    if (room.isTemporary === false && session) {
      console.log("💾 Adicionando usuário logado à sala permanente para dashboard")
      const { addUserToPermanentRoom } = await import("@/lib/rooms")
      try {
        await addUserToPermanentRoom(params.id, session.user.id)
      } catch (error) {
        console.error("❌ Erro ao adicionar usuário à sala permanente:", error)
      }
    }

    return (
      <main className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <ChatRoom
          roomId={params.id}
          roomName={room.name}
          user={session.user}
          isOwner={room.ownerId === session.user.id}
        />
      </main>
    )
  } catch (error) {
    console.error("❌ Erro crítico na página Room:", error)

    // Em caso de erro crítico, mostrar mensagem amigável
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Algo deu errado</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Não foi possível carregar a sala. Por favor, tente novamente mais tarde.
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

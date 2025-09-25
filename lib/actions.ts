"use server"

import { cookies } from "next/headers"
import { registerUser, loginUser, logoutUser, createGuestSession, updateUserProfile } from "./auth"
import {
  createRoom as createRoomDb,
  addMessage as addMessageDb,
  getRoomMessages as getRoomMessagesDb,
  deleteRoom as deleteRoomDb,
  getUserPermanentRooms,
  getUserParticipatingRooms,
} from "./rooms"
import type { Message } from "./types"

// Ação para registro
export async function register(data: {
  username: string
  email: string
  password: string
  photoURL?: string | null
}) {
  console.log("🚀 Server Action: register iniciada")

  const { username, email, password, photoURL } = data

  console.log("📝 Dados recebidos:", {
    username,
    email,
    password: password ? "***" : "vazio",
    photoURL: photoURL ? "Definido" : "Não definido",
  })

  if (!username || !email || !password) {
    console.log("❌ Campos obrigatórios não preenchidos")
    return { error: "Todos os campos são obrigatórios" }
  }

  try {
    console.log("🔐 Chamando registerUser...")
    const result = await registerUser(username, email, password, photoURL)
    console.log("📄 Resultado do registerUser:", result)

    if (!result.success) {
      console.log("❌ Falha no registro:", result.error)
      return { error: result.error }
    }

    console.log("🍪 Definindo cookie de sessão...")
    // Definir cookie de sessão
    const sessionData = JSON.stringify({ user: result.user })
    console.log("📄 Dados da sessão para cookie:", sessionData)

    cookies().set("session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    })
    console.log("✅ Cookie de sessão definido")

    console.log("✅ Registro concluído com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro na Server Action register:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao criar a conta" }
  }
}

// Ação para login
export async function login(formData: FormData) {
  console.log("🚀 Server Action: login iniciada")

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  console.log("📝 Dados recebidos:", {
    email,
    password: password ? "***" : "vazio",
  })

  if (!email || !password) {
    console.log("❌ Email ou senha não preenchidos")
    return { error: "Email e senha são obrigatórios" }
  }

  try {
    console.log("🔐 Chamando loginUser...")
    const result = await loginUser(email, password)
    console.log("📄 Resultado do loginUser:", result)

    if (!result.success) {
      console.log("❌ Falha no login:", result.error)
      return { error: result.error }
    }

    console.log("🍪 Definindo cookie de sessão...")
    // Definir cookie de sessão
    const sessionData = JSON.stringify({ user: result.user })
    console.log("📄 Dados da sessão para cookie:", sessionData)

    cookies().set("session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    })
    console.log("✅ Cookie de sessão definido")

    console.log("✅ Login concluído com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro na Server Action login:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao fazer login" }
  }
}

// Ação para logout
export async function logout() {
  console.log("🚀 Server Action: logout iniciada")

  try {
    console.log("🔐 Chamando logoutUser...")
    await logoutUser()
    console.log("🍪 Removendo cookie de sessão...")
    cookies().delete("session")
    console.log("✅ Logout concluído com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro na Server Action logout:", error)
    return { error: "Ocorreu um erro ao fazer logout" }
  }
}

// Ação para atualizar perfil
export async function updateProfile(data: {
  username?: string
  password?: string
  photoURL?: string | null
}) {
  console.log("🚀 Server Action: updateProfile iniciada")

  try {
    console.log("🔐 Verificando sessão do usuário...")
    const session = await import("./auth").then((m) => m.getSession())
    console.log("📄 Sessão atual:", session)

    if (!session) {
      console.log("❌ Usuário não autenticado")
      return { error: "Usuário não autenticado" }
    }

    console.log("👤 Atualizando perfil do usuário...")
    const result = await updateUserProfile(session.user.id, data)

    if (!result.success) {
      console.log("❌ Falha ao atualizar perfil:", result.error)
      return { error: result.error }
    }

    // Atualizar cookie de sessão com os novos dados
    const updatedUser = {
      ...session.user,
      username: data.username || session.user.username,
      photoURL: data.photoURL !== undefined ? data.photoURL : session.user.photoURL,
    }

    const sessionData = JSON.stringify({ user: updatedUser })
    cookies().set("session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    })

    console.log("✅ Perfil atualizado com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro na Server Action updateProfile:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao atualizar o perfil" }
  }
}

// Ação para criar sala (corrigida)
export async function createRoom(name: string, isTemporary = true) {
  console.log("🚀 Server Action: createRoom iniciada")
  console.log("📝 Nome da sala:", name)
  console.log("📝 É temporária:", isTemporary)

  if (!name || name.trim() === "") {
    console.log("❌ Nome da sala vazio")
    return { error: "O nome da sala é obrigatório" }
  }

  try {
    console.log("🔐 Verificando sessão do usuário...")
    const session = await import("./auth").then((m) => m.getSession())
    console.log("📄 Sessão atual:", session)

    if (!session) {
      console.log("❌ Usuário não autenticado")
      return { error: "Usuário não autenticado" }
    }

    console.log("🏠 Chamando createRoomDb...")
    console.log("📝 Parâmetros:", { name, userId: session.user.id, isTemporary })

    try {
      const room = await createRoomDb(name, session.user.id, isTemporary)
      console.log("✅ Sala criada:", room)
      return { roomId: room.id }
    } catch (dbError: any) {
      console.error("❌ Erro específico do createRoomDb:", dbError)
      console.error("❌ Stack trace do createRoomDb:", dbError.stack)
      return { error: `${dbError.message}` }
    }
  } catch (error: any) {
    console.error("❌ Erro geral na Server Action createRoom:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao criar a sala" }
  }
}

// Ação para enviar mensagem
export async function sendMessage(roomId: string, message: Omit<Message, "id">) {
  console.log("🚀 Server Action: sendMessage iniciada")
  console.log("📝 Room ID:", roomId)
  console.log("📝 Mensagem:", message)

  try {
    console.log("💬 Adicionando mensagem ao banco de dados...")
    await addMessageDb(roomId, message)
    console.log("✅ Mensagem enviada com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro ao enviar mensagem:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao enviar a mensagem" }
  }
}

// Ação para obter mensagens
export async function getRoomMessages(roomId: string) {
  console.log("🚀 Server Action: getRoomMessages iniciada")
  console.log("📝 Room ID:", roomId)

  try {
    console.log("💬 Buscando mensagens do banco de dados...")
    const messages = await getRoomMessagesDb(roomId)
    console.log("✅ Mensagens obtidas:", messages.length, "mensagens")
    return { messages }
  } catch (error: any) {
    console.error("❌ Erro ao obter mensagens:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao obter as mensagens" }
  }
}

// Ação para excluir sala
export async function deleteRoom(roomId: string) {
  console.log("🚀 Server Action: deleteRoom iniciada")
  console.log("📝 Room ID:", roomId)

  const session = await import("./auth").then((m) => m.getSession())
  console.log("📄 Sessão atual:", session)

  if (!session) {
    console.log("❌ Usuário não autenticado")
    return { error: "Usuário não autenticado" }
  }

  try {
    console.log("🗑️ Excluindo sala do banco de dados...")
    await deleteRoomDb(roomId)
    console.log("✅ Sala excluída com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro ao excluir sala:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao excluir a sala" }
  }
}

// Ação para excluir sala permanente (apenas para o proprietário)
export async function deletePermanentRoom(roomId: string) {
  console.log("🚀 Server Action: deletePermanentRoom iniciada")
  console.log("📝 Room ID:", roomId)

  try {
    console.log("🔐 Verificando sessão do usuário...")
    const session = await import("./auth").then((m) => m.getSession())
    console.log("📄 Sessão atual:", session)

    if (!session) {
      console.log("❌ Usuário não autenticado")
      return { error: "Usuário não autenticado" }
    }

    console.log("🏠 Verificando se a sala existe e se o usuário é o proprietário...")
    const { getRoomById } = await import("./rooms")
    const room = await getRoomById(roomId)

    if (!room) {
      console.log("❌ Sala não encontrada")
      return { error: "Sala não encontrada" }
    }

    if (room.ownerId !== session.user.id) {
      console.log("❌ Usuário não é o proprietário da sala")
      return { error: "Você não tem permissão para excluir esta sala" }
    }

    console.log("🗑️ Excluindo sala do banco de dados...")
    await deleteRoomDb(roomId)
    console.log("✅ Sala excluída com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro ao excluir sala:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao excluir a sala" }
  }
}

// Ação para entrar como convidado (modificada)
export async function joinAsGuest(roomId: string, guestName: string, photoURL?: string | null) {
  console.log("🚀 Server Action: joinAsGuest iniciada")
  console.log("📝 Room ID:", roomId)
  console.log("📝 Nome do convidado:", guestName)
  console.log("📝 Avatar:", photoURL)

  // Validações básicas
  if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
    console.log("❌ Room ID inválido")
    return { error: "ID da sala inválido" }
  }

  if (!guestName || typeof guestName !== "string" || guestName.trim() === "") {
    console.log("❌ Nome não fornecido")
    return { error: "Nome é obrigatório" }
  }

  // Verificar se a sala existe antes de criar a sessão
  try {
    console.log("🏠 Verificando se a sala existe...")
    const { getRoomById } = await import("./rooms")
    const room = await getRoomById(roomId)

    if (!room) {
      console.log("❌ Sala não encontrada")
      return { error: "Sala não encontrada ou não existe mais" }
    }

    console.log("✅ Sala encontrada:", room.name)
  } catch (roomError: any) {
    console.error("❌ Erro ao verificar sala:", roomError)
    return { error: "Erro ao verificar a sala. Tente novamente." }
  }

  try {
    console.log("🔐 Criando sessão de convidado...")
    const result = await createGuestSession(guestName.trim(), photoURL)
    console.log("📄 Resultado da criação de sessão:", result)

    if (!result.success) {
      console.log("❌ Falha na criação de sessão:", result.error)
      return { error: result.error || "Erro ao criar sessão de convidado" }
    }

    console.log("🍪 Definindo cookie de sessão para convidado...")
    // Definir cookie de sessão
    const sessionData = JSON.stringify({ user: result.user })
    console.log("📄 Dados da sessão para cookie:", sessionData)

    cookies().set("session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 dia
      path: "/",
      sameSite: "lax", // Adicionar sameSite para melhor compatibilidade
    })
    console.log("✅ Cookie de sessão definido para convidado")

    console.log("✅ Login como convidado concluído")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro na Server Action joinAsGuest:", error)
    console.error("❌ Stack trace:", error.stack)

    const errorMessage = error.message || "Ocorreu um erro ao entrar na sala"
    return { error: errorMessage }
  }
}

// Ação para buscar salas do usuário (criadas E participantes)
export async function getUserRooms() {
  console.log("🚀 Server Action: getUserRooms iniciada")

  try {
    console.log("🔐 Verificando sessão do usuário...")
    const session = await import("./auth").then((m) => m.getSession())
    console.log("📄 Sessão atual:", session)

    if (!session) {
      console.log("❌ Usuário não autenticado")
      return { error: "Usuário não autenticado" }
    }

    console.log("🏠 Buscando salas criadas pelo usuário...")
    const ownedRooms = await getUserPermanentRooms(session.user.id)
    console.log("✅ Salas criadas encontradas:", ownedRooms.length)

    console.log("🏠 Buscando salas que o usuário participa...")
    const participatingRooms = await getUserParticipatingRooms(session.user.id)
    console.log("✅ Salas participantes encontradas:", participatingRooms.length)

    return {
      ownedRooms,
      participatingRooms,
    }
  } catch (error: any) {
    console.error("❌ Erro na Server Action getUserRooms:", error)
    console.error("❌ Stack trace:", error.stack)
    return { error: "Ocorreu um erro ao buscar as salas", ownedRooms: [], participatingRooms: [] }
  }
}

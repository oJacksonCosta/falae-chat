// Modificar para remover dependência do login anônimo

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  updatePassword,
} from "firebase/auth"
import { doc, setDoc, getDoc, collection, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase"
import { cookies } from "next/headers"
import type { User } from "./types"
import { v4 as uuidv4 } from "uuid"

// Função para registrar um novo usuário
export async function registerUser(username: string, email: string, password: string, photoURL?: string | null) {
  console.log("🔐 Iniciando registro de usuário...")
  console.log("📝 Dados recebidos:", {
    username,
    email,
    password: "***",
    photoURL: photoURL ? "Definido" : "Não definido",
  })

  try {
    console.log("🔐 Criando usuário no Firebase Auth...")

    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    console.log("✅ Usuário criado no Firebase Auth:", userCredential.user.uid)

    console.log("🔐 Atualizando perfil do usuário...")
    // Atualizar o perfil com o nome de usuário
    await updateFirebaseProfile(userCredential.user, {
      displayName: username,
      photoURL: photoURL || null,
    })
    console.log("✅ Perfil atualizado com displayName:", username)

    console.log("🔐 Salvando dados adicionais no Firestore...")
    // Salvar informações adicionais no Firestore
    const userData = {
      username,
      email,
      photoURL: photoURL || null,
      createdAt: new Date().toISOString(),
    }

    // Criar documento do usuário
    await setDoc(doc(db, "users", userCredential.user.uid), userData)
    console.log("✅ Dados salvos no Firestore:", userData)

    // Criar coleção metadata para o usuário
    const metadataRef = collection(db, "users", userCredential.user.uid, "metadata")
    console.log("✅ Coleção metadata criada:", metadataRef.id)

    const result = {
      success: true,
      user: {
        id: userCredential.user.uid,
        username: username,
        email: userCredential.user.email,
        photoURL: photoURL || null,
      },
    }

    console.log("✅ Registro concluído com sucesso:", result)
    return result
  } catch (error: any) {
    console.error("❌ Erro ao registrar usuário:", error)
    console.error("❌ Código do erro:", error.code)
    console.error("❌ Mensagem do erro:", error.message)
    console.error("❌ Stack trace:", error.stack)

    let errorMessage = "Erro ao criar conta"

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "Este email já está em uso"
        break
      case "auth/weak-password":
        errorMessage = "A senha deve ter pelo menos 6 caracteres"
        break
      case "auth/invalid-email":
        errorMessage = "Email inválido"
        break
      case "auth/operation-not-allowed":
        errorMessage = "Operação não permitida. Verifique as configurações do Firebase"
        break
      default:
        errorMessage = `Erro: ${error.message}`
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Função para fazer login
export async function loginUser(email: string, password: string) {
  console.log("🔐 Iniciando login de usuário...")
  console.log("📝 Email:", email)

  try {
    console.log("🔐 Fazendo login no Firebase Auth...")
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("✅ Login realizado no Firebase Auth:", userCredential.user.uid)

    console.log("🔐 Buscando dados adicionais no Firestore...")
    // Buscar dados adicionais do usuário no Firestore
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
    const userData = userDoc.data()
    console.log("📄 Dados do Firestore:", userData)

    const result = {
      success: true,
      user: {
        id: userCredential.user.uid,
        username: userData?.username || userCredential.user.displayName,
        email: userCredential.user.email,
        photoURL: userCredential.user.photoURL || userData?.photoURL || null,
      },
    }

    console.log("✅ Login concluído com sucesso:", result)
    return result
  } catch (error: any) {
    console.error("❌ Erro ao fazer login:", error)
    console.error("❌ Código do erro:", error.code)
    console.error("❌ Mensagem do erro:", error.message)

    let errorMessage = "Erro ao fazer login"

    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        errorMessage = "Email ou senha incorretos"
        break
      case "auth/invalid-email":
        errorMessage = "Email inválido"
        break
      case "auth/user-disabled":
        errorMessage = "Conta desabilitada"
        break
      default:
        errorMessage = `Erro: ${error.message}`
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Função para atualizar perfil do usuário (corrigida)
export async function updateUserProfile(
  userId: string,
  data: { username?: string; password?: string; photoURL?: string | null },
) {
  console.log("🔐 Iniciando atualização de perfil...")
  console.log("📝 Dados recebidos:", {
    userId,
    username: data.username,
    password: data.password ? "***" : "Não definido",
    photoURL: data.photoURL !== undefined ? (data.photoURL ? "Definido" : "Removido") : "Não alterado",
  })

  try {
    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser

    // Atualizar dados no Firestore primeiro
    const userDocRef = doc(db, "users", userId)
    const updateFirestoreData: { [key: string]: any } = {}

    if (data.username) {
      updateFirestoreData.username = data.username
    }

    if (data.photoURL !== undefined) {
      updateFirestoreData.photoURL = data.photoURL
    }

    // Atualizar documento no Firestore se houver dados para atualizar
    if (Object.keys(updateFirestoreData).length > 0) {
      console.log("🔐 Atualizando dados no Firestore:", updateFirestoreData)
      await updateDoc(userDocRef, updateFirestoreData)
      console.log("✅ Dados atualizados no Firestore")
    }

    // Se o usuário estiver autenticado no Firebase, atualizar também lá
    if (currentUser && currentUser.uid === userId) {
      // Atualizar dados no Firebase Auth
      const updateData: { displayName?: string; photoURL?: string | null } = {}

      if (data.username) {
        updateData.displayName = data.username
      }

      if (data.photoURL !== undefined) {
        updateData.photoURL = data.photoURL
      }

      // Atualizar perfil no Firebase Auth se houver dados para atualizar
      if (Object.keys(updateData).length > 0) {
        console.log("🔐 Atualizando perfil no Firebase Auth:", updateData)
        await updateFirebaseProfile(currentUser, updateData)
        console.log("✅ Perfil atualizado no Firebase Auth")
      }

      // Atualizar senha se fornecida
      if (data.password && data.password.trim() !== "") {
        console.log("🔐 Atualizando senha...")
        try {
          await updatePassword(currentUser, data.password)
          console.log("✅ Senha atualizada")
        } catch (passwordError: any) {
          console.error("❌ Erro ao atualizar senha:", passwordError)

          if (passwordError.code === "auth/requires-recent-login") {
            throw new Error(
              "Para alterar a senha, você precisa fazer login novamente. Saia e entre novamente na sua conta.",
            )
          } else if (passwordError.code === "auth/weak-password") {
            throw new Error("A senha deve ter pelo menos 6 caracteres")
          } else {
            throw new Error(`Erro ao atualizar senha: ${passwordError.message}`)
          }
        }
      }
    } else {
      console.log("⚠️ Usuário não autenticado no Firebase Auth ou IDs não coincidem")

      if (data.password && data.password.trim() !== "") {
        throw new Error("Para alterar a senha, você precisa estar logado. Faça login novamente.")
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro ao atualizar perfil:", error)
    console.error("❌ Código do erro:", error.code)
    console.error("❌ Mensagem do erro:", error.message)

    // Se o erro já tem uma mensagem personalizada, usar ela
    if (error.message && !error.code) {
      return {
        success: false,
        error: error.message,
      }
    }

    let errorMessage = "Erro ao atualizar perfil"

    switch (error.code) {
      case "auth/requires-recent-login":
        errorMessage = "Para alterar a senha, você precisa fazer login novamente. Saia e entre novamente na sua conta."
        break
      case "auth/weak-password":
        errorMessage = "A senha deve ter pelo menos 6 caracteres"
        break
      default:
        errorMessage = `Erro: ${error.message}`
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Função para fazer logout
export async function logoutUser() {
  console.log("🔐 Fazendo logout...")

  try {
    await signOut(auth)
    console.log("✅ Logout realizado com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("❌ Erro ao fazer logout:", error)
    return { success: false, error: "Erro ao fazer logout" }
  }
}

// Função para criar sessão de convidado (sem Firebase Auth)
export async function createGuestSession(guestName: string, photoURL?: string | null) {
  console.log("🔐 Criando sessão de convidado...")
  console.log("📝 Nome do convidado:", guestName)
  console.log("📝 Avatar:", photoURL)

  // Validações básicas
  if (!guestName || typeof guestName !== "string" || guestName.trim() === "") {
    console.error("❌ Nome do convidado inválido")
    return {
      success: false,
      error: "Nome é obrigatório",
    }
  }

  try {
    // Gerar ID único para o convidado
    const guestId = `guest_${uuidv4()}`
    console.log("🆔 ID do convidado gerado:", guestId)

    // Criar dados do convidado
    const guestData = {
      username: guestName.trim(),
      isGuest: true,
      photoURL: photoURL || null,
      createdAt: new Date().toISOString(),
    }

    console.log("💾 Salvando dados do convidado no Firestore...")
    try {
      // Salvar dados do convidado no Firestore (opcional, para histórico)
      await setDoc(doc(db, "guests", guestId), guestData)
      console.log("✅ Dados do convidado salvos no Firestore:", guestData)
    } catch (firestoreError) {
      console.warn("⚠️ Erro ao salvar no Firestore (continuando):", firestoreError)
      // Não falhar se não conseguir salvar no Firestore
    }

    const result = {
      success: true,
      user: {
        id: guestId,
        username: guestName.trim(),
        isGuest: true,
        photoURL: photoURL || null,
      },
    }

    console.log("✅ Sessão de convidado criada:", result)
    return result
  } catch (error: any) {
    console.error("❌ Erro ao criar sessão de convidado:", error)
    console.error("❌ Código do erro:", error.code)
    console.error("❌ Mensagem do erro:", error.message)
    console.error("❌ Stack trace:", error.stack)

    return {
      success: false,
      error: `Erro ao criar sessão de convidado: ${error.message}`,
    }
  }
}

// Função para verificar se o usuário está autenticado no servidor
export async function getSession() {
  console.log("🔐 Verificando sessão do usuário...")

  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session")?.value

    if (!sessionCookie) {
      console.log("❌ Nenhum cookie de sessão encontrado")
      return null
    }

    console.log("🔐 Decodificando cookie de sessão...")
    const sessionData = JSON.parse(sessionCookie)
    console.log("📄 Dados da sessão:", sessionData)

    if (!sessionData || !sessionData.user) {
      console.log("❌ Dados de sessão inválidos")
      return null
    }

    // Validar estrutura do usuário
    if (!sessionData.user.id || !sessionData.user.username) {
      console.log("❌ Dados do usuário na sessão inválidos")
      return null
    }

    console.log("✅ Sessão válida encontrada:", sessionData.user)
    return {
      user: sessionData.user as User,
    }
  } catch (error) {
    console.error("❌ Erro ao verificar sessão:", error)
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : "Stack não disponível")

    // Em caso de erro, retornar null ao invés de lançar exceção
    return null
  }
}

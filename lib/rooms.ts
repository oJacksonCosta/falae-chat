import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  where,
  setDoc,
  arrayUnion,
  updateDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Room, Message } from "./types"

// Função para buscar salas permanentes do usuário (criadas por ele)
export async function getUserPermanentRooms(userId: string): Promise<Room[]> {
  console.log("🏠 Buscando salas permanentes criadas pelo usuário:", userId)

  try {
    const roomsRef = collection(db, "rooms")
    // Buscar apenas por ownerId para salas criadas pelo usuário
    const q = query(roomsRef, where("ownerId", "==", userId))

    const querySnapshot = await getDocs(q)
    console.log("📊 Total de salas criadas encontradas:", querySnapshot.size)

    const rooms: Room[] = []

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      console.log("📄 Dados da sala:", doc.id, data)

      // Verificar se a sala é permanente (isTemporary === false)
      const isTemporary = data.isTemporary
      console.log("📝 isTemporary para sala", doc.id, ":", isTemporary, typeof isTemporary)

      if (isTemporary === false) {
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt

        rooms.push({
          id: doc.id,
          name: data.name,
          ownerId: data.ownerId,
          createdAt,
          isTemporary: false,
        })
      }
    })

    // Ordenar por data de criação no JavaScript
    rooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log("✅ Salas permanentes criadas encontradas:", rooms.length)
    console.log("📄 Salas permanentes criadas:", rooms)
    return rooms
  } catch (error: any) {
    console.error("❌ Erro ao buscar salas permanentes criadas:", error)
    return []
  }
}

// Função para buscar salas permanentes que o usuário participa (não criou)
export async function getUserParticipatingRooms(userId: string): Promise<Room[]> {
  console.log("🏠 Buscando salas permanentes que o usuário participa:", userId)

  try {
    const roomsRef = collection(db, "rooms")
    // Buscar salas onde o usuário está na lista de participantes mas não é o dono
    const q = query(roomsRef, where("participants", "array-contains", userId))

    const querySnapshot = await getDocs(q)
    console.log("📊 Total de salas participantes encontradas:", querySnapshot.size)

    const rooms: Room[] = []

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      console.log("📄 Dados da sala participante:", doc.id, data)

      // Verificar se a sala é permanente e o usuário não é o dono
      const isTemporary = data.isTemporary
      const isOwner = data.ownerId === userId

      if (isTemporary === false && !isOwner) {
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt

        rooms.push({
          id: doc.id,
          name: data.name,
          ownerId: data.ownerId,
          createdAt,
          isTemporary: false,
        })
      }
    })

    // Ordenar por data de criação no JavaScript
    rooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log("✅ Salas permanentes participantes encontradas:", rooms.length)
    console.log("📄 Salas permanentes participantes:", rooms)
    return rooms
  } catch (error: any) {
    console.error("❌ Erro ao buscar salas permanentes participantes:", error)
    return []
  }
}

// Função para contar salas não temporárias do usuário (simplificada)
export async function countUserPermanentRooms(userId: string): Promise<number> {
  console.log("📊 Contando salas permanentes do usuário:", userId)

  try {
    const roomsRef = collection(db, "rooms")
    const q = query(roomsRef, where("ownerId", "==", userId))
    const querySnapshot = await getDocs(q)

    let count = 0
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (data.isTemporary === false) {
        count++
      }
    })

    console.log("📊 Salas permanentes encontradas:", count)
    return count
  } catch (error: any) {
    console.error("❌ Erro ao contar salas permanentes:", error)
    return 0
  }
}

// Função para criar uma sala (corrigida para não usar orderBy)
export async function createRoom(name: string, ownerId: string, isTemporary = true): Promise<Room> {
  console.log("🏠 Criando sala...")
  console.log("📝 Dados:", { name, ownerId, isTemporary })

  if (!name || name.trim() === "") {
    console.error("❌ Nome da sala vazio")
    throw new Error("O nome da sala é obrigatório")
  }

  if (!ownerId) {
    console.error("❌ ID do proprietário vazio")
    throw new Error("ID do proprietário é obrigatório")
  }

  // Verificar limite de salas permanentes
  if (isTemporary === false) {
    const permanentRoomsCount = await countUserPermanentRooms(ownerId)
    console.log("📊 Contagem de salas permanentes:", permanentRoomsCount)

    if (permanentRoomsCount >= 2) {
      throw new Error(
        "Você já atingiu o limite de 2 salas permanentes. Exclua uma sala existente ou crie uma sala temporária.",
      )
    }
  }

  try {
    console.log("🏠 Criando documento da sala no Firestore...")

    // Garantir que isTemporary seja um booleano explícito
    const isTemporaryBool = isTemporary === false ? false : true
    console.log("📝 isTemporary (booleano final):", isTemporaryBool)

    // Gerar ID único para a sala
    const roomRef = doc(collection(db, "rooms"))
    const roomId = roomRef.id

    const roomData = {
      name: name.trim(),
      ownerId,
      createdAt: serverTimestamp(),
      activeUsers: [ownerId], // Lista de usuários ativos na sala
      participants: isTemporaryBool ? [] : [ownerId], // Lista de participantes para salas permanentes
      isTemporary: isTemporaryBool, // Campo explícito
    }

    console.log("💾 Dados do Firestore:", roomData)
    console.log("📄 ID da sala:", roomId)

    // Usar setDoc com o ID gerado
    await setDoc(roomRef, roomData)
    console.log("✅ Sala criada com sucesso no Firestore")

    const room: Room = {
      id: roomId,
      name: name.trim(),
      ownerId,
      createdAt: new Date().toISOString(),
      isTemporary: isTemporaryBool,
    }

    console.log("✅ Sala criada:", room)
    return room
  } catch (error: any) {
    console.error("❌ Erro ao criar sala:", error)
    throw new Error(`Falha ao criar sala: ${error.message}`)
  }
}

// Função para adicionar usuário à sala permanente (para aparecer no dashboard)
export async function addUserToPermanentRoom(roomId: string, userId: string): Promise<void> {
  console.log("👤 Adicionando usuário à sala permanente:", { roomId, userId })

  try {
    const roomRef = doc(db, "rooms", roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) {
      throw new Error("Sala não encontrada")
    }

    const roomData = roomDoc.data()

    // Verificar se é uma sala permanente
    if (roomData.isTemporary !== false) {
      console.log("⚠️ Tentativa de adicionar usuário a sala temporária, ignorando...")
      return
    }

    // Verificar se o usuário já está na lista de participantes
    const participants = roomData.participants || []
    if (!participants.includes(userId)) {
      await updateDoc(roomRef, {
        participants: arrayUnion(userId),
      })
      console.log("✅ Usuário adicionado à sala permanente")
    } else {
      console.log("ℹ️ Usuário já é participante da sala permanente")
    }
  } catch (error: any) {
    console.error("❌ Erro ao adicionar usuário à sala permanente:", error)
    throw error
  }
}

// Função para obter uma sala pelo ID
export async function getRoomById(roomId: string): Promise<Room | null> {
  console.log("🏠 Buscando sala por ID:", roomId)

  // Validar se o roomId é válido
  if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
    console.log("❌ ID da sala inválido:", roomId)
    return null
  }

  try {
    console.log("📄 Buscando documento da sala no Firestore...")
    const roomDoc = await getDoc(doc(db, "rooms", roomId))

    if (!roomDoc.exists()) {
      console.log("❌ Sala não encontrada")
      return null
    }

    const roomData = roomDoc.data()

    // Verificar se os dados da sala são válidos
    if (!roomData || !roomData.name || !roomData.ownerId) {
      console.log("❌ Dados da sala inválidos:", roomData)
      return null
    }

    console.log("📄 Dados da sala encontrados:", roomData)

    // Converter Timestamp para string ISO
    const createdAt =
      roomData.createdAt instanceof Timestamp ? roomData.createdAt.toDate().toISOString() : roomData.createdAt

    const room = {
      id: roomDoc.id,
      name: roomData.name,
      ownerId: roomData.ownerId,
      createdAt,
      isTemporary: roomData.isTemporary === false ? false : true,
    }

    console.log("✅ Sala encontrada:", room)
    return room
  } catch (error: any) {
    console.error("❌ Erro ao obter sala:", error)
    console.error("❌ Código do erro:", error.code)
    console.error("❌ Mensagem do erro:", error.message)
    console.error("❌ Stack trace:", error.stack)

    // Retornar null em caso de erro ao invés de lançar exceção
    return null
  }
}

// Função para adicionar usuário à sala
export async function addUserToRoom(roomId: string, userId: string): Promise<void> {
  console.log("👤 Adicionando usuário à sala:", { roomId, userId })

  try {
    const roomRef = doc(db, "rooms", roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) {
      throw new Error("Sala não encontrada")
    }

    const roomData = roomDoc.data()
    const activeUsers = roomData.activeUsers || []

    if (!activeUsers.includes(userId)) {
      const batch = writeBatch(db)
      batch.update(roomRef, {
        activeUsers: [...activeUsers, userId],
      })
      await batch.commit()
      console.log("✅ Usuário adicionado à sala")
    }
  } catch (error: any) {
    console.error("❌ Erro ao adicionar usuário à sala:", error)
    throw error
  }
}

// Função para remover usuário da sala
export async function removeUserFromRoom(roomId: string, userId: string): Promise<void> {
  console.log("👤 Removendo usuário da sala:", { roomId, userId })

  try {
    const roomRef = doc(db, "rooms", roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) {
      console.log("⚠️ Sala não encontrada, provavelmente já foi deletada")
      return
    }

    const roomData = roomDoc.data()
    const activeUsers = roomData.activeUsers || []
    const updatedUsers = activeUsers.filter((id: string) => id !== userId)

    const batch = writeBatch(db)

    if (updatedUsers.length === 0 && roomData.isTemporary !== false) {
      // Se não há mais usuários e a sala é temporária, deletar a sala
      console.log("🗑️ Nenhum usuário ativo e sala temporária, deletando sala...")
      batch.delete(roomRef)

      // Deletar todas as mensagens da sala
      const messagesRef = collection(db, "rooms", roomId, "messages")
      const messagesSnapshot = await getDocs(messagesRef)
      messagesSnapshot.docs.forEach((messageDoc) => {
        batch.delete(messageDoc.ref)
      })
    } else {
      // Atualizar lista de usuários ativos
      batch.update(roomRef, {
        activeUsers: updatedUsers,
      })
    }

    await batch.commit()
    console.log("✅ Usuário removido da sala")
  } catch (error: any) {
    console.error("❌ Erro ao remover usuário da sala:", error)
    throw error
  }
}

// Função para adicionar mensagem a uma sala
export async function addMessage(roomId: string, message: Omit<Message, "id">): Promise<Message> {
  console.log("💬 Adicionando mensagem...")

  try {
    const messageRef = collection(db, "rooms", roomId, "messages")
    const messageData = {
      ...message,
      timestamp: serverTimestamp(),
    }

    const docRef = await addDoc(messageRef, messageData)
    console.log("✅ Mensagem salva com ID:", docRef.id)

    return {
      ...message,
      id: docRef.id,
    }
  } catch (error: any) {
    console.error("❌ Erro ao adicionar mensagem:", error)
    throw new Error(`Falha ao enviar mensagem: ${error.message}`)
  }
}

// Função para obter mensagens de uma sala
export async function getRoomMessages(roomId: string): Promise<Message[]> {
  console.log("💬 Buscando mensagens da sala:", roomId)

  try {
    const messagesRef = collection(db, "rooms", roomId, "messages")
    const q = query(messagesRef, orderBy("timestamp", "asc"))
    const querySnapshot = await getDocs(q)

    const messages = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp

      return {
        id: doc.id,
        roomId,
        content: data.content,
        type: data.type,
        sender: data.sender,
        senderId: data.senderId,
        timestamp,
        fileName: data.fileName,
        fileSize: data.fileSize,
        senderPhotoURL: data.senderPhotoURL,
      }
    })

    console.log("✅ Mensagens obtidas:", messages.length, "mensagens")
    return messages
  } catch (error: any) {
    console.error("❌ Erro ao obter mensagens:", error)
    return []
  }
}

// Função para excluir uma sala (apenas para o proprietário)
export async function deleteRoom(roomId: string): Promise<void> {
  console.log("🗑️ Excluindo sala:", roomId)

  try {
    const batch = writeBatch(db)

    // Deletar sala
    batch.delete(doc(db, "rooms", roomId))

    // Deletar todas as mensagens da sala
    const messagesRef = collection(db, "rooms", roomId, "messages")
    const messagesSnapshot = await getDocs(messagesRef)
    messagesSnapshot.docs.forEach((messageDoc) => {
      batch.delete(messageDoc.ref)
    })

    await batch.commit()
    console.log("✅ Sala excluída com sucesso")
  } catch (error: any) {
    console.error("❌ Erro ao excluir sala:", error)
    throw new Error(`Falha ao excluir sala: ${error.message}`)
  }
}

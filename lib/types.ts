export interface User {
  id: string
  name: string
  email: string
  photoURL?: string
  isGuest?: boolean
}

export interface Room {
  id: string
  name: string
  description?: string
  createdBy: string
  createdAt: number
  isPrivate: boolean
  isPermanent: boolean
  participants: string[]
  lastMessage?: {
    content: string
    timestamp: number
    senderName: string
  }
}

export interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: number
  type: "text" | "image" | "file"
  fileUrl?: string
  fileName?: string
  fileSize?: number
  readBy?: string[]
  replyTo?: {
    messageId: string
    content: string
    sender: string
    type: "text" | "image" | "file"
  }
  isDestructive?: boolean
  destructiveTimer?: number
}

export interface TypingUser {
  id: string
  name: string
  timestamp: number
}

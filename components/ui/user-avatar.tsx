import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/lib/types"

interface UserAvatarProps {
  user: User
  size?: "sm" | "md" | "lg"
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  }

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  }

  const fontSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  }

  // Obter iniciais do nome de usuário
  const initials = user.username
    ? user.username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U"

  // Gerar cor baseada no ID do usuário
  const getColorFromId = (id: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ]

    // Usar o ID para selecionar uma cor
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <Avatar className={sizeClasses[size]}>
      {user.photoURL && <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.username || "Usuário"} />}
      <AvatarFallback className={`${getColorFromId(user.id)} text-white ${fontSizeClasses[size]}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

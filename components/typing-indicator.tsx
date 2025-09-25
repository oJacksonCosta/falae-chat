"use client"
import { UserAvatar } from "@/components/ui/user-avatar"

interface TypingUser {
  id: string
  name: string
  photoURL?: string | null
}

interface TypingIndicatorProps {
  users: TypingUser[]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  return (
    <div className="flex items-center space-x-2 px-4 py-2">
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <UserAvatar
            key={user.id}
            user={{
              id: user.id,
              username: user.name,
              photoURL: user.photoURL,
              email: "",
              isGuest: user.id.startsWith("guest_"),
            }}
            size="sm"
            className="border-2 border-white dark:border-gray-800"
          />
        ))}
      </div>
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {users.length === 1
            ? `${users[0].name} está digitando`
            : users.length === 2
              ? `${users[0].name} e ${users[1].name} estão digitando`
              : `${users[0].name} e mais ${users.length - 1} pessoas estão digitando`}
        </span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  )
}

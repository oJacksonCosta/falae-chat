import type * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface LoadingButtonProps extends ButtonProps {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
}

export function LoadingButton({ isLoading, loadingText, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {loadingText || "Carregando..."}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Share2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ShareLinkProps {
  roomId: string
  roomName?: string
  onClose?: () => void
}

export function ShareLink({ roomId, roomName, onClose }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const roomUrl = `${window.location.origin}/room/${roomId}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl)
      setCopied(true)
      toast({
        title: "Link copiado!",
        description: "O link da sala foi copiado para a área de transferência.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: roomName ? `Sala: ${roomName}` : "Convite para sala de chat",
          text: "Junte-se a esta sala de chat!",
          url: roomUrl,
        })
      } catch (err) {
        console.error("Erro ao compartilhar:", err)
      }
    } else {
      copyToClipboard()
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar sala</DialogTitle>
          <DialogDescription>
            {roomName ? `Compartilhe o link da sala "${roomName}"` : "Compartilhe o link desta sala"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input id="link" defaultValue={roomUrl} readOnly className="h-9" />
          </div>
          <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard}>
            <span className="sr-only">Copiar</span>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          {navigator.share && (
            <Button onClick={shareNative}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

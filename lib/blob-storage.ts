"use client"

import { put } from "@vercel/blob"
import { v4 as uuidv4 } from "uuid"

export async function uploadToBlob(file: File) {
  try {
    console.log("📁 Iniciando upload do arquivo para Vercel Blob:", file.name)

    // Verificar tamanho do arquivo (limite de 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("O arquivo não pode ser maior que 10MB")
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomId = uuidv4().substring(0, 8)
    const fileExtension = file.name.split(".").pop() || "file"
    const filename = `${timestamp}-${randomId}.${fileExtension}`

    console.log("📁 Nome do arquivo gerado:", filename)

    // Fazer upload para o Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    console.log("✅ Upload concluído, URL:", blob.url)

    return { url: blob.url }
  } catch (error: any) {
    console.error("❌ Erro ao fazer upload do arquivo:", error)
    throw new Error(`Erro no upload: ${error.message}`)
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Verificar tamanho do arquivo (limite de 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "O arquivo não pode ser maior que 10MB" }, { status: 400 })
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "file"
    const filename = `uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

    // Fazer upload para o Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
      success: true,
    })
  } catch (error: any) {
    console.error("Erro no upload:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

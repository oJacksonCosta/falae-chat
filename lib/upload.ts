export async function uploadFile(file: File, path?: string): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", file)
    if (path) {
      formData.append("path", path)
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erro ao fazer upload do arquivo")
    }

    const data = await response.json()
    return data.url
  } catch (error: any) {
    console.error("Erro ao fazer upload:", error)
    throw new Error(`Falha no upload: ${error.message}`)
  }
}

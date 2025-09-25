import { type NextRequest, NextResponse } from "next/server"

// Esta rota é um placeholder para compatibilidade com o Firebase Auth
// O Firebase Auth é gerenciado pelo cliente, então não precisamos de uma API real aqui

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "ok" })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ status: "ok" })
}

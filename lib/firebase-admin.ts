// Arquivo para inicializar o Firebase Admin SDK (opcional)
// Isso pode ser útil para verificar tokens de autenticação no servidor

import * as admin from "firebase-admin"

// Verificar se o Firebase Admin já foi inicializado
let app: admin.app.App

try {
  console.log("🔧 Verificando se o Firebase Admin já está inicializado...")
  app = admin.app()
  console.log("✅ Firebase Admin já inicializado")
} catch (error) {
  console.log("🔧 Inicializando Firebase Admin...")

  // Se não estiver inicializado, criar uma nova instância
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }

  // Se não tivermos as credenciais completas, inicializar com configuração básica
  if (!serviceAccount.privateKey) {
    console.log("⚠️ Credenciais completas não encontradas, inicializando com configuração básica")
    app = admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  } else {
    console.log("🔧 Inicializando com credenciais completas")
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    })
  }

  console.log("✅ Firebase Admin inicializado")
}

export const adminAuth = app.auth()
export const adminFirestore = app.firestore()

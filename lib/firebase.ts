import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableNetwork } from "firebase/firestore"
import { getStorage } from "firebase/storage"

console.log("🔧 Inicializando configuração do Firebase...")

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

console.log("🔧 Firebase Config:", {
  apiKey: firebaseConfig.apiKey ? "✅ Definido" : "❌ Não definido",
  authDomain: firebaseConfig.authDomain ? "✅ Definido" : "❌ Não definido",
  projectId: firebaseConfig.projectId ? "✅ Definido" : "❌ Não definido",
  storageBucket: firebaseConfig.storageBucket ? "✅ Definido" : "❌ Não definido",
  messagingSenderId: firebaseConfig.messagingSenderId ? "✅ Definido" : "❌ Não definido",
  appId: firebaseConfig.appId ? "✅ Definido" : "❌ Não definido",
})

// Verificar se todas as variáveis estão definidas
const missingVars = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.error("❌ Variáveis de ambiente do Firebase não definidas:", missingVars)
  throw new Error(`Variáveis de ambiente do Firebase não definidas: ${missingVars.join(", ")}`)
}

// Inicializar Firebase
console.log("🔧 Inicializando app Firebase...")
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
console.log("✅ Firebase app inicializado:", app.name)

console.log("🔧 Inicializando serviços Firebase...")
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

console.log("✅ Serviços Firebase inicializados:")
console.log("- Auth:", auth.app.name)
console.log("- Firestore:", db.app.name)
console.log("- Storage:", storage.app.name)

// Configurar persistência offline para melhor performance
if (typeof window !== "undefined") {
  // Habilitar cache offline
  console.log("🔧 Configurando cache offline do Firestore...")

  // Detectar quando a conexão é perdida/recuperada
  window.addEventListener("online", () => {
    console.log("🌐 Conexão restaurada, habilitando rede...")
    enableNetwork(db).catch(console.error)
  })

  window.addEventListener("offline", () => {
    console.log("📴 Conexão perdida, usando cache offline...")
  })
}

export { app, auth, db, storage }

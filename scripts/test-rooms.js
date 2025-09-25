// Script para testar a criação de salas permanentes
console.log("🧪 Testando criação de salas permanentes...")

// Simular dados de teste
const testUserId = "test-user-123"
const testRooms = [
  { name: "Sala de Teste 1", isTemporary: false },
  { name: "Sala de Teste 2", isTemporary: false },
  { name: "Sala Temporária", isTemporary: true },
]

console.log("📝 Dados de teste:", {
  userId: testUserId,
  rooms: testRooms,
})

// Verificar estrutura dos dados
testRooms.forEach((room, index) => {
  console.log(`📄 Sala ${index + 1}:`, {
    name: room.name,
    isTemporary: room.isTemporary,
    type: typeof room.isTemporary,
  })
})

console.log("✅ Teste de estrutura de dados concluído")
console.log("💡 Para testar no Firebase:")
console.log("1. Crie uma sala permanente no dashboard")
console.log("2. Verifique se ela aparece na lista")
console.log("3. Verifique no console do Firebase se os dados estão corretos")

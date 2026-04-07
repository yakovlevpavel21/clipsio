const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Начинаю глубокое лечение дат в таблице User...');
  
  const now = new Date().toISOString();

  try {
    // Используем сырой SQL, чтобы сбросить все даты в правильный ISO формат
    // Это починит и lastActive, и createdAt
    await prisma.$executeRawUnsafe(`
      UPDATE User 
      SET lastActive = '${now}', 
          createdAt = '${now}'
    `);

    console.log('✅ Все даты в таблице User успешно исправлены!');
  } catch (err) {
    console.error('❌ Ошибка при выполнении SQL:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
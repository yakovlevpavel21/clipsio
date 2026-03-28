const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Создаем тестовые каналы
  const channel1 = await prisma.channel.create({ data: { name: 'Shorts Factory' } });
  const channel2 = await prisma.channel.create({ data: { name: 'Daily Reactions' } });

  // Создаем пользователей
  const manager = await prisma.user.create({
    data: { username: 'manager1', password: '123', role: 'MANAGER' }
  });
  const creator = await prisma.user.create({
    data: { username: 'ivan_creator', password: '123', role: 'CREATOR' }
  });

  console.log('Seed data created!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
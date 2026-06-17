import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const chars = await Promise.all([
    prisma.character.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: '林夜',
        codeName: 'Shadow',
        ability: '暗影操控',
        level: 'S级',
        status: '活跃',
        description: '能够操控影子进行攻击和移动，擅长潜入作战。',
        avatar: '🌙',
      },
    }),
    prisma.character.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: '苏晴',
        codeName: 'Phoenix',
        ability: '火焰掌控',
        level: 'A级',
        status: '活跃',
        description: '可以操控火焰，温度最高可达3000度。',
        avatar: '🔥',
      },
    }),
    prisma.character.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: '陈风',
        codeName: 'Zephyr',
        ability: '风系异能',
        level: 'B级',
        status: '待命',
        description: '能够操控气流，创造风暴和风刃。',
        avatar: '💨',
      },
    }),
  ]);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { username: 'linye' },
    update: {},
    create: {
      username: 'linye',
      password: userPassword,
      role: 'user',
      characterId: chars[0].id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'suqing' },
    update: {},
    create: {
      username: 'suqing',
      password: userPassword,
      role: 'user',
      characterId: chars[1].id,
    },
  });

  const event = await prisma.event.create({
    data: {
      title: '银行抢劫案',
      type: '战斗',
      level: 'B级',
      date: new Date('2024-01-15'),
      location: '城市中心银行',
      description: '三名异能者抢劫银行，被小队成功制止。',
      result: '成功',
      isPublic: true,
      characters: {
        create: [
          { characterId: chars[0].id, role: '主攻手', contribution: '制服两名劫匪', missionResult: '成功' },
          { characterId: chars[1].id, role: '支援', contribution: '封锁现场，防止平民受伤', missionResult: '成功' },
        ],
      },
    },
  });

  const mission = await prisma.mission.create({
    data: {
      title: '调查异常能量波动',
      description: '城东工业区出现异常能量波动，需要调查原因。',
      priority: '高',
      status: '进行中',
      dueDate: new Date('2024-02-01'),
      eventId: event.id,
      characters: {
        create: [
          { characterId: chars[0].id },
          { characterId: chars[2].id },
        ],
      },
    },
  });

  console.log('种子数据创建完成！');
  console.log('管理员账号: admin / admin123');
  console.log('普通用户账号: linye / user123 (角色: 林夜)');
  console.log('普通用户账号: suqing / user123 (角色: 苏晴)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

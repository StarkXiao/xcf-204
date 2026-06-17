import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateCharacterIdsAssignable } from './characterController';

const prisma = new PrismaClient();

const missionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.string().min(1),
  status: z.string().min(1),
  dueDate: z.string().min(1),
  eventId: z.number().optional(),
  characterIds: z.array(z.number()).optional(),
});

export const getMissions = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const isAdmin = user?.role === 'admin';
  const characterId = user?.characterId;

  let missions;
  if (isAdmin) {
    missions = await prisma.mission.findMany({
      include: {
        characters: { include: { character: true } },
        event: true,
        extensionRequests: {
          include: { applicant: true, approver: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  } else {
    const where: any = {};
    if (characterId) {
      where.characters = {
        some: { characterId },
      };
    } else {
      where.id = -1;
    }
    missions = await prisma.mission.findMany({
      where,
      include: {
        characters: { include: { character: true } },
        event: true,
        extensionRequests: {
          include: { applicant: true, approver: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
  res.json(missions);
};

export const getMission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role === 'admin';
  const characterId = user?.characterId;

  const mission = await prisma.mission.findUnique({
    where: { id: Number(id) },
    include: {
      characters: { include: { character: true } },
      event: true,
      extensionRequests: {
        include: { applicant: true, approver: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!mission) {
    return res.status(404).json({ message: '任务不存在' });
  }

  if (!isAdmin) {
    const isParticipant = characterId && mission.characters.some((mc) => mc.characterId === characterId);
    if (!isParticipant) {
      return res.status(403).json({ message: '无权访问该任务' });
    }
  }

  res.json(mission);
};

export const createMission = async (req: Request, res: Response) => {
  try {
    const { characterIds, eventId, ...data } = missionSchema.parse(req.body);

    if (characterIds && characterIds.length > 0) {
      const validation = await validateCharacterIdsAssignable(characterIds);
      if (!validation.valid) {
        const invalidList = validation.invalidCharacters
          .map((c) => `${c.name}(${c.status})`)
          .join('、');
        return res.status(400).json({
          message: `以下角色当前状态不可指派任务：${invalidList}`,
        });
      }
    }
    
    const mission = await prisma.mission.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        event: eventId ? { connect: { id: eventId } } : undefined,
        characters: characterIds
          ? {
              create: characterIds.map((id) => ({
                character: { connect: { id } },
              })),
            }
          : undefined,
      },
      include: { 
        characters: { include: { character: true } },
        event: true,
        extensionRequests: true,
      },
    });

    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (event && event.disposalStatus === '待处置') {
        await prisma.event.update({
          where: { id: eventId },
          data: { disposalStatus: '处置中' },
        });
      }

      if (data.status === '已完成') {
        await autoUpdateEventConclusion(eventId);
      }
    }

    const updatedMission = await prisma.mission.findUnique({
      where: { id: mission.id },
      include: { 
        characters: { include: { character: true } },
        event: true,
        extensionRequests: {
          include: { applicant: true, approver: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.status(201).json(updatedMission);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '创建失败' });
  }
};

const autoUpdateEventConclusion = async (eventId: number) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      missions: true,
      characters: { include: { character: true } },
    },
  });

  if (!event) return;

  const completedMissions = event.missions.filter((m) => m.status === '已完成');
  const allMissionsCompleted = event.missions.length > 0 && completedMissions.length === event.missions.length;

  if (allMissionsCompleted) {
    const collaborationRecords = event.characters
      .map((ec) => {
        const char = ec.character;
        const parts = [];
        if (ec.role) parts.push(`【${ec.role}】`);
        parts.push(char.name);
        if (ec.missionResult) parts.push(`- 任务结果: ${ec.missionResult}`);
        if (ec.contribution) parts.push(`- 贡献: ${ec.contribution}`);
        return parts.join('');
      })
      .filter(Boolean)
      .join('\n');

    const successCount = event.characters.filter((ec) => ec.missionResult === '成功').length;
    const totalChars = event.characters.length;
    const overallResult = successCount === totalChars ? '成功' : successCount > 0 ? '部分成功' : '失败';

    const disposalConclusion = `事件处置结论：\n` +
      `共计 ${event.missions.length} 个任务，已全部完成。\n` +
      `参与角色 ${totalChars} 人，成功完成 ${successCount} 人。\n\n` +
      `角色协作记录：\n${collaborationRecords}`;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        disposalConclusion,
        result: overallResult,
        disposalStatus: '已完成',
      },
    });
  }
};

export const updateMission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { characterIds, eventId, ...data } = missionSchema.parse(req.body);

    const missionId = Number(id);

    const existingMission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { eventId: true, status: true },
    });

    if (characterIds && characterIds.length > 0) {
      const validation = await validateCharacterIdsAssignable(characterIds);
      if (!validation.valid) {
        const invalidList = validation.invalidCharacters
          .map((c) => `${c.name}(${c.status})`)
          .join('、');
        return res.status(400).json({
          message: `以下角色当前状态不可指派任务：${invalidList}`,
        });
      }
    }

    await prisma.missionCharacter.deleteMany({ where: { missionId } });

    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        event: eventId !== undefined ? (eventId ? { connect: { id: eventId } } : { disconnect: true }) : undefined,
        characters: characterIds
          ? {
              create: characterIds.map((cid) => ({
                character: { connect: { id: cid } },
              })),
            }
          : undefined,
      },
      include: { 
        characters: { include: { character: true } },
        event: true,
        extensionRequests: true,
      },
    });

    const targetEventId = eventId !== undefined ? eventId : existingMission?.eventId;

    if (targetEventId) {
      const event = await prisma.event.findUnique({ where: { id: targetEventId } });
      if (event && event.disposalStatus === '待处置') {
        await prisma.event.update({
          where: { id: targetEventId },
          data: { disposalStatus: '处置中' },
        });
      }

      if (data.status === '已完成') {
        await autoUpdateEventConclusion(targetEventId);
      }
    }

    const updatedMission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { 
        characters: { include: { character: true } },
        event: true,
        extensionRequests: {
          include: { applicant: true, approver: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json(updatedMission);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '更新失败' });
  }
};

export const deleteMission = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.mission.delete({ where: { id: Number(id) } });
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(404).json({ message: '任务不存在' });
  }
};

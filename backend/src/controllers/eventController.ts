import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const eventSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  level: z.string().min(1),
  date: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  result: z.string().optional(),
  disposalStatus: z.string().optional(),
  disposalConclusion: z.string().optional(),
  isPublic: z.boolean().optional(),
  characterIds: z.array(z.number()).optional(),
  characterRoles: z.array(z.object({
    characterId: z.number(),
    role: z.string().optional(),
    contribution: z.string().optional(),
    missionResult: z.string().optional(),
    collaboration: z.string().optional(),
  })).optional(),
});

const updateCharacterRoleSchema = z.object({
  role: z.string().optional(),
  contribution: z.string().optional(),
  missionResult: z.string().optional(),
  collaboration: z.string().optional(),
});

const autoUpdateSchema = z.object({
  autoUpdateConclusion: z.boolean().default(true),
});

export const getEvents = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const isAdmin = user?.role === 'admin';
  const characterId = user?.characterId;

  const missionsInclude: any = isAdmin
    ? { include: { characters: { include: { character: true } }, event: true } }
    : {
        where: characterId
          ? { characters: { some: { characterId } } }
          : { id: -1 },
        include: { characters: { include: { character: true } }, event: true },
      };

  let events;
  if (isAdmin) {
    events = await prisma.event.findMany({
      include: {
        characters: { include: { character: true } },
        missions: missionsInclude,
      },
      orderBy: { date: 'desc' },
    });
  } else {
    const where: any = {
      OR: [
        { isPublic: true },
      ],
    };
    if (characterId) {
      where.OR.push({
        characters: {
          some: { characterId },
        },
      });
    }
    events = await prisma.event.findMany({
      where,
      include: {
        characters: { include: { character: true } },
        missions: missionsInclude,
      },
      orderBy: { date: 'desc' },
    });
  }
  res.json(events);
};

export const getEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role === 'admin';
  const characterId = user?.characterId;

  const missionsInclude: any = isAdmin
    ? { include: { characters: { include: { character: true } }, event: true } }
    : {
        where: characterId
          ? { characters: { some: { characterId } } }
          : { id: -1 },
        include: { characters: { include: { character: true } }, event: true },
      };

  const event = await prisma.event.findUnique({
    where: { id: Number(id) },
    include: {
      characters: { include: { character: true } },
      missions: missionsInclude,
    },
  });
  if (!event) {
    return res.status(404).json({ message: '事件不存在' });
  }

  if (!isAdmin) {
    const isPublic = event.isPublic;
    const isParticipant = characterId && event.characters.some((ec) => ec.characterId === characterId);
    if (!isPublic && !isParticipant) {
      return res.status(403).json({ message: '无权访问该事件' });
    }
  }

  res.json(event);
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { characterIds, characterRoles, disposalStatus, ...data } = eventSchema.parse(req.body);
    
    let finalStatus = disposalStatus || '待处置';
    if (data.result) {
      finalStatus = '已完成';
    } else if (characterIds && characterIds.length > 0) {
      finalStatus = '处置中';
    }

    const roleMap = new Map<number, any>();
    if (characterRoles) {
      characterRoles.forEach((cr) => roleMap.set(cr.characterId, cr));
    }
    
    const event = await prisma.event.create({
      data: {
        ...data,
        disposalStatus: finalStatus,
        date: new Date(data.date),
        characters: characterIds
          ? {
              create: characterIds.map((id) => {
                const roleData = roleMap.get(id);
                return {
                  character: { connect: { id } },
                  role: roleData?.role,
                  contribution: roleData?.contribution,
                  missionResult: roleData?.missionResult,
                  collaboration: roleData?.collaboration,
                };
              }),
            }
          : undefined,
      },
      include: { 
        characters: { include: { character: true } },
        missions: true,
      },
    });
    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '创建失败' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { characterIds, characterRoles, disposalStatus, ...data } = eventSchema.parse(req.body);

    const eventId = Number(id);

    if (characterIds) {
      await prisma.eventCharacter.deleteMany({ where: { eventId } });
    }

    let finalStatus = disposalStatus;
    if (data.result) {
      finalStatus = '已完成';
    } else if (characterIds && characterIds.length > 0) {
      finalStatus = '处置中';
    } else if (!finalStatus) {
      const existingEvent = await prisma.event.findUnique({ where: { id: eventId } });
      finalStatus = existingEvent?.disposalStatus || '待处置';
    }

    const roleMap = new Map<number, any>();
    if (characterRoles) {
      characterRoles.forEach((cr) => roleMap.set(cr.characterId, cr));
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...data,
        disposalStatus: finalStatus,
        date: new Date(data.date),
        characters: characterIds
          ? {
              create: characterIds.map((cid) => {
                const roleData = roleMap.get(cid);
                return {
                  character: { connect: { id: cid } },
                  role: roleData?.role,
                  contribution: roleData?.contribution,
                  missionResult: roleData?.missionResult,
                  collaboration: roleData?.collaboration,
                };
              }),
            }
          : undefined,
      },
      include: { 
        characters: { include: { character: true } },
        missions: true,
      },
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '更新失败' });
  }
};

export const updateEventCharacterRole = async (req: Request, res: Response) => {
  try {
    const { eventId, characterId } = req.params;
    const data = updateCharacterRoleSchema.parse(req.body);

    const eventCharacter = await prisma.eventCharacter.update({
      where: {
        eventId_characterId: {
          eventId: Number(eventId),
          characterId: Number(characterId),
        },
      },
      data: {
        role: data.role,
        contribution: data.contribution,
        missionResult: data.missionResult,
        collaboration: data.collaboration,
      },
      include: {
        character: true,
      },
    });

    res.json(eventCharacter);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '更新角色分工失败' });
  }
};

export const autoUpdateEventConclusion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { autoUpdateConclusion } = autoUpdateSchema.parse(req.body);

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
      include: {
        missions: true,
        characters: { include: { character: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ message: '事件不存在' });
    }

    const completedMissions = event.missions.filter((m) => m.status === '已完成');
    const allMissionsCompleted = event.missions.length > 0 && completedMissions.length === event.missions.length;

    let disposalConclusion = event.disposalConclusion;
    let result = event.result;
    let disposalStatus = event.disposalStatus;

    if (autoUpdateConclusion && allMissionsCompleted) {
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

      disposalConclusion = `事件处置结论：\n` +
        `共计 ${event.missions.length} 个任务，已全部完成。\n` +
        `参与角色 ${totalChars} 人，成功完成 ${successCount} 人。\n\n` +
        `角色协作记录：\n${collaborationRecords}`;

      result = overallResult;
      disposalStatus = '已完成';
    }

    const updatedEvent = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        disposalConclusion,
        result,
        disposalStatus,
      },
      include: {
        characters: { include: { character: true } },
        missions: true,
      },
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '自动更新处置结论失败' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.event.delete({ where: { id: Number(id) } });
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(404).json({ message: '事件不存在' });
  }
};

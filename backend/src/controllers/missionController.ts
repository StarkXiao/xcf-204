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
  resultSummary: z.string().optional(),
  dueDate: z.string().min(1),
  eventId: z.number().optional(),
  characterIds: z.array(z.number()).optional(),
});

const completeMissionSchema = z.object({
  resultSummary: z.string().min(1, '处理结果摘要不能为空'),
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

    const missionResultRecords = completedMissions
      .map((m, idx) => {
        const parts = [`${idx + 1}. ${m.title}`];
        if (m.resultSummary) parts.push(`   处理结果: ${m.resultSummary}`);
        return parts.join('\n');
      })
      .join('\n\n');

    const successCount = event.characters.filter((ec) => ec.missionResult === '成功').length;
    const totalChars = event.characters.length;
    const overallResult = successCount === totalChars ? '成功' : successCount > 0 ? '部分成功' : '失败';

    const disposalConclusion = `事件处置结论：\n` +
      `共计 ${event.missions.length} 个任务，已全部完成。\n` +
      `参与角色 ${totalChars} 人，成功完成 ${successCount} 人。\n\n` +
      `任务处理结果摘要：\n${missionResultRecords}\n\n` +
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

export const completeMission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resultSummary } = completeMissionSchema.parse(req.body);
    const missionId = Number(id);

    const existingMission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!existingMission) {
      return res.status(404).json({ message: '任务不存在' });
    }

    if (existingMission.status === '已完成') {
      return res.status(400).json({ message: '任务已完成，不可重复完成' });
    }

    if (existingMission.status === '已取消') {
      return res.status(400).json({ message: '已取消的任务不可完成' });
    }

    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        status: '已完成',
        resultSummary,
      },
      include: {
        characters: { include: { character: true } },
        event: true,
        extensionRequests: {
          include: { applicant: true, approver: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (existingMission.eventId) {
      const event = await prisma.event.findUnique({ where: { id: existingMission.eventId } });
      if (event && event.disposalStatus === '待处置') {
        await prisma.event.update({
          where: { id: existingMission.eventId },
          data: { disposalStatus: '处置中' },
        });
      }
      await autoUpdateEventConclusion(existingMission.eventId);
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(400).json({ message: '完成任务失败' });
  }
};

const createChangeLog = async (
  missionId: number,
  userId: number | undefined,
  actionType: string,
  fieldName: string | null,
  oldValue: string | null,
  newValue: string | null,
  description: string | null,
  batchId: string | null
) => {
  await prisma.missionChangeLog.create({
    data: {
      missionId,
      userId,
      actionType,
      fieldName,
      oldValue,
      newValue,
      description,
      batchId,
    },
  });
};

const generateBatchId = () => {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const batchAssignSchema = z.object({
  missionIds: z.array(z.number()).min(1),
  characterIds: z.array(z.number()).min(1),
  replaceExisting: z.boolean().optional().default(false),
});

export const batchAssignCharacters = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { missionIds, characterIds, replaceExisting } = batchAssignSchema.parse(req.body);
    const batchId = generateBatchId();

    const validation = await validateCharacterIdsAssignable(characterIds);
    if (!validation.valid) {
      const invalidList = validation.invalidCharacters
        .map((c) => `${c.name}(${c.status})`)
        .join('、');
      return res.status(400).json({
        message: `以下角色当前状态不可指派任务：${invalidList}`,
      });
    }

    const missions = await prisma.mission.findMany({
      where: { id: { in: missionIds } },
      include: { characters: { include: { character: true } } },
    });

    if (missions.length !== missionIds.length) {
      const foundIds = missions.map((m) => m.id);
      const missingIds = missionIds.filter((id) => !foundIds.includes(id));
      return res.status(404).json({
        message: `以下任务不存在：${missingIds.join('、')}`,
      });
    }

    const results: Array<{ missionId: number; title: string; added: string[]; removed: string[] }> = [];

    for (const mission of missions) {
      const existingChars = mission.characters;
      const existingCharIds = existingChars.map((mc) => mc.characterId);
      const addedNames: string[] = [];
      const removedNames: string[] = [];

      let newCharIds: number[];
      if (replaceExisting) {
        removedNames.push(...existingChars.map((mc) => mc.character.name));
        newCharIds = characterIds;
      } else {
        newCharIds = [...new Set([...existingCharIds, ...characterIds])];
      }

      const addedIds = characterIds.filter((cid) => !existingCharIds.includes(cid));
      const addedCharNames = await prisma.character.findMany({
        where: { id: { in: addedIds } },
        select: { name: true },
      });
      addedNames.push(...addedCharNames.map((c) => c.name));

      await prisma.missionCharacter.deleteMany({ where: { missionId: mission.id } });
      await prisma.missionCharacter.createMany({
        data: newCharIds.map((cid) => ({
          missionId: mission.id,
          characterId: cid,
        })),
      });

      const description = `批量指派角色：${replaceExisting ? '替换现有角色，' : '追加角色，'}新增: ${addedNames.join('、') || '无'}${replaceExisting && removedNames.length > 0 ? `，移除: ${removedNames.join('、')}` : ''}`;

      await createChangeLog(
        mission.id,
        user?.userId,
        'BATCH_ASSIGN',
        'characters',
        existingChars.map((mc) => mc.character.name).join(','),
        newCharIds.length.toString() + ' 个角色',
        description,
        batchId
      );

      results.push({
        missionId: mission.id,
        title: mission.title,
        added: addedNames,
        removed: removedNames,
      });
    }

    res.json({
      message: `成功批量更新 ${results.length} 个任务的角色分配`,
      batchId,
      results,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数校验失败', errors: error.errors });
    }
    res.status(500).json({ message: '批量操作失败' });
  }
};

const batchPrioritySchema = z.object({
  missionIds: z.array(z.number()).min(1),
  priority: z.string().min(1),
});

export const batchUpdatePriority = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { missionIds, priority } = batchPrioritySchema.parse(req.body);
    const batchId = generateBatchId();

    const missions = await prisma.mission.findMany({
      where: { id: { in: missionIds } },
      select: { id: true, title: true, priority: true },
    });

    if (missions.length !== missionIds.length) {
      const foundIds = missions.map((m) => m.id);
      const missingIds = missionIds.filter((id) => !foundIds.includes(id));
      return res.status(404).json({
        message: `以下任务不存在：${missingIds.join('、')}`,
      });
    }

    const results: Array<{ missionId: number; title: string; oldPriority: string; newPriority: string }> = [];

    for (const mission of missions) {
      const oldPriority = mission.priority;
      await prisma.mission.update({
        where: { id: mission.id },
        data: { priority },
      });

      const description = `批量调整优先级：${oldPriority} → ${priority}`;
      await createChangeLog(
        mission.id,
        user?.userId,
        'BATCH_PRIORITY',
        'priority',
        oldPriority,
        priority,
        description,
        batchId
      );

      results.push({
        missionId: mission.id,
        title: mission.title,
        oldPriority,
        newPriority: priority,
      });
    }

    res.json({
      message: `成功更新 ${results.length} 个任务的优先级`,
      batchId,
      results,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数校验失败', errors: error.errors });
    }
    res.status(500).json({ message: '批量操作失败' });
  }
};

const batchDueDateSchema = z.object({
  missionIds: z.array(z.number()).min(1),
  dueDate: z.string().min(1),
});

export const batchUpdateDueDate = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { missionIds, dueDate } = batchDueDateSchema.parse(req.body);
    const batchId = generateBatchId();
    const newDueDate = new Date(dueDate);

    const missions = await prisma.mission.findMany({
      where: { id: { in: missionIds } },
      select: { id: true, title: true, dueDate: true, eventId: true },
    });

    if (missions.length !== missionIds.length) {
      const foundIds = missions.map((m) => m.id);
      const missingIds = missionIds.filter((id) => !foundIds.includes(id));
      return res.status(404).json({
        message: `以下任务不存在：${missingIds.join('、')}`,
      });
    }

    const results: Array<{ missionId: number; title: string; oldDueDate: string; newDueDate: string }> = [];

    for (const mission of missions) {
      const oldDueDate = mission.dueDate.toISOString();
      await prisma.mission.update({
        where: { id: mission.id },
        data: { dueDate: newDueDate },
      });

      const description = `批量修改截止日期：${new Date(oldDueDate).toLocaleDateString('zh-CN')} → ${newDueDate.toLocaleDateString('zh-CN')}`;
      await createChangeLog(
        mission.id,
        user?.userId,
        'BATCH_DUEDATE',
        'dueDate',
        oldDueDate,
        newDueDate.toISOString(),
        description,
        batchId
      );

      results.push({
        missionId: mission.id,
        title: mission.title,
        oldDueDate,
        newDueDate: newDueDate.toISOString(),
      });

      if (mission.eventId) {
        const event = await prisma.event.findUnique({ where: { id: mission.eventId } });
        if (event && event.disposalStatus === '待处置') {
          await prisma.event.update({
            where: { id: mission.eventId },
            data: { disposalStatus: '处置中' },
          });
        }
      }
    }

    res.json({
      message: `成功更新 ${results.length} 个任务的截止日期`,
      batchId,
      results,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '参数校验失败', errors: error.errors });
    }
    res.status(500).json({ message: '批量操作失败' });
  }
};

export const getMissionChangeLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const missionId = Number(id);

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      return res.status(404).json({ message: '任务不存在' });
    }

    const logs = await prisma.missionChangeLog.findMany({
      where: { missionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            character: {
              select: { name: true, avatar: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取变更日志失败' });
  }
};

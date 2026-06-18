import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateCharacterIdsAssignable } from './characterController';

const prisma = new PrismaClient();

const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const stringSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1;
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
};

const dateSimilarity = (date1: string, date2: string, daysThreshold: number = 7): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  if (diffDays === 0) return 1;
  if (diffDays <= daysThreshold) {
    return 1 - (diffDays / daysThreshold) * 0.5;
  }
  return Math.max(0, 1 - (diffDays - daysThreshold) / 30);
};

const locationSimilarity = (loc1: string, loc2: string): number => {
  if (!loc1 || !loc2) return 0;
  const l1 = loc1.toLowerCase().trim();
  const l2 = loc2.toLowerCase().trim();
  if (l1 === l2) return 1;
  if (l1.includes(l2) || l2.includes(l1)) return 0.8;
  return stringSimilarity(l1, l2);
};

const calculateOverallSimilarity = (
  titleSim: number,
  dateSim: number,
  locationSim: number
): number => {
  const weights = { title: 0.4, date: 0.3, location: 0.3 };
  return titleSim * weights.title + dateSim * weights.date + locationSim * weights.location;
};

const checkDuplicateEventsSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  location: z.string().min(1),
  excludeId: z.number().optional(),
  threshold: z.number().min(0).max(1).optional(),
});

export interface DuplicateEventResult {
  event: any;
  similarity: {
    title: number;
    date: number;
    location: number;
    overall: number;
  };
  matchReasons: string[];
}

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

const LEVEL_ORDER: Record<string, number> = {
  'D级': 1,
  'C级': 2,
  'B级': 3,
  'A级': 4,
  'S级': 5,
  'SS级': 6,
};

const RESULT_SEVERITY: Record<string, number> = {
  '成功': 0,
  '处理中': 1,
  '部分成功': 2,
  '失败': 3,
};

const isLevelEscalated = (oldLevel: string, newLevel: string): boolean => {
  return (LEVEL_ORDER[newLevel] || 0) > (LEVEL_ORDER[oldLevel] || 0);
};

const isResultWorsened = (oldResult: string | null, newResult: string | null): boolean => {
  if (!oldResult && !newResult) return false;
  if (!oldResult && newResult) return true;
  if (oldResult && !newResult) return false;
  return (RESULT_SEVERITY[newResult!] || 0) > (RESULT_SEVERITY[oldResult!] || 0);
};

const handleLevelEscalation = async (
  eventId: number,
  oldLevel: string,
  newLevel: string,
  oldResult: string | null,
  newResult: string | null,
  eventTitle: string
) => {
  const reasons: string[] = [];
  if (isLevelEscalated(oldLevel, newLevel)) {
    reasons.push(`事件等级从 ${oldLevel} 升级为 ${newLevel}`);
  }
  if (isResultWorsened(oldResult, newResult)) {
    reasons.push(`事件结果恶化：${oldResult || '无'} → ${newResult}`);
  }

  if (reasons.length === 0) return null;

  const reason = reasons.join('；');
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + 24);

  const mission = await prisma.mission.create({
    data: {
      title: `[紧急] ${eventTitle} - 等级升级应急任务`,
      description: `事件「${eventTitle}」触发等级升级机制。\n原因：${reason}\n请立即组织力量进行应急处置。`,
      priority: '高',
      status: '待处理',
      dueDate,
      eventId,
    },
    include: {
      characters: { include: { character: true } },
      event: true,
    },
  });

  const escalation = await prisma.levelEscalation.create({
    data: {
      eventId,
      oldLevel,
      newLevel,
      oldResult,
      newResult,
      reason,
      triggeredMissionId: mission.id,
    },
    include: {
      event: true,
      triggeredMission: true,
    },
  });

  return { mission, escalation };
};

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
        levelEscalations: { include: { triggeredMission: true }, orderBy: { createdAt: 'desc' } },
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
        levelEscalations: { include: { triggeredMission: true }, orderBy: { createdAt: 'desc' } },
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
      levelEscalations: { include: { triggeredMission: true }, orderBy: { createdAt: 'desc' } },
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

    if (characterIds && characterIds.length > 0) {
      const validation = await validateCharacterIdsAssignable(characterIds);
      if (!validation.valid) {
        const invalidList = validation.invalidCharacters
          .map((c) => `${c.name}(${c.status})`)
          .join('、');
        return res.status(400).json({
          message: `以下角色当前状态不可参与事件：${invalidList}`,
        });
      }
    }
    
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

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { characters: true, missions: true },
    });

    if (!existingEvent) {
      return res.status(404).json({ message: '事件不存在' });
    }

    if (characterIds && characterIds.length > 0) {
      const validation = await validateCharacterIdsAssignable(characterIds);
      if (!validation.valid) {
        const invalidList = validation.invalidCharacters
          .map((c) => `${c.name}(${c.status})`)
          .join('、');
        return res.status(400).json({
          message: `以下角色当前状态不可参与事件：${invalidList}`,
        });
      }
    }

    if (characterIds) {
      await prisma.eventCharacter.deleteMany({ where: { eventId } });
    }

    let finalStatus = disposalStatus;
    if (data.result) {
      finalStatus = '已完成';
    } else if (characterIds && characterIds.length > 0) {
      finalStatus = '处置中';
    } else if (!finalStatus) {
      finalStatus = existingEvent.disposalStatus || '待处置';
    }

    const roleMap = new Map<number, any>();
    if (characterRoles) {
      characterRoles.forEach((cr) => roleMap.set(cr.characterId, cr));
    }

    const oldLevel = existingEvent.level;
    const newLevel = data.level;
    const oldResult = existingEvent.result || null;
    const newResult = data.result || null;
    const levelEscalated = isLevelEscalated(oldLevel, newLevel);
    const resultWorsened = isResultWorsened(oldResult, newResult);

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
        levelEscalations: { include: { triggeredMission: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    let escalationResult: { mission: any; escalation: any } | null = null;
    if (levelEscalated || resultWorsened) {
      escalationResult = await handleLevelEscalation(
        eventId,
        oldLevel,
        newLevel,
        oldResult,
        newResult,
        existingEvent.title
      );

      if (escalationResult && existingEvent.disposalStatus !== '处置中') {
        await prisma.event.update({
          where: { id: eventId },
          data: { disposalStatus: '处置中' },
        });
      }
    }

    res.json({
      ...event,
      _escalation: escalationResult ? {
        triggered: true,
        reason: escalationResult.escalation.reason,
        missionId: escalationResult.mission.id,
        missionTitle: escalationResult.mission.title,
        oldLevel,
        newLevel,
      } : undefined,
    });
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

export const checkDuplicateEvents = async (req: Request, res: Response) => {
  try {
    const { title, date, location, excludeId, threshold = 0.6 } = checkDuplicateEventsSchema.parse(req.body);

    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';
    const characterId = user?.characterId;

    const where: any = {};
    if (!isAdmin) {
      where.OR = [
        { isPublic: true },
      ];
      if (characterId) {
        where.OR.push({
          characters: {
            some: { characterId },
          },
        });
      }
    }
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingEvents = await prisma.event.findMany({
      where,
      include: {
        characters: { include: { character: true } },
        missions: true,
      },
      orderBy: { date: 'desc' },
    });

    const duplicateResults: DuplicateEventResult[] = [];

    for (const event of existingEvents) {
      const titleSim = stringSimilarity(title, event.title);
      const eventDateStr = event.date instanceof Date 
        ? event.date.toISOString().split('T')[0] 
        : String(event.date);
      const dateSim = dateSimilarity(date, eventDateStr);
      const locationSim = locationSimilarity(location, event.location);
      const overallSim = calculateOverallSimilarity(titleSim, dateSim, locationSim);

      if (overallSim >= threshold) {
        const matchReasons: string[] = [];
        if (titleSim >= 0.7) {
          matchReasons.push(`标题相似度 ${(titleSim * 100).toFixed(0)}%`);
        }
        if (dateSim >= 0.7) {
          matchReasons.push(`日期相近`);
        }
        if (locationSim >= 0.7) {
          matchReasons.push(`地点相似度 ${(locationSim * 100).toFixed(0)}%`);
        }

        duplicateResults.push({
          event,
          similarity: {
            title: Math.round(titleSim * 100) / 100,
            date: Math.round(dateSim * 100) / 100,
            location: Math.round(locationSim * 100) / 100,
            overall: Math.round(overallSim * 100) / 100,
          },
          matchReasons,
        });
      }
    }

    duplicateResults.sort((a, b) => b.similarity.overall - a.similarity.overall);

    res.json({
      duplicates: duplicateResults,
      total: duplicateResults.length,
      threshold,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '检查重复事件失败' });
  }
};

export const getEscalations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ message: '仅管理员可查看升级记录' });
    }

    const escalations = await prisma.levelEscalation.findMany({
      include: {
        event: {
          include: {
            characters: { include: { character: true } },
          },
        },
        triggeredMission: {
          include: {
            characters: { include: { character: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(escalations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取升级记录失败' });
  }
};

export const getRiskStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalEvents,
      pendingEvents,
      escalatedEvents,
      recentEscalations,
      highRiskEvents,
      totalMissions,
      highPriorityMissions,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: { disposalStatus: { in: ['待处置', '处置中'] } },
      }),
      prisma.event.count({
        where: { levelEscalations: { some: {} } },
      }),
      prisma.levelEscalation.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          event: { select: { id: true, title: true, level: true, disposalStatus: true } },
          triggeredMission: { select: { id: true, title: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.event.count({
        where: {
          level: { in: ['S级', 'A级'] },
          disposalStatus: { notIn: ['已完成', '已取消'] },
        },
      }),
      prisma.mission.count({
        where: { status: { in: ['待处理', '进行中'] } },
      }),
      prisma.mission.count({
        where: {
          priority: '高',
          status: { in: ['待处理', '进行中'] },
        },
      }),
    ]);

    const levelDistribution = await prisma.event.groupBy({
      by: ['level'],
      _count: { level: true },
      where: { disposalStatus: { notIn: ['已取消'] } },
    });

    const riskLevel = highRiskEvents > 0 ? '高危'
      : escalatedEvents > 0 ? '警戒'
      : pendingEvents > 3 ? '关注'
      : '平稳';

    res.json({
      totalEvents,
      pendingEvents,
      escalatedEvents,
      highRiskEvents,
      activeMissions: totalMissions,
      highPriorityMissions,
      riskLevel,
      recentEscalations,
      levelDistribution: levelDistribution.map((item) => ({
        level: item.level,
        count: item._count.level,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取风险统计失败' });
  }
};

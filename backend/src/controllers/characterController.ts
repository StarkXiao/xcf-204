import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { CharacterStatus, ASSIGNABLE_STATUSES, UNAVAILABLE_STATUSES } from '../types';

const prisma = new PrismaClient();

const VALID_STATUSES = Object.values(CharacterStatus);

const characterSchema = z.object({
  name: z.string().min(1),
  codeName: z.string().optional(),
  ability: z.string().min(1),
  level: z.string().min(1),
  status: z.enum(VALID_STATUSES as [string, ...string[]]),
  description: z.string().optional(),
  avatar: z.string().optional(),
});

export const isAssignableStatus = (status: string): boolean => {
  return ASSIGNABLE_STATUSES.includes(status as CharacterStatus);
};

export const getAssignableCharacters = async () => {
  return prisma.character.findMany({
    where: {
      status: {
        in: ASSIGNABLE_STATUSES,
      },
    },
  });
};

export const validateCharacterIdsAssignable = async (characterIds: number[]): Promise<{ valid: boolean; invalidCharacters: { id: number; name: string; status: string }[] }> => {
  const invalidCharacters: { id: number; name: string; status: string }[] = [];

  for (const id of characterIds) {
    const character = await prisma.character.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });

    if (character && !isAssignableStatus(character.status)) {
      invalidCharacters.push(character);
    }
  }

  return {
    valid: invalidCharacters.length === 0,
    invalidCharacters,
  };
};

const levelHistorySchema = z.object({
  oldLevel: z.string().min(1),
  newLevel: z.string().min(1),
  reason: z.string().min(1),
  description: z.string().optional(),
  eventId: z.number().optional(),
  missionId: z.number().optional(),
});

export const getCharacters = async (_req: Request, res: Response) => {
  const characters = await prisma.character.findMany({
    include: {
      events: { include: { event: true } },
      missions: { include: { mission: true } },
    },
  });
  res.json(characters);
};

export const getCharacter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const character = await prisma.character.findUnique({
    where: { id: Number(id) },
    include: {
      events: { include: { event: true } },
      missions: { include: { mission: true } },
      levelHistories: {
        include: { event: true, mission: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!character) {
    return res.status(404).json({ message: '角色不存在' });
  }
  res.json(character);
};

export const createCharacter = async (req: Request, res: Response) => {
  try {
    const data = characterSchema.parse(req.body);
    const character = await prisma.character.create({ data });
    res.status(201).json(character);
  } catch (error) {
    res.status(400).json({ message: '创建失败' });
  }
};

export const updateCharacter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = characterSchema.parse(req.body);

    const existingChar = await prisma.character.findUnique({
      where: { id: Number(id) },
    });
    if (!existingChar) {
      return res.status(404).json({ message: '角色不存在' });
    }

    const character = await prisma.character.update({
      where: { id: Number(id) },
      data,
      include: {
        events: { include: { event: true } },
        missions: { include: { mission: true } },
        levelHistories: {
          include: { event: true, mission: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (existingChar.level !== data.level) {
      await prisma.levelHistory.create({
        data: {
          characterId: Number(id),
          oldLevel: existingChar.level,
          newLevel: data.level,
          reason: '管理员调整',
        },
      });
    }

    res.json(character);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '更新失败' });
  }
};

export const deleteCharacter = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.character.delete({ where: { id: Number(id) } });
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(404).json({ message: '角色不存在' });
  }
};

export const getLevelHistories = async (req: Request, res: Response) => {
  const { characterId } = req.params;
  try {
    const histories = await prisma.levelHistory.findMany({
      where: { characterId: Number(characterId) },
      include: { event: true, mission: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(histories);
  } catch (error) {
    res.status(400).json({ message: '获取失败' });
  }
};

export const createLevelHistory = async (req: Request, res: Response) => {
  try {
    const { characterId } = req.params;
    const data = levelHistorySchema.parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id: Number(characterId) },
    });
    if (!character) {
      return res.status(404).json({ message: '角色不存在' });
    }

    const history = await prisma.levelHistory.create({
      data: {
        ...data,
        characterId: Number(characterId),
      },
      include: { event: true, mission: true },
    });

    if (data.newLevel !== character.level) {
      await prisma.character.update({
        where: { id: Number(characterId) },
        data: { level: data.newLevel },
      });
    }

    res.status(201).json(history);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '创建失败' });
  }
};

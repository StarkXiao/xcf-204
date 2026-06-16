import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const missionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.string().min(1),
  status: z.string().min(1),
  dueDate: z.string().min(1),
  characterIds: z.array(z.number()).optional(),
});

export const getMissions = async (_req: Request, res: Response) => {
  const missions = await prisma.mission.findMany({
    include: {
      characters: { include: { character: true } },
    },
    orderBy: { dueDate: 'asc' },
  });
  res.json(missions);
};

export const getMission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mission = await prisma.mission.findUnique({
    where: { id: Number(id) },
    include: {
      characters: { include: { character: true } },
    },
  });
  if (!mission) {
    return res.status(404).json({ message: '任务不存在' });
  }
  res.json(mission);
};

export const createMission = async (req: Request, res: Response) => {
  try {
    const { characterIds, ...data } = missionSchema.parse(req.body);
    
    const mission = await prisma.mission.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        characters: characterIds
          ? {
              create: characterIds.map((id) => ({
                character: { connect: { id } },
              })),
            }
          : undefined,
      },
      include: { characters: { include: { character: true } } },
    });
    res.status(201).json(mission);
  } catch (error) {
    res.status(400).json({ message: '创建失败' });
  }
};

export const updateMission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { characterIds, ...data } = missionSchema.parse(req.body);

    await prisma.missionCharacter.deleteMany({ where: { missionId: Number(id) } });

    const mission = await prisma.mission.update({
      where: { id: Number(id) },
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        characters: characterIds
          ? {
              create: characterIds.map((cid) => ({
                character: { connect: { id: cid } },
              })),
            }
          : undefined,
      },
      include: { characters: { include: { character: true } } },
    });
    res.json(mission);
  } catch (error) {
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

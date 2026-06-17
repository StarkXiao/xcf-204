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
  characterIds: z.array(z.number()).optional(),
});

export const getEvents = async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    include: {
      characters: { include: { character: true } },
      missions: true,
    },
    orderBy: { date: 'desc' },
  });
  res.json(events);
};

export const getEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({
    where: { id: Number(id) },
    include: {
      characters: { include: { character: true } },
      missions: true,
    },
  });
  if (!event) {
    return res.status(404).json({ message: '事件不存在' });
  }
  res.json(event);
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { characterIds, disposalStatus, ...data } = eventSchema.parse(req.body);
    
    let finalStatus = disposalStatus || '待处置';
    if (data.result) {
      finalStatus = '已完成';
    } else if (characterIds && characterIds.length > 0) {
      finalStatus = '处置中';
    }
    
    const event = await prisma.event.create({
      data: {
        ...data,
        disposalStatus: finalStatus,
        date: new Date(data.date),
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
    const { characterIds, disposalStatus, ...data } = eventSchema.parse(req.body);

    await prisma.eventCharacter.deleteMany({ where: { eventId: Number(id) } });

    let finalStatus = disposalStatus;
    if (data.result) {
      finalStatus = '已完成';
    } else if (characterIds && characterIds.length > 0) {
      finalStatus = '处置中';
    } else if (!finalStatus) {
      const existingEvent = await prisma.event.findUnique({ where: { id: Number(id) } });
      finalStatus = existingEvent?.disposalStatus || '待处置';
    }

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        ...data,
        disposalStatus: finalStatus,
        date: new Date(data.date),
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
        missions: true,
      },
    });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: '更新失败' });
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

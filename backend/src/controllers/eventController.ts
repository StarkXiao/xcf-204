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
  characterIds: z.array(z.number()).optional(),
});

export const getEvents = async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    include: {
      characters: { include: { character: true } },
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
    },
  });
  if (!event) {
    return res.status(404).json({ message: '事件不存在' });
  }
  res.json(event);
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { characterIds, ...data } = eventSchema.parse(req.body);
    
    const event = await prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date),
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
    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: '创建失败' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { characterIds, ...data } = eventSchema.parse(req.body);

    await prisma.eventCharacter.deleteMany({ where: { eventId: Number(id) } });

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        ...data,
        date: new Date(data.date),
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

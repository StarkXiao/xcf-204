import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const characterSchema = z.object({
  name: z.string().min(1),
  codeName: z.string().optional(),
  ability: z.string().min(1),
  level: z.string().min(1),
  status: z.string().min(1),
  description: z.string().optional(),
  avatar: z.string().optional(),
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
    const character = await prisma.character.update({
      where: { id: Number(id) },
      data,
    });
    res.json(character);
  } catch (error) {
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

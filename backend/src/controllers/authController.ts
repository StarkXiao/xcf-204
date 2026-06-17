import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, characterId: user.characterId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        characterId: user.characterId,
      },
    });
  } catch (error) {
    res.status(400).json({ message: '请求参数错误' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { username } });

    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'user',
      },
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    res.status(400).json({ message: '注册失败' });
  }
};

export const getProfile = (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    id: user.userId,
    username: user.username,
    role: user.role,
    characterId: user.characterId,
  });
};

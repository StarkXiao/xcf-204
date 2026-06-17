import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const extensionRequestSchema = z.object({
  missionId: z.number(),
  requestedDueDate: z.string().min(1),
  reason: z.string().min(1),
});

const approvalSchema = z.object({
  status: z.enum(['已批准', '已拒绝']),
  approvalComment: z.string().optional(),
});

export const createExtensionRequest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const characterId = user?.characterId;

    if (!characterId) {
      return res.status(400).json({ message: '用户未关联角色' });
    }

    const { missionId, requestedDueDate, reason } = extensionRequestSchema.parse(req.body);

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { characters: true },
    });

    if (!mission) {
      return res.status(404).json({ message: '任务不存在' });
    }

    if (mission.status === '已完成' || mission.status === '已取消') {
      return res.status(400).json({ message: '该任务状态不支持延期申请' });
    }

    const isParticipant = mission.characters.some((mc) => mc.characterId === characterId);
    if (!isParticipant) {
      return res.status(403).json({ message: '只有任务参与人员可以申请延期' });
    }

    const pendingRequest = await prisma.missionExtensionRequest.findFirst({
      where: {
        missionId,
        applicantId: characterId,
        status: '待审批',
      },
    });

    if (pendingRequest) {
      return res.status(400).json({ message: '该任务已有待审批的延期申请' });
    }

    const requestedDate = new Date(requestedDueDate);
    if (requestedDate <= mission.dueDate) {
      return res.status(400).json({ message: '申请的延期日期必须晚于当前截止日期' });
    }

    const extensionRequest = await prisma.missionExtensionRequest.create({
      data: {
        missionId,
        applicantId: characterId,
        originalDueDate: mission.dueDate,
        requestedDueDate: requestedDate,
        reason,
      },
      include: {
        mission: true,
        applicant: true,
        approver: true,
      },
    });

    res.status(201).json(extensionRequest);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '数据验证失败', errors: error.errors });
    }
    res.status(500).json({ message: '创建延期申请失败' });
  }
};

export const getExtensionRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';
    const characterId = user?.characterId;

    let where: any = {};

    if (!isAdmin) {
      where.OR = [
        { applicantId: characterId },
      ];
    }

    const requests = await prisma.missionExtensionRequest.findMany({
      where,
      include: {
        mission: {
          include: {
            characters: { include: { character: true } },
          },
        },
        applicant: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取延期申请列表失败' });
  }
};

export const getPendingExtensionRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    const requests = await prisma.missionExtensionRequest.findMany({
      where: { status: '待审批' },
      include: {
        mission: {
          include: {
            characters: { include: { character: true } },
          },
        },
        applicant: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取待审批申请失败' });
  }
};

export const getPendingExtensionCount = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      return res.json({ count: 0 });
    }

    const count = await prisma.missionExtensionRequest.count({
      where: { status: '待审批' },
    });

    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取待审批数量失败' });
  }
};

export const getExtensionRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';
    const characterId = user?.characterId;

    const request = await prisma.missionExtensionRequest.findUnique({
      where: { id: Number(id) },
      include: {
        mission: {
          include: {
            characters: { include: { character: true } },
          },
        },
        applicant: true,
        approver: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: '延期申请不存在' });
    }

    if (!isAdmin && request.applicantId !== characterId) {
      return res.status(403).json({ message: '无权访问该申请' });
    }

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取延期申请详情失败' });
  }
};

export const approveExtensionRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';
    const approverCharacterId = user?.characterId;

    if (!isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    if (!approverCharacterId) {
      return res.status(400).json({ message: '审批人未关联角色' });
    }

    const { status, approvalComment } = approvalSchema.parse(req.body);

    const request = await prisma.missionExtensionRequest.findUnique({
      where: { id: Number(id) },
      include: { mission: true },
    });

    if (!request) {
      return res.status(404).json({ message: '延期申请不存在' });
    }

    if (request.status !== '待审批') {
      return res.status(400).json({ message: '该申请已处理' });
    }

    let updatedMission = null;

    if (status === '已批准') {
      updatedMission = await prisma.mission.update({
        where: { id: request.missionId },
        data: {
          dueDate: request.requestedDueDate,
        },
        include: {
          characters: { include: { character: true } },
          event: true,
        },
      });
    }

    const updatedRequest = await prisma.missionExtensionRequest.update({
      where: { id: Number(id) },
      data: {
        status,
        approvalComment,
        approverId: approverCharacterId,
        approvedAt: new Date(),
      },
      include: {
        mission: {
          include: {
            characters: { include: { character: true } },
            event: true,
          },
        },
        applicant: true,
        approver: true,
      },
    });

    res.json({
      request: updatedRequest,
      mission: updatedMission,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: '数据验证失败', errors: error.errors });
    }
    res.status(500).json({ message: '审批延期申请失败' });
  }
};

export const getMissionExtensionRequests = async (req: Request, res: Response) => {
  try {
    const { missionId } = req.params;
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin';
    const characterId = user?.characterId;

    const mission = await prisma.mission.findUnique({
      where: { id: Number(missionId) },
      include: { characters: true },
    });

    if (!mission) {
      return res.status(404).json({ message: '任务不存在' });
    }

    if (!isAdmin) {
      const isParticipant = mission.characters.some((mc) => mc.characterId === characterId);
      if (!isParticipant) {
        return res.status(403).json({ message: '无权访问该任务的延期申请' });
      }
    }

    const requests = await prisma.missionExtensionRequest.findMany({
      where: { missionId: Number(missionId) },
      include: {
        applicant: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取任务延期申请失败' });
  }
};

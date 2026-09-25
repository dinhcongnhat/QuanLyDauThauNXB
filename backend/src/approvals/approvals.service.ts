import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalRequestStatus,
  ApprovalTargetType,
  DocStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { EffectivePermissionsService } from '../auth/effective-permissions.service';
import { ApprovalDossiersService } from './approval-dossiers.service';
import { DossierWorkflowType, DocType, Role } from '@prisma/client';

const DECISION_DOCUMENT_TYPES = new Set(['QD_DUTOAN', 'QD_KHLCNT']);
const DECISION_STEP_KEYS = new Set([
  'quyet_dinh_kqlcnt',
  'quyet_dinh_hsmt',
  'quyet_dinh_lcnt',
]);

type SubmitApprovalInput = {
  targetType: ApprovalTargetType;
  targetId: string;
  approverId: string;
  comment?: string;
};

type ApprovalListQuery = {
  status?: ApprovalRequestStatus;
  targetType?: ApprovalTargetType;
  q?: string;
  page?: number;
  limit?: number;
};

const requestInclude = {
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      position: true,
    },
  },
  approver: {
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      position: true,
    },
  },
  document: {
    include: {
      project: { select: { id: true, tenDuAn: true, procurementType: true } },
      creator: { select: { id: true, name: true, email: true } },
      sourceDocument: { select: { id: true, type: true, status: true, data: true } },
      parent: { select: { id: true, type: true, status: true, data: true } },
    },
  },
  datSachProject: {
    include: {
      project: { select: { id: true, tenDuAn: true, procurementType: true } },
      creator: { select: { id: true, name: true, email: true } },
      gdnDocuments: { select: { id: true, status: true, data: true } },
      pcdiDocuments: { select: { id: true, status: true, data: true } },
    },
  },
  procurementStep: {
    include: {
      contractorSelection: {
        include: {
          project: { select: { id: true, tenDuAn: true, procurementType: true } },
          creator: { select: { id: true, name: true, email: true } },
          steps: {
            select: {
              id: true,
              title: true,
              stepKey: true,
              stepOrder: true,
              status: true,
            },
            orderBy: { stepOrder: 'asc' as const },
          },
        },
      },
    },
  },
  dossier: {
    select: {
      id: true,
      workflowType: true,
      status: true,
      version: true,
      title: true,
      currentHandlerId: true,
    },
  },
} as const;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly effectivePermissions?: EffectivePermissionsService,
    private readonly dossiers?: ApprovalDossiersService,
  ) {}

  async getApprovers(requesterId: string, query?: string) {
    const q = query?.trim();
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: requesterId },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
                { department: { contains: q, mode: 'insensitive' as const } },
                { position: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        position: true,
      },
      orderBy: [{ name: 'asc' }],
      take: 100,
    });
    const approvers = await Promise.all(
      candidates.map(async (candidate) => {
        if (!this.effectivePermissions) return null;
        const resolved = await this.effectivePermissions.resolve(candidate.id);
        return resolved.user.canApprove ||
          resolved.user.role === Role.ADMIN ||
          resolved.effectivePermissions.includes('approval:review') ||
          resolved.effectivePermissions.includes('approval:final')
          ? candidate
          : null;
      }),
    );
    return approvers.filter(Boolean);
  }

  async submit(requesterId: string, input: SubmitApprovalInput) {
    if (requesterId === input.approverId) {
      throw new BadRequestException('Không thể tự phê duyệt hồ sơ do mình gửi');
    }
    const approver = await this.prisma.user.findUnique({
      where: { id: input.approverId },
      select: { id: true, canApprove: true, role: true },
    });
    const resolvedApprover = this.effectivePermissions && approver
      ? await this.effectivePermissions.resolve(input.approverId)
      : null;
    if (
      !approver ||
      (
        !approver.canApprove &&
        approver.role !== Role.ADMIN &&
        !resolvedApprover?.effectivePermissions.includes('approval:review') &&
        !resolvedApprover?.effectivePermissions.includes('approval:final')
      )
    ) {
      throw new BadRequestException('Người được chọn không có quyền phê duyệt');
    }
    await this.assertNoPendingRequest(input.targetType, input.targetId);
    await this.validateTargetForSubmission(requesterId, input);
    const context = await this.getDossierContext(input.targetType, input.targetId);
    if (!this.dossiers) {
      throw new ConflictException('Dịch vụ bộ hồ sơ chưa sẵn sàng');
    }
    const created = await this.dossiers.create(requesterId, {
      workflowType: context.workflowType,
      projectId: context.projectId || undefined,
      targetType: input.targetType,
      targetId: input.targetId,
      context: context.context,
      title: context.title,
    });
    const submitted = await this.dossiers.submit(created.id, requesterId, {
      approverId: input.approverId,
      expectedVersion: created.version,
      comment: input.comment,
    });
    const request = submitted.requests.find(
      (candidate: any) => candidate.status === ApprovalRequestStatus.PENDING,
    );
    return request ? this.getResolvedRequest(request.id) : submitted;
  }

  async pendingCount(approverId: string) {
    return this.prisma.approvalRequest.count({
      where: { approverId, status: ApprovalRequestStatus.PENDING },
    });
  }

  /**
   * Compatibility adapter for legacy feature routes. The central approval
   * request is still the source of truth, so old URLs cannot bypass assignment.
   */
  async approveTarget(
    targetType: ApprovalTargetType,
    targetId: string,
    approverId: string,
    comment?: string,
  ) {
    const request = await this.findPendingTargetRequest(
      targetType,
      targetId,
      approverId,
    );
    return this.approve(request.id, approverId, comment);
  }

  async rejectTarget(
    targetType: ApprovalTargetType,
    targetId: string,
    approverId: string,
    comment: string,
  ) {
    const request = await this.findPendingTargetRequest(
      targetType,
      targetId,
      approverId,
    );
    return this.reject(request.id, approverId, comment);
  }

  async list(approverId: string, query: ApprovalListQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const status = query.status || ApprovalRequestStatus.PENDING;
    const q = query.q?.trim();
    const where: any = {
      approverId,
      status,
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };
    if (q) {
      where.OR = [
        { requester: { name: { contains: q, mode: 'insensitive' } } },
        { document: { project: { tenDuAn: { contains: q, mode: 'insensitive' } } } },
        { datSachProject: { tenDuAn: { contains: q, mode: 'insensitive' } } },
        {
          procurementStep: {
            contractorSelection: {
              tenGoiThau: { contains: q, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [requests, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { submittedAt: status === ApprovalRequestStatus.PENDING ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return {
      requests: requests.map((request) => this.mapRequest(request)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: string, approverId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, approverId },
      include: requestInclude,
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu phê duyệt');

    const history = await this.prisma.approvalRequest.findMany({
      where: this.targetWhere(request.targetType, this.getTargetId(request)),
      include: {
        requester: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    return {
      ...this.mapRequest(request),
      history,
    };
  }

  async approve(id: string, approverId: string, comment?: string) {
    const request = await this.getPendingAssignedRequest(id, approverId);
    if (request.dossierId) {
      const dossier = await this.prisma.approvalDossier.findUniqueOrThrow({
        where: { id: request.dossierId },
        select: { version: true },
      });
      return this.dossiers!.finalApprove(id, approverId, {
        expectedVersion: dossier.version,
        comment,
      });
    }
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.updateMany({
        where: {
          id,
          approverId,
          status: ApprovalRequestStatus.PENDING,
        },
        data: {
          status: ApprovalRequestStatus.APPROVED,
          decisionComment: comment?.trim() || null,
          decidedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Yêu cầu đã được xử lý trước đó');
      }

      if (request.targetType === ApprovalTargetType.DOCUMENT && request.documentId) {
        await tx.document.update({
          where: { id: request.documentId },
          data: { status: DocStatus.APPROVED },
        });
        await tx.review.create({
          data: {
            documentId: request.documentId,
            userId: approverId,
            action: 'APPROVE',
            comment: comment?.trim() || null,
          },
        });
      } else if (
        request.targetType === ApprovalTargetType.DAT_SACH_DECISION
        && request.datSachProjectId
      ) {
        await tx.datSachProject.update({
          where: { id: request.datSachProjectId },
          data: {
            reviewStatus: 'APPROVED',
            status: 'COMPLETED',
            reviewComment: comment?.trim() || null,
            reviewedAt: now,
          },
        });
      } else if (request.procurementStepId) {
        await tx.procurementStep.update({
          where: { id: request.procurementStepId },
          data: {
            approvalStatus: 'APPROVED',
            approvedBy: approverId,
            approvedAt: now,
            approvalComment: comment?.trim() || null,
            status: 'COMPLETED',
            completedAt: now,
          },
        });
        await tx.stepApprovalRequest.create({
          data: {
            stepId: request.procurementStepId,
            userId: approverId,
            action: 'APPROVED',
            comment: comment?.trim() || null,
          },
        });
      }
    });

    await this.notificationService.create(request.requesterId, {
      type: NotificationType.APPROVAL_APPROVED,
      title: 'Quyết định đã được phê duyệt',
      message: 'Quyết định bạn gửi đã được phê duyệt.',
      link: this.targetLink(request),
      metadata: { approvalRequestId: id },
    });
    await this.notificationService.emitApprovalCount(approverId);
    return this.getResolvedRequest(id);
  }

  async reject(id: string, approverId: string, comment: string) {
    const reason = comment.trim();
    if (!reason) throw new BadRequestException('Vui lòng nhập lý do từ chối');
    const request = await this.getPendingAssignedRequest(id, approverId);
    if (request.dossierId) {
      const dossier = await this.prisma.approvalDossier.findUniqueOrThrow({
        where: { id: request.dossierId },
        select: { version: true },
      });
      return this.dossiers!.reject(id, approverId, {
        expectedVersion: dossier.version,
        comment: reason,
      });
    }
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.updateMany({
        where: {
          id,
          approverId,
          status: ApprovalRequestStatus.PENDING,
        },
        data: {
          status: ApprovalRequestStatus.REJECTED,
          decisionComment: reason,
          decidedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Yêu cầu đã được xử lý trước đó');
      }

      if (request.targetType === ApprovalTargetType.DOCUMENT && request.documentId) {
        await tx.document.update({
          where: { id: request.documentId },
          data: { status: DocStatus.REJECTED },
        });
        await tx.review.create({
          data: {
            documentId: request.documentId,
            userId: approverId,
            action: 'REJECT',
            comment: reason,
          },
        });
      } else if (
        request.targetType === ApprovalTargetType.DAT_SACH_DECISION
        && request.datSachProjectId
      ) {
        await tx.datSachProject.update({
          where: { id: request.datSachProjectId },
          data: {
            reviewStatus: 'REWORK',
            status: 'IN_PROGRESS',
            reviewComment: reason,
            reviewedAt: now,
          },
        });
      } else if (request.procurementStepId) {
        await tx.procurementStep.update({
          where: { id: request.procurementStepId },
          data: {
            approvalStatus: 'REJECTED',
            approvalComment: reason,
            approvedBy: null,
            approvedAt: null,
            status: 'IN_PROGRESS',
            completedAt: null,
          },
        });
        await tx.stepApprovalRequest.create({
          data: {
            stepId: request.procurementStepId,
            userId: approverId,
            action: 'REJECTED',
            comment: reason,
          },
        });
      }
    });

    await this.notificationService.create(request.requesterId, {
      type: NotificationType.APPROVAL_REJECTED,
      title: 'Quyết định cần chỉnh sửa',
      message: `Quyết định bạn gửi đã bị từ chối: ${reason}`,
      link: this.targetLink(request),
      metadata: { approvalRequestId: id },
    });
    await this.notificationService.emitApprovalCount(approverId);
    return this.getResolvedRequest(id);
  }

  private async assertNoPendingRequest(
    targetType: ApprovalTargetType,
    targetId: string,
  ) {
    const pending = await this.prisma.approvalRequest.findFirst({
      where: {
        status: ApprovalRequestStatus.PENDING,
        ...this.targetWhere(targetType, targetId),
      },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('Hồ sơ đang chờ phê duyệt');
    }
  }

  private async validateTargetForSubmission(
    requesterId: string,
    input: SubmitApprovalInput,
  ): Promise<{ label: string; requesterName: string }> {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true, role: true },
    });
    if (!requester) throw new ForbiddenException('Tài khoản không hợp lệ');

    if (input.targetType === ApprovalTargetType.DOCUMENT) {
      const document = await this.prisma.document.findUnique({
        where: { id: input.targetId },
        include: {
          sourceDocument: { select: { id: true, type: true, status: true } },
          project: { select: { id: true } },
        },
      });
      if (!document || !DECISION_DOCUMENT_TYPES.has(document.type)) {
        throw new BadRequestException('Chỉ Quyết định mới được gửi phê duyệt');
      }
      await this.assertCanSubmit(
        requesterId,
        requester.role,
        document.createdBy,
        document.projectId,
      );
      if (
        document.status !== DocStatus.DRAFT
        && document.status !== DocStatus.REJECTED
      ) {
        throw new BadRequestException('Quyết định không ở trạng thái có thể gửi duyệt');
      }
      if (!document.sourceDocument) {
        throw new BadRequestException('Quyết định chưa có hồ sơ nguồn');
      }
      if (
        document.sourceDocument.status !== DocStatus.COMPLETED
        && document.sourceDocument.status !== DocStatus.APPROVED
      ) {
        throw new BadRequestException('Hồ sơ nguồn chưa hoàn thành');
      }

      return {
        label:
          document.type === 'QD_DUTOAN'
            ? 'Quyết định dự toán'
            : 'Quyết định KHLCNT',
        requesterName: requester.name,
      };
    }

    if (input.targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      const project = await this.prisma.datSachProject.findUnique({
        where: { id: input.targetId },
        include: {
          gdnDocuments: { select: { status: true } },
          pcdiDocuments: { select: { status: true } },
        },
      });
      if (!project) throw new NotFoundException('Không tìm thấy hồ sơ Đặt sách');
      await this.assertCanSubmit(
        requesterId,
        requester.role,
        project.createdBy,
        project.projectId,
      );
      if (
        project.reviewStatus === 'PENDING'
        || project.reviewStatus === 'APPROVED'
      ) {
        throw new BadRequestException('Quyết định không ở trạng thái có thể gửi duyệt');
      }
      if (
        project.gdnDocuments.length === 0
        || project.pcdiDocuments.length === 0
        || project.gdnDocuments.some((item) => item.status !== 'COMPLETED')
        || project.pcdiDocuments.some((item) => item.status !== 'COMPLETED')
      ) {
        throw new BadRequestException('GDN và PCDI phải hoàn thành trước khi gửi Quyết định');
      }
      if (
        !project.qdData
        || typeof project.qdData !== 'object'
        || Object.keys(project.qdData as object).length === 0
      ) {
        throw new BadRequestException('Quyết định đặt sách chưa có nội dung');
      }
      return {
        label: 'Quyết định đặt sách',
        requesterName: requester.name,
      };
    }

    const step = await this.prisma.procurementStep.findUnique({
      where: { id: input.targetId },
      include: {
        contractorSelection: true,
      },
    });
    if (!step || !DECISION_STEP_KEYS.has(step.stepKey)) {
      throw new BadRequestException('Chỉ bước Quyết định mới được gửi phê duyệt');
    }
    await this.assertCanSubmit(
      requesterId,
      requester.role,
      step.contractorSelection.createdBy,
      step.contractorSelection.projectId,
    );
    if (
      !['NO_APPROVAL_REQUIRED', 'REJECTED'].includes(step.approvalStatus)
      || step.status === 'COMPLETED'
    ) {
      throw new BadRequestException('Bước không ở trạng thái có thể gửi duyệt');
    }
    const incompletePrevious = await this.prisma.procurementStep.findFirst({
      where: {
        contractorSelectionId: step.contractorSelectionId,
        stepOrder: { lt: step.stepOrder },
        status: { not: 'COMPLETED' },
      },
      select: { title: true },
      orderBy: { stepOrder: 'asc' },
    });
    if (incompletePrevious) {
      throw new BadRequestException(
        `Cần hoàn thành bước "${incompletePrevious.title}" trước`,
      );
    }
    return { label: step.title, requesterName: requester.name };
  }

  private async assertCanSubmit(
    userId: string,
    role: string,
    creatorId: string,
    projectId?: string | null,
  ) {
    if (creatorId === userId || role === 'ADMIN') return;
    if (projectId) {
      const member = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { id: true },
      });
      if (member) return;
    }
    throw new ForbiddenException('Bạn không có quyền gửi hồ sơ này');
  }

  private async getPendingAssignedRequest(id: string, approverId: string) {
    const resolved = this.effectivePermissions
      ? await this.effectivePermissions.resolve(approverId)
      : {
          user: await this.prisma.user.findUnique({
            where: { id: approverId },
            select: { canApprove: true, role: true },
          }),
          effectivePermissions: [] as string[],
        };
    if (
      !resolved.user?.canApprove &&
      resolved.user?.role !== Role.ADMIN &&
      !resolved.effectivePermissions.includes('approval:review') &&
      !resolved.effectivePermissions.includes('approval:final')
    ) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt');
    }
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        id,
        approverId,
        status: ApprovalRequestStatus.PENDING,
      },
    });
    if (!request) {
      const existing = await this.prisma.approvalRequest.findUnique({
        where: { id },
        select: { id: true, approverId: true, status: true },
      });
      if (!existing) throw new NotFoundException('Không tìm thấy yêu cầu phê duyệt');
      if (existing.approverId !== approverId) {
        throw new ForbiddenException('Hồ sơ không được giao cho bạn');
      }
      throw new ConflictException('Yêu cầu đã được xử lý trước đó');
    }
    return request;
  }

  private async findPendingTargetRequest(
    targetType: ApprovalTargetType,
    targetId: string,
    approverId: string,
  ) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        approverId,
        status: ApprovalRequestStatus.PENDING,
        ...this.targetWhere(targetType, targetId),
      },
      select: { id: true },
    });
    if (request) return request;

    const active = await this.prisma.approvalRequest.findFirst({
      where: {
        status: ApprovalRequestStatus.PENDING,
        ...this.targetWhere(targetType, targetId),
      },
      select: { approverId: true },
    });
    if (active) {
      throw new ForbiddenException('Hồ sơ không được giao cho bạn');
    }
    throw new ConflictException('Hồ sơ không có yêu cầu phê duyệt đang chờ');
  }

  private async getResolvedRequest(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu phê duyệt');
    return this.mapRequest(request);
  }

  private targetWhere(targetType: ApprovalTargetType, targetId: string) {
    if (targetType === ApprovalTargetType.DOCUMENT) {
      return { documentId: targetId };
    }
    if (targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      return { datSachProjectId: targetId };
    }
    return { procurementStepId: targetId };
  }

  private targetData(targetType: ApprovalTargetType, targetId: string) {
    return this.targetWhere(targetType, targetId);
  }

  private async getDossierContext(
    targetType: ApprovalTargetType,
    targetId: string,
  ): Promise<{
    workflowType: DossierWorkflowType;
    projectId: string | null;
    title: string;
    context: Record<string, unknown>;
  }> {
    if (targetType === ApprovalTargetType.DOCUMENT) {
      const document = await this.prisma.document.findUniqueOrThrow({
        where: { id: targetId },
        include: { project: { select: { tenDuAn: true } } },
      });
      const workflowType =
        document.type === DocType.QD_DUTOAN
          ? DossierWorkflowType.DU_TOAN
          : DossierWorkflowType.KHLCNT;
      return {
        workflowType,
        projectId: document.projectId,
        title: `${document.type === DocType.QD_DUTOAN ? 'Bộ hồ sơ dự toán' : 'Bộ hồ sơ KHLCNT'} - ${document.project?.tenDuAn || 'Chưa đặt tên'}`,
        context: {
          parentDecisionId: document.parentId,
          sourceDocumentId: document.sourceDocumentId,
        },
      };
    }
    if (targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      const project = await this.prisma.datSachProject.findUniqueOrThrow({
        where: { id: targetId },
      });
      return {
        workflowType: DossierWorkflowType.DAT_SACH,
        projectId: project.projectId,
        title: `Bộ hồ sơ đặt sách - ${project.tenDuAn}`,
        context: { datSachProjectId: project.id },
      };
    }
    const step = await this.prisma.procurementStep.findUniqueOrThrow({
      where: { id: targetId },
      include: {
        contractorSelection: {
          include: { project: { select: { tenDuAn: true } } },
        },
      },
    });
    const workflowType =
      step.stepKey === 'quyet_dinh_hsmt'
        ? DossierWorkflowType.LCNT_QD_HSMT
        : step.stepKey === 'quyet_dinh_kqlcnt'
          ? DossierWorkflowType.LCNT_QD_KQLCNT
          : DossierWorkflowType.LCNT_QD_LCNT;
    return {
      workflowType,
      projectId: step.contractorSelection.projectId,
      title: `Bộ hồ sơ ${step.title} - ${step.contractorSelection.project?.tenDuAn || step.contractorSelection.tenGoiThau}`,
      context: {
        contractorSelectionId: step.contractorSelectionId,
        stepKey: step.stepKey,
      },
    };
  }

  private getTargetId(request: any) {
    return (
      request.documentId
      || request.datSachProjectId
      || request.procurementStepId
    );
  }

  private targetLink(request: any) {
    if (request.targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      return `/dashboard/mua-sam/dat-sach/${request.datSachProjectId}`;
    }
    if (request.targetType === ApprovalTargetType.PROCUREMENT_STEP) {
      return request.procurementStepId
        ? `/dashboard/lua-chon-nha-thau`
        : '/dashboard/lua-chon-nha-thau';
    }
    return '/dashboard';
  }

  private mapRequest(request: any) {
    const document = request.document;
    const datSach = request.datSachProject;
    const step = request.procurementStep;
    const project =
      document?.project
      || datSach?.project
      || step?.contractorSelection?.project;
    const targetId = this.getTargetId(request);

    let label = 'Quyết định';
    let title = project?.tenDuAn || 'Hồ sơ phê duyệt';
    let category = 'DOCUMENT';
    let preview: any = null;

    if (document) {
      label =
        document.type === 'QD_DUTOAN'
          ? 'Quyết định dự toán'
          : 'Quyết định KHLCNT';
      title =
        project?.tenDuAn
        || (document.data as any)?.TenDuAn
        || (document.data as any)?.tenDuAn
        || label;
      category = document.type === 'QD_DUTOAN' ? 'DU_TOAN' : 'KHLCNT';
      preview = { kind: 'DOCUMENT', documentId: document.id };
    } else if (datSach) {
      label = 'Quyết định đặt sách';
      title = datSach.tenDuAn;
      category = 'DAT_SACH';
      preview = { kind: 'DAT_SACH', projectId: datSach.id };
    } else if (step) {
      label = step.title;
      title =
        step.contractorSelection?.project?.tenDuAn
        || step.contractorSelection?.tenGoiThau
        || label;
      category = 'LCNT';
      preview = {
        kind: 'PROCUREMENT_STEP',
        stepId: step.id,
        attachmentPath: step.attachmentPath,
      };
    }

    return {
      id: request.id,
      targetType: request.targetType,
      targetId,
      status: request.status,
      category,
      label,
      title,
      project,
      requester: request.requester,
      approver: request.approver,
      submitComment: request.submitComment,
      decisionComment: request.decisionComment,
      submittedAt: request.submittedAt,
      decidedAt: request.decidedAt,
      preview,
      target: document || datSach || step,
      dossier: request.dossier || null,
      dossierId: request.dossierId || null,
      previousRequestId: request.previousRequestId || null,
      hopIndex: request.hopIndex || 1,
    };
  }
}

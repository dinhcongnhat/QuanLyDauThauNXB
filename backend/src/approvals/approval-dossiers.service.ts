import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ApprovalRequestStatus,
  ApprovalTargetType,
  DossierItemKind,
  DossierItemSource,
  DossierStatus,
  DossierWorkflowType,
  DocStatus,
  DocType,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { EffectivePermissionsService } from '../auth/effective-permissions.service';
import { buildWorkflowPayload } from '../contractor-selection/contractor-selection.service';
import {
  generateContractorSelectionDocx,
  isAttachmentOnlyStep,
} from '../contractor-selection/lcnt-docx-generator';
import {
  generateDatSachDecisionDocx,
  generateGdnInDocx,
  generatePcdiDocx,
} from '../dat-sach/dat-sach-docx-generator';
import { generateDuToanCoverDocx, generateDuToanDocx } from '../documents/dutoan-docx-generator';
import { generateBaoCaoKHLCNT } from '../documents/docx-generator';
import { generateKhlcntCoverDocx, generateKhlcntDocx } from '../documents/khlcnt-docx-generator';
import { MinioService } from '../minio/minio.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import { getOnlyOfficeAppUrl } from '../utils/onlyoffice-url';
import {
  appendDocxAttachment,
  prepareWorkflowTemplateData,
  validateDocxAttachmentForMerge,
} from '../utils/docx-template-renderer';
import {
  CreateApprovalDossierDto,
  DossierDecisionDto,
  DossierTransitionDto,
  RejectDossierDto,
  UpdateDossierItemDto,
} from './dto/approval-dossier.dto';

type ItemSeed = {
  itemKey: string;
  label: string;
  kind: DossierItemKind;
  source: DossierItemSource;
  data?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  objectPath?: string;
  originalName?: string;
  mimeType?: string;
  required?: boolean;
  editable?: boolean;
  sortOrder: number;
};

const dossierInclude = {
  creator: {
    select: { id: true, name: true, email: true, department: true, position: true },
  },
  currentHandler: {
    select: { id: true, name: true, email: true, department: true, position: true },
  },
  project: {
    select: { id: true, tenDuAn: true, procurementType: true, status: true },
  },
  items: { orderBy: { sortOrder: 'asc' as const } },
  revisions: {
    include: {
      actor: {
        select: { id: true, name: true, email: true, department: true, position: true },
      },
      item: { select: { id: true, itemKey: true, label: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  requests: {
    include: {
      requester: {
        select: { id: true, name: true, email: true, department: true, position: true },
      },
      approver: {
        select: { id: true, name: true, email: true, department: true, position: true },
      },
    },
    orderBy: [{ hopIndex: 'asc' as const }, { submittedAt: 'asc' as const }],
  },
} satisfies Prisma.ApprovalDossierInclude;

@Injectable()
export class ApprovalDossiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly jwt: JwtService,
    private readonly permissions: EffectivePermissionsService,
    private readonly notifications: NotificationService,
  ) {}

  async create(userId: string, input: CreateApprovalDossierDto) {
    await this.assertCanCreate(userId, input.workflowType, input.projectId);
    if (!!input.targetType !== !!input.targetId) {
      throw new BadRequestException(
        'targetType và targetId phải được cung cấp cùng nhau',
      );
    }

    const items = await this.buildItemSeeds(input);
    const title =
      input.title?.trim() ||
      this.defaultTitle(input.workflowType, items, input.targetId);
    const dossier = await this.prisma.$transaction(async (tx) => {
      const created = await tx.approvalDossier.create({
        data: {
          workflowType: input.workflowType,
          projectId: input.projectId || null,
          targetType: input.targetType || null,
          targetId: input.targetId || null,
          context: (input.context || {}) as Prisma.InputJsonValue,
          createdBy: userId,
          currentHandlerId: userId,
          title,
          items: {
            create: items.map((item) => ({
              itemKey: item.itemKey,
              label: item.label,
              kind: item.kind,
              source: item.source,
              data: (item.data || {}) as Prisma.InputJsonValue,
              entityType: item.entityType || null,
              entityId: item.entityId || null,
              objectPath: item.objectPath || null,
              originalName: item.originalName || null,
              mimeType: item.mimeType || null,
              required: item.required ?? true,
              editable: item.editable ?? true,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });
      await tx.approvalDossierRevision.create({
        data: {
          dossierId: created.id,
          actorId: userId,
          action: 'CREATE_DRAFT',
          fromVersion: 0,
          toVersion: created.version,
          metadata: {
            workflowType: input.workflowType,
            targetType: input.targetType || null,
            targetId: input.targetId || null,
          },
        },
      });
      return created;
    });
    return this.getOne(dossier.id, userId);
  }

  async listAssigned(userId: string) {
    return this.prisma.approvalDossier.findMany({
      where: {
        currentHandlerId: userId,
        status: { in: [DossierStatus.IN_REVIEW, DossierStatus.REWORK] },
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, department: true, position: true },
        },
        currentHandler: {
          select: { id: true, name: true, email: true, department: true, position: true },
        },
        project: {
          select: { id: true, tenDuAn: true, procurementType: true },
        },
        requests: {
          include: {
            requester: { select: { id: true, name: true, email: true } },
            approver: { select: { id: true, name: true, email: true } },
          },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
        _count: { select: { items: true, revisions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getOne(id: string, userId: string) {
    const dossier = await this.prisma.approvalDossier.findUnique({
      where: { id },
      include: dossierInclude,
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy bộ hồ sơ');
    await this.assertCanView(dossier, userId);

    const resolved = await this.permissions.resolve(userId);
    const isAdmin = resolved.user.role === Role.ADMIN;
    const isCurrentHandler = dossier.currentHandlerId === userId;
    const isCreator = dossier.createdBy === userId;
    const canEdit =
      dossier.status !== DossierStatus.APPROVED &&
      dossier.status !== DossierStatus.CANCELLED &&
      ((dossier.status === DossierStatus.DRAFT && isCreator) ||
        ((dossier.status === DossierStatus.IN_REVIEW ||
          dossier.status === DossierStatus.REWORK) &&
          isCurrentHandler));
    const pendingRequest = dossier.requests.find(
      (request) =>
        request.status === ApprovalRequestStatus.PENDING &&
        request.approverId === userId,
    );

    return {
      ...dossier,
      actions: {
        canEdit,
        canSubmit:
          canEdit &&
          (dossier.status === DossierStatus.DRAFT ||
            dossier.status === DossierStatus.REWORK),
        canForward:
          !!pendingRequest &&
          (resolved.effectivePermissions.includes('approval:review') ||
            resolved.effectivePermissions.includes('approval:final') ||
            isAdmin),
        canFinalApprove:
          !!pendingRequest &&
          (resolved.effectivePermissions.includes('approval:final') || isAdmin),
        canReject: !!pendingRequest,
        canReturn:
          dossier.status === DossierStatus.REWORK &&
          isCurrentHandler &&
          this.findReturnRecipient(dossier.requests, userId) !== null,
      },
      activeRequestId: pendingRequest?.id || null,
    };
  }

  async updateItem(
    dossierId: string,
    itemId: string,
    userId: string,
    input: UpdateDossierItemDto,
  ) {
    const item = await this.getEditableItem(dossierId, itemId, userId);
    const beforeData = item.data;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.approvalDossierItem.updateMany({
        where: {
          id: itemId,
          dossierId,
          version: input.expectedVersion,
        },
        data: {
          data: prepareWorkflowTemplateData(
            input.data as Record<string, unknown>,
          ) as Prisma.InputJsonValue,
          objectPath: null,
          renderedOverridePath: null,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Tài liệu đã được người khác cập nhật. Vui lòng tải lại hồ sơ.',
        );
      }
      const dossier = await this.bumpDossier(tx, dossierId);
      const current = await tx.approvalDossierItem.findUniqueOrThrow({
        where: { id: itemId },
      });
      await this.syncFormEntity(
        tx,
        current.entityType,
        current.entityId,
        current.data as Record<string, unknown>,
      );
      await tx.approvalDossierRevision.create({
        data: {
          dossierId,
          itemId,
          actorId: userId,
          action: 'UPDATE_FORM',
          fromVersion: input.expectedVersion,
          toVersion: current.version,
          comment: input.comment?.trim() || null,
          metadata: {
            beforeData,
            previousObjectPath: item.objectPath,
            previousRenderedOverridePath: item.renderedOverridePath,
            dossierVersion: dossier.version,
          } as Prisma.InputJsonValue,
        },
      });
      return current;
    });
    return updated;
  }

  async uploadItemFile(
    dossierId: string,
    itemId: string,
    userId: string,
    expectedVersion: number,
    file: Express.Multer.File,
  ) {
    const item = await this.getEditableItem(dossierId, itemId, userId);
    if (expectedVersion !== item.version) {
      throw new ConflictException(
        'Tài liệu đã được cập nhật. Vui lòng tải lại hồ sơ.',
      );
    }
    const originalName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    const extension = originalName.split('.').pop()?.toLowerCase();
    if (extension !== 'docx') {
      throw new BadRequestException('Chỉ chấp nhận tệp DOCX');
    }
    try {
      await validateDocxAttachmentForMerge(file.buffer);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Tệp DOCX không hợp lệ hoặc không thể ghép',
      );
    }

    const objectPath = `approval-dossiers/${dossierId}/${itemId}/v${item.version + 1}-${randomUUID()}.docx`;
    await this.minio.upload(
      objectPath,
      file.buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.approvalDossierItem.updateMany({
        where: { id: itemId, dossierId, version: expectedVersion },
        data: {
          source: DossierItemSource.FILE,
          objectPath,
          renderedOverridePath: null,
          originalName,
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Tài liệu đã được cập nhật. Vui lòng tải lại hồ sơ.',
        );
      }
      const dossier = await this.bumpDossier(tx, dossierId);
      const current = await tx.approvalDossierItem.findUniqueOrThrow({
        where: { id: itemId },
      });
      await this.syncFileEntity(tx, current.entityType, current.entityId, {
        objectPath,
        originalName,
        mimeType: current.mimeType!,
        size: file.size,
      });
      if (current.itemKey === 'khai_toan_attachment') {
        const entityItems = await tx.approvalDossierItem.findMany({
          where: {
            dossierId,
            entityType: 'DOCUMENT',
            entityId: { not: null },
          },
          select: { entityId: true },
        });
        for (const entityItem of entityItems) {
          const document = await tx.document.findUnique({
            where: { id: entityItem.entityId! },
            select: { data: true },
          });
          if (!document) continue;
          await tx.document.update({
            where: { id: entityItem.entityId! },
            data: {
              data: {
                ...((document.data as Record<string, unknown>) || {}),
                khaiToanAttachment: {
                  objectPath,
                  originalName,
                  mimeType: current.mimeType,
                  size: file.size,
                  uploadedAt: new Date().toISOString(),
                },
                khaiToanAttachmentOverride: true,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
      await tx.approvalDossierRevision.create({
        data: {
          dossierId,
          itemId,
          actorId: userId,
          action: item.objectPath ? 'REPLACE_FILE' : 'UPLOAD_FILE',
          fromVersion: expectedVersion,
          toVersion: current.version,
          metadata: {
            previousObjectPath: item.objectPath,
            previousRenderedOverridePath: item.renderedOverridePath,
            originalName,
            dossierVersion: dossier.version,
          },
        },
      });
      return current;
    });
  }

  async getPreviewPdf(dossierId: string, itemId: string, userId: string) {
    const dossier = await this.getOne(dossierId, userId);
    const item = dossier.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException('Không tìm thấy tài liệu trong hồ sơ');
    const docx = await this.renderItemDocx(dossier as any, item);
    return convertDocxToPdf(docx);
  }

  async getItemDocx(dossierId: string, itemId: string, userId: string) {
    const dossier = await this.getOne(dossierId, userId);
    const item = dossier.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException('Không tìm thấy tài liệu trong hồ sơ');
    return {
      buffer: await this.renderItemDocx(dossier as any, item),
      filename: `${item.label.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tai-lieu'}.docx`,
    };
  }

  async getItemContent(
    dossierId: string,
    itemId: string,
    token: string,
  ) {
    const payload = this.verifyOnlyOfficeToken(token, 'content');
    if (payload.dossierId !== dossierId || payload.itemId !== itemId) {
      throw new ForbiddenException('Liên kết tài liệu không hợp lệ');
    }
    const dossier = await this.prisma.approvalDossier.findUnique({
      where: { id: dossierId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy bộ hồ sơ');
    const item = dossier.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException('Không tìm thấy tài liệu');
    return this.renderItemDocx(dossier as any, item);
  }

  async getOnlyOfficeConfig(
    dossierId: string,
    itemId: string,
    userId: string,
  ) {
    const dossier = await this.getOne(dossierId, userId);
    const item = dossier.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException('Không tìm thấy tài liệu');
    if (
      item.mimeType &&
      !item.mimeType.includes('word') &&
      !item.originalName?.toLowerCase().endsWith('.docx')
    ) {
      throw new BadRequestException('Tài liệu này không hỗ trợ OnlyOffice');
    }
    const editable = dossier.actions.canEdit && item.editable;
    const appUrl = getOnlyOfficeAppUrl();
    const secret = process.env.ONLYOFFICE_JWT_SECRET || 'onlyoffice-secret';
    const contentToken = this.jwt.sign(
      { purpose: 'content', dossierId, itemId, itemVersion: item.version },
      { secret, expiresIn: '2h' },
    );
    const callbackToken = this.jwt.sign(
      {
        purpose: 'callback',
        dossierId,
        itemId,
        itemVersion: item.version,
        actorId: userId,
      },
      { secret, expiresIn: '24h' },
    );
    const editorConfig: any = {
      document: {
        fileType: 'docx',
        key: `${item.id}-${item.version}`,
        title: item.originalName || `${item.label}.docx`,
        url: `${appUrl}/api/approval-dossiers/${dossierId}/items/${itemId}/content?token=${encodeURIComponent(contentToken)}`,
        permissions: {
          edit: editable,
          download: true,
          print: true,
          review: editable,
        },
      },
      documentType: 'word',
      editorConfig: {
        mode: editable ? 'edit' : 'view',
        lang: 'vi',
        callbackUrl: `${appUrl}/api/approval-dossiers/${dossierId}/items/${itemId}/onlyoffice-callback?token=${encodeURIComponent(callbackToken)}`,
        user: {
          id: userId,
          name:
            dossier.currentHandler?.id === userId
              ? dossier.currentHandler.name
              : dossier.creator.name,
        },
      },
    };
    editorConfig.token = this.jwt.sign(editorConfig, {
      secret,
      expiresIn: '2h',
    });
    return {
      onlyofficeUrl: process.env.ONLYOFFICE_URL || '/onlyoffice',
      editorConfig,
    };
  }

  async handleOnlyOfficeCallback(
    dossierId: string,
    itemId: string,
    callbackToken: string,
    body: any,
  ) {
    const payload = this.verifyOnlyOfficeToken(callbackToken, 'callback');
    if (payload.dossierId !== dossierId || payload.itemId !== itemId) {
      return { error: 1 };
    }
    if (![2, 6].includes(Number(body?.status))) return { error: 0 };
    if (!body?.url || !this.isAllowedOnlyOfficeUrl(body.url)) {
      return { error: 1 };
    }
    const response = await fetch(body.url);
    if (!response.ok) return { error: 1 };
    const buffer = Buffer.from(await response.arrayBuffer());
    try {
      await validateDocxAttachmentForMerge(buffer);
    } catch {
      return { error: 1 };
    }

    const item = await this.prisma.approvalDossierItem.findFirst({
      where: { id: itemId, dossierId },
      include: { dossier: true },
    });
    if (
      !item ||
      item.version !== payload.itemVersion ||
      !item.editable ||
      item.dossier.currentHandlerId !== payload.actorId ||
      item.dossier.status === DossierStatus.APPROVED ||
      item.dossier.status === DossierStatus.CANCELLED
    ) {
      return { error: 1 };
    }
    const objectPath = `approval-dossiers/${dossierId}/${itemId}/onlyoffice-v${item.version + 1}-${randomUUID()}.docx`;
    await this.minio.upload(
      objectPath,
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.approvalDossierItem.updateMany({
        where: { id: itemId, dossierId, version: payload.itemVersion },
        data: {
          renderedOverridePath: objectPath,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) throw new ConflictException();
      const dossier = await this.bumpDossier(tx, dossierId);
      await this.syncFileEntity(tx, item.entityType, item.entityId, {
        objectPath,
        originalName: item.originalName || `${item.label}.docx`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: buffer.length,
      });
      await tx.approvalDossierRevision.create({
        data: {
          dossierId,
          itemId,
          actorId: payload.actorId,
          action: 'ONLYOFFICE_SAVE',
          fromVersion: payload.itemVersion,
          toVersion: payload.itemVersion + 1,
          metadata: {
            previousRenderedOverridePath: item.renderedOverridePath,
            objectPath,
            dossierVersion: dossier.version,
          },
        },
      });
    });
    return { error: 0 };
  }

  async submit(
    dossierId: string,
    userId: string,
    input: DossierTransitionDto,
  ) {
    return this.sendForReview(dossierId, userId, input, false);
  }

  async resubmit(
    dossierId: string,
    userId: string,
    input: DossierTransitionDto,
  ) {
    return this.sendForReview(dossierId, userId, input, true);
  }

  async forward(
    requestId: string,
    userId: string,
    input: DossierTransitionDto,
  ) {
    const request = await this.getPendingDossierRequest(requestId, userId);
    await this.assertApprovalPermission(userId, false);
    await this.assertValidRecipient(input.approverId, userId);
    if (request.dossier.version !== input.expectedVersion) {
      throw new ConflictException('Bộ hồ sơ đã thay đổi. Vui lòng tải lại.');
    }
    this.assertForwardRecipientNotInChain(
      request.dossier.requests,
      input.approverId,
    );

    const next = await this.prisma.$transaction(async (tx) => {
      await this.resolvePendingRequest(
        tx,
        request.id,
        userId,
        ApprovalRequestStatus.APPROVED,
        input.comment,
      );
      const created = await tx.approvalRequest.create({
        data: {
          targetType: request.targetType,
          ...this.targetData(request.targetType, this.requestTargetId(request)),
          dossierId: request.dossierId,
          previousRequestId: request.id,
          hopIndex: request.hopIndex + 1,
          requesterId: userId,
          approverId: input.approverId,
          submitComment: input.comment?.trim() || null,
        },
      });
      const dossier = await this.updateDossierVersion(
        tx,
        request.dossierId!,
        input.expectedVersion,
        {
          status: DossierStatus.IN_REVIEW,
          currentHandlerId: input.approverId,
        },
      );
      await tx.approvalDossierRevision.create({
        data: {
          dossierId: request.dossierId!,
          actorId: userId,
          action: 'FORWARD',
          fromVersion: input.expectedVersion,
          toVersion: dossier.version,
          comment: input.comment?.trim() || null,
          metadata: {
            requestId: request.id,
            nextRequestId: created.id,
            approverId: input.approverId,
          },
        },
      });
      return created;
    });
    await this.notifySubmitted(
      input.approverId,
      request.dossier.title,
      userId,
      next.id,
      request.dossierId!,
    );
    await this.notifications.emitApprovalCount(userId);
    return this.getOne(request.dossierId!, userId);
  }

  async finalApprove(
    requestId: string,
    userId: string,
    input: DossierDecisionDto,
  ) {
    const request = await this.getPendingDossierRequest(requestId, userId);
    await this.assertApprovalPermission(userId, true);
    if (request.dossier.version !== input.expectedVersion) {
      throw new ConflictException('Bộ hồ sơ đã thay đổi. Vui lòng tải lại.');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.resolvePendingRequest(
        tx,
        request.id,
        userId,
        ApprovalRequestStatus.APPROVED,
        input.comment,
      );
      const dossier = await this.updateDossierVersion(
        tx,
        request.dossierId!,
        input.expectedVersion,
        {
          status: DossierStatus.APPROVED,
          currentHandlerId: null,
          approvedAt: new Date(),
        },
      );
      await this.updateTargetStatus(
        tx,
        request.targetType,
        this.requestTargetId(request),
        'APPROVE',
        userId,
        input.comment,
      );
      await tx.approvalDossierRevision.create({
        data: {
          dossierId: request.dossierId!,
          actorId: userId,
          action: 'FINAL_APPROVE',
          fromVersion: input.expectedVersion,
          toVersion: dossier.version,
          comment: input.comment?.trim() || null,
          metadata: { requestId: request.id },
        },
      });
    });
    await this.notifications.create(request.requesterId, {
      type: NotificationType.APPROVAL_APPROVED,
      title: 'Bộ hồ sơ đã được phê duyệt cuối',
      message: request.dossier.title,
      link: `/dashboard/phe-duyet?request=${request.id}`,
      metadata: { approvalRequestId: request.id, dossierId: request.dossierId },
    });
    await this.notifications.emitApprovalCount(userId);
    return this.getOne(request.dossierId!, userId);
  }

  async reject(
    requestId: string,
    userId: string,
    input: RejectDossierDto,
  ) {
    const request = await this.getPendingDossierRequest(requestId, userId);
    const reason = input.comment.trim();
    if (request.dossier.version !== input.expectedVersion) {
      throw new ConflictException('Bộ hồ sơ đã thay đổi. Vui lòng tải lại.');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.resolvePendingRequest(
        tx,
        request.id,
        userId,
        ApprovalRequestStatus.REJECTED,
        reason,
      );
      const dossier = await this.updateDossierVersion(
        tx,
        request.dossierId!,
        input.expectedVersion,
        {
          status: DossierStatus.REWORK,
          currentHandlerId: request.requesterId,
        },
      );
      await this.updateTargetStatus(
        tx,
        request.targetType,
        this.requestTargetId(request),
        'REJECT',
        userId,
        reason,
      );
      await tx.approvalDossierRevision.create({
        data: {
          dossierId: request.dossierId!,
          actorId: userId,
          action: 'REJECT',
          fromVersion: input.expectedVersion,
          toVersion: dossier.version,
          comment: reason,
          metadata: {
            requestId: request.id,
            returnedTo: request.requesterId,
          },
        },
      });
    });
    await this.notifications.create(request.requesterId, {
      type: NotificationType.APPROVAL_REJECTED,
      title: 'Bộ hồ sơ cần làm lại',
      message: `${request.dossier.title}: ${reason}`,
      link: `/dashboard/phe-duyet?request=${request.id}`,
      metadata: { approvalRequestId: request.id, dossierId: request.dossierId },
    });
    await this.notifications.emitApprovalCount(userId);
    return this.getOne(request.dossierId!, userId);
  }

  async returnToPreviousSender(
    dossierId: string,
    userId: string,
    input: DossierDecisionDto,
  ) {
    const dossier = await this.prisma.approvalDossier.findUnique({
      where: { id: dossierId },
      include: { requests: { orderBy: { submittedAt: 'asc' } } },
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy bộ hồ sơ');
    if (
      dossier.status !== DossierStatus.REWORK ||
      dossier.currentHandlerId !== userId
    ) {
      throw new ForbiddenException('Bạn không được trả tiếp bộ hồ sơ này');
    }
    if (dossier.version !== input.expectedVersion) {
      throw new ConflictException('Bộ hồ sơ đã thay đổi. Vui lòng tải lại.');
    }
    const recipient = this.findReturnRecipient(dossier.requests, userId);
    if (!recipient) {
      throw new BadRequestException('Không còn người gửi trước đó để trả hồ sơ');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await this.updateDossierVersion(
        tx,
        dossierId,
        input.expectedVersion,
        { currentHandlerId: recipient },
      );
      await tx.approvalDossierRevision.create({
        data: {
          dossierId,
          actorId: userId,
          action: 'RETURN',
          fromVersion: input.expectedVersion,
          toVersion: next.version,
          comment: input.comment?.trim() || null,
          metadata: { returnedTo: recipient },
        },
      });
      return next;
    });
    await this.notifications.create(recipient, {
      type: NotificationType.APPROVAL_REJECTED,
      title: 'Bộ hồ sơ được trả lại cho bạn',
      message: input.comment?.trim() || dossier.title,
      link: `/dashboard/phe-duyet?dossier=${dossierId}`,
      metadata: { dossierId },
    });
    return this.getOne(updated.id, userId);
  }

  private async sendForReview(
    dossierId: string,
    userId: string,
    input: DossierTransitionDto,
    resubmit: boolean,
  ) {
    await this.assertValidRecipient(input.approverId, userId);
    let dossier = await this.prisma.approvalDossier.findUnique({
      where: { id: dossierId },
      include: { items: true, requests: { orderBy: { submittedAt: 'asc' } } },
    });
    if (!dossier) throw new NotFoundException('Không tìm thấy bộ hồ sơ');
    if (dossier.version !== input.expectedVersion) {
      throw new ConflictException('Bộ hồ sơ đã thay đổi. Vui lòng tải lại.');
    }
    const allowedStatus = resubmit
      ? DossierStatus.REWORK
      : DossierStatus.DRAFT;
    if (
      dossier.status !== allowedStatus ||
      dossier.currentHandlerId !== userId
    ) {
      throw new ForbiddenException('Bạn không được gửi bộ hồ sơ ở trạng thái này');
    }
    this.assertComplete(dossier.items);

    let transitionExpectedVersion = input.expectedVersion;
    if (!dossier.targetType || !dossier.targetId) {
      await this.materializeDocumentDossier(dossier, userId);
      dossier = await this.prisma.approvalDossier.findUniqueOrThrow({
        where: { id: dossierId },
        include: { items: true, requests: { orderBy: { submittedAt: 'asc' } } },
      });
      transitionExpectedVersion = dossier.version;
    }
    const latestRequest = dossier.requests.at(-1);
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.approvalRequest.create({
        data: {
          targetType: dossier.targetType!,
          ...this.targetData(dossier.targetType!, dossier.targetId!),
          dossierId,
          previousRequestId: latestRequest?.id || null,
          hopIndex: (latestRequest?.hopIndex || 0) + 1,
          requesterId: userId,
          approverId: input.approverId,
          submitComment: input.comment?.trim() || null,
        },
      });
      const next = await this.updateDossierVersion(
        tx,
        dossierId,
        transitionExpectedVersion,
        {
          status: DossierStatus.IN_REVIEW,
          currentHandlerId: input.approverId,
        },
      );
      await this.updateTargetStatus(
        tx,
        dossier.targetType!,
        dossier.targetId!,
        'SUBMIT',
        userId,
        input.comment,
        input.approverId,
      );
      await tx.approvalDossierRevision.create({
        data: {
          dossierId,
          actorId: userId,
          action: resubmit ? 'RESUBMIT' : 'SUBMIT',
          fromVersion: transitionExpectedVersion,
          toVersion: next.version,
          comment: input.comment?.trim() || null,
          metadata: {
            requestId: created.id,
            approverId: input.approverId,
          },
        },
      });
      return created;
    });
    await this.notifySubmitted(
      input.approverId,
      dossier.title,
      userId,
      request.id,
      dossierId,
    );
    return this.getOne(dossierId, userId);
  }

  private async materializeDocumentDossier(dossier: any, userId: string) {
    if (
      dossier.workflowType !== DossierWorkflowType.DU_TOAN &&
      dossier.workflowType !== DossierWorkflowType.KHLCNT
    ) {
      throw new BadRequestException(
        'Bộ hồ sơ nghiệp vụ này phải tham chiếu Quyết định hiện có',
      );
    }
    const proposal = dossier.items.find((item: any) =>
      ['tt_dutoan', 'tt_khlcnt'].includes(item.itemKey),
    );
    const decision = dossier.items.find((item: any) =>
      ['qd_dutoan', 'qd_khlcnt'].includes(item.itemKey),
    );
    const appraisalReport = dossier.items.find(
      (item: any) => item.itemKey === 'bc_khlcnt',
    );
    if (!proposal || !decision) {
      throw new BadRequestException('Bộ hồ sơ thiếu Tờ trình hoặc Quyết định');
    }
    const project = dossier.projectId
      ? await this.prisma.project.findUnique({
          where: { id: dossier.projectId },
        })
      : null;
    if (dossier.projectId && !project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }
    const context = (dossier.context || {}) as Record<string, any>;
    const parentId =
      dossier.workflowType === DossierWorkflowType.KHLCNT
        ? String(context.parentDecisionId || '')
        : null;
    if (dossier.workflowType === DossierWorkflowType.KHLCNT) {
      const parent = parentId
        ? await this.prisma.document.findUnique({ where: { id: parentId } })
        : null;
      if (
        !parent ||
        parent.type !== DocType.QD_DUTOAN ||
        parent.status !== DocStatus.APPROVED
      ) {
        throw new BadRequestException(
          'KHLCNT phải tham chiếu Quyết định dự toán đã duyệt',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.approvalDossier.updateMany({
        where: {
          id: dossier.id,
          version: dossier.version,
          targetId: null,
        },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Bộ hồ sơ đã được gửi hoặc thay đổi. Vui lòng tải lại.',
        );
      }
      const proposalType =
        dossier.workflowType === DossierWorkflowType.DU_TOAN
          ? DocType.TT_DUTOAN
          : DocType.TT_KHLCNT;
      const decisionType =
        dossier.workflowType === DossierWorkflowType.DU_TOAN
          ? DocType.QD_DUTOAN
          : DocType.QD_KHLCNT;
      const appendix = dossier.items.find(
        (item: any) =>
          item.itemKey === 'khai_toan_attachment' && item.objectPath,
      );
      const attachmentData = appendix
        ? {
            khaiToanAttachment: {
              objectPath: appendix.objectPath,
              originalName: appendix.originalName,
              mimeType: appendix.mimeType,
            },
            khaiToanAttachmentOverride: true,
          }
        : {};
      const proposalDocument = await tx.document.create({
        data: {
          type: proposalType,
          status: DocStatus.COMPLETED,
          data: {
            ...((proposal.data as Record<string, unknown>) || {}),
            ...attachmentData,
          } as Prisma.InputJsonValue,
          parentId,
          createdBy: userId,
          projectId: dossier.projectId,
          procurementType: project?.procurementType || null,
        },
      });
      await tx.review.create({
        data: {
          documentId: proposalDocument.id,
          userId,
          action: 'COMPLETE_DOSSIER_ITEM',
        },
      });

      if (
        dossier.workflowType === DossierWorkflowType.KHLCNT &&
        appraisalReport &&
        Object.keys(
          (appraisalReport.data as Record<string, unknown>) || {},
        ).length > 0
      ) {
        const reportDocument = await tx.document.create({
          data: {
            type: DocType.BC_KHLCNT,
            status: DocStatus.COMPLETED,
            data: appraisalReport.data as Prisma.InputJsonValue,
            parentId,
            createdBy: userId,
            projectId: dossier.projectId,
            procurementType: project?.procurementType || null,
          },
        });
        await tx.review.create({
          data: {
            documentId: reportDocument.id,
            userId,
            action: 'COMPLETE_DOSSIER_ITEM',
          },
        });
        await tx.approvalDossierItem.update({
          where: { id: appraisalReport.id },
          data: {
            entityType: 'DOCUMENT',
            entityId: reportDocument.id,
          },
        });
      }

      const decisionDocument = await tx.document.create({
        data: {
          type: decisionType,
          status: DocStatus.DRAFT,
          data: {
            ...((decision.data as Record<string, unknown>) || {}),
            ...attachmentData,
          } as Prisma.InputJsonValue,
          parentId,
          sourceDocumentId: proposalDocument.id,
          createdBy: userId,
          projectId: dossier.projectId,
          procurementType: project?.procurementType || null,
        },
      });
      await tx.review.create({
        data: {
          documentId: decisionDocument.id,
          userId,
          action: 'CREATE_DOSSIER_DRAFT',
        },
      });
      await tx.approvalDossierItem.update({
        where: { id: proposal.id },
        data: { entityType: 'DOCUMENT', entityId: proposalDocument.id },
      });
      await tx.approvalDossierItem.update({
        where: { id: decision.id },
        data: { entityType: 'DOCUMENT', entityId: decisionDocument.id },
      });
      await tx.approvalDossier.update({
        where: { id: dossier.id },
        data: {
          targetType: ApprovalTargetType.DOCUMENT,
          targetId: decisionDocument.id,
        },
      });
      await tx.approvalDossierRevision.create({
        data: {
          dossierId: dossier.id,
          actorId: userId,
          action: 'MATERIALIZE_BUSINESS_RECORDS',
          fromVersion: dossier.version,
          toVersion: dossier.version + 1,
          metadata: {
            proposalDocumentId: proposalDocument.id,
            decisionDocumentId: decisionDocument.id,
          },
        },
      });
    });
  }

  private async buildItemSeeds(
    input: CreateApprovalDossierDto,
  ): Promise<ItemSeed[]> {
    const empty = (item: Omit<ItemSeed, 'data' | 'source'>): ItemSeed => ({
      ...item,
      source: DossierItemSource.FORM,
      data: {},
    });
    let seeds: ItemSeed[];
    switch (input.workflowType) {
      case DossierWorkflowType.DU_TOAN:
        seeds = [
          empty({
            itemKey: 'cover_dutoan',
            label: 'Phiếu trình ký',
            kind: DossierItemKind.COVER,
            sortOrder: 10,
          }),
          empty({
            itemKey: 'tt_dutoan',
            label: 'Tờ trình dự toán',
            kind: DossierItemKind.PROPOSAL,
            sortOrder: 20,
          }),
          empty({
            itemKey: 'qd_dutoan',
            label: 'Quyết định dự toán',
            kind: DossierItemKind.DECISION,
            sortOrder: 30,
          }),
          {
            itemKey: 'khai_toan_attachment',
            label: 'Phụ lục khái toán',
            kind: DossierItemKind.ATTACHMENT,
            source: DossierItemSource.FILE,
            sortOrder: 40,
            required: false,
          },
        ];
        break;
      case DossierWorkflowType.KHLCNT:
        seeds = [
          empty({
            itemKey: 'cover_khlcnt',
            label: 'Phiếu trình ký',
            kind: DossierItemKind.COVER,
            sortOrder: 10,
          }),
          empty({
            itemKey: 'tt_khlcnt',
            label: 'Tờ trình KHLCNT',
            kind: DossierItemKind.PROPOSAL,
            sortOrder: 20,
          }),
          {
            ...empty({
              itemKey: 'bc_khlcnt',
              label: 'Báo cáo thẩm định',
              kind: DossierItemKind.REPORT,
              sortOrder: 30,
              required: false,
            }),
          },
          empty({
            itemKey: 'qd_khlcnt',
            label: 'Quyết định KHLCNT',
            kind: DossierItemKind.DECISION,
            sortOrder: 40,
          }),
        ];
        if ((input.context as any)?.parentDecisionId) {
          seeds.unshift({
            itemKey: 'qd_dutoan_reference',
            label: 'Quyết định dự toán nguồn',
            kind: DossierItemKind.REFERENCE,
            source: DossierItemSource.ENTITY_REFERENCE,
            entityType: 'DOCUMENT',
            entityId: String((input.context as any).parentDecisionId),
            sortOrder: 0,
            editable: false,
          });
        }
        break;
      case DossierWorkflowType.DAT_SACH:
        seeds = [
          empty({
            itemKey: 'gdn_in',
            label: 'Giấy đề nghị in',
            kind: DossierItemKind.PROPOSAL,
            sortOrder: 10,
          }),
          empty({
            itemKey: 'pcdi',
            label: 'Phiếu chỉ định cơ sở in',
            kind: DossierItemKind.SUPPORTING_DOCUMENT,
            sortOrder: 20,
          }),
          empty({
            itemKey: 'qd_dat_sach',
            label: 'Quyết định đặt sách',
            kind: DossierItemKind.DECISION,
            sortOrder: 30,
          }),
        ];
        break;
      default:
        seeds = [
          empty({
            itemKey: 'current_decision',
            label: 'Quyết định hiện tại',
            kind: DossierItemKind.DECISION,
            sortOrder: 100,
          }),
        ];
        break;
    }
    if (input.targetType && input.targetId) {
      return this.hydrateExistingTarget(seeds, input);
    }
    return seeds;
  }

  private async hydrateExistingTarget(
    seeds: ItemSeed[],
    input: CreateApprovalDossierDto,
  ) {
    if (input.targetType === ApprovalTargetType.DOCUMENT) {
      const decision = await this.prisma.document.findUnique({
        where: { id: input.targetId },
        include: { sourceDocument: true },
      });
      if (!decision) throw new NotFoundException('Không tìm thấy Quyết định');
      for (const seed of seeds) {
        if (seed.kind === DossierItemKind.DECISION) {
          Object.assign(seed, {
            data: decision.data as Record<string, unknown>,
            entityType: 'DOCUMENT',
            entityId: decision.id,
          });
        } else if (
          seed.kind === DossierItemKind.PROPOSAL &&
          decision.sourceDocument
        ) {
          Object.assign(seed, {
            data: decision.sourceDocument.data as Record<string, unknown>,
            entityType: 'DOCUMENT',
            entityId: decision.sourceDocument.id,
          });
        } else if (seed.kind === DossierItemKind.COVER) {
          seed.data =
            (decision.sourceDocument?.data as Record<string, unknown>) ||
            (decision.data as Record<string, unknown>);
        }
      }
      if (
        input.workflowType === DossierWorkflowType.KHLCNT &&
        decision.parentId
      ) {
        const [parentDecision, appraisalReport] = await Promise.all([
          this.prisma.document.findUnique({
            where: { id: decision.parentId },
          }),
          this.prisma.document.findFirst({
            where: {
              type: DocType.BC_KHLCNT,
              parentId: decision.parentId,
              ...(decision.projectId ? { projectId: decision.projectId } : {}),
              createdAt: { lte: decision.createdAt },
            },
            orderBy: { createdAt: 'desc' },
          }),
        ]);
        if (
          parentDecision &&
          !seeds.some((seed) => seed.itemKey === 'qd_dutoan_reference')
        ) {
          seeds.unshift({
            itemKey: 'qd_dutoan_reference',
            label: 'Quyết định dự toán nguồn',
            kind: DossierItemKind.REFERENCE,
            source: DossierItemSource.ENTITY_REFERENCE,
            data: parentDecision.data as Record<string, unknown>,
            entityType: 'DOCUMENT',
            entityId: parentDecision.id,
            sortOrder: 0,
            editable: false,
          });
        }
        const reportSeed = seeds.find(
          (seed) => seed.itemKey === 'bc_khlcnt',
        );
        if (reportSeed && appraisalReport) {
          Object.assign(reportSeed, {
            data: appraisalReport.data as Record<string, unknown>,
            entityType: 'DOCUMENT',
            entityId: appraisalReport.id,
            required: true,
          });
        }
      }
      const data = {
        ...((decision.sourceDocument?.data as Record<string, any>) || {}),
        ...((decision.data as Record<string, any>) || {}),
      };
      const attachment = data.khaiToanAttachment || data._khaiToanAttachment;
      const appendix = seeds.find(
        (seed) => seed.itemKey === 'khai_toan_attachment',
      );
      if (appendix && attachment?.objectPath) {
        Object.assign(appendix, {
          objectPath: attachment.objectPath,
          originalName:
            attachment.originalName || attachment.fileName || 'phu-luc.docx',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }
    } else if (input.targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      const project = await this.prisma.datSachProject.findUnique({
        where: { id: input.targetId },
        include: {
          gdnDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
          pcdiDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (!project) throw new NotFoundException('Không tìm thấy hồ sơ Đặt sách');
      const mapping: Record<string, any> = {
        gdn_in: project.gdnDocuments[0],
        pcdi: project.pcdiDocuments[0],
        qd_dat_sach: {
          id: project.id,
          data: project.qdData,
          docxPath: null,
        },
      };
      seeds.forEach((seed) => {
        const entity = mapping[seed.itemKey];
        if (!entity) return;
        seed.data = (entity.data || {}) as Record<string, unknown>;
        seed.entityType =
          seed.itemKey === 'qd_dat_sach' ? 'DAT_SACH_PROJECT' : 'DAT_SACH_ITEM';
        seed.entityId = entity.id;
        if (entity.docxPath) seed.objectPath = entity.docxPath;
      });
    } else if (input.targetType === ApprovalTargetType.PROCUREMENT_STEP) {
      const current = await this.prisma.procurementStep.findUnique({
        where: { id: input.targetId },
        include: {
          contractorSelection: {
            include: {
              steps: {
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      });
      if (!current) throw new NotFoundException('Không tìm thấy bước lựa chọn nhà thầu');
      const references: ItemSeed[] = current.contractorSelection.steps
        .filter(
          (step) =>
            step.stepOrder < current.stepOrder &&
            step.status === 'COMPLETED' &&
            (step.requiresApproval ||
              step.title.toLocaleLowerCase('vi').includes('quyết định')),
        )
        .map((step) => ({
          itemKey: `reference_${step.id}`,
          label: step.title,
          kind: DossierItemKind.REFERENCE,
          source: DossierItemSource.ENTITY_REFERENCE,
          data: step.data as Record<string, unknown>,
          entityType: 'PROCUREMENT_STEP',
          entityId: step.id,
          objectPath: step.attachmentPath || undefined,
          sortOrder: step.stepOrder,
          editable: false,
        }));
      const currentSeed = seeds.find(
        (seed) => seed.kind === DossierItemKind.DECISION,
      )!;
      Object.assign(currentSeed, {
        label: current.title,
        data: current.data as Record<string, unknown>,
        entityType: 'PROCUREMENT_STEP',
        entityId: current.id,
        objectPath: current.attachmentPath || undefined,
        originalName: `${current.title}.docx`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      if (!currentSeed.objectPath && !isAttachmentOnlyStep(current.stepKey)) {
        const buffer = await this.renderProcurementStepSnapshot(
          current.id,
          current.data as Record<string, unknown>,
        );
        const objectPath =
          `approval-dossiers/snapshots/${current.id}/${randomUUID()}.docx`;
        await this.minio.upload(
          objectPath,
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        currentSeed.objectPath = objectPath;
        await this.prisma.procurementStep.update({
          where: { id: current.id },
          data: { attachmentPath: objectPath },
        });
      }
      return [...references, ...seeds];
    }
    return seeds;
  }

  private async renderItemDocx(dossier: any, item: any): Promise<Buffer> {
    if (item.renderedOverridePath) {
      return this.minio.download(item.renderedOverridePath);
    }
    if (item.objectPath) {
      try {
        return await this.minio.download(item.objectPath);
      } catch (error) {
        if (item.entityType !== 'PROCUREMENT_STEP') throw error;
        // Dữ liệu cũ có thể trỏ tới một object MinIO đã bị xóa. Với LCNT,
        // sinh lại từ snapshot trong dossier để người duyệt vẫn xem được.
      }
    }
    if (item.entityType === 'DOCUMENT' && item.entityId && item.kind === DossierItemKind.REFERENCE) {
      const document = await this.prisma.document.findUnique({
        where: { id: item.entityId },
      });
      if (!document) throw new NotFoundException('Tài liệu tham chiếu không còn tồn tại');
      return this.renderDocumentType(document.type, document.data as any);
    }
    if (item.entityType === 'PROCUREMENT_STEP' && item.entityId) {
      const step = await this.prisma.procurementStep.findUnique({
        where: { id: item.entityId },
      });
      if (step?.attachmentPath) {
        try {
          return await this.minio.download(step.attachmentPath);
        } catch {
          // Fall through và sinh lại DOCX từ dữ liệu đã chốt trong dossier.
        }
      }
      if (step && !isAttachmentOnlyStep(step.stepKey)) {
        return this.renderProcurementStepSnapshot(
          step.id,
          (item.data || step.data || {}) as Record<string, unknown>,
        );
      }
    }

    let buffer: Buffer;
    const data = (item.data || {}) as Record<string, any>;
    if (item.itemKey === 'gdn_in') {
      const gdn = item.entityId
        ? await this.prisma.gDNInSach.findUnique({
            where: { id: item.entityId },
            include: { assignments: true },
          })
        : null;
      return generateGdnInDocx(
        data,
        gdn?.assignments || (Array.isArray(data.assignments) ? data.assignments : []),
      );
    }
    if (item.itemKey === 'pcdi') {
      return generatePcdiDocx(data);
    }
    if (
      item.itemKey === 'qd_dat_sach' ||
      item.entityType === 'DAT_SACH_DECISION'
    ) {
      const projectId = item.entityId || dossier.targetId;
      const project = projectId
        ? await this.prisma.datSachProject.findUnique({
            where: { id: projectId },
            include: {
              gdnDocuments: {
                include: { assignments: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              pcdiDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          })
        : null;
      const gdn = project?.gdnDocuments[0];
      const pcdi = project?.pcdiDocuments[0];
      return generateDatSachDecisionDocx({
        ...((gdn?.data as Record<string, unknown>) || {}),
        assignments: gdn?.assignments || [],
        ...((pcdi?.data as Record<string, unknown>) || {}),
        ...((project?.qdData as Record<string, unknown>) || {}),
        ...data,
      });
    }
    switch (item.itemKey) {
      case 'cover_dutoan':
        buffer = await generateDuToanCoverDocx(data);
        break;
      case 'tt_dutoan':
        buffer = await generateDuToanDocx('TT_DUTOAN', data);
        break;
      case 'qd_dutoan':
        buffer = await generateDuToanDocx('QD_DUTOAN', data);
        break;
      case 'cover_khlcnt':
        buffer = await generateKhlcntCoverDocx(data);
        break;
      case 'tt_khlcnt':
        buffer = await generateKhlcntDocx('TT_KHLCNT', data);
        break;
      case 'qd_khlcnt':
        buffer = await generateKhlcntDocx('QD_KHLCNT', data);
        break;
      default:
        if (item.entityType === 'DOCUMENT' && item.entityId) {
          const document = await this.prisma.document.findUnique({
            where: { id: item.entityId },
          });
          if (document) {
            buffer = await this.renderDocumentType(
              document.type,
              document.data as Record<string, any>,
            );
            break;
          }
        }
        throw new BadRequestException(
          'Tài liệu chưa có tệp DOCX để xem trước',
        );
    }
    if (
      dossier.workflowType === DossierWorkflowType.DU_TOAN &&
      ['tt_dutoan', 'qd_dutoan'].includes(item.itemKey)
    ) {
      const appendix = dossier.items.find(
        (candidate: any) =>
          candidate.itemKey === 'khai_toan_attachment' &&
          candidate.objectPath,
      );
      if (appendix?.objectPath) {
        buffer = await appendDocxAttachment(
          buffer,
          await this.minio.download(appendix.objectPath),
        );
      }
    }
    return buffer;
  }

  private async renderProcurementStepSnapshot(
    stepId: string,
    snapshotData: Record<string, unknown>,
  ): Promise<Buffer> {
    const step = await this.prisma.procurementStep.findUnique({
      where: { id: stepId },
      include: {
        contractorSelection: {
          include: {
            qdKhlcnt: { select: { data: true } },
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });
    if (!step) {
      throw new NotFoundException('Bước lựa chọn nhà thầu không còn tồn tại');
    }
    if (isAttachmentOnlyStep(step.stepKey)) {
      throw new BadRequestException(
        'Bước này chỉ có tệp đính kèm và chưa có DOCX để xem trước',
      );
    }

    const previousCompletedData = step.contractorSelection.steps
      .filter(
        candidate =>
          candidate.stepOrder < step.stepOrder &&
          candidate.status === 'COMPLETED' &&
          candidate.data,
      )
      .map(candidate => candidate.data);
    const payload = buildWorkflowPayload(
      step.contractorSelection,
      step.contractorSelection.qdKhlcnt.data,
      [...previousCompletedData, snapshotData],
    );
    return generateContractorSelectionDocx(
      step.contractorSelection.procurementMethod,
      step.stepKey,
      payload,
    );
  }

  private async renderDocumentType(type: DocType, data: Record<string, any>) {
    switch (type) {
      case DocType.TT_DUTOAN:
        return generateDuToanDocx('TT_DUTOAN', data);
      case DocType.QD_DUTOAN:
        return generateDuToanDocx('QD_DUTOAN', data);
      case DocType.TT_KHLCNT:
        return generateKhlcntDocx('TT_KHLCNT', data);
      case DocType.BC_KHLCNT:
        return generateBaoCaoKHLCNT({
          ...data,
          ngayLap: data.ngayLap ? new Date(data.ngayLap) : new Date(),
        } as any);
      case DocType.QD_KHLCNT:
        return generateKhlcntDocx('QD_KHLCNT', data);
      default:
        throw new BadRequestException('Loại tài liệu không có mẫu xem trước');
    }
  }

  private async getEditableItem(
    dossierId: string,
    itemId: string,
    userId: string,
  ) {
    const dossier = await this.getOne(dossierId, userId);
    if (!dossier.actions.canEdit) {
      throw new ForbiddenException('Bạn không được sửa bộ hồ sơ này');
    }
    const item = dossier.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException('Không tìm thấy tài liệu');
    if (!item.editable) {
      throw new ForbiddenException('Tài liệu tham chiếu chỉ được xem');
    }
    return item;
  }

  private async assertCanCreate(
    userId: string,
    workflowType: DossierWorkflowType,
    projectId?: string,
  ) {
    const resolved = await this.permissions.resolve(userId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isInvestor: true },
    });
    const project = projectId
      ? await this.prisma.project.findUnique({
          where: { id: projectId },
          select: { procurementType: true },
        })
      : null;
    const feature =
      workflowType === DossierWorkflowType.DAT_SACH ||
      project?.procurementType === 'THAU_SACH'
        ? 'feature:book-procurement'
        : 'feature:equipment-procurement';
    if (
      resolved.user.role !== Role.ADMIN &&
      !user.isInvestor &&
      !resolved.effectivePermissions.includes(feature)
    ) {
      throw new ForbiddenException('Bạn không có quyền mở nghiệp vụ này');
    }
    if (projectId && resolved.user.role !== Role.ADMIN) {
      const membership = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!membership) {
        throw new ForbiddenException('Bạn không phải thành viên của dự án');
      }
    }
  }

  private async assertCanView(dossier: any, userId: string) {
    if (
      dossier.createdBy === userId ||
      dossier.currentHandlerId === userId ||
      dossier.requests.some(
        (request: any) =>
          request.requesterId === userId || request.approverId === userId,
      )
    ) {
      return;
    }
    const resolved = await this.permissions.resolve(userId);
    if (resolved.user.role === Role.ADMIN) return;
    if (dossier.projectId) {
      const membership = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: dossier.projectId, userId } },
      });
      if (membership) return;
    }
    throw new ForbiddenException('Bạn không được xem bộ hồ sơ này');
  }

  private async assertApprovalPermission(userId: string, final: boolean) {
    const resolved = await this.permissions.resolve(userId);
    const required = final ? 'approval:final' : 'approval:review';
    if (
      resolved.user.role !== Role.ADMIN &&
      !resolved.effectivePermissions.includes(required) &&
      !(final === false &&
        resolved.effectivePermissions.includes('approval:final'))
    ) {
      throw new ForbiddenException(
        final
          ? 'Bạn không có quyền phê duyệt cuối'
          : 'Bạn không có quyền duyệt và chuyển tiếp',
      );
    }
  }

  private async assertValidRecipient(recipientId: string, senderId: string) {
    if (recipientId === senderId) {
      throw new BadRequestException('Không thể tự gửi duyệt cho chính mình');
    }
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, canApprove: true },
    });
    if (!recipient) throw new NotFoundException('Không tìm thấy người nhận');
    const resolved = await this.permissions.resolve(recipientId);
    if (
      !recipient.canApprove &&
      resolved.user.role !== Role.ADMIN &&
      !resolved.effectivePermissions.includes('approval:review') &&
      !resolved.effectivePermissions.includes('approval:final')
    ) {
      throw new BadRequestException('Người nhận không có quyền phê duyệt');
    }
  }

  private async getPendingDossierRequest(requestId: string, userId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        id: requestId,
        approverId: userId,
        status: ApprovalRequestStatus.PENDING,
        dossierId: { not: null },
      },
      include: {
        dossier: {
          include: {
            items: true,
            requests: { orderBy: { submittedAt: 'asc' } },
          },
        },
      },
    });
    if (!request?.dossier) {
      throw new NotFoundException(
        'Không tìm thấy yêu cầu được giao hoặc yêu cầu đã được xử lý',
      );
    }
    return request as typeof request & { dossierId: string; dossier: any };
  }

  private async resolvePendingRequest(
    tx: Prisma.TransactionClient,
    requestId: string,
    approverId: string,
    status: ApprovalRequestStatus,
    comment?: string,
  ) {
    const result = await tx.approvalRequest.updateMany({
      where: {
        id: requestId,
        approverId,
        status: ApprovalRequestStatus.PENDING,
      },
      data: {
        status,
        decisionComment: comment?.trim() || null,
        decidedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new ConflictException('Yêu cầu đã được xử lý trước đó');
    }
  }

  private async updateDossierVersion(
    tx: Prisma.TransactionClient,
    dossierId: string,
    expectedVersion: number,
    data: Prisma.ApprovalDossierUncheckedUpdateManyInput,
  ) {
    const result = await tx.approvalDossier.updateMany({
      where: { id: dossierId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new ConflictException('Bộ hồ sơ đã thay đổi. Vui lòng tải lại.');
    }
    return tx.approvalDossier.findUniqueOrThrow({ where: { id: dossierId } });
  }

  private async bumpDossier(
    tx: Prisma.TransactionClient,
    dossierId: string,
  ) {
    return tx.approvalDossier.update({
      where: { id: dossierId },
      data: { version: { increment: 1 } },
    });
  }

  private async updateTargetStatus(
    tx: Prisma.TransactionClient,
    targetType: ApprovalTargetType,
    targetId: string,
    action: 'SUBMIT' | 'APPROVE' | 'REJECT',
    actorId: string,
    comment?: string,
    assignedTo?: string,
  ) {
    if (targetType === ApprovalTargetType.DOCUMENT) {
      const status =
        action === 'APPROVE'
          ? DocStatus.APPROVED
          : action === 'REJECT'
            ? DocStatus.REJECTED
            : DocStatus.PENDING_APPROVAL;
      await tx.document.update({
        where: { id: targetId },
        data: {
          status,
          ...(action === 'SUBMIT' ? { assignedTo } : {}),
        },
      });
      await tx.review.create({
        data: {
          documentId: targetId,
          userId: actorId,
          action:
            action === 'APPROVE'
              ? 'FINAL_APPROVE_DOSSIER'
              : action === 'REJECT'
                ? 'REJECT_DOSSIER'
                : 'SUBMIT_DOSSIER',
          comment: comment?.trim() || null,
        },
      });
    } else if (targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      await tx.datSachProject.update({
        where: { id: targetId },
        data:
          action === 'APPROVE'
            ? {
                reviewerId: actorId,
                reviewStatus: 'APPROVED',
                reviewComment: comment?.trim() || null,
                reviewedAt: new Date(),
                status: 'COMPLETED',
              }
            : action === 'REJECT'
              ? {
                  reviewerId: actorId,
                  reviewStatus: 'REWORK',
                  reviewComment: comment?.trim() || null,
                  reviewedAt: new Date(),
                  status: 'IN_PROGRESS',
                }
              : {
                  reviewerId: assignedTo,
                  reviewStatus: 'PENDING',
                  reviewComment: comment?.trim() || null,
                },
      });
    } else {
      await tx.procurementStep.update({
        where: { id: targetId },
        data:
          action === 'APPROVE'
            ? {
                requiresApproval: true,
                approvalStatus: 'APPROVED',
                approvedBy: actorId,
                approvedAt: new Date(),
                approvalComment: comment?.trim() || null,
                status: 'COMPLETED',
                completedAt: new Date(),
              }
            : action === 'REJECT'
              ? {
                  approvalStatus: 'REJECTED',
                  approvedBy: null,
                  approvedAt: null,
                  approvalComment: comment?.trim() || null,
                  status: 'IN_PROGRESS',
                  completedAt: null,
                }
              : {
                  requiresApproval: true,
                  approvalStatus: 'PENDING_APPROVAL',
                  approvalComment: comment?.trim() || null,
                },
      });
      await tx.stepApprovalRequest.create({
        data: {
          stepId: targetId,
          userId: actorId,
          action:
            action === 'APPROVE'
              ? 'FINAL_APPROVED'
              : action === 'REJECT'
                ? 'REJECTED'
                : 'PENDING_APPROVAL',
          comment: comment?.trim() || null,
        },
      });
    }
  }

  private assertComplete(items: any[]) {
    const missing = items.filter((item) => {
      if (!item.required) return false;
      if (item.objectPath || item.entityId) return false;
      const data = (item.data || {}) as Record<string, unknown>;
      return Object.keys(data).length === 0;
    });
    if (missing.length) {
      throw new BadRequestException(
        `Bộ hồ sơ chưa đầy đủ: ${missing.map((item) => item.label).join(', ')}`,
      );
    }
  }

  private targetData(targetType: ApprovalTargetType, targetId: string) {
    if (targetType === ApprovalTargetType.DOCUMENT) {
      return { documentId: targetId };
    }
    if (targetType === ApprovalTargetType.DAT_SACH_DECISION) {
      return { datSachProjectId: targetId };
    }
    return { procurementStepId: targetId };
  }

  private requestTargetId(request: any) {
    return (
      request.documentId ||
      request.datSachProjectId ||
      request.procurementStepId ||
      request.dossier?.targetId
    );
  }

  private findReturnRecipient(requests: any[], currentUserId: string) {
    const latestRejected = [...requests]
      .reverse()
      .find(
        (request) =>
          request.status === ApprovalRequestStatus.REJECTED &&
          request.requesterId === currentUserId,
      );
    if (!latestRejected) return null;
    const previousInbound = [...requests]
      .filter(
        (request) =>
          request.submittedAt < latestRejected.submittedAt &&
          request.approverId === currentUserId &&
          request.requesterId !== currentUserId,
      )
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() -
          new Date(left.submittedAt).getTime(),
      )[0];
    return previousInbound?.requesterId || null;
  }

  private assertForwardRecipientNotInChain(
    requests: any[],
    recipientId: string,
  ) {
    const lastRejectedIndex = requests.reduce(
      (latest, request, index) =>
        request.status === ApprovalRequestStatus.REJECTED ? index : latest,
      -1,
    );
    // Một lần bị trả lại mở một nhánh xử lý mới. Người duyệt ở nhánh cũ có
    // thể nhận lại hồ sơ sau khi đã sửa, nhưng không ai trong nhánh hiện tại
    // được xuất hiện lần hai vì điều đó tạo vòng chuyển tiếp thực sự.
    const activeRequests = requests.slice(lastRejectedIndex + 1);
    const chainUsers = new Set(
      activeRequests.flatMap((request) => [
        request.requesterId,
        request.approverId,
      ]),
    );
    if (chainUsers.has(recipientId)) {
      throw new BadRequestException(
        'Không thể chuyển tiếp ngược lại người đã có trong chuỗi phê duyệt',
      );
    }
  }

  private async syncFormEntity(
    tx: Prisma.TransactionClient,
    entityType: string | null,
    entityId: string | null,
    data: Record<string, unknown>,
  ) {
    if (!entityId) return;
    const normalized = prepareWorkflowTemplateData(data) as Prisma.InputJsonValue;
    if (entityType === 'DOCUMENT') {
      await tx.document.update({ where: { id: entityId }, data: { data: normalized } });
    } else if (entityType === 'DAT_SACH_PROJECT') {
      await tx.datSachProject.update({ where: { id: entityId }, data: { qdData: normalized } });
    } else if (entityType === 'PROCUREMENT_STEP') {
      await tx.procurementStep.update({
        where: { id: entityId },
        data: { data: normalized, attachmentPath: null },
      });
    } else if (entityType === 'DAT_SACH_ITEM') {
      const gdn = await tx.gDNInSach.findUnique({ where: { id: entityId } });
      if (gdn) {
        await tx.gDNInSach.update({
          where: { id: entityId },
          data: { data: normalized, docxPath: null },
        });
      } else {
        await tx.pCDICoSoIn.update({
          where: { id: entityId },
          data: { data: normalized, docxPath: null },
        });
      }
    }
  }

  private async syncFileEntity(
    tx: Prisma.TransactionClient,
    entityType: string | null,
    entityId: string | null,
    file: {
      objectPath: string;
      originalName: string;
      mimeType: string;
      size: number;
    },
  ) {
    if (!entityId) return;
    if (entityType === 'PROCUREMENT_STEP') {
      await tx.procurementStep.update({
        where: { id: entityId },
        data: { attachmentPath: file.objectPath },
      });
    } else if (entityType === 'DAT_SACH_ITEM') {
      const gdn = await tx.gDNInSach.findUnique({ where: { id: entityId } });
      if (gdn) {
        await tx.gDNInSach.update({
          where: { id: entityId },
          data: { docxPath: file.objectPath },
        });
      } else {
        await tx.pCDICoSoIn.update({
          where: { id: entityId },
          data: { docxPath: file.objectPath },
        });
      }
    }
  }

  private verifyOnlyOfficeToken(token: string, purpose: string): any {
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.ONLYOFFICE_JWT_SECRET || 'onlyoffice-secret',
      }) as any;
      if (payload.purpose !== purpose) throw new Error();
      return payload;
    } catch {
      throw new ForbiddenException('Chữ ký OnlyOffice không hợp lệ');
    }
  }

  private isAllowedOnlyOfficeUrl(value: string) {
    try {
      const candidate = new URL(value);
      const configured = process.env.ONLYOFFICE_URL;
      const internal = process.env.ONLYOFFICE_INTERNAL_URL;
      const allowedHosts = [configured, internal]
        .filter((entry): entry is string => !!entry && !entry.startsWith('/'))
        .map(entry => new URL(entry).host);
      if (allowedHosts.length === 0) {
        return ['http:', 'https:'].includes(candidate.protocol);
      }
      return (
        ['http:', 'https:'].includes(candidate.protocol) &&
        allowedHosts.includes(candidate.host)
      );
    } catch {
      return false;
    }
  }

  private defaultTitle(
    workflowType: DossierWorkflowType,
    items: ItemSeed[],
    targetId?: string,
  ) {
    const labels: Record<DossierWorkflowType, string> = {
      DU_TOAN: 'Bộ hồ sơ phê duyệt dự toán',
      KHLCNT: 'Bộ hồ sơ phê duyệt KHLCNT',
      DAT_SACH: 'Bộ hồ sơ quyết định đặt sách',
      LCNT_QD_HSMT: 'Bộ hồ sơ quyết định hồ sơ mời thầu',
      LCNT_QD_KQLCNT: 'Bộ hồ sơ quyết định kết quả LCNT',
      LCNT_QD_LCNT: 'Bộ hồ sơ quyết định lựa chọn nhà thầu',
    };
    return `${labels[workflowType]}${targetId ? '' : ` (${items.length} tài liệu)`}`;
  }

  private async notifySubmitted(
    approverId: string,
    title: string,
    requesterId: string,
    requestId: string,
    dossierId: string,
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });
    await this.notifications.create(approverId, {
      type: NotificationType.APPROVAL_SUBMITTED,
      title: 'Có bộ hồ sơ mới cần xử lý',
      message: `${requester?.name || 'Một người dùng'} đã gửi ${title}.`,
      link: `/dashboard/phe-duyet?request=${requestId}`,
      metadata: { approvalRequestId: requestId, dossierId },
    });
    await this.notifications.emitApprovalCount(approverId);
  }
}

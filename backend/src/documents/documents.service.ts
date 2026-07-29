import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { DocType, DocStatus, Role, ProcurementType } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '@prisma/client';
import { generateBaoCaoKHLCNT } from './docx-generator';
import {
  generateDuToanCoverDocx,
  generateDuToanDocx,
  getDuToanTemplateFields,
} from './dutoan-docx-generator';
import {
  generateKhlcntCoverDocx,
  generateKhlcntDocx,
  getKhlcntTemplateFields,
} from './khlcnt-docx-generator';
import { MinioService } from '../minio/minio.service';
import {
  appendDocxAttachment,
  prepareWorkflowTemplateData,
  validateDocxAttachmentForMerge,
} from '../utils/docx-template-renderer';
import * as path from 'path';
import * as JSZip from 'jszip';

function mergeDocumentSourceData(
  source: Record<string, any>,
  current: Record<string, any>,
): Record<string, any> {
  const merged = { ...source };
  for (const [key, value] of Object.entries(current)) {
    const isEmpty = value === undefined
      || value === null
      || value === ''
      || (Array.isArray(value) && value.length === 0);
    if (!isEmpty || merged[key] === undefined) merged[key] = value;
  }
  return merged;
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private notificationService: NotificationService,
    private jwtService: JwtService,
    private minio: MinioService,
  ) {}

  private getInitialStatus(type: DocType): DocStatus {
    // All documents requiring approval go to PENDING_APPROVAL
    // Approver is determined by canApprove flag, not by document type
    const approvalTypes: DocType[] = [DocType.TT_DUTOAN, DocType.QD_DUTOAN, DocType.TT_KHLCNT, DocType.BC_KHLCNT, DocType.QD_KHLCNT];
    if (approvalTypes.includes(type)) {
      return DocStatus.PENDING_APPROVAL;
    }
    return DocStatus.DRAFT;
  }

  /**
   * Validate sequential workflow for Thầu Sách (THAU_SACH):
   * Step 1: Đặt sách (DatSachProject with status=COMPLETED)
   * Step 2: Phê duyệt dự toán
   * Step 3: Phê duyệt KHLCNT
   *
   * For Thầu Thiết Bị (THAU_THIET_BI):
   * Step 1: Phê duyệt dự toán (no restriction)
   * Step 2: Phê duyệt KHLCNT
   */
  private async validateWorkflowForDuToan(projectId: string, procurementType: ProcurementType) {
    if (procurementType === ProcurementType.THAU_SACH) {
      const datSachCompleted = await this.prisma.datSachProject.findFirst({
        where: { projectId, status: 'COMPLETED' },
      });
      if (!datSachCompleted) {
        throw new BadRequestException(
          'Phải hoàn thành bước Đặt sách trước khi tạo Phê duyệt Dự toán (Thầu Sách).',
        );
      }
    }
    // THAU_THIET_BI: no restriction, can create directly
  }

  async create(
    userId: string,
    type: DocType,
    data: any,
    parentId?: string,
    assignedTo?: string,
    projectId?: string,
    sourceDocumentId?: string,
  ) {
    const sourceDocument = sourceDocumentId
      ? await this.prisma.document.findUnique({ where: { id: sourceDocumentId } })
      : null;
    if (sourceDocumentId && !sourceDocument) {
      throw new NotFoundException('Không tìm thấy văn bản nguồn');
    }
    const parentDocument = parentId
      ? await this.prisma.document.findUnique({ where: { id: parentId } })
      : null;
    if (parentId && !parentDocument) {
      throw new NotFoundException('Không tìm thấy văn bản cha');
    }
    if (!projectId && sourceDocument?.projectId) {
      projectId = sourceDocument.projectId;
    }

    // If parentId is provided and projectId is not, inherit from parent document
    if (!projectId && parentDocument?.projectId) {
      projectId = parentDocument.projectId;
    }
    if (
      projectId
      && parentDocument?.projectId
      && parentDocument.projectId !== projectId
    ) {
      throw new BadRequestException(
        'Văn bản cha không thuộc dự án đã chọn',
      );
    }

    // Validate project exists if provided
    let projectType: ProcurementType | null = null;
    let projectName = '';
    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundException('Không tìm thấy dự án');
      projectType = project.procurementType;
      projectName = project.tenDuAn;
    }

    // `parentId` anchors a stage (for example KHLCNT → QĐ Dự toán).
    // `sourceDocumentId` links a decision to the exact approved proposal from
    // which it inherited its data.
    if (sourceDocumentId) {
      const source = sourceDocument!;
      const expectedSourceType =
        type === DocType.QD_DUTOAN ? DocType.TT_DUTOAN
        : type === DocType.QD_KHLCNT ? DocType.TT_KHLCNT
        : null;
      if (expectedSourceType && source.type !== expectedSourceType) {
        throw new BadRequestException(`Văn bản nguồn phải có loại ${expectedSourceType}`);
      }
      if (source.status !== DocStatus.APPROVED) {
        throw new BadRequestException('Văn bản nguồn chưa được phê duyệt');
      }
      if (projectId && source.projectId && source.projectId !== projectId) {
        throw new BadRequestException('Văn bản nguồn không thuộc dự án đã chọn');
      }
      if (type === DocType.QD_KHLCNT && parentId && source.parentId !== parentId) {
        throw new BadRequestException('Tờ trình KHLCNT không thuộc Quyết định dự toán đã chọn');
      }
    }
    if (
      projectType === ProcurementType.THAU_THIET_BI
      && ([DocType.QD_DUTOAN, DocType.QD_KHLCNT] as DocType[]).includes(type)
      && !sourceDocumentId
    ) {
      throw new BadRequestException('Phải chọn tờ trình đã duyệt làm văn bản nguồn');
    }
    if (
      projectType === ProcurementType.THAU_THIET_BI
      && ([DocType.QD_DUTOAN, DocType.QD_KHLCNT] as DocType[]).includes(type)
    ) {
      const decisionNumber =
        data?.SoVanBan
        ?? data?.soVanBan
        ?? data?.SoQuyetDinh
        ?? data?.soQuyetDinh;
      if (!String(decisionNumber || '').trim()) {
        throw new BadRequestException(
          'Vui lòng nhập số Quyết định; hệ thống không dùng số Tờ trình thay thế',
        );
      }
    }

    // KHLCNT docs need an approved QD_DUTOAN parent
    if (([DocType.TT_KHLCNT, DocType.BC_KHLCNT, DocType.QD_KHLCNT] as DocType[]).includes(type)) {
      if (!parentId) throw new BadRequestException('Phải chọn quyết định dự toán đã duyệt');
      if (
        !parentDocument
        || parentDocument.type !== DocType.QD_DUTOAN
        || parentDocument.status !== DocStatus.APPROVED
      ) {
        throw new BadRequestException('Quyết định dự toán chưa được phê duyệt');
      }
    }

    const status = this.getInitialStatus(type);
    const inheritedData =
      (sourceDocument?.data as Record<string, any>)
      || (
        ([DocType.TT_KHLCNT, DocType.BC_KHLCNT] as DocType[]).includes(type)
          ? (parentDocument?.data as Record<string, any>)
          : undefined
      )
      || {};
    const mergedData = mergeDocumentSourceData(inheritedData, data || {});
    if (projectName) {
      mergedData.TenDuAn = projectName;
      mergedData.tenDuAn = projectName;
    }
    const normalizedData = prepareWorkflowTemplateData(mergedData);
    const doc = await this.prisma.document.create({
      data: {
        type,
        status,
        data: normalizedData,
        parentId,
        sourceDocumentId,
        createdBy: userId,
        projectId,
        procurementType: projectType,
        ...(assignedTo ? { assignedTo } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, type: true, status: true } },
        sourceDocument: { select: { id: true, type: true, status: true } },
      },
    });

    await this.prisma.review.create({
      data: { documentId: doc.id, userId, action: 'SUBMIT' },
    });

    // Notify approvers if document needs approval
    if (status !== DocStatus.DRAFT) {
      const docTypeLabels: Record<string, string> = {
        [DocType.TT_DUTOAN]: 'Tờ trình dự toán',
        [DocType.QD_DUTOAN]: 'Quyết định dự toán',
        [DocType.TT_KHLCNT]: 'Tờ trình KHLCNT',
        [DocType.BC_KHLCNT]: 'Báo cáo KHLCNT',
        [DocType.QD_KHLCNT]: 'Quyết định KHLCNT',
      };
      // Find users with canApprove=true or ADMIN role
      const approvers = await this.prisma.user.findMany({
        where: {
          OR: [
            { role: 'ADMIN' },
            { canApprove: true },
          ],
        },
      });
      if (approvers.length > 0) {
        await Promise.all(
          approvers.map((u) =>
            this.notificationService.create(u.id, {
              type: NotificationType.DOC_SUBMITTED,
              title: 'Có tài liệu mới cần duyệt',
              message: `${doc.creator.name} đã gửi ${docTypeLabels[type] || 'tài liệu'} "${(doc.data as any)?.TenDuAn || (doc.data as any)?.tenDuAn || ''}" chờ bạn phê duyệt.`,
              link: '/dashboard',
            }),
          ),
        );
      }
    }

    this.notifications.notifyDocumentUpdate(doc);
    return doc;
  }

  async createDuToanBatch(
    userId: string,
    ttData: any,
    qdData: any,
    assignedTo: string,
    projectId?: string,
  ) {
    let projectType: ProcurementType | null = null;
    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundException('Không tìm thấy dự án');
      projectType = project.procurementType;
    }

    // Workflow validation: Thầu Sách must complete Đặt sách first
    await this.validateWorkflowForDuToan(projectId!, projectType!);

    const status = DocStatus.PENDING_DIRECTOR;

    const [ttDoc, qdDoc] = await this.prisma.$transaction(async (tx) => {
      const tt = await tx.document.create({
        data: {
          type: DocType.TT_DUTOAN,
          status,
          data: prepareWorkflowTemplateData(ttData || {}),
          createdBy: userId,
          assignedTo,
          projectId,
          procurementType: projectType,
        },
        include: { creator: { select: { id: true, name: true, email: true, role: true } } },
      });
      await tx.review.create({ data: { documentId: tt.id, userId, action: 'SUBMIT' } });

      const qd = await tx.document.create({
        data: {
          type: DocType.QD_DUTOAN,
          status,
          data: prepareWorkflowTemplateData(qdData || {}),
          sourceDocumentId: tt.id,
          createdBy: userId,
          assignedTo,
          projectId,
          procurementType: projectType,
        },
        include: { creator: { select: { id: true, name: true, email: true, role: true } } },
      });
      await tx.review.create({ data: { documentId: qd.id, userId, action: 'SUBMIT' } });

      return [tt, qd];
    });

    this.notifications.notifyDocumentUpdate(ttDoc);
    this.notifications.notifyDocumentUpdate(qdDoc);
    return { ttDoc, qdDoc };
  }

  async findByType(
    types: DocType[],
    userId?: string,
    role?: string,
    projectId?: string,
    page: number = 1,
    limit: number = 20,
    procurementType?: ProcurementType,
  ) {
    const where: any = { type: { in: types } };

    // Filter by project
    if (projectId) {
      where.projectId = projectId;
    }
    // Document types such as TT_DUTOAN/QD_DUTOAN are shared by both
    // procurement flows. Always constrain the project relation when a
    // module requests one flow so records can never leak across modules.
    if (procurementType) {
      where.project = { procurementType };
    }

    if (role === 'USER') {
      const currentUser = userId
        ? await this.prisma.user.findUnique({
            where: { id: userId },
            select: { canApprove: true },
          })
        : null;
      if (!currentUser?.canApprove) {
        where.createdBy = userId;
      }
    }

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
          parent: { select: { id: true, type: true, data: true, status: true } },
          sourceDocument: { select: { id: true, type: true, data: true, status: true } },
          project: { select: { id: true, tenDuAn: true, procurementType: true } },
          reviews: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByProject(projectId: string) {
    return this.prisma.document.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, role: true } },
        parent: { select: { id: true, type: true, data: true, status: true } },
        sourceDocument: { select: { id: true, type: true, data: true, status: true } },
        reviews: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, type: true, data: true, status: true } },
        sourceDocument: { select: { id: true, type: true, data: true, status: true } },
        project: { select: { id: true, tenDuAn: true, procurementType: true, status: true } },
        children: {
          include: {
            creator: { select: { id: true, name: true, role: true } },
            reviews: {
              include: { user: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    return doc;
  }

  async findByParent(parentId: string) {
    return this.prisma.document.findMany({
      where: { parentId },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        reviews: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, userId: string, comment?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');

    // Check if user has permission to approve (either assignedTo or ADMIN/canApprove)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, canApprove: true },
    });
    const isAssigned = doc.assignedTo === userId;
    if (!isAssigned && (!user || (user.role !== 'ADMIN' && user.canApprove !== true))) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt tài liệu.');
    }

    const isPending = doc.status === DocStatus.PENDING_APPROVAL ||
                      doc.status === DocStatus.PENDING_HEAD ||
                      doc.status === DocStatus.PENDING_DIRECTOR;
    if (!isPending) {
      throw new BadRequestException('Tài liệu không ở trạng thái chờ duyệt');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: DocStatus.APPROVED },
      include: { creator: { select: { id: true, name: true, email: true, role: true } } },
    });
    await this.prisma.review.create({
      data: { documentId: id, userId, action: 'APPROVE', comment },
    });

    // Notify document creator that their document was approved
    await this.notificationService.create(doc.createdBy, {
      type: NotificationType.DOC_APPROVED,
      title: 'Tài liệu đã được phê duyệt',
      message: `Tài liệu "${(updated.data as any)?.tenDuAn || ''}" của bạn đã được phê duyệt.`,
      link: '/dashboard',
    });

    this.notifications.notifyDocumentUpdate(updated);
    return updated;
  }

  async reject(id: string, userId: string, comment: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');

    // Check if user has permission to reject
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, canApprove: true },
    });
    const isAssigned = doc.assignedTo === userId;
    if (!isAssigned && (!user || (user.role !== 'ADMIN' && user.canApprove !== true))) {
      throw new ForbiddenException('Bạn không có quyền từ chối tài liệu.');
    }

    const isPending = doc.status === DocStatus.PENDING_APPROVAL ||
                      doc.status === DocStatus.PENDING_HEAD ||
                      doc.status === DocStatus.PENDING_DIRECTOR;
    if (!isPending) {
      throw new BadRequestException('Tài liệu không ở trạng thái chờ duyệt');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: DocStatus.REJECTED },
      include: { creator: { select: { id: true, name: true, email: true, role: true } } },
    });
    await this.prisma.review.create({
      data: { documentId: id, userId, action: 'REJECT', comment },
    });

    await this.notificationService.create(doc.createdBy, {
      type: NotificationType.DOC_REJECTED,
      title: 'Tài liệu bị từ chối',
      message: `Tài liệu "${(updated.data as any)?.tenDuAn || ''}" của bạn đã bị từ chối. Lý do: ${comment || 'Không có'}`.slice(0, 500),
      link: '/dashboard',
    });

    this.notifications.notifyDocumentUpdate(updated);
    return updated;
  }

  async resubmit(id: string, userId: string, data?: any) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    const editableStatuses: DocStatus[] = [
      DocStatus.DRAFT,
      DocStatus.PENDING_APPROVAL,
      DocStatus.PENDING_HEAD,
      DocStatus.PENDING_DIRECTOR,
      DocStatus.REJECTED,
    ];
    if (!editableStatuses.includes(doc.status)) {
      throw new BadRequestException(
        'Văn bản đã phê duyệt không thể chỉnh sửa; hãy tạo văn bản thay thế',
      );
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (doc.createdBy !== userId && actor?.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Chỉ người tạo hoặc Admin mới được chỉnh sửa văn bản',
      );
    }

    const isRejected = doc.status === DocStatus.REJECTED;
    const newStatus = isRejected ? this.getInitialStatus(doc.type) : doc.status;
    let normalizedData: Record<string, any> | undefined;
    if (data) {
      const mergedData = mergeDocumentSourceData(
        (doc.data as Record<string, any>) || {},
        data,
      );
      if (doc.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: doc.projectId },
          select: { tenDuAn: true },
        });
        if (project) {
          mergedData.TenDuAn = project.tenDuAn;
          mergedData.tenDuAn = project.tenDuAn;
        }
      }
      normalizedData = prepareWorkflowTemplateData(mergedData);
    }
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: newStatus,
        ...(normalizedData ? { data: normalizedData } : {}),
      },
      include: { creator: { select: { id: true, name: true, email: true, role: true } } },
    });
    await this.prisma.review.create({
      data: {
        documentId: id,
        userId,
        action: isRejected ? 'RESUBMIT' : 'UPDATE_PENDING',
      },
    });

    // Keep reviewers informed when the content they are reviewing changes.
    const approvers = await this.prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { canApprove: true },
        ],
      },
    });
    if (approvers.length > 0) {
      await Promise.all(
        approvers.map((u) =>
          this.notificationService.create(u.id, {
            type: NotificationType.DOC_SUBMITTED,
            title: isRejected
              ? 'Có tài liệu gửi lại duyệt'
              : 'Tài liệu chờ duyệt vừa được cập nhật',
            message: `${updated.creator.name} đã ${
              isRejected ? 'gửi lại' : 'cập nhật'
            } tài liệu "${(updated.data as any)?.TenDuAn || (updated.data as any)?.tenDuAn || ''}" cần bạn duyệt.`,
            link: '/dashboard',
          }),
        ),
      );
    }

    this.notifications.notifyDocumentUpdate(updated);
    return updated;
  }

  async delegate(parentId: string, userId: string, employeeId: string) {
    // Delegation check - any ADMIN can delegate
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Admin mới có thể ủy quyền');
    }
    const approved = await this.prisma.document.findMany({
      where: { parentId, type: DocType.TT_KHLCNT, status: DocStatus.APPROVED },
    });
    if (approved.length === 0) {
      throw new BadRequestException('Tờ trình KHLCNT phải được duyệt trước khi ủy quyền');
    }
    const employee = await this.prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    await this.prisma.review.create({
      data: { documentId: approved[0].id, userId, action: 'DELEGATE', comment: employeeId },
    });
    return { delegated: true, employeeId, employeeName: employee.name };
  }

  async getApprovedDecisions(projectId?: string) {
    const where: any = {
      type: { in: [DocType.QD_DUTOAN, DocType.QD_KHLCNT] },
      status: DocStatus.APPROVED,
    };
    if (projectId) {
      where.projectId = projectId;
    }
    return this.prisma.document.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, type: true, data: true } },
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        reviews: {
          where: { action: { in: ['APPROVE', 'APPROVE_HEAD'] } },
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const docStats = await this.prisma.document.groupBy({
      by: ['type', 'status'],
      _count: { id: true },
    });
    const recentReviews = await this.prisma.review.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        document: { select: { id: true, type: true, status: true } },
      },
    });
    return { docStats, recentReviews };
  }

  async getTemplateFields(type: DocType) {
    switch (type) {
      case DocType.TT_DUTOAN:
      case DocType.QD_DUTOAN:
        return { fields: await getDuToanTemplateFields(type) };
      case DocType.TT_KHLCNT:
      case DocType.QD_KHLCNT:
        return { fields: await getKhlcntTemplateFields(type) };
      default:
        throw new BadRequestException('Loại tài liệu không có mẫu DOCX động');
    }
  }

  async generateDocx(id: string): Promise<Buffer> {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id } });
    const d = doc.data as any;
    let generated: Buffer;
    switch (doc.type) {
      case DocType.TT_DUTOAN:
        generated = await generateDuToanDocx('TT_DUTOAN', d);
        break;
      case DocType.QD_DUTOAN:
        generated = await generateDuToanDocx('QD_DUTOAN', d);
        break;
      case DocType.TT_KHLCNT:
        generated = await generateKhlcntDocx('TT_KHLCNT', d);
        break;
      case DocType.BC_KHLCNT:
        generated = await generateBaoCaoKHLCNT({ ...d, ngayLap: new Date(d.ngayLap) });
        break;
      case DocType.QD_KHLCNT:
        generated = await generateKhlcntDocx('QD_KHLCNT', d);
        break;
      default:
        throw new BadRequestException('Loại tài liệu không hỗ trợ');
    }

    const attachment = d?.khaiToanAttachment ?? d?._khaiToanAttachment;
    if (doc.type === DocType.QD_DUTOAN && attachment?.objectPath) {
      const attachmentBuffer = await this.minio.download(attachment.objectPath);
      generated = await appendDocxAttachment(generated, attachmentBuffer);
    }
    return generated;
  }

  /**
   * Render an unsaved form against the real DOCX template. The browser uses
   * this response for realtime preview, so preview and downloaded documents
   * always share exactly the same renderer and placeholder rules.
   */
  async generatePreviewDocx(
    type: string,
    data: Record<string, any>,
  ): Promise<Buffer> {
    switch (type) {
      case 'COVER_DUTOAN':
        return generateDuToanCoverDocx(data);
      case DocType.TT_DUTOAN:
        return generateDuToanDocx('TT_DUTOAN', data);
      case DocType.QD_DUTOAN:
        return generateDuToanDocx('QD_DUTOAN', data);
      case 'COVER_KHLCNT':
        return generateKhlcntCoverDocx(data);
      case DocType.TT_KHLCNT:
        return generateKhlcntDocx('TT_KHLCNT', data);
      case DocType.QD_KHLCNT:
        return generateKhlcntDocx('QD_KHLCNT', data);
      default:
        throw new BadRequestException(
          'Loại văn bản không hỗ trợ xem trước từ mẫu Word',
        );
    }
  }

  async generateDocumentBundle(id: string): Promise<{
    filename: string;
    files: Array<{ filename: string; buffer: Buffer }>;
  }> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { sourceDocument: true },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu');

    const currentData = (document.data as Record<string, any>) || {};
    const sourceData = (document.sourceDocument?.data as Record<string, any>) || currentData;
    const files: Array<{ filename: string; buffer: Buffer }> = [];

    if ([DocType.TT_DUTOAN, DocType.QD_DUTOAN].includes(document.type as any)) {
      files.push({
        filename: '0. Phiếu trình ký phê duyệt dự toán.docx',
        buffer: await generateDuToanCoverDocx(sourceData),
      });
      files.push({
        filename: '1. Tờ trình phê duyệt dự toán.docx',
        buffer: await generateDuToanDocx('TT_DUTOAN', sourceData),
      });
      if (document.type === DocType.QD_DUTOAN) {
        files.push({
          filename: '2. Quyết định phê duyệt dự toán.docx',
          buffer: await this.generateDocx(id),
        });
      }
      return {
        filename: `Hồ sơ Dự toán - ${currentData.TenDuAn || sourceData.TenDuAn || 'du-an'}.zip`,
        files,
      };
    }

    if ([DocType.TT_KHLCNT, DocType.QD_KHLCNT].includes(document.type as any)) {
      files.push({
        filename: '1. Phiếu trình ký phê duyệt KHLCNT.docx',
        buffer: await generateKhlcntCoverDocx(sourceData),
      });
      files.push({
        filename: '2. Tờ trình phê duyệt KHLCNT.docx',
        buffer: await generateKhlcntDocx('TT_KHLCNT', sourceData),
      });
      if (document.type === DocType.QD_KHLCNT) {
        files.push({
          filename: '3. Quyết định phê duyệt KHLCNT.docx',
          buffer: await this.generateDocx(id),
        });
      }
      return {
        filename: `Hồ sơ KHLCNT - ${currentData.TenDuAn || sourceData.TenDuAn || 'du-an'}.zip`,
        files,
      };
    }

    return {
      filename: `${this.getDocFilename(document.type, currentData)}.zip`,
      files: [{
        filename: `${this.getDocFilename(document.type, currentData)}.docx`,
        buffer: await this.generateDocx(id),
      }],
    };
  }

  async generateCoverDocx(id: string): Promise<{
    filename: string;
    buffer: Buffer;
  }> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { sourceDocument: true },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu');

    const currentData = (document.data as Record<string, any>) || {};
    const sourceData =
      (document.sourceDocument?.data as Record<string, any>) || currentData;

    if (
      [DocType.TT_DUTOAN, DocType.QD_DUTOAN].includes(document.type as any)
    ) {
      return {
        filename: 'Phiếu trình ký phê duyệt dự toán.docx',
        buffer: await generateDuToanCoverDocx(sourceData),
      };
    }
    if (
      [DocType.TT_KHLCNT, DocType.QD_KHLCNT].includes(document.type as any)
    ) {
      return {
        filename: 'Phiếu trình ký phê duyệt KHLCNT.docx',
        buffer: await generateKhlcntCoverDocx(sourceData),
      };
    }
    throw new BadRequestException(
      'Loại văn bản này không có mẫu Phiếu trình ký',
    );
  }

  async uploadKhaiToanAttachment(
    id: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu');
    if (!([DocType.TT_DUTOAN, DocType.QD_DUTOAN] as DocType[]).includes(document.type)) {
      throw new BadRequestException('File khái toán chỉ áp dụng cho hồ sơ Dự toán');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (document.createdBy !== userId && user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thay file khái toán của tài liệu này');
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.docx') {
      throw new BadRequestException('Phụ lục khái toán phải là file DOCX để nối vào Quyết định');
    }
    try {
      await validateDocxAttachmentForMerge(file.buffer);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'File khái toán không phải là DOCX hợp lệ',
      );
    }
    const safeName = file.originalname
      .normalize('NFKD')
      .replace(/[^\w.\-]+/g, '-')
      .replace(/-+/g, '-');
    const objectPath = `documents/${id}/khai-toan/${Date.now()}-${safeName}`;
    await this.minio.upload(
      objectPath,
      file.buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    const attachment = {
      objectPath,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    const currentData = (document.data as Record<string, any>) || {};
    const previousAttachment = currentData.khaiToanAttachment ?? currentData._khaiToanAttachment;
    let updated;
    try {
      updated = await this.prisma.document.update({
        where: { id },
        data: {
          data: {
            ...currentData,
            khaiToanAttachment: attachment,
            FileKhaiToanDinhKem: file.originalname,
          },
        },
      });
    } catch (error) {
      await this.minio.delete(objectPath).catch(() => undefined);
      throw error;
    }
    if (
      previousAttachment?.objectPath
      && previousAttachment.objectPath !== objectPath
    ) {
      await this.minio.delete(previousAttachment.objectPath).catch(() => undefined);
    }
    return { attachment, document: updated };
  }

  async getKhaiToanAttachmentUrl(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu');
    const data = (document.data as Record<string, any>) || {};
    const attachment = data.khaiToanAttachment ?? data._khaiToanAttachment;
    if (!attachment?.objectPath) throw new NotFoundException('Chưa có file khái toán');
    if (
      document.createdBy !== userId
      && document.assignedTo !== userId
    ) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, canApprove: true },
      });
      if (user?.role !== Role.ADMIN && user?.canApprove !== true) {
        throw new ForbiddenException('Bạn không có quyền xem file này');
      }
    }
    return {
      attachment,
      url: await this.minio.getPresignedUrl(attachment.objectPath),
    };
  }

  getDocFilename(type: DocType, data: any): string {
    const name = data?.TenGoiThau || data?.TenDuAn || data?.ChuDauTu || data?.tenDuAn || data?.tenChuDauTu || 'tai-lieu';
    switch (type) {
      case DocType.TT_DUTOAN: return `Tờ trình phê duyệt dự toán - ${name}`;
      case DocType.QD_DUTOAN: return `Quyết định phê duyệt dự toán - ${name}`;
      case DocType.TT_KHLCNT: return `Tờ trình KHLCNT - ${name}`;
      case DocType.BC_KHLCNT: return `Báo cáo thẩm định KHLCNT - ${name}`;
      case DocType.QD_KHLCNT: return `Quyết định phê duyệt KHLCNT - ${name}`;
      default: return `document-${name}`;
    }
  }

  async getOnlyofficeConfig(id: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id } });
    const data = doc.data as any;

    const downloadToken = this.jwtService.sign(
      { docId: id, purpose: 'download' },
      { expiresIn: '1h' },
    );

    const appUrl = process.env.APP_URL || 'http://demo.jtsc.vn';
    const onlyofficeUrl = process.env.ONLYOFFICE_URL || 'https://jtsconlyoffice.duckdns.org';
    const onlyofficeSecret = process.env.ONLYOFFICE_JWT_SECRET || '10122002';

    const filename = this.getDocFilename(doc.type, data);
    const docKey = `${id}_${Date.now()}`;

    const editorConfig: any = {
      document: {
        fileType: 'docx',
        key: docKey,
        title: `${filename}.docx`,
        url: `${appUrl}/api/documents/${id}/download-public?token=${downloadToken}`,
      },
      documentType: 'word',
      editorConfig: {
        mode: 'view',
        lang: 'vi',
      },
    };

    const token = this.jwtService.sign(editorConfig, {
      secret: onlyofficeSecret,
      expiresIn: '1h',
    });

    return { onlyofficeUrl, editorConfig: { ...editorConfig, token } };
  }

  verifyDownloadToken(token: string, expectedDocId: string): void {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.docId !== expectedDocId || payload.purpose !== 'download') {
        throw new ForbiddenException('Token không hợp lệ');
      }
    } catch {
      throw new ForbiddenException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}

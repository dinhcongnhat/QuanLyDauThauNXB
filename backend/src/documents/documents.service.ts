import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { DocType, DocStatus, Role, ProcurementType } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '@prisma/client';
import { generateToTrinhKHLCNT, generateBaoCaoKHLCNT, generateQuyetDinhKHLCNT } from './docx-generator';
import { generateDuToanDocx } from './dutoan-docx-generator';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private notificationService: NotificationService,
    private jwtService: JwtService,
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
  ) {
    // If parentId is provided and projectId is not, inherit from parent document
    if (parentId && !projectId) {
      const parent = await this.prisma.document.findUnique({ where: { id: parentId } });
      if (parent && parent.projectId) {
        projectId = parent.projectId;
      }
    }

    // Validate project exists if provided
    let projectType: ProcurementType | null = null;
    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundException('Không tìm thấy dự án');
      projectType = project.procurementType;
    }

    // KHLCNT docs need an approved QD_DUTOAN parent
    if (([DocType.TT_KHLCNT, DocType.BC_KHLCNT, DocType.QD_KHLCNT] as DocType[]).includes(type)) {
      if (!parentId) throw new BadRequestException('Phải chọn quyết định dự toán đã duyệt');
      const parent = await this.prisma.document.findUnique({ where: { id: parentId } });
      if (!parent || parent.type !== DocType.QD_DUTOAN || parent.status !== DocStatus.APPROVED) {
        throw new BadRequestException('Quyết định dự toán chưa được phê duyệt');
      }
    }

    const status = this.getInitialStatus(type);
    const doc = await this.prisma.document.create({
      data: {
        type,
        status,
        data,
        parentId,
        createdBy: userId,
        projectId,
        procurementType: projectType,
        ...(assignedTo ? { assignedTo } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, type: true, status: true } },
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
              message: `${doc.creator.name} đã gửi ${docTypeLabels[type] || 'tài liệu'} "${(doc.data as any)?.tenDuAn || ''}" chờ bạn phê duyệt.`,
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
          data: ttData,
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
          data: qdData,
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
  ) {
    const where: any = { type: { in: types } };

    // Filter by project
    if (projectId) {
      where.projectId = projectId;
    }

    if (role === 'USER') {
      where.createdBy = userId;
    }

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
          parent: { select: { id: true, type: true, data: true, status: true } },
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
    if (doc.status !== DocStatus.REJECTED) throw new BadRequestException('Chỉ tài liệu bị từ chối mới được gửi lại');
    if (doc.createdBy !== userId) throw new ForbiddenException('Chỉ người tạo mới được gửi lại');

    // Get original status based on document type
    const newStatus = this.getInitialStatus(doc.type);
    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: newStatus, ...(data ? { data } : {}) },
      include: { creator: { select: { id: true, name: true, email: true, role: true } } },
    });
    await this.prisma.review.create({
      data: { documentId: id, userId, action: 'RESUBMIT' },
    });

    // Notify approvers about resubmission
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
            title: 'Có tài liệu gửi lại duyệt',
            message: `${updated.creator.name} đã gửi lại tài liệu "${(updated.data as any)?.tenDuAn || ''}" cần bạn duyệt.`,
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

  async generateDocx(id: string): Promise<Buffer> {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id } });
    const d = doc.data as any;
    switch (doc.type) {
      case DocType.TT_DUTOAN:
        return generateDuToanDocx('TT_DUTOAN', d);
      case DocType.QD_DUTOAN:
        return generateDuToanDocx('QD_DUTOAN', d);
      case DocType.TT_KHLCNT:
        return generateToTrinhKHLCNT({ ...d, ngayLap: new Date(d.ngayLap) });
      case DocType.BC_KHLCNT:
        return generateBaoCaoKHLCNT({ ...d, ngayLap: new Date(d.ngayLap) });
      case DocType.QD_KHLCNT:
        return generateQuyetDinhKHLCNT({ ...d, ngayBanHanh: new Date(d.ngayBanHanh) });
      default:
        throw new BadRequestException('Loại tài liệu không hỗ trợ');
    }
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

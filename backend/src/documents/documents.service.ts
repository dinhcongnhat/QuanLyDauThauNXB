import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { DocType, DocStatus, Role } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { generateToTrinhKHLCNT, generateBaoCaoKHLCNT, generateQuyetDinhKHLCNT } from './docx-generator';
import { generateDuToanDocx } from './dutoan-docx-generator';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private jwtService: JwtService,
  ) {}

  private getInitialStatus(type: DocType, createdByRole: Role): DocStatus {
    if (type === DocType.TT_DUTOAN || type === DocType.QD_DUTOAN) {
      return DocStatus.PENDING_DIRECTOR;
    }
    if (type === DocType.TT_KHLCNT || type === DocType.BC_KHLCNT) {
      return DocStatus.PENDING_HEAD;
    }
    if (type === DocType.QD_KHLCNT) {
      return DocStatus.PENDING_DIRECTOR;
    }
    return DocStatus.DRAFT;
  }

  async create(userId: string, userRole: Role, type: DocType, data: any, parentId?: string, assignedTo?: string) {
    // KHLCNT docs need an approved QD_DUTOAN parent
    if (([DocType.TT_KHLCNT, DocType.BC_KHLCNT, DocType.QD_KHLCNT] as DocType[]).includes(type)) {
      if (!parentId) throw new BadRequestException('Phải chọn quyết định dự toán đã duyệt');
      const parent = await this.prisma.document.findUnique({ where: { id: parentId } });
      if (!parent || parent.type !== DocType.QD_DUTOAN || parent.status !== DocStatus.APPROVED) {
        throw new BadRequestException('Quyết định dự toán chưa được phê duyệt');
      }
    }

    // QD_KHLCNT: only creatable after TT approved
    if (type === DocType.QD_KHLCNT) {
      const approved = await this.prisma.document.findMany({
        where: { parentId, type: DocType.TT_KHLCNT, status: DocStatus.APPROVED },
      });
      if (approved.length === 0) {
        throw new BadRequestException('Tờ trình KHLCNT phải được duyệt trước');
      }
      // If INVESTOR creates, must be delegated
      if (userRole === Role.INVESTOR) {
        const delegation = await this.prisma.review.findFirst({
          where: { document: { parentId, type: DocType.TT_KHLCNT }, action: 'DELEGATE' },
          orderBy: { createdAt: 'desc' },
        });
        if (!delegation || delegation.comment !== userId) {
          throw new ForbiddenException('Bạn chưa được ủy quyền tạo Quyết định KHLCNT');
        }
      }
    }

    const status = this.getInitialStatus(type, userRole);
    const doc = await this.prisma.document.create({
      data: {
        type, status, data, parentId, createdBy: userId,
        ...(assignedTo ? { assignedTo } : {}),
        ...(type === DocType.QD_KHLCNT && userRole === Role.INVESTOR ? { delegatedTo: userId } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, type: true, status: true } },
      },
    });

    await this.prisma.review.create({
      data: { documentId: doc.id, userId, action: 'SUBMIT' },
    });

    this.notifications.notifyDocumentUpdate(doc);
    return doc;
  }

  async createDuToanBatch(userId: string, userRole: Role, ttData: any, qdData: any, assignedTo: string) {
    const status = DocStatus.PENDING_DIRECTOR;

    const [ttDoc, qdDoc] = await this.prisma.$transaction(async (tx) => {
      const tt = await tx.document.create({
        data: { type: DocType.TT_DUTOAN, status, data: ttData, createdBy: userId, assignedTo },
        include: { creator: { select: { id: true, name: true, email: true, role: true } } },
      });
      await tx.review.create({ data: { documentId: tt.id, userId, action: 'SUBMIT' } });

      const qd = await tx.document.create({
        data: { type: DocType.QD_DUTOAN, status, data: qdData, createdBy: userId, assignedTo },
        include: { creator: { select: { id: true, name: true, email: true, role: true } } },
      });
      await tx.review.create({ data: { documentId: qd.id, userId, action: 'SUBMIT' } });

      return [tt, qd];
    });

    this.notifications.notifyDocumentUpdate(ttDoc);
    this.notifications.notifyDocumentUpdate(qdDoc);
    return { ttDoc, qdDoc };
  }

  async findByType(types: DocType[], userId?: string, role?: Role) {
    const where: any = { type: { in: types } };
    if (role === Role.INVESTOR) {
      where.createdBy = userId;
    } else if (role === Role.DIRECTOR) {
      where.OR = [
        { assignedTo: userId },
        { assignedTo: null },
        { createdBy: userId },
        { status: DocStatus.APPROVED },
      ];
    } else if (role === Role.HEAD_OF_DEPARTMENT) {
      where.OR = [
        { assignedTo: userId },
        { assignedTo: null },
        { createdBy: userId },
        { status: DocStatus.APPROVED },
      ];
    }
    return this.prisma.document.findMany({
      where,
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

  async approve(id: string, userId: string, role: Role, comment?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');

    if (doc.status === DocStatus.PENDING_DIRECTOR) {
      if (role !== Role.DIRECTOR && role !== Role.ADMIN) {
        throw new ForbiddenException('Chỉ Giám đốc mới có thể phê duyệt');
      }
    } else if (doc.status === DocStatus.PENDING_HEAD) {
      if (role !== Role.HEAD_OF_DEPARTMENT && role !== Role.ADMIN) {
        throw new ForbiddenException('Chỉ Trưởng phòng mới có thể phê duyệt');
      }
      // QD_KHLCNT from employee: head approves → moves to director
      if (doc.type === DocType.QD_KHLCNT) {
        const updated = await this.prisma.document.update({
          where: { id },
          data: { status: DocStatus.PENDING_DIRECTOR },
          include: { creator: { select: { id: true, name: true, email: true, role: true } } },
        });
        await this.prisma.review.create({
          data: { documentId: id, userId, action: 'APPROVE_HEAD', comment },
        });
        this.notifications.notifyDocumentUpdate(updated);
        return updated;
      }
    } else {
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
    this.notifications.notifyDocumentUpdate(updated);
    return updated;
  }

  async reject(id: string, userId: string, role: Role, comment: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');

    if (doc.status === DocStatus.PENDING_DIRECTOR && role !== Role.DIRECTOR && role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ Giám đốc mới có thể từ chối');
    }
    if (doc.status === DocStatus.PENDING_HEAD && role !== Role.HEAD_OF_DEPARTMENT && role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ Trưởng phòng mới có thể từ chối');
    }
    if (doc.status !== DocStatus.PENDING_DIRECTOR && doc.status !== DocStatus.PENDING_HEAD) {
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
    this.notifications.notifyDocumentUpdate(updated);
    return updated;
  }

  async resubmit(id: string, userId: string, role: Role, data?: any) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (doc.status !== DocStatus.REJECTED) throw new BadRequestException('Chỉ tài liệu bị từ chối mới được gửi lại');
    if (doc.createdBy !== userId) throw new ForbiddenException('Chỉ người tạo mới được gửi lại');

    const newStatus = this.getInitialStatus(doc.type, role);
    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: newStatus, ...(data ? { data } : {}) },
      include: { creator: { select: { id: true, name: true, email: true, role: true } } },
    });
    await this.prisma.review.create({
      data: { documentId: id, userId, action: 'RESUBMIT' },
    });
    this.notifications.notifyDocumentUpdate(updated);
    return updated;
  }

  async delegate(parentId: string, userId: string, role: Role, employeeId: string) {
    if (role !== Role.HEAD_OF_DEPARTMENT && role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ Trưởng phòng mới có thể ủy quyền');
    }
    const approved = await this.prisma.document.findMany({
      where: { parentId, type: DocType.TT_KHLCNT, status: DocStatus.APPROVED },
    });
    if (approved.length === 0) {
      throw new BadRequestException('Tờ trình KHLCNT phải được duyệt trước khi ủy quyền');
    }
    // Verify employee exists
    const employee = await this.prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    await this.prisma.review.create({
      data: { documentId: approved[0].id, userId, action: 'DELEGATE', comment: employeeId },
    });
    return { delegated: true, employeeId, employeeName: employee.name };
  }

  async getApprovedDecisions() {
    return this.prisma.document.findMany({
      where: {
        type: { in: [DocType.QD_DUTOAN, DocType.QD_KHLCNT] },
        status: DocStatus.APPROVED,
      },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, type: true, data: true } },
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

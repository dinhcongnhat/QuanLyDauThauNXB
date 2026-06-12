import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementType, ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(
    tenDuAn: string,
    procurementType: ProcurementType,
    createdBy: string,
    memberIds?: string[],
  ) {
    const project = await this.prisma.project.create({
      data: { tenDuAn, procurementType, createdBy },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Auto-add creator as OWNER
    await this.prisma.projectMember.create({
      data: { projectId: project.id, userId: createdBy, role: 'OWNER', addedBy: createdBy },
    });

    // Add additional members
    if (memberIds?.length) {
      const uniqueIds = [...new Set(memberIds.filter(id => id !== createdBy))];
      if (uniqueIds.length) {
        await this.prisma.projectMember.createMany({
          data: uniqueIds.map(userId => ({
            projectId: project.id, userId, role: 'MEMBER', addedBy: createdBy,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(project.id);
  }

  async findAll(userId?: string, role?: string, page: number = 1, limit: number = 20) {
    const where: any = {};

    // ADMIN sees all, other users only see projects they are members of
    if (role !== 'ADMIN' && userId) {
      where.members = { some: { userId } };
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true, role: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true, department: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: {
              documents: true,
              contractorSelections: true,
              payments: true,
              datSachProjects: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      projects,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          include: {
            creator: { select: { id: true, name: true } },
            reviews: {
              include: { user: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        datSachProjects: {
          include: {
            gdnDocuments: true,
            pcdiDocuments: true,
          },
        },
        contractorSelections: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            creator: { select: { id: true, name: true } },
          },
        },
        payments: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            contractorSelection: { select: { id: true, tenGoiThau: true } },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return project;
  }

  async update(id: string, data: { status?: ProjectStatus; tenDuAn?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    return this.prisma.project.update({
      where: { id },
      data,
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async getProjectSummary(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        datSachProjects: {
          include: {
            gdnDocuments: true,
            pcdiDocuments: true,
          },
        },
        documents: {
          include: {
            reviews: {
              include: { user: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        contractorSelections: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        payments: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            contractorSelection: { select: { id: true, tenGoiThau: true } },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    const procurementType = project.procurementType;
    const isThauSach = procurementType === 'THAU_SACH';
    const isThauThietBi = procurementType === 'THAU_THIET_BI';

    // Step 1: Đặt sách (Thầu Sách only)
    const datSachProjects = project.datSachProjects;
    // A dat-sach project is completed when its review has been approved (reviewStatus === 'APPROVED')
    const datSachCompleted = datSachProjects.some(p => p.reviewStatus === 'APPROVED');
    const datSachProgress = datSachProjects.length > 0
      ? Math.round((datSachProjects.filter(p => p.reviewStatus === 'APPROVED').length / datSachProjects.length) * 100)
      : 0;

    // Step 2: Phê duyệt Dự toán
    const duToanDocs = project.documents.filter(d =>
      d.type === 'TT_DUTOAN' || d.type === 'QD_DUTOAN',
    );
    const duToanApproved = duToanDocs.some(d => d.status === 'APPROVED' && d.type === 'QD_DUTOAN');
    const duToanProgress = duToanDocs.length > 0
      ? Math.round((duToanDocs.filter(d => d.status === 'APPROVED').length / duToanDocs.length) * 100)
      : 0;

    // Step 3: Phê duyệt KHLCNT
    const khlcntDocs = project.documents.filter(d =>
      d.type === 'TT_KHLCNT' || d.type === 'BC_KHLCNT' || d.type === 'QD_KHLCNT',
    );
    const khlcntApproved = khlcntDocs.some(d => d.status === 'APPROVED' && d.type === 'QD_KHLCNT');
    const khlcntProgress = khlcntDocs.length > 0
      ? Math.round((khlcntDocs.filter(d => d.status === 'APPROVED').length / khlcntDocs.length) * 100)
      : 0;

    // Step 4: Lựa chọn Nhà thầu
    const lcntProcesses = project.contractorSelections;
    const lcntCompleted = lcntProcesses.filter(lc =>
      lc.steps.some(s => s.stepKey === 'hop_dong' && s.status === 'COMPLETED'),
    );
    const lcntProgress = lcntProcesses.length > 0
      ? Math.round((lcntCompleted.length / lcntProcesses.length) * 100)
      : 0;

    // Step 5: Thanh toán
    const payments = project.payments;
    const paymentsCompleted = payments.filter(p =>
      p.steps.every(s => s.status === 'COMPLETED'),
    );
    const paymentProgress = payments.length > 0
      ? Math.round((paymentsCompleted.length / payments.length) * 100)
      : 0;

    // Build sequential steps based on procurement type
    const steps: Array<{
      key: string;
      label: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      progress: number;
      count: number;
      total: number;
    }> = [];

    if (isThauSach) {
      steps.push({
        key: 'dat_sach',
        label: 'Đặt sách',
        status: datSachCompleted ? 'COMPLETED' : datSachProjects.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        progress: datSachProgress,
        count: datSachProjects.filter(p => p.reviewStatus === 'APPROVED').length,
        total: datSachProjects.length,
      });
    }

    steps.push({
      key: 'du_toan',
      label: 'Phê duyệt Dự toán',
      status: duToanApproved ? 'COMPLETED' : duToanDocs.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      progress: duToanProgress,
      count: duToanDocs.filter(d => d.status === 'APPROVED').length,
      total: duToanDocs.length,
    });

    steps.push({
      key: 'khlcnt',
      label: 'Phê duyệt KHLCNT',
      status: khlcntApproved ? 'COMPLETED' : khlcntDocs.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      progress: khlcntProgress,
      count: khlcntDocs.filter(d => d.status === 'APPROVED').length,
      total: khlcntDocs.length,
    });

    steps.push({
      key: 'lcnt',
      label: 'Lựa chọn Nhà thầu',
      status: lcntCompleted.length > 0 ? 'COMPLETED' : lcntProcesses.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      progress: lcntProgress,
      count: lcntCompleted.length,
      total: lcntProcesses.length,
    });

    steps.push({
      key: 'thanh_toan',
      label: 'Thanh toán',
      status: paymentsCompleted.length > 0 && payments.length > 0 ? 'COMPLETED' : payments.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      progress: paymentProgress,
      count: paymentsCompleted.length,
      total: payments.length,
    });

    // Calculate overall progress
    const completedSteps = steps.filter(s => s.status === 'COMPLETED').length;
    const overallProgress = Math.round((completedSteps / steps.length) * 100);

    return {
      id: project.id,
      tenDuAn: project.tenDuAn,
      procurementType: project.procurementType,
      status: project.status,
      createdAt: project.createdAt,
      overallProgress,
      totalSteps: steps.length,
      completedSteps,
      steps,
      datSachProjects,
      stats: {
        totalDocuments: project.documents.length,
        totalGoiThau: lcntProcesses.length,
        totalPayments: payments.length,
        datSachProjects: datSachProjects.length,
      },
    };
  }

  async getStats() {
    // Use groupBy for a single query instead of 4 separate count queries
    const stats = await this.prisma.project.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    let total = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    for (const s of stats) {
      total += s._count.id;
      if (s.status === 'IN_PROGRESS') inProgress = s._count.id;
      else if (s.status === 'COMPLETED') completed = s._count.id;
      else if (s.status === 'CANCELLED') cancelled = s._count.id;
    }

    return { total, inProgress, completed, cancelled };
  }

  async delete(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    // Check for related data
    const hasRelated = await Promise.all([
      this.prisma.document.count({ where: { projectId: id } }),
      this.prisma.contractorSelection.count({ where: { projectId: id } }),
      this.prisma.payment.count({ where: { projectId: id } }),
      this.prisma.datSachProject.count({ where: { projectId: id } }),
    ]);

    if (hasRelated.some(c => c > 0)) {
      throw new BadRequestException(
        'Dự án có dữ liệu liên quan. Vui lòng xóa dữ liệu liên quan trước.',
      );
    }

    return this.prisma.project.delete({ where: { id } });
  }

  async getLogs(projectId: string, stepKey?: string) {
    const where: any = { projectId };
    if (stepKey) {
      where.stepKey = stepKey;
    }
    return this.prisma.projectLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLog(projectId: string, stepKey: string, action: string, message: string, userId: string, data?: any) {
    return this.prisma.projectLog.create({
      data: {
        projectId,
        stepKey,
        action,
        message,
        userId,
        data: data || {},
      },
    });
  }

  // ── Project Members ────────────────────────────────────────

  async getMembers(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true, position: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(projectId: string, userId: string, addedBy: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Check if already a member
    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) throw new BadRequestException('Người dùng đã là thành viên của dự án');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId, role: 'MEMBER', addedBy },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true, position: true } },
      },
    });

    return member;
  }

  async removeMember(projectId: string, userId: string, requesterId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Người dùng không phải thành viên dự án');
    if (member.role === 'OWNER') throw new BadRequestException('Không thể xóa chủ dự án');

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    return { success: true };
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }
}

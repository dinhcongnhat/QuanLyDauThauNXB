import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementType, ProjectStatus } from '@prisma/client';
import { EffectivePermissionsService } from '../auth/effective-permissions.service';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private effectivePermissions: EffectivePermissionsService,
  ) {}

  async create(
    tenDuAn: string,
    procurementType: ProcurementType,
    createdBy: string,
    memberIds?: string[],
  ) {
    await this.assertCanCreate(createdBy);
    const normalizedName = tenDuAn.trim();
    if (!normalizedName) throw new BadRequestException('Tên dự án không được để trống');
    const uniqueIds = [...new Set((memberIds || []).filter(id => id !== createdBy))];
    if (uniqueIds.length) {
      const validUsers = await this.prisma.user.count({ where: { id: { in: uniqueIds } } });
      if (validUsers !== uniqueIds.length) {
        throw new BadRequestException('Danh sách thành viên có tài khoản không hợp lệ');
      }
    }
    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: { tenDuAn: normalizedName, procurementType, createdBy },
      });
      await tx.projectMember.create({
        data: { projectId: created.id, userId: createdBy, role: 'OWNER', addedBy: createdBy },
      });
      if (uniqueIds.length) {
        await tx.projectMember.createMany({
          data: uniqueIds.map(userId => ({
            projectId: created.id, userId, role: 'MEMBER', addedBy: createdBy,
          })),
        });
      }
      return created;
    });
    return this.getProjectDetails(project.id);
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

  async findOne(id: string, userId: string, role?: string) {
    await this.assertCanRead(id, userId, role);
    return this.getProjectDetails(id);
  }

  private async getProjectDetails(id: string) {
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

  async update(
    id: string,
    data: { status?: ProjectStatus; tenDuAn?: string; memberIds?: string[] },
    requesterId: string,
    requesterRole?: string,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    await this.assertOwnerOrAdmin(id, requesterId, requesterRole);
    const tenDuAn = data.tenDuAn?.trim();
    if (data.tenDuAn !== undefined && !tenDuAn) {
      throw new BadRequestException('Tên dự án không được để trống');
    }
    const owner = await this.prisma.projectMember.findFirst({
      where: { projectId: id, role: 'OWNER' },
    });
    if (!owner) throw new ConflictException('Dự án chưa có chủ sở hữu');
    const requestedIds =
      data.memberIds === undefined
        ? null
        : [...new Set([...data.memberIds, owner.userId])];
    if (requestedIds) {
      const validUsers = await this.prisma.user.count({
        where: { id: { in: requestedIds } },
      });
      if (validUsers !== requestedIds.length) {
        throw new BadRequestException('Danh sách thành viên có tài khoản không hợp lệ');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          ...(tenDuAn !== undefined ? { tenDuAn } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });
      if (requestedIds) {
        await tx.projectMember.deleteMany({
          where: {
            projectId: id,
            role: { not: 'OWNER' },
            userId: { notIn: requestedIds },
          },
        });
        const existing = await tx.projectMember.findMany({
          where: { projectId: id },
          select: { userId: true },
        });
        const existingIds = new Set(existing.map(member => member.userId));
        const additions = requestedIds.filter(userId => !existingIds.has(userId));
        if (additions.length) {
          await tx.projectMember.createMany({
            data: additions.map(userId => ({
              projectId: id,
              userId,
              role: 'MEMBER',
              addedBy: requesterId,
            })),
          });
        }
      }
    });
    return this.getProjectDetails(id);
  }

  async getProjectSummary(id: string, userId: string, role?: string) {
    await this.assertCanRead(id, userId, role);
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

  async getStats(userId: string, role?: string) {
    // Use groupBy for a single query instead of 4 separate count queries
    const stats = await this.prisma.project.groupBy({
      where: role === 'ADMIN' ? {} : { members: { some: { userId } } },
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

  async delete(id: string, requesterId: string, requesterRole?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    await this.assertOwnerOrAdmin(id, requesterId, requesterRole);

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

  async getLogs(projectId: string, userId: string, role?: string, stepKey?: string) {
    await this.assertCanRead(projectId, userId, role);
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

  async getMembers(projectId: string, userId: string, role?: string) {
    await this.assertCanRead(projectId, userId, role);
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
    const requester = await this.prisma.user.findUnique({
      where: { id: addedBy },
      select: { role: true },
    });
    await this.assertOwnerOrAdmin(projectId, addedBy, requester?.role);

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
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    await this.assertOwnerOrAdmin(projectId, requesterId, requester?.role);

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

  private async assertCanCreate(userId: string) {
    const [resolved, user] = await Promise.all([
      this.effectivePermissions.resolve(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { isInvestor: true },
      }),
    ]);
    if (
      resolved.user.role !== 'ADMIN' &&
      !user?.isInvestor &&
      !resolved.effectivePermissions.includes('feature:projects')
    ) {
      throw new ForbiddenException('Bạn không có quyền quản lý dự án');
    }
  }

  private async assertCanRead(projectId: string, userId: string, role?: string) {
    if (role === 'ADMIN') return;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của dự án');
    }
  }

  private async assertOwnerOrAdmin(
    projectId: string,
    userId: string,
    role?: string,
  ) {
    if (role === 'ADMIN') return;
    const owner = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (owner?.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ chủ dự án hoặc Admin được thực hiện thao tác này');
    }
  }
}

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
  ) {
    return this.prisma.project.create({
      data: { tenDuAn, procurementType, createdBy },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async findAll(userId?: string, role?: string) {
    const where: any = {};

    if (role === 'ADMIN' || !role) {
      // Admin sees all
    } else if (role === 'INVESTOR') {
      where.createdBy = userId;
    }

    return this.prisma.project.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
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
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
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
    const [total, inProgress, completed, cancelled] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.project.count({ where: { status: 'COMPLETED' } }),
      this.prisma.project.count({ where: { status: 'CANCELLED' } }),
    ]);
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
}

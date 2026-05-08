import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementType } from '@prisma/client';

@Injectable()
export class DatSachService {
  constructor(private prisma: PrismaService) {}

  async createProject(
    parentId: string,
    tenDuAn: string,
    procurementType: ProcurementType,
    createdBy: string,
  ) {
    return this.prisma.datSachProject.create({
      data: { parentId, tenDuAn, procurementType, createdBy },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async getProject(id: string) {
    const project = await this.prisma.datSachProject.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        gdnDocuments: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignments: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        pcdiDocuments: {
          include: { creator: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return project;
  }

  async getProjectsByParent(parentId: string) {
    return this.prisma.datSachProject.findMany({
      where: { parentId },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        gdnDocuments: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignments: true,
          },
        },
        pcdiDocuments: {
          include: { creator: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── GDN In Sách ────────────────────────────────────────────

  async createGDNInSach(projectId: string, data: any, createdBy: string) {
    const project = await this.prisma.datSachProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return this.prisma.gDNInSach.create({
      data: { datSachProjectId: projectId, data, createdBy, status: 'DRAFT' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async updateGDNInSach(id: string, data: any) {
    const existing = await this.prisma.gDNInSach.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy GDN');
    return this.prisma.gDNInSach.update({
      where: { id },
      data: { data: { ...(existing.data as object), ...data } },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async assignUsersForSL(gdnId: string, userIds: string[], assignedBy: string) {
    const existing = await this.prisma.gDNInSach.findUnique({ where: { id: gdnId } });
    if (!existing) throw new NotFoundException('Không tìm thấy GDN');

    await this.prisma.gDNAssignment.deleteMany({ where: { gdnInSachId: gdnId } });

    const assignments = await Promise.all(
      userIds.map((userId) =>
        this.prisma.gDNAssignment.create({
          data: { gdnInSachId: gdnId, userId, assignedBy },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
      ),
    );

    await this.prisma.gDNInSach.update({
      where: { id: gdnId },
      data: { status: 'ASSIGNED' },
    });

    return assignments;
  }

  async fillSL(gdnId: string, userId: string, soLuong: number) {
    const assignment = await this.prisma.gDNAssignment.findUnique({
      where: { gdnInSachId_userId: { gdnInSachId: gdnId, userId } },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy assignment');
    return this.prisma.gDNAssignment.update({
      where: { gdnInSachId_userId: { gdnInSachId: gdnId, userId } },
      data: {
        soLuong,
        completedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async getMyAssignments(userId: string) {
    const assignments = await this.prisma.gDNAssignment.findMany({
      where: { userId },
      include: {
        gdnInSach: {
          include: {
            datSachProject: {
              include: { creator: { select: { id: true, name: true, email: true } } },
            },
            creator: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    return assignments;
  }

  async approveGDN(gdnId: string) {
    const gdn = await this.prisma.gDNInSach.findUnique({
      where: { id: gdnId },
      include: { assignments: true },
    });
    if (!gdn) throw new NotFoundException('Không tìm thấy GDN');
    return this.prisma.gDNInSach.update({
      where: { id: gdnId },
      data: { status: 'APPROVED' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  // ─── PCDI Cơ Sở In ─────────────────────────────────────────

  async createPCDI(projectId: string, data: any, createdBy: string) {
    const project = await this.prisma.datSachProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return this.prisma.pCDICoSoIn.create({
      data: { datSachProjectId: projectId, data, createdBy, status: 'DRAFT' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updatePCDI(id: string, data: any) {
    const existing = await this.prisma.pCDICoSoIn.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy PCDI');
    return this.prisma.pCDICoSoIn.update({
      where: { id },
      data: { data: { ...(existing.data as object), ...data } },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async approvePCDI(pcdiId: string) {
    const pcdi = await this.prisma.pCDICoSoIn.findUnique({ where: { id: pcdiId } });
    if (!pcdi) throw new NotFoundException('Không tìm thấy PCDI');
    return this.prisma.pCDICoSoIn.update({
      where: { id: pcdiId },
      data: { status: 'APPROVED' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async markProjectCompleted(projectId: string) {
    return this.prisma.datSachProject.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });
  }

  // ─── Generate Quyết Định ────────────────────────────────────
  async getProjectForGenerate(projectId: string) {
    const project = await this.prisma.datSachProject.findUnique({
      where: { id: projectId },
      include: {
        gdnDocuments: {
          where: { status: 'APPROVED' },
          include: {
            assignments: true,
          },
        },
        pcdiDocuments: {
          where: { status: 'APPROVED' },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return project;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LibraryType, FieldType } from '@prisma/client';

@Injectable()
export class DocumentLibraryService {
  constructor(private prisma: PrismaService) {}

  // ── Organization ──────────────────────────────────────────────

  async findAllOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        libraries: {
          include: {
            _count: { select: { fields: true, savedValues: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        libraries: {
          include: {
            fields: { orderBy: { thuTu: 'asc' } },
            savedValues: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async createOrganization(data: { ten: string; moTa?: string }) {
    return this.prisma.organization.create({
      data,
    });
  }

  async updateOrganization(id: string, data: { ten?: string; moTa?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.prisma.organization.update({ where: { id }, data });
  }

  async deleteOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    await this.prisma.organization.delete({ where: { id } });
    return { message: 'Organization deleted' };
  }

  // ── Library ──────────────────────────────────────────────────

  async findAllLibraries(organizationId?: string) {
    return this.prisma.library.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        organization: { select: { id: true, ten: true } },
        _count: { select: { fields: true, savedValues: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findLibrary(id: string) {
    const lib = await this.prisma.library.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, ten: true } },
        fields: { orderBy: { thuTu: 'asc' } },
        savedValues: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lib) throw new NotFoundException('Library not found');
    return lib;
  }

  async createLibrary(data: { ten: string; loai: LibraryType; organizationId: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.prisma.library.create({ data });
  }

  async updateLibrary(id: string, data: { ten?: string; loai?: LibraryType }) {
    const lib = await this.prisma.library.findUnique({ where: { id } });
    if (!lib) throw new NotFoundException('Library not found');
    return this.prisma.library.update({ where: { id }, data });
  }

  async deleteLibrary(id: string) {
    const lib = await this.prisma.library.findUnique({ where: { id } });
    if (!lib) throw new NotFoundException('Library not found');
    await this.prisma.library.delete({ where: { id } });
    return { message: 'Library deleted' };
  }

  // ── Field ───────────────────────────────────────────────────

  async getLibraryFields(id: string) {
    const lib = await this.prisma.library.findUnique({ where: { id } });
    if (!lib) throw new NotFoundException('Library not found');
    return this.prisma.libraryField.findMany({
      where: { libraryId: id },
      orderBy: { thuTu: 'asc' },
    });
  }

  async createField(libraryId: string, data: {
    tenTruong: string;
    khoa: string;
    kieuDuLieu: FieldType;
    giaTriMacDinh?: string;
    batBuoc?: boolean;
    thuTu?: number;
    nhom?: string;
  }) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');

    const exists = await this.prisma.libraryField.findUnique({ where: { khoa: data.khoa } });
    if (exists) throw new BadRequestException(`Field with key "${data.khoa}" already exists`);

    return this.prisma.libraryField.create({
      data: {
        libraryId,
        tenTruong: data.tenTruong,
        khoa: data.khoa,
        kieuDuLieu: data.kieuDuLieu,
        giaTriMacDinh: data.giaTriMacDinh,
        batBuoc: data.batBuoc ?? false,
        thuTu: data.thuTu ?? 0,
        nhom: data.nhom,
      },
    });
  }

  async updateField(libraryId: string, fieldId: string, data: {
    tenTruong?: string;
    khoa?: string;
    kieuDuLieu?: FieldType;
    giaTriMacDinh?: string;
    batBuoc?: boolean;
    thuTu?: number;
    nhom?: string;
  }) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');
    const field = await this.prisma.libraryField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Field not found');

    if (data.khoa && data.khoa !== field.khoa) {
      const exists = await this.prisma.libraryField.findUnique({ where: { khoa: data.khoa } });
      if (exists) throw new BadRequestException(`Field with key "${data.khoa}" already exists`);
    }

    return this.prisma.libraryField.update({
      where: { id: fieldId },
      data,
    });
  }

  async deleteField(libraryId: string, fieldId: string) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');
    const field = await this.prisma.libraryField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Field not found');
    await this.prisma.libraryField.delete({ where: { id: fieldId } });
    return { message: 'Field deleted' };
  }

  // ── Saved Value ─────────────────────────────────────────────

  async getSavedValues(libraryId: string) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');
    return this.prisma.savedValue.findMany({
      where: { libraryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveValue(libraryId: string, data: { tenGiaTri: string; duLieu: Record<string, any> }) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');
    return this.prisma.savedValue.create({
      data: {
        libraryId,
        tenGiaTri: data.tenGiaTri,
        duLieu: data.duLieu,
      },
    });
  }

  async updateValue(libraryId: string, valueId: string, data: { tenGiaTri?: string; duLieu?: Record<string, any> }) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');
    const value = await this.prisma.savedValue.findUnique({ where: { id: valueId } });
    if (!value) throw new NotFoundException('Saved value not found');
    return this.prisma.savedValue.update({
      where: { id: valueId },
      data,
    });
  }

  async deleteValue(libraryId: string, valueId: string) {
    const lib = await this.prisma.library.findUnique({ where: { id: libraryId } });
    if (!lib) throw new NotFoundException('Library not found');
    const value = await this.prisma.savedValue.findUnique({ where: { id: valueId } });
    if (!value) throw new NotFoundException('Saved value not found');
    await this.prisma.savedValue.delete({ where: { id: valueId } });
    return { message: 'Saved value deleted' };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { LegalDocument, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLegalDocumentDto,
  LegalDocumentQueryDto,
  UpdateLegalDocumentDto,
} from './dto/legal-document.dto';

type LegalDocumentWithCitation = LegalDocument & { citation: string };

@Injectable()
export class LegalDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: LegalDocumentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const q = query.q?.trim();
    const hinhThuc = query.hinhThuc?.trim();
    const linhVuc = query.linhVuc?.trim();

    const where: Prisma.LegalDocumentWhereInput = {
      ...(hinhThuc
        ? { hinhThucVanBan: { contains: hinhThuc, mode: 'insensitive' } }
        : {}),
      ...(linhVuc
        ? { linhVuc: { contains: linhVuc, mode: 'insensitive' } }
        : {}),
      ...(q
        ? {
            OR: [
              { tenCanCu: { contains: q, mode: 'insensitive' } },
              { soHieu: { contains: q, mode: 'insensitive' } },
              { coQuanBanHanh: { contains: q, mode: 'insensitive' } },
              { hinhThucVanBan: { contains: q, mode: 'insensitive' } },
              { linhVuc: { contains: q, mode: 'insensitive' } },
              { trichYeuNoiDung: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.legalDocument.findMany({
        where,
        orderBy: [{ ngayBanHanh: 'desc' }, { soHieu: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.legalDocument.count({ where }),
    ]);

    return {
      items: items.map((item) => this.withCitation(item)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<LegalDocumentWithCitation> {
    const item = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy văn bản pháp lý');
    }
    return this.withCitation(item);
  }

  async create(dto: CreateLegalDocumentDto): Promise<LegalDocumentWithCitation> {
    const item = await this.prisma.legalDocument.create({
      data: this.toCreateData(dto),
    });
    return this.withCitation(item);
  }

  async update(
    id: string,
    dto: UpdateLegalDocumentDto,
  ): Promise<LegalDocumentWithCitation> {
    await this.ensureExists(id);
    const item = await this.prisma.legalDocument.update({
      where: { id },
      data: this.toUpdateData(dto),
    });
    return this.withCitation(item);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.legalDocument.delete({ where: { id } });
    return { message: 'Đã xóa văn bản pháp lý' };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.legalDocument.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy văn bản pháp lý');
    }
  }

  private toCreateData(
    dto: CreateLegalDocumentDto,
  ): Prisma.LegalDocumentCreateInput {
    return {
      tenCanCu: dto.tenCanCu?.trim() || null,
      soHieu: dto.soHieu.trim(),
      coQuanBanHanh: dto.coQuanBanHanh.trim(),
      hinhThucVanBan: dto.hinhThucVanBan.trim(),
      linhVuc: dto.linhVuc.trim(),
      trichYeuNoiDung: dto.trichYeuNoiDung.trim(),
      ngayBanHanh: this.parseDate(dto.ngayBanHanh),
    };
  }

  private toUpdateData(
    dto: UpdateLegalDocumentDto,
  ): Prisma.LegalDocumentUpdateInput {
    return {
      ...(dto.tenCanCu !== undefined
        ? { tenCanCu: dto.tenCanCu.trim() || null }
        : {}),
      ...(dto.soHieu !== undefined ? { soHieu: dto.soHieu.trim() } : {}),
      ...(dto.coQuanBanHanh !== undefined
        ? { coQuanBanHanh: dto.coQuanBanHanh.trim() }
        : {}),
      ...(dto.hinhThucVanBan !== undefined
        ? { hinhThucVanBan: dto.hinhThucVanBan.trim() }
        : {}),
      ...(dto.linhVuc !== undefined ? { linhVuc: dto.linhVuc.trim() } : {}),
      ...(dto.trichYeuNoiDung !== undefined
        ? { trichYeuNoiDung: dto.trichYeuNoiDung.trim() }
        : {}),
      ...(dto.ngayBanHanh !== undefined
        ? { ngayBanHanh: this.parseDate(dto.ngayBanHanh) }
        : {}),
    };
  }

  private parseDate(value: string): Date {
    const datePart = value.slice(0, 10);
    return new Date(`${datePart}T00:00:00.000Z`);
  }

  private withCitation(document: LegalDocument): LegalDocumentWithCitation {
    return {
      ...document,
      citation: LegalDocumentsService.formatCitation(document),
    };
  }

  static formatCitation(document: LegalDocument): string {
    const strip = (value: string) =>
      value.trim().replace(/[\s,.;:]+$/u, '');
    const date = document.ngayBanHanh;
    const formattedDate = `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;

    return `Căn cứ ${strip(document.hinhThucVanBan)} ${strip(document.trichYeuNoiDung)} số ${strip(document.soHieu)}, ngày ${formattedDate} của ${strip(document.coQuanBanHanh)};`;
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LegalDocument, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { MinioService } from '../minio/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLegalDocumentDto,
  LegalDocumentQueryDto,
  UpdateLegalDocumentDto,
} from './dto/legal-document.dto';

type LegalDocumentWithCitation = LegalDocument & { citation: string };
type OriginalFile = {
  objectPath: string;
  originalName: string;
  mimeType: string;
  size: number;
};

const MAX_ORIGINAL_FILE_BYTES = 100 * 1024 * 1024;
const MAX_ORIGINAL_IMAGE_BYTES = 12 * 1024 * 1024;

@Injectable()
export class LegalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

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

  async create(
    dto: CreateLegalDocumentDto,
    file?: Express.Multer.File,
  ): Promise<LegalDocumentWithCitation> {
    const id = randomUUID();
    const originalFile = file
      ? await this.uploadOriginalFile(id, file)
      : undefined;
    try {
      const item = await this.prisma.legalDocument.create({
        data: this.toCreateData(id, dto, originalFile),
      });
      return this.withCitation(item);
    } catch (error) {
      if (originalFile) {
        await this.minio.delete(originalFile.objectPath).catch(() => undefined);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateLegalDocumentDto,
    file?: Express.Multer.File,
  ): Promise<LegalDocumentWithCitation> {
    const current = await this.ensureExists(id);
    const originalFile = file
      ? await this.uploadOriginalFile(id, file)
      : undefined;
    try {
      const item = await this.prisma.legalDocument.update({
        where: { id },
        data: this.toUpdateData(dto, originalFile),
      });
      if (
        originalFile
        && current.originalObjectPath
        && current.originalObjectPath !== originalFile.objectPath
      ) {
        await this.minio
          .delete(current.originalObjectPath)
          .catch(() => undefined);
      }
      return this.withCitation(item);
    } catch (error) {
      if (originalFile) {
        await this.minio.delete(originalFile.objectPath).catch(() => undefined);
      }
      throw error;
    }
  }

  async remove(id: string) {
    const current = await this.ensureExists(id);
    await this.prisma.legalDocument.delete({ where: { id } });
    if (current.originalObjectPath) {
      await this.minio.delete(current.originalObjectPath).catch(() => undefined);
    }
    return { message: 'Đã xóa văn bản pháp lý' };
  }

  async downloadOriginal(id: string) {
    const document = await this.ensureExists(id);
    if (
      !document.originalObjectPath
      || !document.originalName
      || !document.originalMimeType
    ) {
      throw new NotFoundException('Văn bản này chưa có tệp gốc để đối chiếu');
    }
    return {
      buffer: await this.minio.download(document.originalObjectPath),
      originalName: document.originalName,
      mimeType: document.originalMimeType,
    };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.legalDocument.findUnique({
      where: { id },
    });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy văn bản pháp lý');
    }
    return exists;
  }

  private toCreateData(
    id: string,
    dto: CreateLegalDocumentDto,
    originalFile?: OriginalFile,
  ): Prisma.LegalDocumentCreateInput {
    return {
      id,
      tenCanCu: dto.tenCanCu?.trim() || null,
      soHieu: dto.soHieu.trim(),
      coQuanBanHanh: dto.coQuanBanHanh.trim(),
      hinhThucVanBan: dto.hinhThucVanBan.trim(),
      linhVuc: dto.linhVuc.trim(),
      trichYeuNoiDung: dto.trichYeuNoiDung.trim(),
      ngayBanHanh: this.parseDate(dto.ngayBanHanh),
      ...(originalFile ? this.originalFileData(originalFile) : {}),
    };
  }

  private toUpdateData(
    dto: UpdateLegalDocumentDto,
    originalFile?: OriginalFile,
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
      ...(originalFile ? this.originalFileData(originalFile) : {}),
    };
  }

  private originalFileData(file: OriginalFile) {
    return {
      originalObjectPath: file.objectPath,
      originalName: file.originalName,
      originalMimeType: file.mimeType,
      originalSize: file.size,
    };
  }

  private async uploadOriginalFile(
    documentId: string,
    file: Express.Multer.File,
  ): Promise<OriginalFile> {
    if (!file.buffer?.length) {
      throw new BadRequestException('Tệp tải lên không có dữ liệu');
    }
    if (file.size > MAX_ORIGINAL_FILE_BYTES) {
      throw new BadRequestException('Tệp vượt quá dung lượng tối đa 100 MB');
    }

    const mimeType = this.detectSupportedMimeType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException(
        'Chỉ hỗ trợ PDF, PNG, JPG, WEBP hoặc BMP',
      );
    }
    if (mimeType !== 'application/pdf' && file.size > MAX_ORIGINAL_IMAGE_BYTES) {
      throw new BadRequestException('Ảnh vượt quá dung lượng tối đa 12 MB');
    }
    const extensionByType: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
    };
    const requestedExtension = extname(file.originalname || '').toLowerCase();
    const extension =
      requestedExtension === '.jpeg'
        ? '.jpg'
        : Object.values(extensionByType).includes(requestedExtension)
          ? requestedExtension
          : extensionByType[mimeType];
    const objectPath =
      `legal-documents/${documentId}/${Date.now()}-${randomUUID()}${extension}`;

    await this.minio.upload(objectPath, file.buffer, mimeType);
    const originalName = (file.originalname || `van-ban-goc${extension}`)
      .replace(/[\r\n"]/g, '_')
      .slice(0, 255);
    return {
      objectPath,
      originalName,
      mimeType,
      size: file.size,
    };
  }

  private detectSupportedMimeType(buffer: Buffer): string | null {
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      return 'application/pdf';
    }
    if (
      buffer.length >= 8
      && buffer[0] === 0x89
      && buffer.subarray(1, 4).toString('ascii') === 'PNG'
    ) {
      return 'image/png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }
    if (buffer.subarray(0, 2).toString('ascii') === 'BM') {
      return 'image/bmp';
    }
    return null;
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
    const title = strip(document.trichYeuNoiDung);
    const normalizedTitle = title
      ? title.charAt(0).toLocaleLowerCase('vi') + title.slice(1)
      : '';
    const date = document.ngayBanHanh;
    const formattedDate = `${String(date.getUTCDate()).padStart(2, '0')} tháng ${date.getUTCMonth() + 1} năm ${date.getUTCFullYear()}`;

    return `Căn cứ ${strip(document.hinhThucVanBan)} số ${strip(document.soHieu)} ngày ${formattedDate} của ${strip(document.coQuanBanHanh)} ${normalizedTitle};`;
  }
}

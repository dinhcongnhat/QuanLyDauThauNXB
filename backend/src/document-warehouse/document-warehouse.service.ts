import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAttachmentOnlyStep } from '../contractor-selection/lcnt-docx-generator';

export const WAREHOUSE_TAGS = [
  'DAT_SACH',
  'DU_TOAN',
  'KHLCNT',
  'LCNT',
  'THANH_TOAN',
] as const;

export type WarehouseTag = (typeof WAREHOUSE_TAGS)[number];

export interface WarehouseItem {
  id: string;
  sourceType:
    | 'DOCUMENT'
    | 'DOCUMENT_COVER'
    | 'DAT_SACH_GDN'
    | 'DAT_SACH_PCDI'
    | 'DAT_SACH_QD'
    | 'LCNT_STEP'
    | 'PAYMENT_STEP'
    | 'ATTACHMENT';
  sourceId: string;
  tag: WarehouseTag;
  title: string;
  documentNumber: string;
  projectId: string | null;
  projectName: string;
  packageName: string;
  status: string;
  updatedAt: string;
  openHref: string;
  objectPath?: string;
  fileName?: string;
}

const DOCUMENT_TITLES: Record<string, string> = {
  TT_DUTOAN: 'Tờ trình phê duyệt dự toán',
  QD_DUTOAN: 'Quyết định phê duyệt dự toán',
  TT_KHLCNT: 'Tờ trình phê duyệt kế hoạch lựa chọn nhà thầu',
  BC_KHLCNT: 'Báo cáo thẩm định kế hoạch lựa chọn nhà thầu',
  QD_KHLCNT: 'Quyết định phê duyệt kế hoạch lựa chọn nhà thầu',
  LCNT_STEP: 'Văn bản lựa chọn nhà thầu',
};

const NUMBER_KEYS = new Set([
  'sovanban',
  'sototrinh',
  'soquyetdinh',
  'sohopdong',
  'masohd',
  'masohopdong',
  'sophieu',
  'sohoso',
]);

const PACKAGE_KEYS = new Set([
  'tengoithau',
  'tencacgoithau',
  'goithau',
]);

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('vi')
    .trim();
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function hasData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray(value)
    ? value.length > 0
    : Object.keys(value as object).some((key) => !key.startsWith('_'));
}

function collectValues(
  value: unknown,
  acceptedKeys: Set<string>,
  output = new Set<string>(),
  depth = 0,
): Set<string> {
  if (depth > 5 || value === null || value === undefined) return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectValues(item, acceptedKeys, output, depth + 1));
    return output;
  }
  if (typeof value !== 'object') return output;
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (acceptedKeys.has(normalizeKey(key))) {
      if (Array.isArray(item)) {
        item.forEach((entry) => {
          if (typeof entry === 'string' && entry.trim()) output.add(entry.trim());
        });
      } else if (typeof item === 'string' || typeof item === 'number') {
        const text = String(item).trim();
        if (text) output.add(text);
      }
    }
    collectValues(item, acceptedKeys, output, depth + 1);
  });
  return output;
}

function firstValue(value: unknown, keys: Set<string>): string {
  return Array.from(collectValues(value, keys))[0] || '';
}

function packageNames(value: unknown): string {
  const unique = new Map<string, string>();
  Array.from(collectValues(value, PACKAGE_KEYS)).forEach((entry) => {
    entry
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const normalized = normalizeSearch(part);
        if (!unique.has(normalized)) unique.set(normalized, part);
      });
  });
  return Array.from(unique.values()).join(', ');
}

function searchableText(item: WarehouseItem, rawData?: unknown): string {
  return normalizeSearch([
    item.title,
    item.documentNumber,
    item.projectName,
    item.packageName,
    item.fileName,
    rawData ? JSON.stringify(rawData) : '',
  ].join(' '));
}

function documentTag(type: string): WarehouseTag {
  if (type === 'TT_DUTOAN' || type === 'QD_DUTOAN') return 'DU_TOAN';
  if (type === 'TT_KHLCNT' || type === 'BC_KHLCNT' || type === 'QD_KHLCNT') {
    return 'KHLCNT';
  }
  return 'LCNT';
}

function documentOpenHref(type: string, procurementType?: string | null): string {
  if (type === 'TT_DUTOAN' || type === 'QD_DUTOAN') {
    return procurementType === 'THAU_SACH'
      ? '/dashboard/mua-sam/sach/du-toan'
      : '/dashboard/mua-sam/thiet-bi/du-toan';
  }
  if (type === 'TT_KHLCNT' || type === 'BC_KHLCNT' || type === 'QD_KHLCNT') {
    return procurementType === 'THAU_SACH'
      ? '/dashboard/mua-sam/sach/khlcnt'
      : '/dashboard/mua-sam/thiet-bi/khlcnt';
  }
  return '/dashboard/lua-chon-nha-thau';
}

function attachmentEntries(data: unknown, fallbackPath?: string | null) {
  const record = asRecord(data);
  const output: Array<{ objectPath: string; fileName: string }> = [];
  const seen = new Set<string>();
  const add = (objectPath: unknown, fileName?: unknown) => {
    if (typeof objectPath !== 'string' || !objectPath.trim() || seen.has(objectPath)) {
      return;
    }
    seen.add(objectPath);
    output.push({
      objectPath,
      fileName:
        (typeof fileName === 'string' && fileName.trim())
          ? fileName.trim()
          : objectPath.split('/').pop() || 'Tệp đính kèm',
    });
  };
  if (Array.isArray(record._attachments)) {
    record._attachments.forEach((attachment: any) =>
      add(
        attachment?.objectPath || attachment?.path,
        attachment?.originalName || attachment?.name || attachment?.fileName,
      ),
    );
  }
  add(fallbackPath);
  return output;
}

@Injectable()
export class DocumentWarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    userId: string,
    role: string,
    query: {
      q?: string;
      tag?: string;
      projectId?: string;
      page?: string | number;
      limit?: string | number;
    },
  ) {
    const isAdmin = role === 'ADMIN';
    const projectWhere: any = isAdmin
      ? {}
      : { members: { some: { userId } } };
    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        tenDuAn: true,
        procurementType: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (
      query.projectId &&
      !projects.some((project) => project.id === query.projectId)
    ) {
      throw new ForbiddenException('Bạn không có quyền xem kho văn bản của dự án này');
    }

    const allowedProjectIds = projects.map((project) => project.id);
    const sourceWhere: any = query.projectId
      ? { projectId: query.projectId }
      : isAdmin
        ? {}
        : {
            OR: [
              { projectId: { in: allowedProjectIds } },
              { projectId: null, createdBy: userId },
            ],
          };

    const [documents, datSachProjects, selections, payments] = await Promise.all([
      this.prisma.document.findMany({
        where: sourceWhere,
        include: {
          project: {
            select: { id: true, tenDuAn: true, procurementType: true },
          },
        },
      }),
      this.prisma.datSachProject.findMany({
        where: sourceWhere,
        include: {
          project: {
            select: { id: true, tenDuAn: true, procurementType: true },
          },
          gdnDocuments: true,
          pcdiDocuments: true,
        },
      }),
      this.prisma.contractorSelection.findMany({
        where: sourceWhere,
        include: {
          project: { select: { id: true, tenDuAn: true } },
          steps: true,
        },
      }),
      this.prisma.payment.findMany({
        where: sourceWhere,
        include: {
          project: { select: { id: true, tenDuAn: true } },
          contractorSelection: {
            select: { id: true, tenGoiThau: true },
          },
          steps: true,
        },
      }),
    ]);

    const indexed: Array<{ item: WarehouseItem; rawData?: unknown }> = [];
    const add = (item: WarehouseItem, rawData?: unknown) =>
      indexed.push({ item, rawData });

    documents.forEach((document) => {
      const data = asRecord(document.data);
      const tag = documentTag(document.type);
      const projectName =
        document.project?.tenDuAn ||
        String(data.TenDuAn || data.tenDuAn || 'Chưa gán dự án');
      const base: WarehouseItem = {
        id: `document:${document.id}`,
        sourceType: 'DOCUMENT',
        sourceId: document.id,
        tag,
        title: DOCUMENT_TITLES[document.type] || 'Văn bản nghiệp vụ',
        documentNumber: firstValue(data, NUMBER_KEYS),
        projectId: document.projectId,
        projectName,
        packageName: packageNames(data),
        status: document.status,
        updatedAt: document.updatedAt.toISOString(),
        openHref: documentOpenHref(
          document.type,
          document.project?.procurementType || document.procurementType,
        ),
      };
      add(base, data);

      if (document.type === 'TT_DUTOAN' || document.type === 'TT_KHLCNT') {
        add({
          ...base,
          id: `cover:${document.id}`,
          sourceType: 'DOCUMENT_COVER',
          title:
            document.type === 'TT_DUTOAN'
              ? 'Phiếu trình ký phê duyệt dự toán'
              : 'Phiếu trình ký phê duyệt kế hoạch lựa chọn nhà thầu',
        }, data);
      }
    });

    datSachProjects.forEach((project) => {
      const projectName = project.project?.tenDuAn || project.tenDuAn;
      const base = {
        tag: 'DAT_SACH' as WarehouseTag,
        projectId: project.projectId,
        projectName,
        packageName: '',
        openHref: `/dashboard/mua-sam/dat-sach/${project.id}`,
      };
      project.gdnDocuments.forEach((document) => {
        add({
          ...base,
          id: `gdn:${document.id}`,
          sourceType: 'DAT_SACH_GDN',
          sourceId: document.id,
          title: 'Giấy đề nghị in sách',
          documentNumber: firstValue(document.data, NUMBER_KEYS),
          packageName: packageNames(document.data),
          status: document.status,
          updatedAt: document.updatedAt.toISOString(),
        }, document.data);
      });
      project.pcdiDocuments.forEach((document) => {
        add({
          ...base,
          id: `pcdi:${document.id}`,
          sourceType: 'DAT_SACH_PCDI',
          sourceId: document.id,
          title: 'Phiếu chỉ định cơ sở in',
          documentNumber: firstValue(document.data, NUMBER_KEYS),
          packageName: packageNames(document.data),
          status: document.status,
          updatedAt: document.updatedAt.toISOString(),
        }, document.data);
      });
      if (hasData(project.qdData)) {
        add({
          ...base,
          id: `dat-sach-qd:${project.id}`,
          sourceType: 'DAT_SACH_QD',
          sourceId: project.id,
          title: 'Quyết định đặt sách',
          documentNumber: firstValue(project.qdData, NUMBER_KEYS),
          packageName: packageNames(project.qdData),
          status: project.reviewStatus || project.status,
          updatedAt: project.updatedAt.toISOString(),
        }, project.qdData);
      }
    });

    selections.forEach((selection) => {
      selection.steps.forEach((step) => {
        const shouldIndex =
          step.status !== 'NOT_STARTED' ||
          hasData(step.data) ||
          Boolean(step.attachmentPath);
        if (!shouldIndex) return;
        const base = {
          tag: 'LCNT' as WarehouseTag,
          projectId: selection.projectId,
          projectName: selection.project?.tenDuAn || 'Chưa gán dự án',
          packageName: selection.tenGoiThau,
          status: step.status,
          updatedAt: step.updatedAt.toISOString(),
          openHref: `/dashboard/lua-chon-nha-thau/${selection.id}/step/${step.id}`,
        };
        if (!isAttachmentOnlyStep(step.stepKey)) {
          add({
            ...base,
            id: `lcnt:${step.id}`,
            sourceType: 'LCNT_STEP',
            sourceId: step.id,
            title: step.title,
            documentNumber: firstValue(step.data, NUMBER_KEYS),
          }, step.data);
        }
        attachmentEntries(step.data, step.attachmentPath).forEach((attachment, index) => {
          add({
            ...base,
            id: `lcnt-attachment:${step.id}:${index}`,
            sourceType: 'ATTACHMENT',
            sourceId: step.id,
            title: attachment.fileName,
            documentNumber: '',
            objectPath: attachment.objectPath,
            fileName: attachment.fileName,
          }, step.data);
        });
      });
    });

    payments.forEach((payment) => {
      payment.steps.forEach((step) => {
        const shouldIndex =
          step.status !== 'NOT_STARTED' ||
          hasData(step.data) ||
          Boolean(step.attachmentPath);
        if (!shouldIndex) return;
        const base = {
          tag: 'THANH_TOAN' as WarehouseTag,
          projectId: payment.projectId,
          projectName: payment.project?.tenDuAn || 'Chưa gán dự án',
          packageName: payment.contractorSelection.tenGoiThau,
          status: step.status,
          updatedAt: step.updatedAt.toISOString(),
          openHref: `/dashboard/thanh-toan/${payment.id}/step/${step.id}`,
        };
        add({
          ...base,
          id: `payment:${step.id}`,
          sourceType: 'PAYMENT_STEP',
          sourceId: step.id,
          title: step.title,
          documentNumber:
            firstValue(step.data, NUMBER_KEYS) || payment.maSoHD || '',
        }, step.data);
        attachmentEntries(step.data, step.attachmentPath).forEach((attachment, index) => {
          add({
            ...base,
            id: `payment-attachment:${step.id}:${index}`,
            sourceType: 'ATTACHMENT',
            sourceId: step.id,
            title: attachment.fileName,
            documentNumber: payment.maSoHD || '',
            objectPath: attachment.objectPath,
            fileName: attachment.fileName,
          }, step.data);
        });
      });
    });

    const normalizedQuery = normalizeSearch(query.q);
    const queryFiltered = normalizedQuery
      ? indexed.filter(({ item, rawData }) =>
          searchableText(item, rawData).includes(normalizedQuery),
        )
      : indexed;
    const stats = Object.fromEntries(
      WAREHOUSE_TAGS.map((tag) => [
        tag,
        queryFiltered.filter(({ item }) => item.tag === tag).length,
      ]),
    );
    const requestedTag = WAREHOUSE_TAGS.includes(query.tag as WarehouseTag)
      ? (query.tag as WarehouseTag)
      : undefined;
    const tagFiltered = requestedTag
      ? queryFiltered.filter(({ item }) => item.tag === requestedTag)
      : queryFiltered;
    const sorted = tagFiltered
      .map(({ item }) => item)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const total = sorted.length;

    return {
      items: sorted.slice((page - 1) * limit, page * limit),
      stats,
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}

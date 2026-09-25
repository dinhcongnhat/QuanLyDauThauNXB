import * as assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApprovalRequestStatus, Role } from '@prisma/client';
import { ApprovalDossiersService } from '../src/approvals/approval-dossiers.service';
import { EffectivePermissionsService } from '../src/auth/effective-permissions.service';
import { ProjectService } from '../src/project/project.service';

async function assertRejects(action: () => unknown | Promise<unknown>) {
  let rejected = false;
  try {
    await action();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true);
}

async function main() {
  const jwt = new JwtService();
  const permissionResolver = {
    resolve: async (userId: string) => ({
      user: { id: userId, role: Role.USER },
      effectivePermissions: ['approval:review'],
    }),
  };
  const dossiers = new ApprovalDossiersService(
    {} as any,
    {} as any,
    jwt,
    permissionResolver as any,
    {} as any,
  ) as any;

  const chain = [
    {
      requesterId: 'creator',
      approverId: 'department-head',
      status: ApprovalRequestStatus.APPROVED,
      submittedAt: new Date('2026-01-01T08:00:00Z'),
    },
    {
      requesterId: 'department-head',
      approverId: 'director',
      status: ApprovalRequestStatus.REJECTED,
      submittedAt: new Date('2026-01-01T09:00:00Z'),
    },
  ];
  assert.equal(
    dossiers.findReturnRecipient(chain, 'department-head'),
    'creator',
    'Trưởng phòng phải có thể trả tiếp hồ sơ về người tạo',
  );
  assert.equal(
    dossiers.findReturnRecipient(chain, 'creator'),
    null,
    'Người tạo không được trả vòng lại chuỗi phía trên',
  );
  dossiers.assertForwardRecipientNotInChain(chain, 'director');
  dossiers.assertForwardRecipientNotInChain(chain, 'new-director');
  const activeChain = [
    {
      requesterId: 'creator',
      approverId: 'department-head',
      status: ApprovalRequestStatus.PENDING,
      submittedAt: new Date('2026-01-01T10:00:00Z'),
    },
  ];
  await assertRejects(() =>
    dossiers.assertForwardRecipientNotInChain(activeChain, 'creator'),
  );

  dossiers.assertComplete([
    { required: true, label: 'Tờ trình', data: { soVanBan: '01' } },
    { required: true, label: 'Quyết định', entityId: 'decision-id' },
    { required: false, label: 'Phụ lục', data: {} },
  ]);
  await assertRejects(() =>
    dossiers.assertComplete([
      { required: true, label: 'Quyết định', data: {} },
    ]),
  );
  await assertRejects(() =>
    dossiers.assertValidRecipient('same-user', 'same-user'),
  );

  const onlyOfficeToken = jwt.sign(
    {
      purpose: 'callback',
      dossierId: 'dossier-id',
      itemId: 'item-id',
      itemVersion: 3,
      actorId: 'reviewer-id',
    },
    { secret: process.env.ONLYOFFICE_JWT_SECRET || 'onlyoffice-secret' },
  );
  assert.equal(
    dossiers.verifyOnlyOfficeToken(onlyOfficeToken, 'callback').itemVersion,
    3,
  );
  await assertRejects(() =>
    dossiers.verifyOnlyOfficeToken(onlyOfficeToken, 'content'),
  );

  const effective = new EffectivePermissionsService({
    user: {
      findUnique: async () => ({
        id: 'user-id',
        email: 'user@example.com',
        role: Role.USER,
        canApprove: false,
      }),
    },
    rolePermission: {
      findMany: async () => [{ permissionKey: 'doc:view' }],
    },
    userDynamicRole: {
      findMany: async () => [
        {
          role: {
            name: 'Trưởng phòng',
            permissions: [
              { permission: { key: 'approval:review', isActive: true } },
            ],
          },
        },
      ],
    },
    userPermission: {
      findMany: async () => [
        {
          permission: {
            key: 'feature:equipment-procurement',
            isActive: true,
          },
        },
      ],
    },
  } as any);
  const resolved = await effective.resolve('user-id');
  assert.deepEqual(
    new Set(resolved.effectivePermissions),
    new Set([
      'doc:view',
      'approval:review',
      'feature:equipment-procurement',
    ]),
  );

  let memberRole = 'OWNER';
  const projects = new ProjectService(
    {
      projectMember: {
        findUnique: async () => ({ role: memberRole }),
      },
    } as any,
    {} as any,
  ) as any;
  await projects.assertOwnerOrAdmin('project-id', 'owner-id', Role.USER);
  memberRole = 'MEMBER';
  await assertRejects(() =>
    projects.assertOwnerOrAdmin('project-id', 'member-id', Role.USER),
  );
  await projects.assertOwnerOrAdmin('project-id', 'admin-id', Role.ADMIN);

  const forbidden = new ForbiddenException();
  assert.equal(forbidden.getStatus(), 403);
  console.log(
    'Dossier/permission/project/OnlyOffice invariant tests passed.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

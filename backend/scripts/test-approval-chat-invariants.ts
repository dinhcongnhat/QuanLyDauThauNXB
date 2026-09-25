import * as assert from 'node:assert/strict';
import {
  ApprovalTargetType,
  DocStatus,
  DocType,
} from '@prisma/client';
import { ApprovalsService } from '../src/approvals/approvals.service';
import { ChatService } from '../src/chat/chat.service';
import { DocumentsService } from '../src/documents/documents.service';

async function expectFailure(
  action: () => Promise<unknown>,
  messagePart: string,
) {
  try {
    await action();
    assert.fail(`Expected failure containing "${messagePart}"`);
  } catch (error: any) {
    assert.match(String(error?.message || error), new RegExp(messagePart, 'i'));
  }
}

async function testApprovalRules() {
  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => ({
        id: where.id,
        name: 'Người dùng',
        role: 'USER',
        canApprove: false,
      }),
    },
  };
  const approvals = new ApprovalsService(prisma, {} as any);

  await expectFailure(
    () =>
      approvals.submit('same-user', {
        targetType: ApprovalTargetType.DOCUMENT,
        targetId: 'decision',
        approverId: 'same-user',
      }),
    'tự phê duyệt',
  );

  await expectFailure(
    () =>
      approvals.submit('requester', {
        targetType: ApprovalTargetType.DOCUMENT,
        targetId: 'decision',
        approverId: 'not-authorized',
      }),
    'không có quyền',
  );

  prisma.user.findUnique = async () => ({
    name: 'Người gửi',
    role: 'USER',
  });
  prisma.document = {
    findUnique: async () => ({
      id: 'proposal',
      type: DocType.TT_DUTOAN,
      status: DocStatus.COMPLETED,
      createdBy: 'requester',
      projectId: 'project',
    }),
  };
  await expectFailure(
    () =>
      (approvals as any).validateTargetForSubmission('requester', {
        targetType: ApprovalTargetType.DOCUMENT,
        targetId: 'proposal',
        approverId: 'approver',
      }),
    'chỉ Quyết định',
  );
}

function testDocumentMatrix() {
  const documents = new DocumentsService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  assert.equal(
    (documents as any).getInitialStatus(DocType.TT_DUTOAN),
    DocStatus.COMPLETED,
  );
  assert.equal(
    (documents as any).getInitialStatus(DocType.TT_KHLCNT),
    DocStatus.COMPLETED,
  );
  assert.equal(
    (documents as any).getInitialStatus(DocType.BC_KHLCNT),
    DocStatus.COMPLETED,
  );
  assert.equal(
    (documents as any).getInitialStatus(DocType.QD_DUTOAN),
    DocStatus.DRAFT,
  );
  assert.equal(
    (documents as any).getInitialStatus(DocType.QD_KHLCNT),
    DocStatus.DRAFT,
  );
}

async function testChatRules() {
  const prisma: any = {
    projectMember: {
      findUnique: async () => null,
    },
  };
  const chat = new ChatService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
  );
  assert.equal(chat.normalizeModule('khlcnt'), 'KHLCNT');
  assert.equal(
    chat.room('project-1', 'du_toan'),
    'project:project-1',
  );
  assert.equal(
    chat.room('project-1', 'khlcnt'),
    'project:project-1',
    'Mọi phân hệ phải dùng chung một conversation realtime của dự án',
  );
  await expectFailure(
    () => chat.assertProjectMember('project-1', 'outsider'),
    'không phải thành viên',
  );
  assert.throws(() => chat.normalizeModule('../bad'), /không hợp lệ/i);
}

async function main() {
  testDocumentMatrix();
  await testApprovalRules();
  await testChatRules();
  console.log('Approval/chat invariant tests passed.');
}

void main();

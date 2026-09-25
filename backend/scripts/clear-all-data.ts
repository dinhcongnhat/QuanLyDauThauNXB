import { PrismaClient } from '@prisma/client';
import * as Minio from 'minio';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CONFIRMATION = 'DELETE_ALL_QLDA_DATA';

type DatabaseTable = {
  schemaname: string;
  tablename: string;
};

function loadEnvironmentFile(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Prisma resolves DATABASE_URL while the client is initialized, so load the
// backend environment before constructing it.
loadEnvironmentFile();
const prisma = new PrismaClient();

function hasArgument(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function argumentValue(name: string): string | undefined {
  const prefix = `${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function printHelp(): void {
  console.log(`
Xóa sạch dữ liệu QLDA trong PostgreSQL và file trong bucket MinIO.

Mặc định script chỉ kiểm tra và thống kê, không xóa:
  npm run data:clear

Xóa toàn bộ dữ liệu:
  npm run data:clear -- --confirm=${CONFIRMATION}

Xóa dữ liệu rồi seed lại tài khoản Admin và RBAC:
  npm run data:clear -- --confirm=${CONFIRMATION} --reseed-admin

Ghi đè địa chỉ MinIO khi chạy ngoài Docker (nếu cần):
  npm run data:clear -- --minio-endpoint=127.0.0.1 --minio-port=9000

Lưu ý:
  - Dừng backend trước khi chạy để tránh phát sinh dữ liệu trong lúc reset.
  - Tất cả bảng trong schema hiện hành sẽ bị TRUNCATE, ngoại trừ
    _prisma_migrations.
  - Bucket MinIO được làm rỗng nhưng bucket và policy được giữ nguyên.
  - Thao tác xác nhận là không thể hoàn tác nếu không có bản sao lưu.
`);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}

function databaseLabel(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '') || '(không xác định)';
  return `${parsed.hostname}:${parsed.port || '5432'}/${databaseName}`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function applicationTables(): Promise<DatabaseTable[]> {
  return prisma.$queryRaw<DatabaseTable[]>`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;
}

async function databaseRowCount(tables: DatabaseTable[]): Promise<bigint> {
  let total = 0n;
  for (const table of tables) {
    const qualifiedName =
      `${quoteIdentifier(table.schemaname)}.${quoteIdentifier(table.tablename)}`;
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${qualifiedName}`,
    );
    total += result[0]?.count ?? 0n;
  }
  return total;
}

function minioClient(): {
  client: Minio.Client;
  bucket: string;
  endpointLabel: string;
} {
  const configuredEndpoint = requiredEnvironment('MINIO_ENDPOINT');
  const runningInsideDocker = fs.existsSync('/.dockerenv');
  const endpoint =
    argumentValue('--minio-endpoint')
    || (
      !runningInsideDocker && configuredEndpoint === 'minio'
        ? '127.0.0.1'
        : configuredEndpoint
    );
  const port = Number(
    argumentValue('--minio-port')
    || process.env.MINIO_PORT
    || '9000',
  );
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('MINIO_PORT không hợp lệ');
  }

  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const bucket = process.env.MINIO_BUCKET?.trim() || 'qldanxb';
  return {
    client: new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: requiredEnvironment('MINIO_ACCESS_KEY'),
      secretKey: requiredEnvironment('MINIO_SECRET_KEY'),
    }),
    bucket,
    endpointLabel: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}/${bucket}`,
  };
}

async function countMinioObjects(
  client: Minio.Client,
  bucket: string,
): Promise<number> {
  if (!(await client.bucketExists(bucket))) return 0;

  let count = 0;
  const objects = client.listObjectsV2(bucket, '', true);
  for await (const object of objects) {
    if (object.name) count += 1;
  }
  return count;
}

async function clearMinioBucket(
  client: Minio.Client,
  bucket: string,
): Promise<number> {
  if (!(await client.bucketExists(bucket))) return 0;

  let removed = 0;
  let batch: string[] = [];
  const objects = client.listObjectsV2(bucket, '', true);

  for await (const object of objects) {
    if (!object.name) continue;
    batch.push(object.name);
    if (batch.length === 1000) {
      await client.removeObjects(bucket, batch);
      removed += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await client.removeObjects(bucket, batch);
    removed += batch.length;
  }
  return removed;
}

async function clearDatabase(tables: DatabaseTable[]): Promise<void> {
  if (tables.length === 0) return;

  const qualifiedNames = tables
    .map(
      (table) =>
        `${quoteIdentifier(table.schemaname)}.${quoteIdentifier(table.tablename)}`,
    )
    .join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${qualifiedNames} RESTART IDENTITY CASCADE`,
  );
}

function reseedAdmin(): void {
  const result = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', 'prisma/seed.ts'],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    },
  );
  if (result.status !== 0) {
    throw new Error('Xóa dữ liệu thành công nhưng seed lại Admin/RBAC thất bại');
  }
}

async function main(): Promise<void> {
  if (hasArgument('--help') || hasArgument('-h')) {
    printHelp();
    return;
  }

  const databaseUrl = requiredEnvironment('DATABASE_URL');
  const minio = minioClient();
  const tables = await applicationTables();

  console.log('Mục tiêu reset:');
  console.log(`- PostgreSQL: ${databaseLabel(databaseUrl)}`);
  console.log(`- MinIO: ${minio.endpointLabel}`);
  console.log(`- Số bảng ứng dụng: ${tables.length}`);
  console.log('- Giữ lại bảng: _prisma_migrations');

  const [rowCount, objectCount] = await Promise.all([
    databaseRowCount(tables),
    countMinioObjects(minio.client, minio.bucket),
  ]);
  console.log(`- Tổng số bản ghi sẽ xóa: ${rowCount.toString()}`);
  console.log(`- Tổng số file MinIO sẽ xóa: ${objectCount}`);

  if (argumentValue('--confirm') !== CONFIRMATION) {
    console.log('\nCHẾ ĐỘ KIỂM TRA: chưa xóa dữ liệu.');
    console.log(
      `Muốn xóa thật, chạy lại với --confirm=${CONFIRMATION}`,
    );
    return;
  }

  console.log('\nĐang làm rỗng bucket MinIO...');
  const removedObjects = await clearMinioBucket(minio.client, minio.bucket);

  console.log('Đang xóa toàn bộ dữ liệu PostgreSQL...');
  await clearDatabase(tables);

  if (hasArgument('--reseed-admin')) {
    console.log('Đang seed lại tài khoản Admin và RBAC...');
    reseedAdmin();
  }

  console.log('\nRESET HOÀN TẤT');
  console.log(`- Đã xóa ${removedObjects} file MinIO`);
  console.log(`- Đã xóa ${rowCount.toString()} bản ghi PostgreSQL`);
  console.log(
    hasArgument('--reseed-admin')
      ? '- Đã seed lại Admin/RBAC'
      : '- Database hiện không còn tài khoản; chạy npm run prisma:seed để tạo lại Admin/RBAC',
  );
}

main()
  .catch((error) => {
    console.error('\nRESET THẤT BẠI:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

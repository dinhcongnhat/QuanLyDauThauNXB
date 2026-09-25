function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * URL mà DocumentServer dùng để gọi ngược về ứng dụng. APP_URL vẫn là URL
 * công khai cho trình duyệt; container OnlyOffice dùng mạng Docker nội bộ để
 * tránh NAT hairpin và time-out.
 */
export function getOnlyOfficeAppUrl(): string {
  return trimTrailingSlash(
    process.env.ONLYOFFICE_INTERNAL_APP_URL ||
      process.env.APP_URL ||
      'http://localhost:3001',
  );
}

export function toOnlyOfficeInternalUrl(value: string): string {
  const internalBase = process.env.ONLYOFFICE_INTERNAL_APP_URL;
  if (!internalBase) return value;
  const source = new URL(value);
  return `${trimTrailingSlash(internalBase)}${source.pathname}${source.search}`;
}

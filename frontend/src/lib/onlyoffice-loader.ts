'use client';

let docsApiPromise: Promise<void> | null = null;
let loadedFrom = '';

function apiScriptUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/web-apps/apps/api/documents/api.js`;
}

/**
 * Nạp OnlyOffice API đúng một lần cho toàn bộ ứng dụng. Trước đây mỗi modal
 * tự chèn một script mới, làm chậm lần mở sau và có thể tạo nhiều callback.
 */
export async function loadOnlyOfficeApi(
  baseUrl: string,
  timeoutMs = 20_000,
): Promise<void> {
  if (window.DocsAPI) return;

  const source = apiScriptUrl(baseUrl);
  if (!docsApiPromise || loadedFrom !== source) {
    loadedFrom = source;
    docsApiPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[data-onlyoffice-api="${CSS.escape(source)}"]`,
      );
      const script = existing || document.createElement('script');
      const onLoad = () => resolve();
      const onError = () => {
        docsApiPromise = null;
        reject(new Error('Không thể kết nối máy chủ OnlyOffice'));
      };
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (!existing) {
        script.src = source;
        script.async = true;
        script.dataset.onlyofficeApi = source;
        document.head.appendChild(script);
      }
    });
  }

  let timeoutId = 0;
  await Promise.race([
    docsApiPromise,
    new Promise<void>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('OnlyOffice phản hồi quá chậm')),
        timeoutMs,
      );
    }),
  ]).finally(() => window.clearTimeout(timeoutId));
}

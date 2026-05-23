import type {
  ApiEnvelope,
  FolderDetailDto,
  FolderDto,
  FileDto,
  SearchResultDto,
} from '@we/shared';

const BASE = '/api/v1';

async function http<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const foldersApi = {
  roots: () => http<ApiEnvelope<FolderDto[]>>('/folders/roots').then((r) => r.data),
  children: (id: number) =>
    http<ApiEnvelope<FolderDto[]>>(`/folders/${id}/children`).then((r) => r.data),
  detail: (id: number) =>
    http<ApiEnvelope<FolderDetailDto>>(`/folders/${id}`).then((r) => r.data),
  files: (id: number, cursor: number | null = null, limit = 200) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor != null) params.set('cursor', String(cursor));
    return http<ApiEnvelope<FileDto[]>>(`/folders/${id}/files?${params}`).then((r) => r.data);
  },
  search: (q: string, limit = 30) =>
    http<ApiEnvelope<SearchResultDto>>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ).then((r) => r.data),
};

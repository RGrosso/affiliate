import type { PageQuery } from "#shared/schemas/pagination.schema";
import type { PagedResult } from "#shared/types/pagination";

export const pageOffset = ({ page, pageSize }: PageQuery) => (page - 1) * pageSize;

export function toPagedResult<T>(items: T[], total: number, { page, pageSize }: PageQuery): PagedResult<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

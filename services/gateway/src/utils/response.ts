export interface StandardResponse<T> {
  status: 'success' | 'error';
  data?: T;
  meta?: Record<string, any>;
  message?: string;
  code?: string;
}

export const success = <T>(data: T, message?: string, meta?: Record<string, any>): StandardResponse<T> => {
  return {
    status: 'success',
    data,
    message,
    meta,
  };
};

export const paginated = <T>(data: T[], total: number, page: number, limit: number): StandardResponse<T[]> => {
  return {
    status: 'success',
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const error = (message: string, code: string): StandardResponse<null> => {
  return {
    status: 'error',
    message,
    code,
  };
};

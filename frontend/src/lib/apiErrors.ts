import { AxiosError } from "axios";

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
  };
}

export type ApiAxiosError = AxiosError<ApiErrorResponse>;

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as ApiAxiosError;
  return axiosErr?.response?.data?.error?.message || fallback;
}

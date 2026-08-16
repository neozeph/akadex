import "server-only";

type ProviderError = {
  code?: string | number;
  status?: string | number;
  name?: string;
};

export function logServerError(operation: string, error: unknown) {
  const providerError = error as ProviderError | null;
  const safeContext = {
    operation,
    code:
      providerError?.code ??
      providerError?.status ??
      providerError?.name ??
      "unknown",
  };

  console.error("Server operation failed", safeContext);
}

export function createPublicError(message: string) {
  return new Error(message);
}

export function throwPublicError(
  operation: string,
  error: unknown,
  publicMessage: string,
): never {
  logServerError(operation, error);
  throw createPublicError(publicMessage);
}

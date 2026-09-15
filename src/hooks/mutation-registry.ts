export type MutationKey = string & {};

export const mutationRegistry: Record<MutationKey, (...args: unknown[]) => Promise<unknown>> = {};

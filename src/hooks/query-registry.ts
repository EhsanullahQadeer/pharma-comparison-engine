export type QueryKey = string & {};

export type QueryArgs<_K extends QueryKey> = unknown[];

export type QueryData<_K extends QueryKey> = unknown;

export const queryRegistry: Record<QueryKey, (...args: unknown[]) => Promise<unknown>> = {};

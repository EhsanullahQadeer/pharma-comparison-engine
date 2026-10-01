import { getPendingWork } from "@/actions/notifications/pending-work";

export const queryRegistry = { pendingWork: getPendingWork };
export type QueryKey = keyof typeof queryRegistry;

type QueryAction<K extends QueryKey> = (typeof queryRegistry)[K];
export type QueryArgs<K extends QueryKey> = Parameters<QueryAction<K>>;
export type QueryData<K extends QueryKey> = Awaited<ReturnType<QueryAction<K>>>;

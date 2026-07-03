import type { CollectionBeforeChangeHook } from "payload";

const DEFAULT_CREATED_BY_FIELD = "createdBy";

const createdByOnCreateBeforeChangeHooks = new Map<string, CollectionBeforeChangeHook>();

export const createCreatedByOnCreateBeforeChangeHook = (
  createdByFieldName = DEFAULT_CREATED_BY_FIELD,
): CollectionBeforeChangeHook => {
  const cached = createdByOnCreateBeforeChangeHooks.get(createdByFieldName);

  if (cached) {
    return cached;
  }

  const hook: CollectionBeforeChangeHook = ({ req, data, operation }) => {
    if (operation === "create" && req.user?.id && !data?.[createdByFieldName]) {
      return {
        ...data,
        [createdByFieldName]: req.user.id,
      };
    }

    return data;
  };

  createdByOnCreateBeforeChangeHooks.set(createdByFieldName, hook);

  return hook;
};

/** Sets `createdBy` to `req.user.id` on create. For other field names use `createCreatedByOnCreateBeforeChangeHook`. */
export const createdByOnCreateBeforeChangeHook = createCreatedByOnCreateBeforeChangeHook();

export const hasCreatedByOnCreateBeforeChangeHook = (
  hooks: CollectionBeforeChangeHook[] | CollectionBeforeChangeHook | undefined,
  createdByFieldName = DEFAULT_CREATED_BY_FIELD,
): boolean => {
  const hook = createCreatedByOnCreateBeforeChangeHook(createdByFieldName);
  const list = Array.isArray(hooks) ? hooks : hooks ? [hooks] : [];
  return list.includes(hook);
};

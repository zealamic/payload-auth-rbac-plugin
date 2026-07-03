import type { CollectionConfig, CustomComponent, Field } from "payload";
import { fieldAffectsData } from "payload/shared";
import type { TargetCollection } from "../../types.js";
import { DEFAULT_USERS_COLLECTION_SLUG } from "../constants/user.js";
import { getArrayOfMergedFieldAffectingData } from "./fields.js";
import {
  createCreatedByOnCreateBeforeChangeHook,
  hasCreatedByOnCreateBeforeChangeHook,
} from "./hooks.js";

export const mergeBeforeListTable = (
  pluginComponent: string,
  consumerComponents?: CustomComponent[] | null,
): CustomComponent[] => [pluginComponent, ...(consumerComponents ?? [])];

export const resolveUsersCollectionSlug = (adminUser?: string | null): string =>
  adminUser || DEFAULT_USERS_COLLECTION_SLUG;

export const getCreatedByRelationshipField = (params?: {
  createdByFieldName?: string | null;
  usersCollectionSlug?: string | null;
}): Field => {
  const { createdByFieldName, usersCollectionSlug } = params || {};
  if (usersCollectionSlug) {
    return {
      name: createdByFieldName || "createdBy",
      type: "relationship",
      relationTo: usersCollectionSlug,
      hasMany: false,
      admin: {
        hidden: true,
      },
    };
  }

  return {
    name: createdByFieldName || "createdBy",
    type: "text",
    admin: {
      hidden: true,
    },
  };
};

const mergeHookArrays = <T>(existing: T[] | T | undefined, added: T): T[] => {
  const base = Array.isArray(existing) ? existing : existing ? [existing] : [];
  return [...base, added];
};

const normalizeTargetCollections = (targets: string[] | TargetCollection[]): TargetCollection[] =>
  targets.map((target) => (typeof target === "string" ? { slug: target } : target));

const hasCollectionDataField = (fields: Field[] | undefined, fieldName: string): boolean =>
  (fields ?? []).some((field) => fieldAffectsData(field) && field.name === fieldName);

/**
 * For each configured target collection, merge ownership field + create hook when not already present.
 */
export const augmentCollectionsWithCreatedBy = (
  collections: CollectionConfig[],
  targets: string[] | TargetCollection[],
  options: {
    usersCollectionSlug?: string | null;
  } = {},
): CollectionConfig[] => {
  const targetCollections = normalizeTargetCollections(targets);

  if (!targetCollections.length) {
    return collections;
  }

  const targetBySlug = new Map(targetCollections.map((target) => [target.slug, target]));

  return collections.map((collection) => {
    const target = targetBySlug.get(collection.slug);

    if (!target) {
      return collection;
    }

    const createdByFieldName = target.createdByFieldName ?? "createdBy";
    const usersCollectionSlug = target.isRelatedWithUsersCollection
      ? options.usersCollectionSlug
      : undefined;

    const existingFields = collection.fields ?? [];
    const fieldAlreadyExists = hasCollectionDataField(existingFields, createdByFieldName);

    const existingBeforeChange = collection.hooks?.beforeChange;
    const hookAlreadyExists = hasCreatedByOnCreateBeforeChangeHook(
      existingBeforeChange,
      createdByFieldName,
    );

    if (fieldAlreadyExists && hookAlreadyExists) {
      return collection;
    }

    const fields = fieldAlreadyExists
      ? existingFields
      : getArrayOfMergedFieldAffectingData({
          fields: existingFields,
          defaultFields: [
            getCreatedByRelationshipField({
              createdByFieldName,
              usersCollectionSlug,
            }),
          ],
        });

    const beforeChange = hookAlreadyExists
      ? existingBeforeChange
      : mergeHookArrays(
          existingBeforeChange,
          createCreatedByOnCreateBeforeChangeHook(createdByFieldName),
        );

    return {
      ...collection,
      fields,
      hooks: hookAlreadyExists
        ? collection.hooks
        : {
            ...collection.hooks,
            beforeChange,
          },
    };
  });
};

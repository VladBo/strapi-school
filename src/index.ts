import type { Core } from "@strapi/strapi";

const H5P_UID = "api::h5p-content.h5p-content";
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "yi",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ю: "yu",
  я: "ya",
  ь: "",
  ъ: "",
  ы: "y",
  э: "e",
  ё: "yo",
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .split("")
    .map((character) => CYRILLIC_TO_LATIN[character] ?? character)
    .join("")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function preferredSlug(record: {
  title?: string;
  legacyPath?: string;
  legacyNid?: number;
}): string {
  const legacySlug = record.legacyPath?.split("/").filter(Boolean).at(-1);
  return (
    slugify(legacySlug || record.title || "") ||
    `quiz-${record.legacyNid ?? "content"}`
  );
}

async function backfillH5PSlugs(strapi: Core.Strapi): Promise<void> {
  const documents = strapi.documents(H5P_UID);
  const [drafts, published] = await Promise.all([
    documents.findMany({
      status: "draft",
      fields: ["title", "legacyPath", "legacyNid", "slug"],
      pagination: { pageSize: 1000 },
    }),
    documents.findMany({
      status: "published",
      fields: ["title", "legacyPath", "legacyNid", "slug"],
      pagination: { pageSize: 1000 },
    }),
  ]);
  const draftsByDocumentId = new Map(
    drafts.map((draft) => [draft.documentId, draft]),
  );
  const publishedDocumentIds = new Set(
    published.map(({ documentId }) => documentId),
  );
  const usedSlugs = new Map<string, Set<string>>();
  for (const row of [...drafts, ...published]) {
    if (!row.slug) continue;
    const owners = usedSlugs.get(row.slug) ?? new Set<string>();
    owners.add(row.documentId);
    usedSlugs.set(row.slug, owners);
  }

  function slugIsUsedByAnotherDocument(slug: string, documentId: string) {
    return [...(usedSlugs.get(slug) ?? [])].some(
      (owner) => owner !== documentId,
    );
  }

  async function backfill(row: (typeof drafts)[number], publish: boolean) {
    if (row.slug) return;
    const base = preferredSlug(row);
    let candidate = base;
    if (slugIsUsedByAnotherDocument(candidate, row.documentId)) {
      const suffix = row.legacyNid ? `-${row.legacyNid}` : "";
      candidate = `${base}${suffix}`;
      let index = 2;
      while (slugIsUsedByAnotherDocument(candidate, row.documentId)) {
        candidate = `${base}${suffix || ""}-${index++}`;
      }
    }

    await documents.update({
      documentId: row.documentId,
      data: { slug: candidate },
    });
    if (publish) {
      await documents.publish({ documentId: row.documentId });
    }
    const owners = usedSlugs.get(candidate) ?? new Set<string>();
    owners.add(row.documentId);
    usedSlugs.set(candidate, owners);
    strapi.log.info(
      `Backfilled H5P slug for document ${row.documentId}: ${candidate}`,
    );
  }

  for (const row of drafts) {
    if (row.slug) continue;
    await backfill(row, publishedDocumentIds.has(row.documentId));
  }

  for (const row of published) {
    if (row.slug || draftsByDocumentId.has(row.documentId)) continue;
    await backfill(row, true);
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    setImmediate(() => {
      void backfillH5PSlugs(strapi).catch((error: unknown) => {
        strapi.log.error(
          `H5P slug backfill failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
        );
      });
    });
  },
};

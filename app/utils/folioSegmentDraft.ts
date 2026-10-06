import type { StaffFolioSegmentInput } from "@shared/api";

/** Default draft for a new custom folio rule (PREFIX-SEQ with padding 5). */
export function createEmptyFolioSegmentDraft(
  sortOrder: number,
): StaffFolioSegmentInput {
  return {
    name: "",
    sort_order: sortOrder,
    is_active: true,
    category_scope: "all_categories",
    category_ids: [],
    coupon_scope: "any",
    discount_code_id: null,
    counter_scope: "segment",
    prefix_value: "",
    category_code: "",
    pattern_tokens: [
      { kind: "token", token: "PREFIX" },
      { kind: "literal", value: "-" },
      { kind: "token", token: "SEQ" },
    ],
    seq_padding: 5,
    start_number: 1,
    end_number: null,
  };
}

export interface StoreActionOptions {
  enterprise?: boolean;
}

const CATEGORY_ACTION_TYPES = new Set(["MYPOINT_LANDING", "LOYALTY"]);

export function redeemActionLabel(actionType: string): string {
  if (actionType === "MYPOINT_LANDING") return "XL Poin";
  if (actionType === "LOYALTY") return "myRewards";
  return actionType;
}

function enterpriseQuery(enterprise?: boolean): string {
  return enterprise ? "&enterprise=true" : "";
}

export function storeActionHref(
  actionType: string,
  actionParam: string,
  opts: StoreActionOptions = {},
): string | null {
  const param = actionParam.trim();
  if (!param) return null;
  if (actionType === "PDP") {
    return `/packages/by-option?code=${encodeURIComponent(param)}${enterpriseQuery(opts.enterprise)}`;
  }
  if (actionType === "PLP") {
    return `/packages/by-family?code=${encodeURIComponent(param)}${enterpriseQuery(opts.enterprise)}`;
  }
  if (CATEGORY_ACTION_TYPES.has(actionType)) {
    const q = new URLSearchParams({ code: param, source: actionType });
    if (opts.enterprise) q.set("enterprise", "true");
    return `/store/category?${q}`;
  }
  return null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function formatValidUntil(raw: unknown): { validUntil: string; hasValidUntil: boolean } {
  if (raw == null || raw === "") return { validUntil: "", hasValidUntil: false };

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    if (!Number.isFinite(year) || year < 2000) return { validUntil: "", hasValidUntil: false };
    return { validUntil: raw.slice(0, 10), hasValidUntil: true };
  }

  const ts = Number(raw);
  if (!Number.isFinite(ts) || ts <= 0) return { validUntil: "", hasValidUntil: false };
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) {
    return { validUntil: "", hasValidUntil: false };
  }
  return { validUntil: d.toISOString().slice(0, 10), hasValidUntil: true };
}

export function resolveRedeemActionParam(
  item: Record<string, unknown>,
  categoryCode: string,
  actionType: string,
): string {
  const fromItem = String(item.action_param ?? item.category_code ?? "").trim();
  if (fromItem) return fromItem;
  if (CATEGORY_ACTION_TYPES.has(actionType)) {
    return categoryCode.trim();
  }
  return "";
}

export function formatStoreSegments(res: Record<string, unknown> | null) {
  const segments: Array<{
    title: string;
    banners: Array<Record<string, unknown>>;
  }> = [];
  if (!res) return segments;
  const rawSegs = ((res.data as Record<string, unknown>)?.store_segments as unknown[]) ?? [];
  for (const s of rawSegs) {
    const seg = s as Record<string, unknown>;
    const banners = ((seg.banners as unknown[]) ?? []).map((b) => {
      const banner = b as Record<string, unknown>;
      const actionType = String(banner.action_type ?? "");
      const actionParam = String(banner.action_param ?? "");
      return {
        title: banner.title ?? "-",
        family_name: banner.family_name ?? "",
        validity: banner.validity ?? "",
        price: banner.discounted_price,
        original_price: banner.original_price,
        image_url: banner.image_url ?? banner.background_image_url,
        href: storeActionHref(actionType, actionParam),
        action_type: actionType,
        has_href: Boolean(storeActionHref(actionType, actionParam)),
      };
    });
    segments.push({ title: String(seg.title ?? "-"), banners });
  }
  return segments;
}

export function formatStoreFamilies(res: Record<string, unknown> | null) {
  const families: Array<{ label: string; id: string; icon: string; has_icon: boolean }> = [];
  if (!res) return families;
  for (const f of ((res.data as Record<string, unknown>)?.results as unknown[]) ?? []) {
    const row = f as Record<string, unknown>;
    const icon = String(row.icon_url ?? row.icon ?? "");
    families.push({
      label: String(row.label ?? "-"),
      id: String(row.id ?? ""),
      icon,
      has_icon: Boolean(icon),
    });
  }
  return families;
}

export function formatStorePackages(res: Record<string, unknown> | null) {
  const packages: Array<Record<string, unknown>> = [];
  if (!res) return packages;
  for (const p of ((res.data as Record<string, unknown>)?.results_price_only as unknown[]) ?? []) {
    const row = p as Record<string, unknown>;
    const original = Number(row.original_price ?? 0) || 0;
    const discounted = Number(row.discounted_price ?? 0) || 0;
    const actionType = String(row.action_type ?? "");
    const actionParam = String(row.action_param ?? "");
    const href = storeActionHref(actionType, actionParam);
    packages.push({
      title: row.title ?? "-",
      family_name: row.family_name ?? "",
      original_price: original,
      price: discounted > 0 ? discounted : original,
      has_discount: discounted > 0 && discounted !== original,
      validity: row.validity ?? "",
      href,
      has_href: Boolean(href),
    });
  }
  return packages;
}

export function formatRedeemables(res: Record<string, unknown> | null, opts: StoreActionOptions = {}) {
  const categories: Array<Record<string, unknown>> = [];
  if (!res) return categories;
  const data = res.data;
  const cats = (typeof data === "object" && data && "categories" in (data as object)
    ? (data as Record<string, unknown>).categories
    : []) as unknown[];
  for (const c of cats ?? []) {
    const cat = c as Record<string, unknown>;
    const categoryCode = String(cat.category_code ?? "");
    const items = ((cat.redeemables as unknown[]) ?? []).map((r) => {
      const item = r as Record<string, unknown>;
      const { validUntil, hasValidUntil } = formatValidUntil(item.valid_until);
      const actionType = String(item.action_type ?? "");
      const actionParam = resolveRedeemActionParam(item, categoryCode, actionType);
      const href = storeActionHref(actionType, actionParam, opts);
      return {
        name: item.name ?? "-",
        valid_until: validUntil,
        has_valid_until: hasValidUntil,
        icon: item.icon_url ?? item.image_url,
        has_icon: Boolean(item.icon_url ?? item.image_url),
        action_type: actionType,
        action_label: redeemActionLabel(actionType),
        href,
        has_href: Boolean(href),
      };
    });
    const landingItem = items.find((it) => CATEGORY_ACTION_TYPES.has(String(it.action_type)));
    const categoryHref = landingItem?.has_href ? String(landingItem.href) : null;
    categories.push({
      name: cat.category_name ?? "-",
      code: categoryCode,
      show_code: Boolean(categoryCode) && !isUuidLike(categoryCode),
      category_href: categoryHref,
      has_category_href: Boolean(categoryHref),
      redeem_items: items,
      has_items: items.length > 0,
    });
  }
  return categories;
}

function unwrapFamilyRow(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nested = row.package_family;
  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }
  return row;
}

function collectCategoryFamilies(payload: Record<string, unknown>): unknown[] {
  const direct = [
    payload.families,
    payload.results,
    payload.package_families,
    payload.items,
  ];
  for (const candidate of direct) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
}

export function formatCategoryFamilies(
  res: Record<string, unknown> | null,
  opts: StoreActionOptions = {},
): Array<Record<string, unknown>> {
  if (!res) return [];
  const payload = (res.data as Record<string, unknown> | undefined) ?? res;
  const list = collectCategoryFamilies(payload);
  const entQ = enterpriseQuery(opts.enterprise);
  const out: Array<Record<string, unknown>> = [];
  for (const f of list) {
    const row = unwrapFamilyRow(f);
    if (!row) continue;
    const id = String(
      row.package_family_code ?? row.id ?? row.family_code ?? row.code ?? "",
    ).trim();
    if (!id) continue;
    const label = String(row.name ?? row.label ?? row.family_name ?? row.title ?? "-");
    const icon = String(row.icon_url ?? row.icon ?? row.image_url ?? "");
    out.push({
      id,
      label,
      icon,
      has_icon: Boolean(icon),
      href: `/packages/by-family?code=${encodeURIComponent(id)}${entQ}`,
      has_href: true,
    });
  }
  return out;
}

export function categoryPageTitle(source: string): string {
  if (source === "MYPOINT_LANDING") return "Katalog XL Poin";
  if (source === "LOYALTY") return "Katalog myRewards";
  return "Katalog Reward";
}
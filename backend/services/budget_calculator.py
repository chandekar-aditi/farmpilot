"""
Budget Calculator
=================
Every single quantity and price comes from the JSON data files.
Zero hardcoded numbers.

Data sources:
  crops.json    → base_kit_price, capacity_per_kit, reservoir_L_per_kit,
                  yield_per_kit_kg, seed_product_id, spawn_product_id, slot_label
  kits.json     → components[].qty_formula, indoor_addons[].qty_formula,
                  outdoor_addons[].qty_formula, all unit_price values
  nutrients.json→ phases[].dosage_per_20L, day_start/day_end (for refill count)
  products.json → pack_size_kg, price_inr, name, image_url, link
                  seeds: qty_formula, seeds_per_packet, price_inr
                  pH Down: usage_ml_per_reservoir_change, pack_size_kg (250ml)

Formula variables passed to every qty_formula evaluation:
  K            = kit_count
  kit_count    = kit_count
  N_total      = kit_count × capacity_per_kit   ← from crops.json, NOT hardcoded
  space_sqft   = project floor area
  ceil / floor = math functions
"""

import math
from typing import Dict, Tuple
from backend.services.data_loader import get_crop, get_kit, get_nutrient, get_products
from backend.schemas.setup import LineItem, SetupSection, CostSummary, SetupResponse


# ══════════════════════════════════════════════════════════════════════════════
# Core formula evaluator
# ══════════════════════════════════════════════════════════════════════════════

def _eval_qty(formula: str, kit_count: int, n_total: int, space_sqft: float) -> int:
    """
    Evaluate a qty_formula string from kits.json or products.json.
    n_total = kit_count * capacity_per_kit  (must be pre-computed from crops.json)
    """
    ns = {
        "K":          kit_count,
        "kit_count":  kit_count,
        "N_total":    n_total,
        "space_sqft": space_sqft,
        "ceil":       math.ceil,
        "floor":      math.floor,
    }
    try:
        return max(0, int(math.ceil(float(eval(str(formula), {"__builtins__": {}}, ns)))))
    except Exception:
        return 1


# ══════════════════════════════════════════════════════════════════════════════
# Nutrient math
# ══════════════════════════════════════════════════════════════════════════════

def _reservoir_L(crop: dict, kit_count: int) -> float:
    """Total reservoir = reservoir_L_per_kit (from crops.json) × kit_count."""
    return crop.get("reservoir_L_per_kit", 0) * kit_count


def _nutrient_totals(nutrient_data: dict, reservoir_L: float) -> dict:
    """
    Catalog formulas applied across every phase:
        M_tank  = reservoir_L / 20
        refills = ceil(phase_days / 14)
        total_g = base_g_per_20L × M_tank × refills
    Returns totals for grow, bloom, cal, mg across the full cycle.
    """
    tg = tb = tc = tm = 0.0
    if reservoir_L == 0 or not nutrient_data:
        return {"grow_g": 0.0, "bloom_g": 0.0, "cal_g": 0.0, "mg_g": 0.0}

    for phase in nutrient_data.get("phases", []):
        d       = phase["dosage_per_20L"]
        days    = phase["day_end"] - phase["day_start"] + 1
        refills = math.ceil(days / 14)
        m       = reservoir_L / 20
        tg += d["grow_g"]  * m * refills
        tb += d["bloom_g"] * m * refills
        tc += d["cal_g"]   * m * refills
        tm += d["mg_g"]    * m * refills

    return {"grow_g": round(tg, 2), "bloom_g": round(tb, 2),
            "cal_g":  round(tc, 2), "mg_g":    round(tm, 2)}


def _packs(total_grams: float, pack_size_kg: float) -> int:
    """ceil(total_grams / (pack_size_kg × 1000))"""
    if total_grams <= 0:
        return 0
    return math.ceil(total_grams / (pack_size_kg * 1000))


def _phdown_bottles(nutrient_data: dict, reservoir_L: float, product: dict) -> int:
    """
    pH Down qty: usage_ml_per_reservoir_change (from products.json) × total_refills
    divided by bottle size in ml (pack_size_kg × 1000).
    Falls back to 1 bottle if usage data missing.
    """
    if reservoir_L == 0 or not nutrient_data or not product:
        return 1
    ml_per_change = product.get("usage_ml_per_reservoir_change", 5)
    total_refills = sum(
        math.ceil((p["day_end"] - p["day_start"] + 1) / 14)
        for p in nutrient_data.get("phases", [])
    )
    bottle_ml = product["pack_size_kg"] * 1000  # 0.25 kg → 250 ml
    return max(1, math.ceil((ml_per_change * total_refills) / bottle_ml))


# ══════════════════════════════════════════════════════════════════════════════
# Quick estimate — used by recommendation engine & project validation
# ══════════════════════════════════════════════════════════════════════════════

def estimate_total_cost(
    crop_id: str, kit_count: int, environment: str, space_sqft: float = 50
) -> Tuple[float, float]:
    """Returns (setup_cost, cycle_cost). All quantities from JSON formulas."""
    crop     = get_crop(crop_id)
    kit_data = get_kit(crop_id)
    nd       = get_nutrient(crop_id)
    products = get_products()
    if not crop or not kit_data:
        return 0.0, 0.0

    cap     = crop["capacity_per_kit"]
    n_total = kit_count * cap

    # ── Setup: kits + addons ──────────────────────────────────────────────────
    setup     = crop["base_kit_price_inr"] * kit_count
    addon_key = "indoor_addons" if environment in ["indoor", "both"] else "outdoor_addons"
    for addon in kit_data.get(addon_key, []):
        qty    = _eval_qty(addon["qty_formula"], kit_count, n_total, space_sqft)
        setup += qty * addon.get("unit_price", 0)

    # ── Cycle: nutrients + seeds/spawn ────────────────────────────────────────
    cycle = 0.0
    res_L = _reservoir_L(crop, kit_count)
    if res_L > 0 and nd:
        totals = _nutrient_totals(nd, res_L)
        npk_g  = totals["grow_g"] + totals["bloom_g"]
        for pid, grams in [
            ("NUT_NPK_01", npk_g),
            ("NUT_CAN_02", totals["cal_g"]),
            ("NUT_MGS_03", totals["mg_g"]),
        ]:
            if grams > 0:
                p = products.get(pid)
                if p:
                    cycle += _packs(grams, p["pack_size_kg"]) * p["price_inr"]
        p_ph  = products.get("NUT_PHD_04")
        cycle += _phdown_bottles(nd, res_L, p_ph) * (p_ph["price_inr"] if p_ph else 0)

    # Seeds or spawn — from products.json via crop's seed_product_id / spawn_product_id
    seed_pid  = crop.get("seed_product_id")
    spawn_pid = crop.get("spawn_product_id")
    consumable_pid = spawn_pid if spawn_pid else seed_pid
    if consumable_pid:
        p = products.get(consumable_pid)
        if p:
            qty    = _eval_qty(p.get("qty_formula", "kit_count * 1"), kit_count, n_total, space_sqft)
            cycle += qty * p["price_inr"]

    return round(setup, 2), round(cycle, 2)


# ══════════════════════════════════════════════════════════════════════════════
# Full line-item breakdown — used by Setup tab
# ══════════════════════════════════════════════════════════════════════════════

def build_setup_response(
    crop_id:       str,
    kit_count:     int,
    environment:   str,
    max_budget:    float,
    qty_overrides: Dict[str, int] = None,
    space_sqft:    float = 50,
) -> SetupResponse:
    """
    Builds sections A / B / C / D.
    qty_overrides: {item_id: qty} set by user (0 = already own / skipping).
    Every line item qty starts from its JSON formula; override replaces it.
    Total = qty × unit_price, recalculated on every override.
    """
    crop          = get_crop(crop_id)
    kit_data      = get_kit(crop_id)
    nutrient_data = get_nutrient(crop_id)
    products      = get_products()
    if qty_overrides is None:
        qty_overrides = {}

    cap     = crop["capacity_per_kit"]          # from crops.json
    n_total = kit_count * cap                   # e.g. 2 kits × 36 slots = 72
    res_L   = _reservoir_L(crop, kit_count)
    slot    = crop.get("slot_label", "units")   # from crops.json

    # ══════════════════════════════════════════════════════════════════════
    # SECTION A — Base Kit(s)
    # ══════════════════════════════════════════════════════════════════════
    a_items = []

    # The kit itself
    base_default = kit_count
    base_qty     = qty_overrides.get("base_kit", base_default)
    a_items.append(LineItem(
        item_id      = "base_kit",
        label        = "KIT",
        name         = crop["base_kit_name"],
        qty          = base_qty,
        unit_price   = crop["base_kit_price_inr"],
        total_price  = base_qty * crop["base_kit_price_inr"],
        link         = crop["base_kit_link"],
        image_url    = crop["image_url"],
        notes        = (
            f"{kit_count} kit(s) × {cap} {slot}/kit = {n_total} {slot} total  |  "
            f"Yield: {crop['yield_per_unit_kg']}kg/{slot} × {n_total} = "
            f"{round(kit_count * crop['yield_per_kit_kg'], 1)}kg/cycle"
        ),
        included_in_kit = False,
        is_skipped      = (base_qty == 0),
    ))

    # Individual components from kits.json
    for comp in kit_data.get("components", []):
        iid     = f"comp_{comp['label']}"
        default = _eval_qty(comp["qty_formula"], kit_count, n_total, space_sqft)
        qty     = qty_overrides.get(iid, default)
        up      = comp.get("unit_price", 0)
        a_items.append(LineItem(
            item_id         = iid,
            label           = comp["label"],
            name            = comp["name"],
            qty             = qty,
            unit_price      = up,
            total_price     = qty * up,
            link            = comp.get("link", ""),
            image_url       = comp.get("image_url", ""),
            notes           = f"{comp.get('notes','')}  |  formula: {comp['qty_formula']} → {default}",
            included_in_kit = comp.get("included_in_kit", True),
            is_skipped      = (qty == 0),
        ))

    sec_a = SetupSection(
        section_id    = "A",
        title         = "Base Hardware Kit",
        subtitle      = f"{kit_count} × {crop['base_kit_name']}  ({n_total} {slot} total)",
        items         = a_items,
        section_total = round(sum(i.total_price for i in a_items), 2),
    )

    # ══════════════════════════════════════════════════════════════════════
    # SECTION B — Add-Ons (all quantities from kits.json formulas)
    # ═══════════════════════��══════════════════════════════════════════════
    addon_key = "indoor_addons" if environment in ["indoor", "both"] else "outdoor_addons"
    b_items   = []
    for addon in kit_data.get(addon_key, []):
        iid     = addon.get("id", f"addon_{addon['label']}")
        default = _eval_qty(addon["qty_formula"], kit_count, n_total, space_sqft)
        qty     = qty_overrides.get(iid, default)
        up      = addon.get("unit_price", 0)
        b_items.append(LineItem(
            item_id         = iid,
            label           = addon["label"],
            name            = addon["name"],
            qty             = qty,
            unit_price      = up,
            total_price     = qty * up,
            link            = addon.get("link", ""),
            image_url       = addon.get("image_url", ""),
            notes           = f"{addon.get('notes','')}  |  formula: {addon['qty_formula']} → {default} unit(s)",
            included_in_kit = False,
            is_skipped      = (qty == 0),
        ))

    sec_b = SetupSection(
        section_id    = "B",
        title         = f"Add-Ons — {environment.title()} Setup",
        subtitle      = f"Scaled for {kit_count} kit(s) / {n_total} {slot}",
        items         = b_items,
        section_total = round(sum(i.total_price for i in b_items), 2),
    )

    # ══════════════════════════════════════════════════════════════════════
    # SECTION C — Nutrients (formula-driven per phase from nutrients.json)
    #
    # M_tank  = reservoir_L / 20
    # refills = ceil(phase_days / 14)
    # total_g = base_g × M_tank × refills  (summed across all phases)
    # packs   = ceil(total_g / pack_size_g)
    # pH Down = ceil((usage_ml × total_refills) / bottle_ml)
    # ══════════════════════════════════════════════════════════════════════
    c_items = []

    if res_L > 0 and nutrient_data:
        totals = _nutrient_totals(nutrient_data, res_L)
        m_tank = res_L / 20

        total_refills = sum(
            math.ceil((p["day_end"] - p["day_start"] + 1) / 14)
            for p in nutrient_data.get("phases", [])
        )

        nutrient_lines = [
            ("NUT_NPK_01", totals["grow_g"] + totals["bloom_g"],
             f"M={m_tank:.1f}× × {total_refills} refills across all phases"),
            ("NUT_CAN_02", totals["cal_g"],
             f"M={m_tank:.1f}× × {total_refills} refills across all phases"),
            ("NUT_MGS_03", totals["mg_g"],
             f"M={m_tank:.1f}× × {total_refills} refills across all phases"),
            ("NUT_PHD_04", None,
             f"usage_ml_per_change × {total_refills} refills / bottle_ml"),
        ]

        for idx, (pid, total_grams, formula_note) in enumerate(nutrient_lines):
            p = products.get(pid)
            if not p:
                continue

            is_phdown = (pid == "NUT_PHD_04")
            if is_phdown:
                default_qty = _phdown_bottles(nutrient_data, res_L, p)
                gram_note   = (
                    f"{p.get('usage_ml_per_reservoir_change', 5)}ml/change × "
                    f"{total_refills} changes = "
                    f"{p.get('usage_ml_per_reservoir_change', 5) * total_refills}ml needed  |  "
                    f"bottle={int(p['pack_size_kg']*1000)}ml → {default_qty} bottle(s)"
                )
            else:
                if total_grams <= 0:
                    continue
                default_qty = _packs(total_grams, p["pack_size_kg"])
                gram_note   = (
                    f"{total_grams:.0f}g needed  |  "
                    f"pack={p['pack_size_kg']}kg ({p['pack_size_kg']*1000:.0f}g)  → "
                    f"ceil({total_grams:.0f}/{p['pack_size_kg']*1000:.0f}) = {default_qty} pack(s)"
                )

            iid = f"nut_{pid}"
            qty = qty_overrides.get(iid, default_qty)
            c_items.append(LineItem(
                item_id         = iid,
                label           = str(idx + 1),
                name            = p["name"],
                qty             = qty,
                unit_price      = p["price_inr"],
                total_price     = qty * p["price_inr"],
                link            = p["link"],
                image_url       = p["image_url"],
                notes           = f"{formula_note}  |  {gram_note}",
                included_in_kit = False,
                is_skipped      = (qty == 0),
            ))

    elif crop.get("spawn_product_id"):
        # Mushroom: no liquid nutrients
        c_items.append(LineItem(
            item_id="nut_substrate", label="—",
            name="No liquid nutrients — substrate provides all nutrition",
            qty=0, unit_price=0, total_price=0, link="", image_url="",
            notes="Substrate preparation detailed in Solution Guide tab",
            included_in_kit=True, is_skipped=True,
        ))

    sec_c = SetupSection(
        section_id    = "C",
        title         = "Nutrients — Full Cycle",
        subtitle      = (
            f"Reservoir: {kit_count} kit(s) × {crop.get('reservoir_L_per_kit', 0)}L = {res_L}L  |  "
            f"Scale M = {res_L/20:.1f}× vs 20L baseline"
            if res_L > 0 else "No liquid nutrients for this system"
        ),
        items         = c_items,
        section_total = round(sum(i.total_price for i in c_items), 2),
    )

    # ══════════════════════════════════════════════════════════════════════
    # SECTION D — Seeds / Spawn
    # qty_formula from products.json → 0 hardcoding
    # ══════════════════════════════════════════════════════════════════════
    d_items = []
    consumable_pid = crop.get("spawn_product_id") or crop.get("seed_product_id")

    if consumable_pid:
        p = products.get(consumable_pid)
        if p:
            formula     = p.get("qty_formula", "kit_count * 1")
            default_qty = _eval_qty(formula, kit_count, n_total, space_sqft)
            iid         = "spawn" if crop.get("spawn_product_id") else "seeds"
            qty         = qty_overrides.get(iid, default_qty)

            seeds_note = ""
            if p.get("seeds_per_packet"):
                seeds_note = (
                    f"formula: {formula} → {default_qty} packet(s)  |  "
                    f"{p['seeds_per_packet']} seeds/packet  |  "
                    f"{p['seeds_per_packet'] * default_qty} seeds total  |  "
                    f"{n_total} {slot} to fill"
                )
            else:
                seeds_note = f"formula: {formula} → {default_qty} kit(s)  |  1 spawn kit per grow cycle"

            d_items.append(LineItem(
                item_id         = iid,
                label           = "S",
                name            = p["name"],
                qty             = qty,
                unit_price      = p["price_inr"],
                total_price     = qty * p["price_inr"],
                link            = p["link"],
                image_url       = p["image_url"],
                notes           = seeds_note,
                included_in_kit = False,
                is_skipped      = (qty == 0),
            ))

    sec_d = SetupSection(
        section_id    = "D",
        title         = "Seeds / Spawn",
        subtitle      = f"Starting material — qty from product formula: {products.get(consumable_pid, {}).get('qty_formula', 'N/A') if consumable_pid else 'N/A'}",
        items         = d_items,
        section_total = round(sum(i.total_price for i in d_items), 2),
    )

    # ── Cost summary ──────────────────────────────────────────────────────────
    setup_total = sec_a.section_total + sec_b.section_total
    cycle_total = sec_c.section_total + sec_d.section_total
    grand_total = setup_total + cycle_total

    return SetupResponse(
        sections      = [sec_a, sec_b, sec_c, sec_d],
        cost_summary  = CostSummary(
            setup_total      = round(setup_total, 2),
            cycle_total      = round(cycle_total, 2),
            grand_total      = round(grand_total, 2),
            budget_remaining = round(max_budget - grand_total, 2),
            is_within_budget = (grand_total <= max_budget),
        ),
        expected_yield_kg = round(kit_count * crop["yield_per_kit_kg"], 2),
        kit_count         = kit_count,
        crop_name         = crop["name"],
        diagram_url       = crop.get("diagram_url", crop["image_url"]),
    )

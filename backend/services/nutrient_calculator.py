"""
Nutrient Calculator
===================
Builds the Solution Guide tab response.

All dosage scaling uses the catalog formulas:
    M_tank  = reservoir_L / 20          (from crops.json: reservoir_L_per_kit * kit_count)
    refills = ceil(phase_days / 14)     (reservoir changed every 14 days per protocol)
    your_dose_g = base_g_per_20L * M_tank   (per single refill)
    total_g     = base_g_per_20L * M_tank * refills  (across full phase)

Packs to buy: ceil(total_g / (pack_size_kg * 1000))
"""
import math
from backend.services.data_loader import get_crop, get_nutrient, get_products
from backend.schemas.solution import (
    MixingStep, PhaseNutrientCard, PhaseDosage,
    NutrientBuyItem, SolutionResponse,
)

# Keywords that map mixing step text to a product image
_STEP_PRODUCT_MAP = {
    "calcium nitrate": "NUT_CAN_02",
    "ca(no3)":         "NUT_CAN_02",
    "npk":             "NUT_NPK_01",
    "grow":            "NUT_NPK_01",
    "bloom":           "NUT_NPK_01",
    "epsom":           "NUT_MGS_03",
    "mgso4":           "NUT_MGS_03",
    "magnesium":       "NUT_MGS_03",
    "ph down":         "NUT_PHD_04",
    "ph adjuster":     "NUT_PHD_04",
}

_CRITICAL_WORDS = {"never", "mandatory", "always", "first", "critical", "do not", "strict"}


def _step_product(text: str, products: dict):
    tl = text.lower()
    for kw, pid in _STEP_PRODUCT_MAP.items():
        if kw in tl:
            p = products.get(pid)
            if p:
                return p["short_name"], p["image_url"]
    return None, None


def build_solution_response(crop_id: str, kit_count: int) -> SolutionResponse:
    crop     = get_crop(crop_id)
    nd       = get_nutrient(crop_id)
    products = get_products()

    # ── Reservoir volume ─────────────────────────────────────────────────────
    res_L_per_kit = crop.get("reservoir_L_per_kit", 0)
    reservoir_L   = res_L_per_kit * kit_count      # total reservoir for this project
    m_tank_base   = reservoir_L / 20 if reservoir_L > 0 else 0  # scale vs 20L baseline

    # ── Mixing steps ─────────────────────────────────────────────────────────
    mixing_steps = []
    for i, text in enumerate(nd.get("mixing_sequence", []), 1):
        pname, pimg = _step_product(text, products)
        is_crit = any(w in text.lower() for w in _CRITICAL_WORDS)
        mixing_steps.append(MixingStep(
            step_num          = i,
            instruction       = text,
            product_name      = pname,
            product_image_url = pimg,
            is_critical       = is_crit,
        ))

    # ── Phase cards + accumulate totals ──────────────────────────────────────
    phase_cards = []
    total = {"grow_g": 0.0, "bloom_g": 0.0, "cal_g": 0.0, "mg_g": 0.0}

    for phase in nd.get("phases", []):
        d          = phase["dosage_per_20L"]
        phase_days = phase["day_end"] - phase["day_start"] + 1
        refills    = math.ceil(phase_days / 14)

        # Scaled single-refill dose for this project's reservoir
        scaled = PhaseDosage(
            grow_g  = round(d["grow_g"]  * m_tank_base, 1),
            bloom_g = round(d["bloom_g"] * m_tank_base, 1),
            cal_g   = round(d["cal_g"]   * m_tank_base, 1),
            mg_g    = round(d["mg_g"]    * m_tank_base, 1),
        )

        # Accumulate totals across full cycle
        total["grow_g"]  += d["grow_g"]  * m_tank_base * refills
        total["bloom_g"] += d["bloom_g"] * m_tank_base * refills
        total["cal_g"]   += d["cal_g"]   * m_tank_base * refills
        total["mg_g"]    += d["mg_g"]    * m_tank_base * refills

        phase_cards.append(PhaseNutrientCard(
            phase_num      = phase["phase"],
            name           = phase["name"],
            week_start     = phase["week_start"],
            week_end       = phase["week_end"],
            day_start      = phase["day_start"],
            day_end        = phase["day_end"],
            dosage_per_20L = PhaseDosage(**d),
            your_reservoir_L = reservoir_L,
            your_dosage    = scaled,
            ec_min         = phase["ec_min"],
            ec_max         = phase["ec_max"],
            tds_min        = phase["tds_min"],
            tds_max        = phase["tds_max"],
            notes          = phase.get("observations", [])[:2],
        ))

    # ── Buy list ─────────────────────────────────────────────────────────────
    buy_list    = []
    total_cost  = 0.0
    npk_g       = total["grow_g"] + total["bloom_g"]

    nutrient_lines = [
        ("NUT_NPK_01", npk_g),
        ("NUT_CAN_02", total["cal_g"]),
        ("NUT_MGS_03", total["mg_g"]),
        ("NUT_PHD_04", -1),   # -1 = flat 1 bottle
    ]

    for pid, total_grams in nutrient_lines:
        p = products.get(pid)
        if not p:
            continue
        flat_bottle = (pid == "NUT_PHD_04")
        if flat_bottle:
            packs = 1
        else:
            if total_grams <= 0:
                continue
            packs = math.ceil(total_grams / (p["pack_size_kg"] * 1000))

        cost = packs * p["price_inr"]
        total_cost += cost

        buy_list.append(NutrientBuyItem(
            product_id         = pid,
            name               = p["name"],
            short_name         = p["short_name"],
            total_grams_needed = round(total_grams, 1) if not flat_bottle else 0,
            packs_to_buy       = packs,
            pack_price         = p["price_inr"],
            total_price        = cost,
            link               = p["link"],
            image_url          = p["image_url"],
        ))

    return SolutionResponse(
        crop_name          = crop["name"],
        mixing_steps       = mixing_steps,
        phase_cards        = phase_cards,
        buy_list           = buy_list,
        total_nutrient_cost= round(total_cost, 2),
    )

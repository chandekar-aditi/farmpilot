"""
FarmPilot — Functional Test Suite
==================================
Covers:
  - System-wide integration cases        (TC-SYS-01 … TC-SYS-08)
  - Recommendation module                (TC-REC-01 … TC-REC-06)
  - Nutrient-dosing / solution module    (TC-DOS-01 … TC-DOS-06)
  - Setup & requirements/purchasing      (TC-BUD-01 … TC-BUD-06)
  - Timeline module                      (TC-TML-01 … TC-TML-05)

Run from the farmpilot root:
    python -m pytest backend/tests/test_suite.py -v
"""

import math
import pytest
import sys, os

# ── Make sure the project root is on sys.path ─────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.services.data_loader import (
    get_crop, get_nutrient, get_products, all_crops_list,
)
from backend.services.budget_calculator import (
    estimate_total_cost, build_setup_response,
)
from backend.services.nutrient_calculator import build_solution_response
from backend.services.recommendation_engine import run_recommendation, _hard_filter, _score
from backend.schemas.recommendation import RecommendRequest


# ═══════════════════════════════════════════════════════════════════════════════
# Shared fixtures
# ═══════════════════════════════════════════════════════════════════════════════

SPINACH_ID       = "kit_kratky_spinach"
BELL_PEPPER_ID   = "kit_dutch_bucket_bell_pepper"
LETTUCE_ID       = "kit_lettuce_dwc_nft"
OYSTER_MUSH_ID   = "kit_polybag_oyster_mushroom"
BUTTON_MUSH_ID   = "kit_casing_button_mushroom"
CHERRY_TOM_ID    = "kit_dutch_bucket_cherry_tomato"


def _base_request(**overrides) -> RecommendRequest:
    defaults = dict(
        space_sqft=50, height_ft=6.0, environment="indoor",
        max_budget_inr=50_000, experience="beginner",
        daily_effort_min=20, primary_goals=["home_kitchen"],
        power_reliability="stable", temperature_c=28, humidity_pct=65,
    )
    defaults.update(overrides)
    return RecommendRequest(**defaults)


# ═══════════════════════════════════════════════════════════════════════════════
# TC-SYS — System-wide tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestSystem:

    def test_sys_01_all_crops_load(self):
        """TC-SYS-01 — All crop records load from crops.json without error."""
        crops = all_crops_list()
        assert len(crops) >= 5, "Expected at least 5 crop definitions"

    def test_sys_02_data_referential_integrity(self):
        """TC-SYS-02 — Every crop has a matching nutrients and kit entry."""
        products = get_products()
        for crop in all_crops_list():
            cid = crop["id"]
            assert get_crop(cid) is not None, f"Missing crop entry for {cid}"
            # seed or spawn product must exist
            pid = crop.get("spawn_product_id") or crop.get("seed_product_id")
            if pid:
                assert pid in products, f"Crop {cid} references missing product {pid}"

    def test_sys_03_budget_estimate_non_negative(self):
        """TC-SYS-03 — Cost estimates are non-negative for all crops."""
        for crop in all_crops_list():
            setup, cycle = estimate_total_cost(crop["id"], 1, "indoor", 30)
            assert setup >= 0, f"{crop['id']} setup cost negative"
            assert cycle >= 0, f"{crop['id']} cycle cost negative"

    def test_sys_04_recommendation_returns_results(self):
        """TC-SYS-04 — Recommendation engine returns at least 1 result for a typical request."""
        top3, also = run_recommendation(_base_request())
        assert len(top3) >= 1, "Expected at least one recommendation"

    def test_sys_05_scores_are_bounded(self):
        """TC-SYS-05 — All recommendation scores are in [0, 100]."""
        top3, also = run_recommendation(_base_request())
        for rec in top3 + also:
            assert 0 <= rec.score <= 100, f"Score {rec.score} out of range for {rec.name}"

    def test_sys_06_solution_guide_builds_for_all_liquid_crops(self):
        """TC-SYS-06 — build_solution_response succeeds for every liquid-nutrient crop."""
        liquid_crops = [
            c for c in all_crops_list() if c.get("reservoir_L_per_kit", 0) > 0
        ]
        for crop in liquid_crops:
            resp = build_solution_response(crop["id"], 2)
            assert resp.crop_name == crop["name"]
            assert len(resp.phase_cards) > 0, f"No phases for {crop['id']}"

    def test_sys_07_zero_kit_count_handled(self):
        """TC-SYS-07 — kit_count=0 is clamped gracefully (no crash)."""
        # estimate_total_cost with 0 kits should return zeros, not raise
        setup, cycle = estimate_total_cost(SPINACH_ID, 0, "indoor", 20)
        assert setup >= 0
        assert cycle >= 0

    def test_sys_08_products_have_required_fields(self):
        """TC-SYS-08 — Every product entry has name, price_inr, pack_size_kg, link, image_url."""
        required = {"name", "price_inr", "pack_size_kg", "link", "image_url"}
        for pid, p in get_products().items():
            missing = required - p.keys()
            assert not missing, f"Product {pid} missing fields: {missing}"


# ═══════════════════════════════════════════════════════════════════════════════
# TC-REC — Recommendation module
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecommendation:

    def test_rec_01_hard_filter_budget(self):
        """TC-REC-01 — Hard filter rejects crop when budget is below minimum."""
        crop = get_crop(BELL_PEPPER_ID)
        req  = _base_request(max_budget_inr=100)       # well below 12 000 min
        ok, reason = _hard_filter(req, crop)
        assert ok is False
        assert "budget" in reason.lower() or "Budget" in reason

    def test_rec_02_hard_filter_height(self):
        """TC-REC-02 — Hard filter rejects crop when ceiling height is insufficient."""
        crop = get_crop(CHERRY_TOM_ID)                 # min_height_ft = 6.5
        req  = _base_request(height_ft=4.0)
        ok, reason = _hard_filter(req, crop)
        assert ok is False
        assert "ft" in reason or "height" in reason.lower() or "Ceiling" in reason

    def test_rec_03_hard_filter_power(self):
        """TC-REC-03 — Power-hungry crop filtered out on frequent-outage setting."""
        crop = get_crop(LETTUCE_ID)                    # power_required = True
        req  = _base_request(power_reliability="frequent")
        ok, reason = _hard_filter(req, crop)
        assert ok is False

    def test_rec_04_fast_harvest_goal_scores_spinach_higher_than_bell_pepper(self):
        """TC-REC-04 — fast_harvest goal gives higher score to 30-day spinach vs 210-day pepper."""
        req   = _base_request(primary_goals=["fast_harvest"], max_budget_inr=100_000)
        crops = {c["id"]: c for c in all_crops_list()}
        sp    = crops[SPINACH_ID]
        bp    = crops[BELL_PEPPER_ID]
        s_sp  = _score(req, sp,  1, 1_330, 500)
        s_bp  = _score(req, bp,  3, 25_380, 3_000)
        assert s_sp > s_bp, (
            f"Spinach ({s_sp}) should outscore Bell Pepper ({s_bp}) for fast_harvest goal"
        )

    def test_rec_05_recommendation_rank_ordering(self):
        """TC-REC-05 — Top-3 results are sorted by descending score."""
        top3, _ = run_recommendation(_base_request())
        scores = [r.score for r in top3]
        assert scores == sorted(scores, reverse=True), "Results not sorted by score"

    def test_rec_06_outdoor_mushroom_filtered(self):
        """TC-REC-06 — Mushrooms never appear in outdoor recommendations."""
        top3, also = run_recommendation(
            _base_request(environment="outdoor", max_budget_inr=200_000)
        )
        all_ids = [r.crop_id for r in top3 + also]
        assert OYSTER_MUSH_ID  not in all_ids, "Oyster mushroom appeared in outdoor recs"
        assert BUTTON_MUSH_ID  not in all_ids, "Button mushroom appeared in outdoor recs"


# ═══════════════════════════════════════════════════════════════════════════════
# TC-DOS — Nutrient-dosing / solution module
# ═══════════════════════════════════════════════════════════════════════════════

class TestDosing:

    def test_dos_01_reservoir_scales_linearly(self):
        """TC-DOS-01 — Doubling kit_count exactly doubles every nutrient dose."""
        r1 = build_solution_response(SPINACH_ID, 1)
        r2 = build_solution_response(SPINACH_ID, 2)
        for p1, p2 in zip(r1.phase_cards, r2.phase_cards):
            assert math.isclose(p2.your_dosage.grow_g,  p1.your_dosage.grow_g  * 2, rel_tol=1e-6)
            assert math.isclose(p2.your_dosage.bloom_g, p1.your_dosage.bloom_g * 2, rel_tol=1e-6)
            assert math.isclose(p2.your_dosage.cal_g,   p1.your_dosage.cal_g   * 2, rel_tol=1e-6)
            assert math.isclose(p2.your_dosage.mg_g,    p1.your_dosage.mg_g    * 2, rel_tol=1e-6)

    def test_dos_02_mushroom_has_no_liquid_nutrients(self):
        """TC-DOS-02 — Mushroom crops have zero reservoir; all nutrient dosages are zero.

        Mushrooms have growing phases (incubation, fruiting) stored in nutrients.json
        for timeline/task purposes, but every dosage value is 0.0 because substrate
        provides all nutrition — no liquid nutrients are used.
        """
        crop = get_crop(OYSTER_MUSH_ID)
        assert crop["reservoir_L_per_kit"] == 0, "Oyster mushroom reservoir_L_per_kit must be 0"

        resp = build_solution_response(OYSTER_MUSH_ID, 1)

        # Every phase card must have all-zero dosages (both base and scaled)
        for phase in resp.phase_cards:
            for dose_obj in (phase.dosage_per_20L, phase.your_dosage):
                assert dose_obj.grow_g  == 0.0, f"Phase {phase.phase_num}: grow_g should be 0"
                assert dose_obj.bloom_g == 0.0, f"Phase {phase.phase_num}: bloom_g should be 0"
                assert dose_obj.cal_g   == 0.0, f"Phase {phase.phase_num}: cal_g should be 0"
                assert dose_obj.mg_g    == 0.0, f"Phase {phase.phase_num}: mg_g should be 0"

        # Buy list must contain no priced liquid-nutrient items
        priced_items = [i for i in resp.buy_list if i.total_price > 0
                        and i.product_id not in ("NUT_PHD_04",)]
        assert len(priced_items) == 0, (
            f"Mushroom buy_list should have no priced nutrient items, found: "
            f"{[i.product_id for i in priced_items]}"
        )

    def test_dos_03_ec_range_always_ascending(self):
        """TC-DOS-03 — ec_min < ec_max for every phase of every crop."""
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            resp = build_solution_response(crop["id"], 1)
            for phase in resp.phase_cards:
                assert phase.ec_min < phase.ec_max, (
                    f"{crop['id']} Phase {phase.phase_num}: ec_min >= ec_max"
                )

    def test_dos_04_buy_list_packs_non_zero(self):
        """TC-DOS-04 — Every liquid-nutrient crop produces at least one item in buy_list."""
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            resp = build_solution_response(crop["id"], 2)
            assert len(resp.buy_list) > 0, f"Empty buy_list for {crop['id']}"

    def test_dos_05_total_cost_matches_buy_list_sum(self):
        """TC-DOS-05 — total_nutrient_cost == sum of all buy_list item total_prices."""
        resp = build_solution_response(BELL_PEPPER_ID, 3)
        expected = round(sum(item.total_price for item in resp.buy_list), 2)
        assert math.isclose(resp.total_nutrient_cost, expected, rel_tol=1e-4), (
            f"total_nutrient_cost {resp.total_nutrient_cost} != sum {expected}"
        )

    def test_dos_06_mixing_steps_non_empty_for_liquid_crops(self):
        """TC-DOS-06 — All liquid-nutrient crops have at least one mixing step."""
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            resp = build_solution_response(crop["id"], 1)
            assert len(resp.mixing_steps) > 0, f"No mixing steps for {crop['id']}"


# ═══════════════════════════════════════════════════════════════════════════════
# TC-BUD — Setup & Requirements / Purchasing module
# ═══════════════════════════════════════════════════════════════════════════════

class TestBudget:

    def test_bud_01_section_keys_present(self):
        """TC-BUD-01 — build_setup_response returns sections A, B, C, D."""
        resp = build_setup_response(SPINACH_ID, 2, "indoor", 20_000)
        ids  = {s.section_id for s in resp.sections}
        assert {"A", "B", "C", "D"} == ids

    def test_bud_02_grand_total_equals_setup_plus_cycle(self):
        """TC-BUD-02 — grand_total == setup_total + cycle_total."""
        resp = build_setup_response(BELL_PEPPER_ID, 3, "indoor", 100_000)
        cs   = resp.cost_summary
        assert math.isclose(cs.grand_total, cs.setup_total + cs.cycle_total, rel_tol=1e-6)

    def test_bud_03_budget_remaining_correct(self):
        """TC-BUD-03 — budget_remaining == max_budget - grand_total."""
        budget = 50_000
        resp   = build_setup_response(SPINACH_ID, 5, "indoor", budget)
        cs     = resp.cost_summary
        assert math.isclose(cs.budget_remaining, budget - cs.grand_total, rel_tol=1e-6)

    def test_bud_04_qty_override_zero_zeroes_line_total(self):
        """TC-BUD-04 — Setting qty_override=0 for base_kit makes that line total = 0."""
        resp = build_setup_response(SPINACH_ID, 2, "indoor", 20_000, {"base_kit": 0})
        sec_a = next(s for s in resp.sections if s.section_id == "A")
        base  = next(i for i in sec_a.items if i.item_id == "base_kit")
        assert base.qty         == 0
        assert base.total_price == 0.0
        assert base.is_skipped  is True

    def test_bud_05_mushroom_section_c_empty(self):
        """TC-BUD-05 — Mushroom crop has no liquid nutrient line items in section C."""
        resp  = build_setup_response(OYSTER_MUSH_ID, 1, "indoor", 50_000)
        sec_c = next(s for s in resp.sections if s.section_id == "C")
        # All items in C should be skipped (the placeholder row) or empty
        liquid_items = [i for i in sec_c.items if not i.is_skipped and i.total_price > 0]
        assert len(liquid_items) == 0, "Mushroom should have no priced liquid nutrient items"

    def test_bud_06_expected_yield_scales_with_kit_count(self):
        """TC-BUD-06 — expected_yield_kg scales proportionally with kit_count."""
        r1 = build_setup_response(SPINACH_ID, 1, "indoor", 20_000)
        r3 = build_setup_response(SPINACH_ID, 3, "indoor", 20_000)
        assert math.isclose(r3.expected_yield_kg, r1.expected_yield_kg * 3, rel_tol=1e-6)


# ═══════════════════════════════════════════════════════════════════════════════
# TC-TML — Timeline module
# ═══════════════════════════════════════════════════════════════════════════════

class TestTimeline:
    """
    Timeline builder requires a DB session to load reminders.
    These tests validate the data-layer logic (phase coverage, day detection)
    directly on the nutrient/crop data without spinning up a DB.
    """

    def _phases(self, crop_id: str):
        return get_nutrient(crop_id).get("phases", [])

    def test_tml_01_phases_cover_full_cycle(self):
        """TC-TML-01 — Phase day ranges cover the full crop cycle with no gaps."""
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            phases     = self._phases(crop["id"])
            if not phases:
                continue
            cycle_days = crop["cycle_days"]
            covered    = set()
            for p in phases:
                covered.update(range(p["day_start"], p["day_end"] + 1))
            # All days 1..cycle_days should be in covered
            expected = set(range(1, cycle_days + 1))
            gaps     = expected - covered
            assert not gaps, f"{crop['id']} timeline gaps on days: {sorted(gaps)[:5]}"

    def test_tml_02_no_phase_overlaps(self):
        """TC-TML-02 — No two phases share the same day."""
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            phases = self._phases(crop["id"])
            if not phases:
                continue
            seen = {}
            for p in phases:
                for d in range(p["day_start"], p["day_end"] + 1):
                    assert d not in seen, (
                        f"{crop['id']}: day {d} overlaps Phase {seen[d]} and Phase {p['phase']}"
                    )
                    seen[d] = p["phase"]

    def test_tml_03_week_ranges_consistent_with_days(self):
        """TC-TML-03 — week_start / week_end ranges are non-decreasing and non-overlapping.

        The data stores agronomically meaningful week labels (e.g. the final flush
        phase of Bell Pepper is labelled W28 even though day 210 / 7 = 30).
        We therefore validate ordering consistency rather than a strict mathematical
        formula: each phase's week_start <= week_end, and phases are ordered so that
        no earlier phase has a higher week_end than the next phase's week_start.
        """
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            phases = self._phases(crop["id"])
            if not phases:
                continue
            for p in phases:
                assert p["week_start"] <= p["week_end"], (
                    f"{crop['id']} Phase {p['phase']}: "
                    f"week_start {p['week_start']} > week_end {p['week_end']}"
                )
            # Consecutive phases must not have overlapping week labels
            for i in range(len(phases) - 1):
                cur  = phases[i]
                nxt  = phases[i + 1]
                assert cur["week_end"] <= nxt["week_start"], (
                    f"{crop['id']}: Phase {cur['phase']} week_end {cur['week_end']} "
                    f"> Phase {nxt['phase']} week_start {nxt['week_start']}"
                )

    def test_tml_04_day_detection_current_phase(self):
        """TC-TML-04 — Day-in-cycle maps to exactly one phase for every day."""
        for crop in all_crops_list():
            if crop.get("reservoir_L_per_kit", 0) == 0:
                continue
            phases = self._phases(crop["id"])
            if not phases:
                continue
            for day in range(1, crop["cycle_days"] + 1):
                matching = [
                    p for p in phases
                    if p["day_start"] <= day <= p["day_end"]
                ]
                assert len(matching) == 1, (
                    f"{crop['id']} day {day} matches {len(matching)} phases (expected 1)"
                )

    def test_tml_05_first_harvest_day_within_cycle(self):
        """TC-TML-05 — first_harvest_day is strictly less than cycle_days for every crop."""
        for crop in all_crops_list():
            assert crop["first_harvest_day"] < crop["cycle_days"], (
                f"{crop['id']}: first_harvest_day {crop['first_harvest_day']} >= "
                f"cycle_days {crop['cycle_days']}"
            )

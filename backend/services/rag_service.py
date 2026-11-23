"""
RAG Service
===========
ChromaDB knowledge base for FarmPilot chat.

Seeding:    One-time at startup. Chunks every phase, mixing step, observation.
Retrieval:  ALWAYS filtered to the user's current project crop_id.
            If no project is active, retrieves top-k from all crops.
Context:    build_system_prompt() assembles ALL 7 context layers:
              1. User profile
              2. Project details (space, budget, kit count, goals, env)
              3. Per-project inputs (temperature, humidity, power, effort)
              4. Current phase + day
              5. Quantity overrides (what user already has)
              6. Last 10 activities + reminder statuses
              7. Retrieved crop knowledge chunks (project crop only)
"""
import os, json
from datetime import date
from typing import Optional
import chromadb
from chromadb.utils import embedding_functions
from backend.services.data_loader import get_crops, get_nutrients, get_nutrient

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
COLLECTION  = "farmpilot_knowledge"
_col        = None


# ─── Collection ───────────────────────────────────────────────────────────────

def _get_col():
    global _col
    if _col is None:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _col = client.get_or_create_collection(COLLECTION, embedding_function=ef)
    return _col


# ─── Seed ─────────────────────────────────────────────────────────────────────

def seed_knowledge_base():
    """Seed once at startup — idempotent."""
    col = _get_col()
    if col.count() > 10:
        print("[RAG] Already seeded — skipping.")
        return

    print("[RAG] Seeding knowledge base...")
    crops    = get_crops()
    nutrients= get_nutrients()
    docs, metas, ids = [], [], []

    for cid, crop in crops.items():
        nd = nutrients.get(cid, {})

        # Chunk: crop overview
        docs.append(
            f"Crop: {crop['name']}. System: {crop['system']}. "
            f"Cycle: {crop['cycle_days']} days. First harvest day: {crop['first_harvest_day']}. "
            f"Yield per kit: {crop['yield_per_kit_kg']} kg. "
            f"pH range: {crop.get('ph_min','N/A')}–{crop.get('ph_max','N/A')}. "
            f"Daily effort: {crop['daily_effort_min']} mins/day. "
            f"{crop.get('description','')}"
        )
        metas.append({"crop_id": cid, "topic": "overview", "phase": "0"})
        ids.append(f"{cid}__overview")

        # Chunk: mixing protocol + critical rules
        if nd.get("mixing_sequence"):
            seq  = " → ".join(nd["mixing_sequence"])
            crit = "; ".join(nd.get("critical_rules", []))
            docs.append(f"Mixing protocol for {crop['name']}: {seq}. Critical rules: {crit}")
            metas.append({"crop_id": cid, "topic": "mixing", "phase": "0"})
            ids.append(f"{cid}__mixing")

        # Chunks per phase
        for phase in nd.get("phases", []):
            pn = str(phase["phase"])
            d  = phase["dosage_per_20L"]

            # Dosage
            docs.append(
                f"{crop['name']} Phase {pn} ({phase['name']}, W{phase['week_start']}–W{phase['week_end']}, "
                f"Day {phase['day_start']}–{phase['day_end']}): "
                f"Grow {d['grow_g']}g  Bloom {d['bloom_g']}g  CalNit {d['cal_g']}g  Epsom {d['mg_g']}g  per 20L. "
                f"Target EC {phase['ec_min']}–{phase['ec_max']} mS/cm, TDS {phase['tds_min']}–{phase['tds_max']} ppm."
            )
            metas.append({"crop_id": cid, "topic": "dosage", "phase": pn})
            ids.append(f"{cid}__p{pn}__dosage")

            # Daily tasks
            if phase.get("daily_tasks"):
                docs.append(f"{crop['name']} Phase {pn} ({phase['name']}) daily tasks: "
                            + ". ".join(phase["daily_tasks"]))
                metas.append({"crop_id": cid, "topic": "daily_tasks", "phase": pn})
                ids.append(f"{cid}__p{pn}__daily")

            # Weekly tasks
            if phase.get("weekly_tasks"):
                docs.append(f"{crop['name']} Phase {pn} ({phase['name']}) weekly tasks: "
                            + ". ".join(phase["weekly_tasks"]))
                metas.append({"crop_id": cid, "topic": "weekly_tasks", "phase": pn})
                ids.append(f"{cid}__p{pn}__weekly")

            # Observations
            if phase.get("observations"):
                docs.append(f"{crop['name']} Phase {pn} ({phase['name']}) what to observe: "
                            + ". ".join(phase["observations"]))
                metas.append({"crop_id": cid, "topic": "observations", "phase": pn})
                ids.append(f"{cid}__p{pn}__obs")

    # Insert in batches of 50
    for i in range(0, len(docs), 50):
        _get_col().add(
            documents=docs[i:i+50],
            metadatas=metas[i:i+50],
            ids=ids[i:i+50],
        )
    print(f"[RAG] Seeded {len(docs)} chunks.")


# ─── Retrieval — STRICT project crop filter ───────────────────────────────────

def retrieve_context(query: str, crop_id: str, top_k: int = 5) -> str:
    """
    Always filters to the project's crop_id.
    Returns the top-k most relevant chunks as a single string.
    """
    col = _get_col()
    count = col.count()
    if count == 0:
        return ""
    try:
        results = col.query(
            query_texts=[query],
            n_results=min(top_k, count),
            where={"crop_id": crop_id},   # strict filter — only this crop
        )
        chunks = results["documents"][0] if results["documents"] else []
        return "\n---\n".join(chunks)
    except Exception:
        return ""


# ─── Context builder — all 7 layers ───────────────────────────────────────────

def build_system_prompt(
    user,
    project,
    activities: list,
    reminders:  list,
    chat_history: list,
    retrieved_chunks: str,
) -> str:
    """
    Assembles the full system prompt with 7 context layers.
    project is guaranteed non-None when called from chat router
    (project_id is required for chat).
    """
    # ── Layer 6: Activities ───────────────────────────────────────────────────
    act_lines = [
        f"  [{a.action_type}] {a.description}"
        for a in activities[-10:]
    ]
    acts_text = "\n".join(act_lines) if act_lines else "  No recent activities."

    # ── Layer 6: Reminders ────────────────────────────────────────────────────
    rem_lines = [
        f"  Day {r.cycle_day} | {r.phase_name} | {r.task_description[:70]} | "
        f"{'✓ Done' if r.is_done else '⏳ Pending'}"
        for r in reminders
    ]
    rems_text = "\n".join(rem_lines) if rem_lines else "  No reminders set."

    # ── Layer 4: Current phase + day ──────────────────────────────────────────
    cur_day          = 1
    current_phase    = "Not started"
    phase_ec_range   = "N/A"
    phase_daily      = []
    phase_weekly     = []

    if project:
        start = project.start_date.date() if hasattr(project.start_date, "date") else project.start_date
        cur_day = max(1, (date.today() - start).days + 1)

        nd = get_nutrient(project.crop_id)
        if nd:
            for phase in nd.get("phases", []):
                if phase["day_start"] <= cur_day <= phase["day_end"]:
                    current_phase  = f"Phase {phase['phase']}: {phase['name']} (W{phase['week_start']}–W{phase['week_end']})"
                    phase_ec_range = f"{phase['ec_min']}–{phase['ec_max']} mS/cm"
                    phase_daily    = phase.get("daily_tasks", [])
                    phase_weekly   = phase.get("weekly_tasks", [])
                    break

    # ── Layer 5: Qty overrides ────────────────────────────────────────────────
    qty_ctx = "  None recorded."
    if project:
        try:
            overrides = json.loads(project.addons_json or "{}")
            if overrides:
                qty_ctx = "  " + "; ".join(
                    f"{k} = {v} {'(skipping — already owned)' if v == 0 else 'unit(s)'}"
                    for k, v in overrides.items()
                )
        except Exception:
            pass

    # ── Layer 2: Goals ────────────────────────────────────────────────────────
    goals_text = "Not specified"
    if project:
        try:
            goals_text = ", ".join(json.loads(project.primary_goals or "[]")) or "Not specified"
        except Exception:
            pass

    # ── Layer 1 + 2 + 3: User + Project + Per-project inputs ─────────────────
    prompt = f"""You are FarmPilot AI — a precise, friendly vertical farming advisor.
You are answering questions about THIS USER'S SPECIFIC PROJECT ONLY.
Use only the context below. Never make up numbers.

════════════════════════════════════════
USER PROFILE
════════════════════════════════════════
  Name:          {user.name}
  Experience:    {user.experience_level}
  Default effort:{user.daily_effort_min} mins/day
  Home temp:     {user.temperature_c}°C | Humidity: {user.humidity_pct}%
  Power:         {user.power_reliability}

════════════════════════════════════════
ACTIVE PROJECT
════════════════════════════════════════
  Crop:          {project.crop_name if project else 'None'}
  System ID:     {project.crop_id if project else 'N/A'}
  Environment:   {project.environment if project else 'N/A'}
  Space:         {project.space_sqft if project else 0} sqft  |  Height: {project.height_ft if project else 0}ft
  Kits deployed: {project.kit_count if project else 0}
  Budget:        ₹{project.max_budget_inr if project else 0:,.0f}
  Goals:         {goals_text}
  Project temp:  {getattr(project, 'temperature_c', user.temperature_c)}°C
  Project power: {getattr(project, 'power_reliability', user.power_reliability)}
  Setup cost:    ₹{project.setup_cost_inr if project else 0:,.0f}
  Cycle cost:    ₹{project.cycle_cost_inr if project else 0:,.0f}
  Expected yield:{project.expected_yield_kg if project else 0} kg over {project.cycle_days if project else 0} days

════════════════════════════════════════
CURRENT PHASE (Day {cur_day})
════════════════════════════════════════
  Phase:         {current_phase}
  Target EC:     {phase_ec_range}
  Today's tasks: {'; '.join(phase_daily) if phase_daily else 'See daily checklist'}
  This week:     {'; '.join(phase_weekly[:2]) if phase_weekly else 'See weekly checklist'}

════════════════════════════════════════
WHAT USER ALREADY HAS (qty overrides)
════════════════════════════════════════
{qty_ctx}

════════════════════════════════════════
RECENT ACTIVITIES (last 10)
════════════════════════════════════════
{acts_text}

════════════════════════════════════════
REMINDERS
════════════════════════════════════════
{rems_text}

════════════════════════════════════════
RETRIEVED CROP KNOWLEDGE (this crop only)
════════════════════════════════════════
{retrieved_chunks if retrieved_chunks else '  No specific knowledge retrieved for this query.'}

════════════════════════════════════════
NUTRIENT QUANTITIES FOR THIS PROJECT
════════════════════════════════════════
{_nutrient_summary(project)}

════════════════════════════════════════
INSTRUCTIONS
════════════════════════════════════════
- Answer only about this user's project. Do not mention other crops.
- For nutrient dosage questions: use their actual reservoir = {project.kit_count if project else 1} kit(s) × {_get_reservoir_per_kit(project.crop_id) if project else 0}L = {_total_reservoir(project)}L. Scale M = {_m_tank(project):.2f}×.
- For symptom questions: diagnose based on Phase ({current_phase}).
- Be concise, specific, and practical.
"""
    return prompt


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _get_reservoir_per_kit(crop_id: str) -> int:
    from backend.services.data_loader import get_crop
    c = get_crop(crop_id)
    return c.get("reservoir_L_per_kit", 0) if c else 0


def _total_reservoir(project) -> float:
    if not project:
        return 0
    return _get_reservoir_per_kit(project.crop_id) * project.kit_count


def _m_tank(project) -> float:
    res = _total_reservoir(project)
    return res / 20 if res > 0 else 0


def _nutrient_summary(project) -> str:
    """
    Compute actual nutrient quantities for this project from nutrients.json.
    Uses the same catalog formulas as budget_calculator — no hardcoding.
    Returns a human-readable string for the RAG context prompt.
    """
    if not project:
        return "  No project loaded."

    import math
    from backend.services.data_loader import get_crop, get_nutrient, get_products

    crop     = get_crop(project.crop_id)
    nd       = get_nutrient(project.crop_id)
    products = get_products()

    if not crop or not nd:
        return "  No nutrient data for this crop."

    res_L = crop.get("reservoir_L_per_kit", 0) * project.kit_count
    if res_L == 0:
        return "  Substrate-based system — no liquid nutrients."

    m_tank = res_L / 20

    # Find current phase
    from datetime import date
    start   = project.start_date.date() if hasattr(project.start_date, "date") else project.start_date
    cur_day = max(1, (date.today() - start).days + 1)

    cur_phase_name  = "N/A"
    cur_grow_g      = cur_bloom_g = cur_cal_g = cur_mg_g = 0.0
    cur_ec          = "N/A"

    # Totals across full cycle
    tg = tb = tc = tm = 0.0
    for phase in nd.get("phases", []):
        d       = phase["dosage_per_20L"]
        days    = phase["day_end"] - phase["day_start"] + 1
        refills = math.ceil(days / 14)
        tg += d["grow_g"]  * m_tank * refills
        tb += d["bloom_g"] * m_tank * refills
        tc += d["cal_g"]   * m_tank * refills
        tm += d["mg_g"]    * m_tank * refills

        if phase["day_start"] <= cur_day <= phase["day_end"]:
            cur_phase_name = f"Phase {phase['phase']}: {phase['name']}"
            cur_grow_g  = round(d["grow_g"]  * m_tank, 1)
            cur_bloom_g = round(d["bloom_g"] * m_tank, 1)
            cur_cal_g   = round(d["cal_g"]   * m_tank, 1)
            cur_mg_g    = round(d["mg_g"]    * m_tank, 1)
            cur_ec      = f"{phase['ec_min']}–{phase['ec_max']} mS/cm"

    # Packs for full cycle
    def packs(g, pid):
        p = products.get(pid)
        if not p or g <= 0:
            return 0
        return math.ceil(g / (p["pack_size_kg"] * 1000))

    npk_g = tg + tb
    return (
        f"  Reservoir: {project.kit_count} kit(s) × {crop['reservoir_L_per_kit']}L = {res_L}L  |  M={m_tank:.1f}×\n"
        f"  CURRENT ({cur_phase_name})  per refill into {res_L}L:\n"
        f"    NPK Grow: {cur_grow_g}g  |  NPK Bloom: {cur_bloom_g}g  |  "
        f"Ca(NO3)2: {cur_cal_g}g  |  MgSO4: {cur_mg_g}g  |  EC target: {cur_ec}\n"
        f"  FULL CYCLE totals:\n"
        f"    NPK: {round(npk_g,0):.0f}g → {packs(npk_g, 'NUT_NPK_01')} pack(s)  |  "
        f"Ca(NO3)2: {round(tc,0):.0f}g → {packs(tc, 'NUT_CAN_02')} pack(s)  |  "
        f"MgSO4: {round(tm,0):.0f}g → {packs(tm, 'NUT_MGS_03')} pack(s)"
    )

# FarmPilot — Complete Data Dictionary & Database Schema Reference

> **Document scope:** This file describes every field in every static JSON dataset file
> and every column in every MySQL database table used by the FarmPilot application.
> It also explains how all tables relate to each other.

---

## Table of Contents

1. [Overview — Two Layers of Data](#1-overview--two-layers-of-data)
2. [JSON Dataset Files](#2-json-dataset-files)
   - 2.1 [crops.json](#21-cropsjson)
   - 2.2 [nutrients.json](#22-nutrientsjson)
   - 2.3 [kits.json](#23-kitsjson)
   - 2.4 [products.json](#24-productsjson)
3. [MySQL Database Tables](#3-mysql-database-tables)
   - 3.1 [users](#31-users-table)
   - 3.2 [projects](#32-projects-table)
   - 3.3 [reminders](#33-reminders-table)
   - 3.4 [activities](#34-activities-table)
   - 3.5 [chat_messages](#35-chat_messages-table)
4. [Table Relationships](#4-table-relationships)
5. [JSON ↔ Database Cross-Reference](#5-json--database-cross-reference)
6. [Design Decisions](#6-design-decisions)

---

## 1. Overview — Two Layers of Data

FarmPilot uses two completely separate data layers:

| Layer | Technology | Who writes it | What it stores |
|---|---|---|---|
| **Static reference catalogue** | JSON files in `backend/data/` | Developer only (never changes at runtime) | Crop specs, nutrient protocols, hardware kits, product prices |
| **Live user data** | MySQL (via SQLAlchemy) | Application at runtime | User accounts, farm projects, reminders, activity logs, chat history |

The JSON files are loaded once at application startup and held in memory via Python's `lru_cache`. Every service function reads from this in-memory cache — there are **zero database queries** for any crop, nutrient, kit, or product lookup. Only the five MySQL tables ever receive INSERT / UPDATE / DELETE operations.

---

## 2. JSON Dataset Files

There are four JSON files. They form a linked catalogue where `crops.json` is the master and the other three files all reference it via a shared crop ID string.

```
crops.json  ◄──  nutrients.json   (via kit_id = crops.id)
            ◄──  kits.json        (via kit_id = crops.id)
            ◄──  products.json    (via compatible_crops = crops.id  or  "all_hydro")
```

---

### 2.1 `crops.json`

**Location:** `backend/data/crops.json`  
**Records:** 6 (one per supported crop)  
**Purpose:** Master crop catalogue. Every piece of crop-specific information — physical requirements, pricing, yield, tags — lives here. All other files and the MySQL `projects` table link back to this via the `id` field.

#### Full Field Reference

| Field | Data Type | Example Value | Detailed Meaning |
|---|---|---|---|
| `id` | string | `"kit_kratky_spinach"` | **Primary key** of the crop catalogue. Unique identifier used as a foreign key in `nutrients.json`, `kits.json`, `products.json`, and stored in the MySQL `projects.crop_id` column. The naming convention is `kit_{system}_{cropname}`. |
| `name` | string | `"Spinach / Palak"` | Human-readable crop name displayed in all UI cards, tabs, and dropdowns. |
| `system` | string | `"Passive Kratky"` | The hydroponic growing system used for this crop. Examples: `"Dutch Bucket"`, `"NFT / DWC"`, `"Substrate Polybag"`, `"Casing Tray"`. Displayed in the Solution Guide header. |
| `environment` | array of strings | `["indoor", "outdoor"]` | List of valid environments for growing this crop. Mushrooms only carry `["indoor"]` because they require controlled humidity and darkness. Used as a hard filter in the recommendation engine — if the user selected `"outdoor"` and the crop is `["indoor"]` only, it is immediately excluded. |
| `min_height_ft` | float | `1.5` | The minimum ceiling height in feet the room must have to physically accommodate this crop. Used as a **hard filter**: if `user.height_ft < crop.min_height_ft`, the crop is rejected regardless of everything else. Cherry Tomato needs 6.5 ft because vines grow 6–8 feet tall. |
| `footprint_sqft` | float | `2.0` | Floor area (sq ft) consumed by one physical kit. Used to estimate how many kits fit in the user's available space: `kit_count = floor(space_sqft / footprint_sqft)`. Spinach = 2 sqft/kit, Bell Pepper Dutch Bucket = 15 sqft/kit. |
| `capacity_per_kit` | int | `5` | Number of individual growing slots inside one kit — buckets, plant slots, or bags depending on the system. Used to calculate total plant count: `N_total = kit_count × capacity_per_kit`. Lettuce NFT = 36 slots/kit; Bell Pepper Dutch Bucket = 5 buckets/kit. |
| `cycle_days` | int | `30` | Total number of days from first planting to end of last harvest. Defines the full timeline length. Spinach = 30 days; Bell Pepper = 210 days. Used in the Timeline tab and cost projections. |
| `first_harvest_day` | int | `25` | The day number on which the first crop can be harvested. Always `< cycle_days`. Displayed in recommendation cards and project summaries. |
| `yield_per_kit_kg` | float | `0.5` | Total kg of produce expected from one kit across the entire cycle. Used to calculate `expected_yield_kg = kit_count × yield_per_kit_kg` stored in the `projects` table. |
| `yield_per_unit_kg` | float | `0.1` | Yield per individual slot (bucket / plant hole / bag). The relationship is `yield_per_kit_kg = yield_per_unit_kg × capacity_per_kit`. Used in the notes text of Section A in the Setup & Budget tab. |
| `base_kit_price_inr` | float | `1330.0` | Purchase price in ₹ for one complete base hardware kit from the linked vendor. This becomes the unit price for Section A (Base Hardware Kit) in the Setup & Budget breakdown. |
| `base_kit_name` | string | `"Pindfresh Pindpipe 5-Plant Kit"` | Official commercial product name of the base kit. Displayed in Section A of the Setup tab. |
| `base_kit_link` | string | `"https://www.pindfresh.com/..."` | Direct purchase URL for the base kit. Shown as a Buy button in the Setup table. |
| `reservoir_L_per_kit` | int | `20` | Litres of nutrient solution one kit's reservoir can hold. **This is the most important number in the entire nutrient dosing system.** The dosing formula `M_tank = reservoir_L / 20` is derived from this value. If `reservoir_L_per_kit = 0` (all mushroom crops), the system knows this crop uses substrate — no liquid nutrients, no reservoir, no dosing calculations. |
| `system_type` | string | `"kratky"` | Internal machine-readable code for the growing system. Used for conditional logic in the backend. Possible values: `"dutch_bucket"`, `"kratky"`, `"nft_dwc"`, `"mushroom_polybag"`, `"mushroom_casing"`. |
| `slot_label` | string | `"plant slots"` | The word used in UI text to describe one growing unit so sentences read naturally. Bell Pepper uses `"buckets"`, Lettuce uses `"plant slots"`, Mushrooms use `"bags"`. |
| `seed_product_id` | string or null | `"SEED_SPINACH"` | References the `id` field of the corresponding seed product in `products.json`. Used by the budget calculator to look up seed pricing and quantity formula. `null` for all mushroom crops because mushrooms use spawn, not seeds. |
| `spawn_product_id` | string or null | `"NUT_MUSH_05"` | References the `id` field of the mushroom spawn product in `products.json`. Only populated for mushroom crops; `null` for all hydroponic crops. The budget calculator checks `spawn_product_id` first, then falls back to `seed_product_id`. |
| `ph_min` | float | `5.5` | Lower bound of the optimal pH range for this crop's nutrient solution. Displayed in the Solution Guide. |
| `ph_max` | float | `6.5` | Upper bound of the optimal pH range. Together with `ph_min`, defines the target window the farmer must maintain. |
| `experience_suitable` | array of strings | `["beginner"]` | Experience levels for which this crop is appropriate. Possible values per element: `"beginner"`, `"intermediate"`, `"expert"`. Used in recommendation scoring: exact match = 20 points, adjacent level = 10 points. |
| `daily_effort_min` | int | `5` | Minimum daily time in minutes required to maintain this crop. Used in recommendation scoring: the closer this is to the user's stated `daily_effort_min`, the higher the score. Spinach = 5 min/day; Bell Pepper = 20 min/day; Cherry Tomato = 25 min/day. |
| `power_required` | boolean | `false` | Whether this crop needs a stable electricity supply to run its pump, lights, or climate control. If `true` and the user's `power_reliability` is `"frequent"`, the crop is excluded by the hard filter. Spinach Kratky = `false` (completely passive — no electricity needed). |
| `image_url` | string | `"https://images.unsplash.com/..."` | Unsplash image URL for the crop. Used in recommendation cards, project headers, section tables. |
| `diagram_url` | string | `"https://images.unsplash.com/..."` | A wider landscape-format image for the Setup tab banner and Solution Guide header. Usually a farm/system photo rather than a close-up of the produce. |
| `tags` | array of strings | `["beginner_friendly", "fast_cycle", "low_effort", "home_kitchen"]` | Machine-readable characteristic tags. Used in the recommendation engine's goal-matching scoring: for each user goal (e.g. `"fast_harvest"`), the engine checks if the crop's tags contain the matching tag (e.g. `"fast_cycle"`). Hits add up to 20 points of score. |
| `description` | string | `"Kratky spinach is the simplest..."` | Long-form paragraph explaining the crop, system, and growing approach. Displayed in the Learn & Grow section / Crop Detail page. |
| `difficulty` | string | `"Easy"` | Display label for UI only. Values: `"Easy"`, `"Moderate"`, `"Advanced"`. Not used in any scoring logic. |
| `min_budget_inr` | float | `2500.0` | The absolute minimum ₹ budget a user must have to run even 1 kit of this crop. Used as a **hard filter**: if `user.max_budget_inr < crop.min_budget_inr`, the crop is immediately excluded from recommendations. |

---

### 2.2 `nutrients.json`

**Location:** `backend/data/nutrients.json`  
**Records:** 6 (one per crop, matched via `kit_id`)  
**Purpose:** Complete nutrient protocol for each crop — mixing instructions, phase-by-phase dosages, environmental targets, and daily/weekly task checklists. This file drives the Solution & Nutrient Guide tab and the Timeline tab.

#### Top-Level Fields

| Field | Data Type | Example Value | Detailed Meaning |
|---|---|---|---|
| `kit_id` | string | `"kit_kratky_spinach"` | **Foreign key** linking back to `crops.json → id`. The nutrient calculator calls `get_nutrient(crop_id)` which looks up this field. Must exactly match a `crops.json → id` value. |
| `mixing_sequence` | array of strings | `["Fill reservoir...", "Dissolve Calcium Nitrate..."]` | Ordered list of steps to prepare the nutrient solution for a reservoir change. Each string is one complete instruction. The order is agronomically critical — Calcium Nitrate must always be dissolved first to prevent chemical precipitation. Each step is displayed as a numbered card in the Solution Guide. Steps containing words like `"never"`, `"always"`, `"mandatory"`, `"first"`, `"critical"` are automatically flagged with a red ⚠️ Critical badge. |
| `critical_rules` | array of strings | `["Never mix dry powders together..."]` | A separate set of overarching safety rules shown as a warning block in the Solution Guide. These apply across all phases, not just during mixing. Currently stored here for reference — not separately rendered but informing the AI context. |
| `phases` | array of objects | *(see below)* | The core of the nutrient data. Each element is one phase of the growing cycle. Crops have between 2 phases (mushrooms) and 8 phases (Bell Pepper). |

#### Fields Inside Each `phases[]` Object

| Field | Data Type | Example Value | Detailed Meaning |
|---|---|---|---|
| `phase` | int | `3` | Phase sequence number starting from 1. Used as a sort key and displayed in the Timeline and Solution tabs. |
| `name` | string | `"Late Vegetative"` | Descriptive phase name. Shown in phase selector pills, timeline cards, and the Solution Guide phase headers. |
| `week_start` | int | `5` | The growing-calendar week number this phase begins. These are **agronomic labels** set by the growing protocol — not strict mathematical calculations. Week 1 = the week of planting. |
| `week_end` | int | `6` | The growing-calendar week this phase ends. For the Timeline tab display only. |
| `day_start` | int | `29` | The exact day number (from day 1 = planting day) when this phase begins. Used by the Timeline builder to detect which phase is currently active: `is_current = (day_start <= current_day <= day_end)`. Also used in dosage calculations. |
| `day_end` | int | `42` | The exact day number when this phase ends. `day_end - day_start + 1` = total days in this phase. Used to calculate number of reservoir refills: `refills = ceil(phase_days / 14)` because the protocol calls for a full drain-and-refill every 14 days. |
| `dosage_per_20L` | object | `{"grow_g": 18, "bloom_g": 0, "cal_g": 15, "mg_g": 6}` | The **baseline nutrient recipe** for a 20-litre reservoir. All four nutrient amounts are in grams. This is the reference point from which all project-specific doses are scaled. |
| `dosage_per_20L.grow_g` | float | `18.0` | Grams of NPK Grow formula to add per 20L of water. NPK Grow is high in Nitrogen — dominates the vegetative (leaf/stem) phases. Zero during fruiting phases. |
| `dosage_per_20L.bloom_g` | float | `0.0` | Grams of NPK Bloom formula to add per 20L. NPK Bloom is high in Phosphorus and Potassium — dominates the flowering and fruiting phases. Zero during vegetative phases. |
| `dosage_per_20L.cal_g` | float | `15.0` | Grams of Calcium Nitrate Ca(NO₃)₂ to add per 20L. Calcium prevents Blossom-End Rot in fruiting crops and strengthens cell walls. Present in every phase at varying amounts. |
| `dosage_per_20L.mg_g` | float | `6.0` | Grams of Epsom Salt MgSO₄ (Magnesium Sulphate) to add per 20L. Magnesium is the central atom of chlorophyll — essential for photosynthesis and preventing yellowing between leaf veins. |
| `ec_min` | float | `1.8` | Minimum acceptable Electrical Conductivity in mS/cm (millisiemens per centimetre) for this phase. EC measures how concentrated the nutrient solution is. Too low = plants are underfed. Used in the Solution Guide EC/TDS range display. |
| `ec_max` | float | `2.0` | Maximum acceptable EC in mS/cm. Too high = nutrient burn (salt stress). The farmer tests EC with a digital pen and adjusts by adding plain water (too high) or more nutrients (too low). |
| `tds_min` | int | `900` | Minimum Total Dissolved Solids in ppm (parts per million). TDS ≈ EC × 500 — it is an alternative measurement of the same nutrient concentration, used by farmers who prefer ppm over mS/cm. |
| `tds_max` | int | `1000` | Maximum TDS in ppm. Together with `tds_min`, gives the farmer a target window for their TDS pen reading. |
| `daily_tasks` | array of strings | `["Verify daytime circulation fan movement...", "Check reservoir water temp (< 24°C)"]` | Tasks the farmer must perform **every single day** during this phase. Each string becomes one task card in the Timeline tab's daily checklist. Users can set reminders on individual tasks. |
| `weekly_tasks` | array of strings | `["Select 2–3 main leaders; prune weak inward shoots", "Strip leaves lower 5\"..."]` | Tasks performed **once per week** during this phase. Displayed in the Timeline tab's weekly checklist. Can also have reminders. |
| `observations` | array of strings | `["Lush dark green leaf canopy", "Absence of yellowing lower leaves"]` | Visual indicators of healthy plant development during this phase. Used as a diagnostic reference — the farmer checks these to confirm the plant is on track. First two observations are also embedded into the AI Farm Bot context via the RAG system. |

> **How doses are scaled for a real project:**
>
> ```
> M_tank = reservoir_L / 20
>        = (reservoir_L_per_kit × kit_count) / 20
>
> your_dose_g = base_g × M_tank
>
> Example — Bell Pepper, 3 kits, Phase 3:
>   reservoir_L = 60 L/kit × 3 kits = 180 L
>   M_tank      = 180 / 20 = 9×
>   your_grow_g = 18g × 9 = 162g per refill
> ```
>
> **Total grams for the full cycle (for purchasing):**
> ```
> total_g = base_g × M_tank × refills_per_phase × (summed across all phases)
> packs   = ceil(total_g / (pack_size_kg × 1000))
> ```

---

### 2.3 `kits.json`

**Location:** `backend/data/kits.json`  
**Records:** 6 (one per crop, matched via `kit_id`)  
**Purpose:** Lists every physical item associated with a crop's growing system — the components that come inside the base kit box, plus indoor and outdoor add-on accessories. Used by the budget calculator to build Section A and Section B of the Setup & Budget tab.

#### Top-Level Fields

| Field | Data Type | Example Value | Detailed Meaning |
|---|---|---|---|
| `kit_id` | string | `"kit_dutch_bucket_bell_pepper"` | **Foreign key** linking back to `crops.json → id`. Must exactly match. |
| `diagram_label` | string | `"Dutch Bucket System — Bell Pepper"` | Display title shown above the system image in the Setup tab. |
| `components` | array of objects | *(see item fields below)* | Physical parts that are **included inside** the base hardware kit box. These items have `unit_price: 0` because their cost is already bundled into `crops.json → base_kit_price_inr`. They appear in Section A purely to inform the user what they are getting. |
| `indoor_addons` | array of objects | *(see item fields below)* | Extra items required for **indoor** setups: grow lights, circulation fans, digital timers, pH/TDS meters, humidifiers. These are **not** in the base kit and must be purchased separately. Appear in Section B when `environment = "indoor"` or `"both"`. |
| `outdoor_addons` | array of objects | *(see item fields below)* | Extra items required for **outdoor** setups: shade nets, pH meters. Appear in Section B when `environment = "outdoor"` or `"both"`. |

#### Fields Inside Each Item Object (components / indoor_addons / outdoor_addons)

| Field | Data Type | Example Value | Detailed Meaning |
|---|---|---|---|
| `label` | string | `"G"` | A single letter used as the row number in the Setup & Budget table (A, B, C…). Components start from A; add-ons continue the alphabet after the last component letter. |
| `id` | string | `"light_inhydro_100w"` | **Unique identifier for this add-on item.** Only present on `indoor_addons` and `outdoor_addons`, not on `components`. This ID is used as the key in the `addons_json` overrides dictionary in the `projects` table — when a user sets qty=0 for an item, `{"light_inhydro_100w": 0}` is stored. |
| `name` | string | `"INHYDRO 100W LED Flood Light for Hydroponics"` | Full commercial product name shown in the item row. |
| `qty_formula` | string | `"ceil(kit_count * 5 / 2.5)"` | A Python expression evaluated at runtime to determine how many units the user needs. Available variables: `K` or `kit_count` = number of kits; `N_total` = `kit_count × capacity_per_kit`; `space_sqft` = room area; `ceil()`/`floor()` = rounding functions. This formula is what makes quantities dynamic — they scale automatically as the user changes their kit count or space. |
| `notes` | string | `"1 light covers 2.5 buckets"` | Short explanation of what the item is or why that specific quantity was computed. Shown in the notes column of the Setup table. |
| `included_in_kit` | boolean | `false` | `true` = this item physically ships inside the base kit box (cost included in `base_kit_price_inr`). `false` = must be purchased separately; it has its own `unit_price`. |
| `unit_price` | float | `2199.0` | Price per unit in ₹. Always `0` for `components` (cost is bundled into the base kit price). Non-zero for `indoor_addons` and `outdoor_addons`. |
| `link` | string | `"https://inhydro.in/product/flood-grow-light-100w/"` | Direct purchase URL. Shown as a Buy button in the item row. |
| `image_url` | string | `"https://images.unsplash.com/..."` | Product image URL shown in the item row thumbnail. |

---

### 2.4 `products.json`

**Location:** `backend/data/products.json`  
**Records:** 10 (4 nutrients + 2 mushroom spawns + 4 seed packs)  
**Purpose:** Consumables catalogue. Contains all purchasable nutrients, pH adjusters, seeds, and spawn kits with their pack sizes and prices. Used by the budget calculator (Section C and D) and the Solution Guide's What to Buy table.

| Field | Data Type | Example Value | Detailed Meaning |
|---|---|---|---|
| `id` | string | `"NUT_NPK_01"` | **Primary key** of the product. Naming conventions: `NUT_XXX_NN` for nutrients/pH, `SEED_CROPNAME` for seeds, `NUT_MUSH_NN` for spawn. Referenced by `crops.json → seed_product_id` and `crops.json → spawn_product_id`. Also used directly in the nutrient calculator to look up each product: `products.get("NUT_NPK_01")`. |
| `name` | string | `"CityGreens Hydroponic NPK Nutrients Combo Set (Part A & Part B)"` | Full commercial product name displayed in the What to Buy table and Section C of the Setup tab. |
| `short_name` | string | `"NPK Combo Set"` | Abbreviated name used in tight spaces like mixing step annotations and AI context prompts. |
| `compatible_crops` | string | `"all_hydro"` | Specifies which crops this product is used for. `"all_hydro"` means it applies to all hydroponic crops with a liquid reservoir. A specific `crop_id` string means it is exclusive to one crop (e.g., `"kit_polybag_oyster_mushroom"` for the Oyster Spawn Kit). |
| `pack_size_kg` | float | `1.0` | Weight of one retail pack/bottle in kilograms. Used in the pack calculation: `packs_to_buy = ceil(total_grams_needed / (pack_size_kg × 1000))`. For pH Down: `0.25` kg = 250 ml bottle. |
| `price_inr` | float | `899.0` | Price per pack/bottle in ₹. Multiplied by `packs_to_buy` to get the total cost for each line item. |
| `link` | string | `"https://www.citygreens.shop/..."` | Direct purchase URL. Shown as a Buy button in the What to Buy table. |
| `image_url` | string | `"https://images.unsplash.com/..."` | Product image URL shown in the table row thumbnail. |
| `nutrient_type` | string | `"npk"` | Category label for the product type. Values: `"npk"` (combined grow/bloom), `"calcium_nitrate"`, `"magnesium"`, `"ph_adjuster"`, `"spawn"`, `"seeds"`. Used for display grouping and conditional logic (e.g., pH Down is handled differently from nutrients in quantity calculation). |
| `usage_ml_per_reservoir_change` | int | `5` | *Present only on `NUT_PHD_04` (pH Down).* How many millilitres of pH Down solution is typically needed per reservoir change to bring pH into the target range. Used in the pH Down bottle calculation: `total_ml = usage_ml × total_refills_across_cycle` → `bottles = ceil(total_ml / (pack_size_kg × 1000))`. |
| `seeds_per_packet` | int | `100` | *Present only on seed products.* Number of seeds in one retail packet. Used to compute packets needed: for lettuce `qty_formula = "ceil(N_total / 200)"` because one packet has 200 seeds and you need one seed per slot. |
| `qty_formula` | string | `"kit_count * 1"` | *Present only on seed products.* Same formula evaluation engine as `kits.json`. Gives the number of seed packets to purchase. Simple crops use `"kit_count * 1"` (one packet per kit). High-density crops like Lettuce use `"ceil(N_total / seeds_per_packet)"` to ensure enough seeds for all 36 slots per kit. |

---

## 3. MySQL Database Tables

The MySQL database stores all **user-generated data** — everything that changes at runtime. There are five tables. The static crop/nutrient/kit/product catalogue lives only in the JSON files above and is never stored in MySQL.

---

### 3.1 `users` Table

**SQLAlchemy model:** `backend/models/user.py`  
**Purpose:** Stores one row per registered user account. This is the root of the entire data hierarchy — every other table eventually links back here.

| Column | MySQL Type | Constraints | Detailed Meaning |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT, INDEX | Unique numeric user identifier. Auto-incremented by MySQL. All other tables reference this column as a foreign key. |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE, INDEX | The user's email address used for login. Indexed for fast lookups during JWT authentication. The UNIQUE constraint prevents two accounts sharing an email. |
| `password_hash` | VARCHAR(255) | NOT NULL | The user's password after bcrypt hashing. The plain-text password is **never stored anywhere** — only this irreversible hash. During login, the submitted password is hashed and compared to this value. |
| `name` | VARCHAR(255) | NOT NULL | The user's display name, shown in the sidebar and AI Farm Bot context. Set during registration. |
| `experience_level` | VARCHAR(50) | DEFAULT `"beginner"` | Self-reported farming experience. Values: `"beginner"`, `"intermediate"`, `"expert"`. Used as the default for new projects and as an input to the recommendation scoring algorithm (20 points if the crop matches the user's level). |
| `daily_effort_min` | INT | DEFAULT `30` | How many minutes per day the user is willing to spend on farming maintenance. Default is 30 minutes. Used as default for new projects. The recommendation engine scores crops based on how closely their `daily_effort_min` matches this. |
| `power_reliability` | VARCHAR(50) | DEFAULT `"stable"` | Quality of local electricity supply. Values: `"stable"` (always on), `"occasional"` (sometimes cuts out), `"frequent"` (cuts out often). If `"frequent"`, any crop with `power_required: true` in `crops.json` is hard-filtered out. |
| `temperature_c` | FLOAT | DEFAULT `28.0` | User's ambient home/farm temperature in Celsius. Used as default for new projects; can be overridden per-project. Fed into the AI Farm Bot context. |
| `humidity_pct` | FLOAT | DEFAULT `60.0` | User's ambient relative humidity percentage. Used the same way as `temperature_c`. |
| `created_at` | DATETIME(timezone) | SERVER DEFAULT `NOW()` | Timestamp auto-set by MySQL when the account is first created. Never updated. |

---

### 3.2 `projects` Table

**SQLAlchemy model:** `backend/models/project.py`  
**Purpose:** Stores one row per farming project. A single user can create multiple projects (e.g., one for spinach and one for bell pepper). The project is the central entity — reminders, activities, and chat messages all hang off it.

| Column | MySQL Type | Constraints | Detailed Meaning |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique project identifier. Referenced by `reminders`, `activities`, and `chat_messages`. |
| `user_id` | INT | NOT NULL, FK → `users.id` | Which user owns this project. This is the **Many side** of the Users → Projects (1:N) relationship. |
| `name` | VARCHAR(255) | NOT NULL | The project's display name. Auto-generated at creation from the crop name: `"{crop_name} Farm"`. Shown in the sidebar and project list. |
| `crop_id` | VARCHAR(100) | NOT NULL | The crop being grown in this project. This is a **logical foreign key** into `crops.json → id` — it is NOT enforced by MySQL because the crop catalogue lives in a JSON file, not a table. Example: `"kit_dutch_bucket_bell_pepper"`. All backend service functions receive this string to look up crop data. |
| `crop_name` | VARCHAR(100) | NOT NULL | Denormalised copy of the crop's display name from `crops.json`. Stored here so the sidebar and project list can display the name without loading the JSON every time. |
| `kit_count` | INT | DEFAULT `1` | Number of physical kits deployed in this project. The core scaling factor — almost every calculation in the system multiplies something by `kit_count`. |
| `environment` | VARCHAR(20) | DEFAULT `"indoor"` | Where the farm is located: `"indoor"`, `"outdoor"`, or `"both"`. Controls which add-ons section is shown in the Setup tab. |
| `space_sqft` | FLOAT | NOT NULL | Available floor area in square feet. Used in `kits.json` add-on `qty_formula` evaluation (variable `space_sqft`) and to estimate how many kits fit. |
| `height_ft` | FLOAT | NOT NULL | Ceiling height in feet. Stored for display and to verify it still passes the hard filter. |
| `max_budget_inr` | FLOAT | NOT NULL | Maximum total budget the user is willing to spend on this project in ₹. Displayed in the Setup tab's Budget Left calculation: `budget_left = max_budget_inr - grand_total`. |
| `primary_goals` | TEXT | DEFAULT `'[]'` | The user's farming goals stored as a **JSON array string**. Example: `'["high_yield", "home_kitchen"]'`. Deserialized with `json.loads()` when needed. Used in recommendation scoring and embedded in the AI Farm Bot context. |
| `power_reliability` | VARCHAR(50) | DEFAULT `"stable"` | Per-project override of the user's global `power_reliability`. Allows a user with generally stable power to mark a specific outdoor project as having occasional cuts. |
| `daily_effort_min` | INT | DEFAULT `30` | Per-project override of daily effort commitment. Can differ from the user profile's default. |
| `temperature_c` | FLOAT | DEFAULT `28.0` | Per-project room temperature. Important for crops with temperature requirements (Button Mushroom needs AC to 14°C for fruiting). |
| `humidity_pct` | FLOAT | DEFAULT `60.0` | Per-project room humidity. Important for mushroom crops that require 85–90% RH during fruiting. |
| `experience_level` | VARCHAR(50) | DEFAULT `"beginner"` | Per-project experience level, embedded in the AI Farm Bot system prompt so the bot can calibrate its explanations. |
| `setup_cost_inr` | FLOAT | DEFAULT `0` | Calculated total hardware setup cost in ₹ (Section A + Section B totals from the budget calculator). Stored here so the sidebar can show total cost instantly without recalculating. Updated whenever the user adjusts quantities. |
| `cycle_cost_inr` | FLOAT | DEFAULT `0` | Calculated consumables cost per growing cycle in ₹ (Section C nutrients + Section D seeds/spawn). Updated on quantity adjustments. |
| `expected_yield_kg` | FLOAT | DEFAULT `0` | Total expected harvest weight for this project: `kit_count × yield_per_kit_kg`. Stored for quick display. |
| `cycle_days` | INT | DEFAULT `0` | Total cycle length copied from `crops.json → cycle_days` at project creation. Stored for quick display without JSON lookup. |
| `yield_per_kit_kg` | FLOAT | DEFAULT `0` | Per-kit yield copied from `crops.json` at creation. Used in the AI Farm Bot context to give exact yield per kit. |
| `nutrient_cost_per_cycle` | FLOAT | DEFAULT `0` | Nutrient-only portion of `cycle_cost_inr` (excludes seeds/spawn). Stored separately for the AI context prompt. |
| `addons_json` | TEXT | DEFAULT `'{}'` | JSON object stored as a string. Contains the user's quantity overrides: a dictionary of `{item_id: qty}` for every item whose quantity was changed from the formula default. Example: `'{"base_kit": 0, "light_inhydro_100w": 2}'`. When `qty = 0`, the item is marked as "already own / skipping". This dictionary is re-applied to the Setup tab on every load so changes persist. |
| `status` | VARCHAR(20) | DEFAULT `"active"` | Project lifecycle status. Values: `"active"` (currently running), `"archived"` (cycle completed or abandoned). Shown as a coloured badge in the project list. |
| `start_date` | DATETIME(timezone) | SERVER DEFAULT `NOW()` | The date the farm was started. **Critical for the Timeline tab** — the current day number is calculated as `current_day = (today - start_date).days + 1`. Automatically set when the project is created. |
| `created_at` | DATETIME(timezone) | SERVER DEFAULT `NOW()` | When the project record was first created in the database. |
| `updated_at` | DATETIME(timezone) | `ON UPDATE NOW()` | Auto-updated by MySQL whenever any column in this row is modified. Used to track when the last change was made. |

---

### 3.3 `reminders` Table

**SQLAlchemy model:** `backend/models/reminder.py`  
**Purpose:** Stores one row for each task reminder a user has set within a project. Users browse the Timeline tab, see the daily/weekly tasks fetched from `nutrients.json`, and can toggle individual tasks as "set reminder" or "mark done". Each toggled task creates or updates a row here.

| Column | MySQL Type | Constraints | Detailed Meaning |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique reminder identifier. Referenced by the Timeline tab to show which tasks have reminders set. |
| `project_id` | INT | NOT NULL, FK → `projects.id` | Which project this reminder belongs to. **Many reminders belong to one project** (1:N). |
| `user_id` | INT | NOT NULL, FK → `users.id` | Direct link to the user. Stored redundantly (could be derived via `projects`) to allow fast per-user queries without joining through projects. |
| `reminder_type` | VARCHAR(20) | DEFAULT `"daily"` | Frequency category of the task: `"daily"` or `"weekly"`. Mirrors the task source in `nutrients.json → phases → daily_tasks` or `weekly_tasks`. |
| `phase_name` | VARCHAR(100) | NOT NULL | The name of the growing phase this task belongs to. Copied from `nutrients.json → phases → name`. Example: `"Early Vegetative"`. Used as a composite lookup key with `task_description` to match reminders back to their source task when loading the Timeline. |
| `task_description` | TEXT | NOT NULL | The full text of the task copied from `nutrients.json`. Example: `"Verify drip stake water flow (15m ON / 60m OFF)"`. Together with `phase_name`, uniquely identifies which task this reminder is for. |
| `cycle_day` | INT | NOT NULL | The cycle day number this task falls on. Computed from `phase.day_start` at the time the reminder is created. Used in the AI Farm Bot context to show upcoming reminders by day. |
| `is_done` | BOOLEAN | DEFAULT `false` | Whether the user has marked this specific task as completed. `false` = pending (shown with a ⏳ icon), `true` = done (shown with a ✓ icon) in the Timeline and AI context. |
| `notes` | TEXT | DEFAULT `''` | Optional free-text note the user can attach to a reminder. Currently stored but not surfaced in the UI — available for future use. |
| `created_at` | DATETIME(timezone) | SERVER DEFAULT `NOW()` | When the reminder was set. |

---

### 3.4 `activities` Table

**SQLAlchemy model:** `backend/models/activity.py`  
**Purpose:** An audit log / event journal. Every significant user action — creating a project, adjusting a quantity, setting a reminder, completing a task — writes a row here. The last 10 activities from this table are embedded in every Farm Bot AI response so the AI knows what the user has recently done.

| Column | MySQL Type | Constraints | Detailed Meaning |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique activity identifier. |
| `project_id` | INT | NULLABLE, FK → `projects.id` | Which project this action relates to. **Nullable** — some actions are user-level (like account setup) and have no associated project. When null, the activity is a global user event. |
| `user_id` | INT | NOT NULL, FK → `users.id` | Which user performed the action. Never null — every activity belongs to a user. |
| `action_type` | VARCHAR(100) | NOT NULL | Short machine-readable label classifying the type of action. Examples used in the codebase: `"project_created"`, `"qty_adjusted"`, `"reminder_set"`, `"reminder_done"`, `"chat_sent"`. Used for filtering and display. |
| `description` | TEXT | NOT NULL | A human-readable English sentence describing what happened. Example: `"Adjusted 2 item quantities"`. This text is what gets shown in the Farm Bot context under "Recent Activities". |
| `metadata_json` | TEXT | DEFAULT `'{}'` | A JSON object (stored as string) containing structured extra detail about the action. For `qty_adjusted`, this stores the list of `[{item_id, new_qty}]` changes. For `reminder_set`, it stores the reminder ID. The structure varies by `action_type`. |
| `created_at` | DATETIME(timezone) | SERVER DEFAULT `NOW()` | When the action happened. Used to fetch "last 10 activities" in chronological order for the AI context. |

---

### 3.5 `chat_messages` Table

**SQLAlchemy model:** `backend/models/chat.py`  
**Purpose:** Stores the complete conversation history for the Farm Bot AI assistant. Every message — both from the user and from the AI — is stored as a separate row. This enables conversation replay, context building, and history display in the chat UI.

| Column | MySQL Type | Constraints | Detailed Meaning |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique message identifier. |
| `user_id` | INT | NOT NULL, FK → `users.id` | Which user this message belongs to. |
| `project_id` | INT | NULLABLE, FK → `projects.id` | Which project context the message was sent in. **Nullable** — a user can ask the Farm Bot general questions without an active project, in which case this is null. When set, the router uses this to load project-specific context (phase, nutrient doses, reminders) into the system prompt. |
| `role` | VARCHAR(20) | NOT NULL | Who sent the message. Values: `"user"` (the farmer typed this) or `"assistant"` (the AI responded with this). Used to reconstruct the conversation as alternating turns for the Groq LLM API. |
| `message` | TEXT | NOT NULL | The full text content of the message. For `role = "user"`, this is exactly what the farmer typed. For `role = "assistant"`, this is the complete AI-generated response. |
| `context_snapshot_json` | TEXT | DEFAULT `'{}'` | A JSON snapshot of the full system prompt that was constructed and sent to the Groq LLM for this particular turn. Contains all 7 context layers: user profile, project details, current phase/day, nutrient quantities, quantity overrides, last 10 activities, and retrieved RAG chunks. Stored for debugging, auditing, and potential replay. |
| `created_at` | DATETIME(timezone) | SERVER DEFAULT `NOW()` | Timestamp of when the message was sent/received. Used to fetch the last N messages for context window construction. |

---

## 4. Table Relationships

### Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              users                                  │
│  PK: id                                                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┴─────────────────┐
              │  1 user can have many projects   │
              │          (1 : N)                 │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                             projects                                │
│  PK: id    FK: user_id → users.id                                   │
│  crop_id  (logical ref → crops.json, NOT a DB foreign key)         │
└──────────┬──────────────────┬──────────────────┬────────────────────┘
           │                  │                  │
   ┌───────┘        ┌─────────┘        ┌─────────┘
   │  1:N           │  1:N             │  1:N
   ▼                ▼                  ▼
┌──────────┐  ┌───────────┐   ┌────────────────┐
│reminders │  │activities │   │ chat_messages  │
│PK: id    │  │PK: id     │   │ PK: id         │
│FK:       │  │FK:        │   │ FK:            │
│project_id│  │project_id │   │ project_id     │
│user_id   │  │user_id    │   │ user_id        │
└──────────┘  └───────────┘   └────────────────┘
                   ▲                  ▲
                   │                  │
        ┌──────────┘        ┌─────────┘
        │  user_id direct   │  user_id direct
        │  link (no project │  link (no project
        │  needed)          │  needed)
        └────────┬──────────┘
                 │
              users.id
```

### Relationship Summary Table

| From Table | To Table | Type | Column Used | Description |
|---|---|---|---|---|
| `users` | `projects` | **1 : N** | `projects.user_id → users.id` | One user can own many projects. Each project belongs to exactly one user. If a user deletes their account, all their projects would cascade. |
| `projects` | `reminders` | **1 : N** | `reminders.project_id → projects.id` | One project can have many reminders. Each reminder belongs to exactly one project. Reminders are meaningless without a project context. |
| `projects` | `activities` | **1 : N (nullable)** | `activities.project_id → projects.id` | One project can have many activity log entries. The FK is nullable so user-level activities (account creation, login) don't require a project. |
| `projects` | `chat_messages` | **1 : N (nullable)** | `chat_messages.project_id → projects.id` | One project can have many chat messages. Nullable so the Farm Bot can be used without selecting a project. |
| `users` | `reminders` | **1 : N** | `reminders.user_id → users.id` | Direct link on reminders to users — allows fetching all reminders for a user without joining through projects. |
| `users` | `activities` | **1 : N** | `activities.user_id → users.id` | Every activity always belongs to a user, even when it has no project. |
| `users` | `chat_messages` | **1 : N** | `chat_messages.user_id → users.id` | Every chat message always belongs to a user. |
| `projects` | `crops.json` | **N : 1 (logical)** | `projects.crop_id = crops.json[id]` | Many projects can grow the same crop. This link is not enforced by MySQL (no DB foreign key) because the crop catalogue lives in memory from a JSON file. The backend resolves it in Python: `get_crop(project.crop_id)`. |

---

## 5. JSON ↔ Database Cross-Reference

This table shows which JSON fields map to which database columns and how data flows from the static catalogue into the live database.

| JSON File | JSON Field | MySQL Table | MySQL Column | How it flows |
|---|---|---|---|---|
| `crops.json` | `id` | `projects` | `crop_id` | Stored at project creation. All backend services use `project.crop_id` to call `get_crop()`, `get_nutrient()`, `get_kit()`. |
| `crops.json` | `name` | `projects` | `crop_name` | Denormalised copy stored at creation for fast UI display without JSON lookup. |
| `crops.json` | `cycle_days` | `projects` | `cycle_days` | Copied at creation for display in sidebar and project cards. |
| `crops.json` | `yield_per_kit_kg` | `projects` | `yield_per_kit_kg` | Copied at creation. `expected_yield_kg = kit_count × yield_per_kit_kg` stored in projects. |
| `nutrients.json` | `phases[].name` | `reminders` | `phase_name` | When a user sets a reminder on a task, the phase name is copied into the reminders row. |
| `nutrients.json` | `phases[].daily_tasks[]` | `reminders` | `task_description` | The exact task text from JSON is stored when a reminder is created. |
| `nutrients.json` | `phases[].day_start` | `reminders` | `cycle_day` | The day the reminder is due, derived from the phase's `day_start`. |
| `kits.json` | `indoor_addons[].id` | `projects` | `addons_json` (key) | Add-on item IDs become keys in the `addons_json` override dictionary. |
| `products.json` | (via budget_calculator) | `projects` | `setup_cost_inr`, `cycle_cost_inr`, `nutrient_cost_per_cycle` | Calculated from product prices and stored on the project for quick display. |

---

## 6. Design Decisions

### Why JSON files instead of database tables for the catalogue?

The crop, nutrient, kit, and product data is **static** — it never changes at runtime. No user action modifies it. Storing it in MySQL would mean a database query on every Setup tab load, every Timeline load, every Solution Guide load. Instead, Python's `@lru_cache()` loads each file once at startup and keeps it in memory. Every service call after that is a dictionary lookup — essentially zero latency and zero database load.

The tradeoff is that `crop_id` in the `projects` table has no MySQL foreign-key enforcement. If a crop ID is deleted from the JSON, existing projects referencing it would break. This is acceptable because the crop catalogue is developer-controlled and version-controlled in Git.

### Why are `setup_cost_inr`, `cycle_cost_inr`, `expected_yield_kg` stored on projects?

These are **derived** values — they can always be recalculated from `crop_id`, `kit_count`, and `addons_json`. They are stored as a **denormalization** for performance: the sidebar, project list, and AI context all need these numbers, and recalculating them on every request would run the full budget calculator repeatedly. They are updated only when quantities change (the `PUT /setup/adjust` endpoint recalculates and stores them).

### Why does `reminders` have both `project_id` and `user_id`?

Technically `user_id` is redundant — it could be derived by joining reminders → projects → users. It is stored directly for two reasons: (1) security — every endpoint filters by `user_id` to ensure users can only see their own data, and doing that through a join is slower; (2) the AI Farm Bot loads reminders via `db.query(Reminder).filter(Reminder.project_id == project_id)` which is a single indexed lookup, not a join.

### Why is `addons_json` a JSON string instead of a separate table?

Quantity overrides are sparse — most items use their formula defaults and are never overridden. A separate `project_addons` table would have mostly empty rows, requiring a join on every Setup tab load. Storing overrides as a JSON dict in a TEXT column means the full Setup response can be built with a single project row read plus in-memory JSON processing. The tradeoff is no SQL-level queryability of individual overrides, which has never been needed.

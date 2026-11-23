# FarmPilot — Task Tracker
Run one task at a time. Mark ✅ when done, ❌ if failed (note reason).

---

## PHASE 0 — Scaffold & Config

- [ ] **T-01** · Create all directories (backend + frontend folder tree)
- [ ] **T-02** · `backend/requirements.txt`
- [ ] **T-03** · `backend/.env.example`
- [ ] **T-04** · `backend/setup_db.sql`
- [ ] **T-05** · `frontend/package.json`
- [ ] **T-06** · `frontend/vite.config.js`
- [ ] **T-07** · `frontend/index.html`
- [ ] **T-08** · `frontend/src/index.css`
- [ ] **T-09** · `frontend/src/main.jsx`

---

## PHASE 1 — Backend Core

- [ ] **T-10** · `backend/core/__init__.py`
- [ ] **T-11** · `backend/core/config.py`
- [ ] **T-12** · `backend/core/database.py`
- [ ] **T-13** · `backend/core/security.py`

---

## PHASE 2 — Database Models

- [ ] **T-14** · `backend/models/__init__.py`
- [ ] **T-15** · `backend/models/user.py`
- [ ] **T-16** · `backend/models/project.py`
- [ ] **T-17** · `backend/models/activity.py`
- [ ] **T-18** · `backend/models/reminder.py`
- [ ] **T-19** · `backend/models/chat.py`

---

## PHASE 3 — Pydantic Schemas

- [ ] **T-20** · `backend/schemas/__init__.py`
- [ ] **T-21** · `backend/schemas/auth.py`
- [ ] **T-22** · `backend/schemas/recommendation.py`
- [ ] **T-23** · `backend/schemas/project.py`
- [ ] **T-24** · `backend/schemas/setup.py`
- [ ] **T-25** · `backend/schemas/solution.py`
- [ ] **T-26** · `backend/schemas/timeline.py`
- [ ] **T-27** · `backend/schemas/chat.py`

---

## PHASE 4 — Static Data Files

- [ ] **T-28** · `backend/data/crops.json` — all 6 crops with Unsplash image URLs
- [ ] **T-29** · `backend/data/kits.json` — labeled A-F components + indoor/outdoor addons per crop
- [ ] **T-30** · `backend/data/nutrients.json` — all phases per crop with tasks + observations
- [ ] **T-31** · `backend/data/products.json` — 6 purchasable nutrient/spawn products

---

## PHASE 5 — Backend Services

- [ ] **T-32** · `backend/services/__init__.py`
- [ ] **T-33** · `backend/services/data_loader.py` — JSON cache loader
- [ ] **T-34** · `backend/services/recommendation_engine.py` — hard filter + scoring
- [ ] **T-35** · `backend/services/budget_calculator.py` — A/B/C/D cost breakdown
- [ ] **T-36** · `backend/services/nutrient_calculator.py` — scaled dosage + buy list
- [ ] **T-37** · `backend/services/timeline_builder.py` — phase timeline with reminders
- [ ] **T-38** · `backend/services/groq_service.py` — LLM calls
- [ ] **T-39** · `backend/services/rag_service.py` — ChromaDB seed + retrieval + context builder

---

## PHASE 6 — API Routers + Main

- [ ] **T-40** · `backend/routers/__init__.py`
- [ ] **T-41** · `backend/routers/auth.py`
- [ ] **T-42** · `backend/routers/recommendation.py`
- [ ] **T-43** · `backend/routers/projects.py`
- [ ] **T-44** · `backend/routers/setup.py`
- [ ] **T-45** · `backend/routers/solution.py`
- [ ] **T-46** · `backend/routers/timeline.py`
- [ ] **T-47** · `backend/routers/reminders.py`
- [ ] **T-48** · `backend/routers/chat.py`
- [ ] **T-49** · `backend/main.py`

---

## PHASE 7 — Frontend Foundation

- [ ] **T-50** · `frontend/src/api/client.js` — Axios instance with auth interceptors
- [ ] **T-51** · `frontend/src/store/authStore.js` — Zustand auth
- [ ] **T-52** · `frontend/src/store/projectStore.js` — Zustand project state
- [ ] **T-53** · `frontend/src/store/recommendStore.js` — Zustand recommendations
- [ ] **T-54** · `frontend/src/App.jsx` — Router + AnimatePresence + protected routes

---

## PHASE 8 — Reusable UI Components

- [ ] **T-55** · `frontend/src/components/ui/AnimatedCard.jsx`
- [ ] **T-56** · `frontend/src/components/ui/ImageWithFallback.jsx`
- [ ] **T-57** · `frontend/src/components/ui/Badge.jsx`
- [ ] **T-58** · `frontend/src/components/ui/SlidePanel.jsx`
- [ ] **T-59** · `frontend/src/components/ui/ProgressDots.jsx`
- [ ] **T-60** · `frontend/src/components/forms/QuantityEditor.jsx`
- [ ] **T-61** · `frontend/src/components/forms/PillSelector.jsx`
- [ ] **T-62** · `frontend/src/components/layout/Navbar.jsx`
- [ ] **T-63** · `frontend/src/components/layout/Sidebar.jsx`
- [ ] **T-64** · `frontend/src/components/layout/PageWrapper.jsx`

---

## PHASE 9 — Pages

- [ ] **T-65** · `frontend/src/pages/Landing.jsx` — hero, 3-step cards, crop strip, features
- [ ] **T-66** · `frontend/src/pages/Auth/SignIn.jsx`
- [ ] **T-67** · `frontend/src/pages/Auth/SignUp.jsx`
- [ ] **T-68** · `frontend/src/pages/Onboarding/InputWizard.jsx` — 8-step wizard
- [ ] **T-69** · `frontend/src/pages/Recommendation/CropCards.jsx` — AI recommendation cards
- [ ] **T-70** · `frontend/src/pages/Project/ProjectList.jsx` — list of user's projects
- [ ] **T-71** · `frontend/src/pages/Project/ProjectLayout.jsx` — sidebar + tab shell

---

## PHASE 10 — Project Tab Pages

- [ ] **T-72** · `frontend/src/pages/Project/tabs/SetupBudget.jsx`
  - Diagram image at top
  - Sections A/B/C/D as collapsible labeled tables
  - Each row: photo thumbnail + label + name + qty editor + price + buy link
  - Sticky cost bar at bottom
- [ ] **T-73** · `frontend/src/pages/Project/tabs/Solution.jsx`
  - Real photo header
  - Numbered mixing step cards with product thumbnails
  - Phase selector pills
  - Buy list table with photos
- [ ] **T-74** · `frontend/src/pages/Project/tabs/Timeline.jsx`
  - Phase progress bar
  - Expandable phase cards (Daily / Weekly / Observe)
  - Add Reminder per task → SlidePanel
- [ ] **T-75** · `frontend/src/pages/Project/tabs/ChatBot.jsx`
  - Full chat UI with RAG context strip
  - Suggested prompts on first load
  - Word-by-word bot response

---

## PHASE 11 — Project Sub-Components

- [ ] **T-76** · `frontend/src/pages/Project/components/BuyTable.jsx`
  - Reusable labeled table (used in SetupBudget + Solution)
  - 48px product photo | label | name | qty editor | unit price | total | buy link
- [ ] **T-77** · `frontend/src/pages/Project/components/PhaseCard.jsx` — expandable phase card
- [ ] **T-78** · `frontend/src/pages/Project/components/ReminderDrawer.jsx` — SlidePanel reminder form
- [ ] **T-79** · `frontend/src/pages/Project/components/ChatBubble.jsx` — single chat message
- [ ] **T-80** · `frontend/src/pages/Project/components/CostBar.jsx` — sticky animated cost summary

---

## PHASE 12 — Learn & Grow Module

- [ ] **T-81** · `frontend/src/pages/Learn/LearnPage.jsx`
  - Grid of 6 crop cards with real photos
  - Click opens full crop detail page
- [ ] **T-82** · `frontend/src/pages/Learn/CropDetail.jsx`
  - Hero image (full width, real photo)
  - System diagram image
  - General info: cycle time, yield, difficulty, environment
  - Phase timeline visual (colour-coded)
  - Nutrients section: phase-wise table with product photos
  - "Start This Project →" button with min budget shown
  - Budget gate: if user's budget < min required → show warning but allow proceed
- [ ] **T-83** · Add Learn route to `App.jsx` and Navbar link

---

## PHASE 13 — Integration & Polish

- [ ] **T-84** · `README.md` — full setup instructions
- [ ] **T-85** · Activity logging — verify all mutation routes write to activities table
- [ ] **T-86** · RAG context check — verify build_system_prompt includes all 7 layers
- [ ] **T-87** · Mobile responsiveness pass — sidebar → bottom tab bar on < 768px
- [ ] **T-88** · Final wiring check — CORS, auth guards, ChromaDB idempotent seed

---

## Image Reference (all Unsplash — no collection needed)

| Use | URL |
|---|---|
| Hero BG | `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80` |
| Auth Panel | `https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=900&q=80` |
| Bell Pepper | `https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&q=80` |
| Spinach | `https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80` |
| Lettuce | `https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&q=80` |
| Cherry Tomato | `https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800&q=80` |
| Oyster Mushroom | `https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=800&q=80` |
| Button Mushroom | `https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80` |
| Nutrient Mixing | `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&q=80` |
| Harvest Hands | `https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=80` |
| System Diagram BG | `https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=1200&q=80` |

---

## Notes

- **Images:** All Unsplash remote URLs embedded in JSON — no local files needed.
- **Learn & Grow module** (T-81 to T-83): interactive crop explorer pulled from the same `crops.json` + `nutrients.json` data. Shows all info colourfully, then lets user start a project with min budget validation.
- **Min budget logic:** `min_budget = base_kit_price * 1 + min_addon_cost`. Shown on crop detail page. User sees a warning if their saved budget is below it but can still proceed.
- **Database:** MySQL. Run `setup_db.sql` once, then SQLAlchemy creates all tables on startup.
- **Tell me which task to start and I'll write that file.**

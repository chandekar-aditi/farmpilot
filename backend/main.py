from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.database import init_db
from backend.routers import auth, recommendation, projects, setup, solution, timeline, reminders, chat, learn

app = FastAPI(
    title="FarmPilot API",
    description="AI-powered hydroponic and mushroom farming planner",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router,           prefix=PREFIX)
app.include_router(recommendation.router, prefix=PREFIX)
app.include_router(projects.router,       prefix=PREFIX)
app.include_router(setup.router,          prefix=PREFIX)
app.include_router(solution.router,       prefix=PREFIX)
app.include_router(timeline.router,       prefix=PREFIX)
app.include_router(reminders.router,      prefix=PREFIX)
app.include_router(chat.router,           prefix=PREFIX)
app.include_router(learn.router,          prefix=PREFIX)


@app.on_event("startup")
async def startup_event():
    print("[FarmPilot] Initialising database...")
    init_db()
    print("[FarmPilot] Database ready.")
    print("[FarmPilot] Seeding RAG knowledge base...")
    try:
        from backend.services.rag_service import seed_knowledge_base
        seed_knowledge_base()
    except Exception as e:
        print(f"[FarmPilot] RAG seeding error (non-fatal): {e}")
    print("[FarmPilot] Ready →  http://localhost:8000")
    print("[FarmPilot] Docs  →  http://localhost:8000/docs")


@app.get("/")
def root():
    return {"message": "FarmPilot API running", "docs": "/docs"}

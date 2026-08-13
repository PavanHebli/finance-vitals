import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import score, narrative, chat, simulate, goal, importer, export, feedback, snapshot

app = FastAPI(title="Vitals API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router)
app.include_router(narrative.router)
app.include_router(chat.router)
app.include_router(simulate.router)
app.include_router(goal.router)
app.include_router(importer.router)
app.include_router(export.router)
app.include_router(feedback.router)
app.include_router(snapshot.router)


@app.get("/health")
def health():
    return {"status": "ok"}

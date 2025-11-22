from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # <--- IMPORT THIS

from routes import project_route, library_route

app = FastAPI(title="MobTalker SDK Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount the routes
app.include_router(project_route.router)
app.include_router(library_route.router)

# 2. Mount the Library as Static Files
# This allows http://localhost:8000/static/images/bg.png to load the file
app.mount("/static", StaticFiles(directory="library"), name="static")

@app.get("/")
def root():
    return {"message": "SDK Backend Running. Fish is fresh."}
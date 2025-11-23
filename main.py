import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routes import project_route, library_route

app = FastAPI(title="MobTalker SDK")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. MOUNT THE LIBRARY (ASSETS)
# ---------------------------------------------------------
# Now, images will be at: http://localhost:8000/media/characters/cupa/skin.png
Path("library").mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory="library"), name="media")

# ---------------------------------------------------------
# 2. MOUNT THE UI (WEBSITE FILES)
# ---------------------------------------------------------
# JS/CSS will be at: http://localhost:8000/static/style.css
Path("static").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------------------------------------------------
# 3. HTML PAGE ROUTES
# ---------------------------------------------------------

@app.get("/", response_class=FileResponse)
async def get_root():
    """Serve the main Dashboard."""
    return "static/project.html"

@app.get("/projects", response_class=FileResponse)
async def get_root():
    """Serve the main Dashboard."""
    return "static/project.html"

@app.get("/library-ui", response_class=FileResponse) # Renamed for clarity
async def get_library_page():
    """Serve the Library Manager."""
    return "static/library.html"

@app.get("/hikarin", response_class=FileResponse) # Renamed for clarity
async def get_library_page():
    """Serve the Library Manager."""
    return "static/hikarin/index.html"

# ---------------------------------------------------------
# 4. API ROUTES
# ---------------------------------------------------------
app.include_router(project_route.router)
app.include_router(library_route.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8411, reload=True)
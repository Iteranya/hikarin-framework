# Hikarin Visual Novel Framework

![WIP Badge](https://img.shields.io/badge/Status-Work_In_Progress-orange)
![Python Badge](https://img.shields.io/badge/Backend-FastAPI-blue)
![JS Badge](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow)
![License Badge](https://img.shields.io/badge/License-MIT-green)

**Hikarin** is a truly platform-agnostic Visual Novel engine and SDK. Unlike traditional engines that compile to platform-specific executables, Hikarin compiles logic into a pure **JSON Finite State Machine (FSM)**.

This project was specifically architected to serve as the development kit for the revival of the legendary **Minecraft Mob Talker Mod**, allowing complex VN interactions to run directly inside Minecraft via a custom interpreter.

## ✨ Key Features

*   **True Platform Agnosticism:** Compiles story logic into portable JSON. If your target platform (game engine, web, Minecraft mod) can parse JSON, it can run your story.
*   **Dual Scripting Interface:**
    *   **Visual Editor:** Drag-and-drop logic construction powered by **Blockly**.
    *   **Code Editor:** Generated Python code for power users who prefer typing.
*   **Integrated Browser Preview:** Instantly playtest your scripts in the browser. No need to compile and load into Minecraft for quick checks and debugging.
*   **Lightweight Tech Stack:** Built with **FastAPI** and **Vanilla JavaScript**. No Node.js, no NPM hell, and no build steps required for the frontend.
*   **Asset Management:** Integrated asset browser for characters, backgrounds, and audio.

---

## 📸 Interface Gallery

### Visual Scripting (Blockly)
Create complex dialogue flows and logic branches using an intuitive drag-and-drop interface.
<img width="1919" height="895" alt="Screenshot 2025-11-25 133200" src="https://github.com/user-attachments/assets/e5cf730e-051d-42f6-acb5-e9e72f9e35f2" />

*(Script logic blocks translating to Python code)*

### Code Generation & Live Preview
The **Play / Test** mode allows you to run and debug your story directly in the browser, while still seeing the generated Python code side-by-side.
<img width="1918" height="884" alt="Screenshot 2025-11-25 133214" src="https://github.com/user-attachments/assets/bc5141c5-fb2b-424a-a153-b6753fb7e69c" />


### Project Management
Manage multiple storylines, scripts, and export configurations from a centralized dashboard.
<img width="1918" height="898" alt="Screenshot 2025-11-25 133101" src="https://github.com/user-attachments/assets/a6ae241c-c87e-45e0-b229-804d74b9b903" />


### Asset & Character Editor
Define characters, upload sprites, and manage metadata without touching a config file.
<img width="1176" height="815" alt="Screenshot 2025-11-25 133346" src="https://github.com/user-attachments/assets/101b439d-8a85-477c-95a1-d64c220acf15" />

---

## ⚙️ Development Workflow

Hikarin's SDK is designed for a fast, iterative workflow.

1.  **Create:** Write your story using the Visual Editor or Python.
2.  **Test:** Use the integrated preview window to instantly playtest and debug your script in the browser.
3.  **Compile:** Export the final story as a portable `story.json` file.
4.  **Deploy:** Load the JSON into the target environment (e.g., the Mob Talker Mod in Minecraft).

## 🛠️ Tech Stack

*   **Backend:** Python 3.x (FastAPI)
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Visual Scripting:** Google Blockly
*   **Output:** JSON FSM (Finite State Machine)

## 🚀 Installation & Setup

Since this project avoids heavy frontend bundlers, setup is standard for any Python developer.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/hikarin-vn-framework.git
    cd hikarin-vn-framework
    ```

2.  **Create a Virtual Environment**
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # Linux/MacOS
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install Requirements**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the SDK**
    ```bash
    python main.py
    ```
    *Access the editor at `http://127.0.0.1:8000` (or whichever port is defined).*

## ⛏️ The Minecraft Connection (Mob Talker)

The primary driver for Hikarin is the **Mob Talker Revival**. Running a VN engine inside a Java-based game environment like Minecraft is difficult.

Hikarin solves this by decoupling the **Logic** from the **Runner**.
1.  You write and test the story in Hikarin SDK.
2.  Hikarin compiles it to a `story.json`.
3.  The Minecraft Mod reads the JSON and moves the state machine forward based on player interaction.

## 🚧 Status

This project is currently a **Work In Progress (WIP)**.
- [x] Visual Scripting (Blockly Integration)
- [x] In-browser script preview
- [x] Asset Management
- [x] JSON Compilation
- [ ] Full FSM Spec documentation
- [ ] Audio event triggers

## 🤝 Contributing

Contributions are welcome! Since we are using Vanilla JS, please ensure your frontend PRs do not introduce build tools (Webpack/Vite) unless absolutely necessary for a new architecture.

## 📄 License

[MIT License](LICENSE)

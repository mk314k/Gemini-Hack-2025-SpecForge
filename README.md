
# Spec-to-Reality: Instant Product Factory

**Turn your ideas into engineering reality in seconds.**

Spec-to-Reality is a hackathon project that leverages the entire Google Gemini 2.5 / 3.0 multimodal suite to transform a simple natural language description into a full-blown engineering design packet. It acts as an instant "Product Factory," generating structured specs, technical blueprints, firmware code, marketing pitches, and even cinematic video commercials.

## 🚀 Features

*   **Instant Engineering Specs**: Converts vague ideas into rigorous JSON-structured engineering specifications (BOM, constraints, assembly steps).
*   **AI Blueprints (Nano Banana Pro)**: Generates blueprint-style technical diagrams (Top View, Exploded View, UI Mockups) using `gemini-3-pro-image-preview`.
*   **Auto-Coding**: Automatically writes the core firmware (Arduino C++) or frontend code (React) for the generated product.
*   **Cinematic Video (Veo)**: Generates a 5-second "Product Commercial" video using `veo-3.1-fast-generate-preview`.
*   **Audio Pitch**: Synthesizes a 30-second "Shark Tank" style pitch using Gemini 2.5 Flash TTS.
*   **Self-Correction Loop**: Uses Gemini 3 to "audit" its own work, comparing the generated specs against the visual diagrams to find physical inconsistencies.
*   **Design Packet Export**: One-click download of a self-contained HTML design packet containing all specs, images, code, and reports.
*   **Local History**: Saves your designs locally using IndexedDB (no quota limits) so you can revisit them later.

## 🛠️ Tech Stack

*   **Frontend**: React 19 (via Vite), TypeScript
*   **Styling**: Tailwind CSS
*   **AI SDK**: `@google/genai` (Google Generative AI SDK for Node/Web)
*   **Database**: IndexedDB (Browser-native async storage for large assets)
*   **Build Tool**: Vite

## 🤖 Google AI Models Used

This project utilizes the full spectrum of Google's latest models:

1.  **Logic & Reasoning**: `gemini-3-pro-preview`
    *   **Spec Generation**: Uses strict JSON Schema enforcement to create complex engineering documents.
    *   **Code Generation**: Writes functional C++ or TypeScript based on the product type.
    *   **Self-Correction**: Audits the generated blueprints for physical feasibility.

2.  **Vision & Generation**: `gemini-3-pro-image-preview` (Nano Banana Pro)
    *   **Blueprints**: Creates high-fidelity schematic technical drawings.

3.  **Video Generation**: `veo-3.1-fast-generate-preview`
    *   **Commercials**: Generates 720p cinematic product videos.

4.  **Audio Generation**: `gemini-2.5-flash-preview-tts`
    *   **Marketing Pitch**: Text-to-Speech generation for the elevator pitch.

## 📂 Project Structure

*   `src/components`: React UI components (Hero Chat, Design Grid, Video Player).
*   `src/services/gemini.ts`: The AI orchestration layer (Spec -> Images -> Code -> Video -> Audit).
*   `src/services/db.ts`: IndexedDB wrapper for persisting large design packets.
*   `examples/`: Sample downloadable design packets.

## ⚡ How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Locally**:
    ```bash
    npm run dev
    ```
3.  **API Key**:
    The app requires a **Google Cloud Project API Key** with billing enabled (required for Veo & Nano Banana Pro). You will be prompted to select this key via the secure Google AI Studio popup upon launching the app.

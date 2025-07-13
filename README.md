# Podcast_player_ai 🎧🤖

## Overview
Welcome to the Podcast Player AI! This project empower your podcast experience with the help of AI: whether you're a casual listener or a podcast enthusiast, our app is designed to enhance your listening experience with intelligent features.

This project is a web-based application designed for audio transcription and analysis, leveraging advanced AI services for enhanced functionalities. It provides a user-friendly interface for uploading audio files, generating transcriptions, interacting with the content through AI-powered chat, creating bookmarks with AI comments, and managing notes.

## Features

  * **Audio Upload & Playback**: Upload audio files via a file input or drag-and-drop, and play them back with interactive controls.
  * **Transcription**:
      * Transcribe uploaded audio using **OpenAI Whisper**.
      * Display transcription segments with clickable timestamps for easy navigation.
      * Export and import transcriptions.
  * **Bookmarks**:
      * Add bookmarks at specific points in the audio, capturing relevant transcript text.
      * Edit bookmark comments manually.
      * Generate AI-powered comments for bookmarks.
      * Copy bookmark content to notes.
      * Export bookmarks in JSONL format.
  * **AI-powered Chat & Summary**:
      * Engage in chat conversations about the transcribed audio.
      * Generate summaries of the transcription using **Azure OpenAI**.
  * **Notes Management**: Create, clear, and export notes in various formats (JSONL, plain text, summary).
  * **Voice Commands**: Interpret and execute voice commands for audio player controls.
  * **Real-time Speech Recognition (Push-to-Talk)**: Utilize **Azure Speech Service** for real-time speech-to-text functionality.

## Technologies Used

  * **Backend**: Flask (Python)
      * OpenAI Whisper
      * Azure Speech Service
      * Azure OpenAI
      * `pydub` for audio processing
      * `python-dotenv` for environment variable management
      * `Flask-CORS` for handling Cross-Origin Resource Sharing
  * **Frontend**: HTML, CSS, JavaScript
      * Utilizes Fetch API for backend communication

## Setup and Installation

### Prerequisites

  * Python 3.x
  * Node.js and npm (if managing frontend dependencies)
  * Azure account with Speech Service and OpenAI deployed.
  * Environment variables for Azure OpenAI and Speech services.

### Backend Setup

1.  **Clone the repository (if not already done):**

    ```bash
    git clone <repository_url>
    cd <repository_name>
    ```

2.  **Create a virtual environment and activate it:**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install backend dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

    (Note: A `requirements.txt` file is assumed, containing `Flask`, `openai-whisper`, `azure-cognitiveservices-speech`, `azure-identity`, `pydub`, `python-dotenv`, `Flask-CORS`, `requests`.)

4.  **Configure Environment Variables:**
    Create a `.env` file in the root directory of the project and add your Azure credentials:

    ```
    AZURE_OPENAI_ENDPOINT="YOUR_AZURE_OPENAI_ENDPOINT"
    AZURE_OPENAI_KEY="YOUR_AZURE_OPENAI_KEY"
    AZURE_OPENAI_DEPLOYMENT="YOUR_AZURE_OPENAI_DEPLOYMENT_NAME"
    AZURE_SPEECH_KEY="YOUR_AZURE_SPEECH_KEY"
    AZURE_SPEECH_REGION="YOUR_AZURE_SPEECH_REGION"
    ```

    Make sure to replace the placeholder values with your actual Azure credentials.

5.  **Run the Flask application:**

    ```bash
    python app.py
    ```

    The server will typically run on `http://localhost:5000`.

### Frontend Setup

The frontend is served directly by the Flask application. No separate build step is typically required for `script.js` and other static assets, assuming they are placed in the `static` and `templates` folders as configured in `app.py`.

Ensure `index.html` is in the `templates` folder and `script.js` (and any CSS files) are in the `static` folder.

## Usage

1.  **Access the Application**: Open your web browser and navigate to `http://localhost:5000`.
2.  **Upload Audio**: Click the "Upload Audio" button or drag and drop an audio file into the designated area.
3.  **Transcribe**: Once the audio is loaded, click the "Transcribe" button to generate the transcription.
4.  **Interact**:
      * **Play/Pause**: Use the player controls to play or pause the audio.
      * **Seek**: Click on the progress bar or transcription timestamps to jump to specific points in the audio.
      * **Bookmarks**: Add bookmarks, edit comments, or generate AI comments for key moments.
      * **Chat**: Use the chat interface to ask questions or get analysis about the transcript.
      * **Summarize**: Generate a summary of the entire transcription.
      * **Notes**: Add and manage personal notes.
      * **Push-to-Talk**: Use the PTT button for real-time speech recognition and command interpretation.

## Project Structure

```
.
├── app.py                  # Flask backend application
├── script.js               # Frontend JavaScript for interactivity
├── static/
│   └── (css, images, etc.) # Frontend static assets
├── templates/
│   └── index.html          # Main HTML page
├── .env.example            # Example environment variables file
└── README.md               # This file
└── requirements.txt        # Python dependencies
```




"""
Flask Audio Transcription and Analysis Application

This application provides:
- Audio file upload and transcription using OpenAI Whisper
- Real-time speech recognition using Azure Speech Service
- AI-powered chat and summary generation using Azure OpenAI
- Voice command interpretation for audio player controls
- Bookmark generation with AI-powered comments

Dependencies:
- Flask with CORS support
- OpenAI Whisper for transcription
- Azure Speech Service for real-time recognition
- Azure OpenAI for chat and summarization
- pydub for audio processing
"""

import os
import json
import uuid
import tempfile
import requests
import whisper
import markdown
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from pydub import AudioSegment


# =============================================================================
# Configuration and Setup
# =============================================================================

# Load environment variables
load_dotenv()

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_KEY = os.getenv('AZURE_OPENAI_KEY')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT')
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2023-05-15')

# Azure Speech Service Configuration
SPEECH_KEY = os.getenv('AZURE_SPEECH_KEY')
SPEECH_REGION = os.getenv('AZURE_SPEECH_REGION')

# Application Configuration
UPLOAD_FOLDER = 'uploads'
TRANSCRIPTION_FOLDER = 'transcriptions'
WHISPER_MODEL_SIZE = "base"  # Options: "tiny", "base", "small", "medium", "large"

# Create Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Initialize Whisper model
model = whisper.load_model(WHISPER_MODEL_SIZE)

# Create required directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TRANSCRIPTION_FOLDER, exist_ok=True)


# =============================================================================
# Utility Functions
# =============================================================================

def validate_azure_openai_config():
    """Validate Azure OpenAI configuration."""
    return bool(AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY and AZURE_OPENAI_DEPLOYMENT)


def validate_speech_config():
    """Validate Azure Speech Service configuration."""
    return bool(SPEECH_KEY and SPEECH_REGION)


def call_azure_openai(system_prompt, user_prompt, max_tokens=800, temperature=0.7):
    """
    Make a call to Azure OpenAI API.

    Args:
        system_prompt (str): System message for the AI
        user_prompt (str): User message/query
        max_tokens (int): Maximum tokens in response
        temperature (float): Response randomness (0-1)

    Returns:
        dict: API response or None if error
    """
    if not validate_azure_openai_config():
        return None

    try:
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_OPENAI_KEY
        }

        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        response = requests.post(
            f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}",
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Azure OpenAI API error: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"Error calling Azure OpenAI: {str(e)}")
        return None


def convert_audio_to_wav(input_path, output_path):
    """
    Convert audio file to WAV format (16kHz, 16-bit, mono) for Azure Speech Service.

    Args:
        input_path (str): Path to input audio file
        output_path (str): Path for output WAV file
    """
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_frame_rate(16000)
    audio = audio.set_channels(1)
    audio = audio.set_sample_width(2)
    audio.export(output_path, format="wav")


def cleanup_temp_files(*file_paths):
    """Remove temporary files safely."""
    for file_path in file_paths:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass


def fallback_command_interpretation(command):
    """
    Simple rule-based fallback for command interpretation when Azure OpenAI is unavailable.

    Args:
        command (str): User command to interpret

    Returns:
        dict: Structured command response
    """
    command_lower = command.lower()

    # Complex command patterns
    if 'bookmark and play' in command_lower:
        return {
            'intent': 'Add bookmark and continue playing',
            'actions': [
                {'action': 'add_bookmark', 'parameters': {'note': 'Quick bookmark'}},
                {'action': 'play', 'parameters': {}, 'delay': 500}
            ],
            'execution_mode': 'sequential'
        }

    if 'transcribe and export' in command_lower:
        return {
            'intent': 'Transcribe audio and export transcript',
            'actions': [
                {'action': 'transcribe', 'parameters': {}},
                {'action': 'export_transcript', 'parameters': {}, 'delay': 2000}
            ],
            'execution_mode': 'sequential'
        }

    # Single action patterns (existing logic)
    if 'play' in command_lower:
        return {
            'intent': 'Play audio',
            'actions': [{'action': 'play', 'parameters': {}}],
            'execution_mode': 'sequential'
        }

    # Default unknown
    return {
        'intent': 'Unknown command',
        'actions': [{'action': 'unknown', 'parameters': {}}],
        'execution_mode': 'sequential'
    }

def parse_json_from_text(text):
    """
    Extract JSON from text that might contain markdown formatting.

    Args:
        text (str): Text potentially containing JSON

    Returns:
        dict: Parsed JSON or None if parsing fails
    """
    try:
        # Try parsing entire text as JSON
        return json.loads(text)
    except json.JSONDecodeError:
        # Try extracting JSON from markdown code blocks
        import re
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|{[\s\S]*}', text)
        if json_match:
            try:
                json_text = json_match.group(1) or json_match.group(0)
                return json.loads(json_text)
            except json.JSONDecodeError:
                pass
    return None


# =============================================================================
# Main Routes
# =============================================================================

@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(UPLOAD_FOLDER, filename)


# =============================================================================
# File Upload and Transcription Routes
# =============================================================================

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle file upload and return a unique file ID.

    Returns:
        JSON response with file_id and filename or error message
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Generate unique ID and save file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{file.filename}")
    file.save(file_path)

    return jsonify({
        'message': 'File uploaded successfully',
        'file_id': file_id,
        'filename': file.filename
    })


@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe uploaded audio file using Whisper.

    Returns:
        JSON response with transcription segments or error message
    """
    data = request.json
    file_id = data.get('file_id')
    filename = data.get('filename')

    if not file_id or not filename:
        return jsonify({'error': 'Missing file ID or filename'}), 400

    file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{filename}")

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    try:
        # Transcribe with Whisper
        result = model.transcribe(file_path, word_timestamps=True)

        # Process segments with word-level timestamps
        segments = []
        for segment in result["segments"]:
            segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
                "words": segment.get("words", [])
            })

        # Save transcription
        transcription_path = os.path.join(TRANSCRIPTION_FOLDER, f"{file_id}_transcription.json")
        with open(transcription_path, 'w', encoding='utf-8') as f:
            json.dump(segments, f, ensure_ascii=False, indent=2)

        return jsonify({
            'message': 'Transcription completed',
            'transcription_id': file_id,
            'segments': segments
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get_transcription/<transcription_id>', methods=['GET'])
def get_transcription(transcription_id):
    """
    Retrieve saved transcription by ID.

    Args:
        transcription_id (str): Unique transcription identifier

    Returns:
        JSON response with transcription segments or error message
    """
    transcription_path = os.path.join(TRANSCRIPTION_FOLDER, f"{transcription_id}_transcription.json")

    if not os.path.exists(transcription_path):
        return jsonify({'error': 'Transcription not found'}), 404

    try:
        with open(transcription_path, 'r', encoding='utf-8') as f:
            segments = json.load(f)

        return jsonify({'segments': segments})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# Speech Recognition Routes
# =============================================================================

@app.route('/recognize_speech', methods=['POST'])
def recognize_speech():
    """
    Perform real-time speech recognition using Azure Speech Service REST API.

    Returns:
        JSON response with recognized transcript or error message
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file part in the request'}), 400

    audio_file = request.files['audio']
    language = request.form.get('language', 'en-US')

    if not audio_file:
        return jsonify({'error': 'No audio file provided'}), 400

    if not validate_speech_config():
        return jsonify({
            'error': 'Azure Speech service not configured. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables.'
        }), 500

    # Create temporary file paths
    temp_input_path = os.path.join(tempfile.gettempdir(), f"input_audio_{uuid.uuid4()}.webm")
    temp_output_path = os.path.join(tempfile.gettempdir(), f"converted_audio_{uuid.uuid4()}.wav")

    try:
        # Save and convert audio
        audio_file.save(temp_input_path)
        convert_audio_to_wav(temp_input_path, temp_output_path)

        # Read converted audio
        with open(temp_output_path, 'rb') as wav_file:
            audio_data = wav_file.read()

        # Azure Speech Service API call
        endpoint = f"https://{SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"

        headers = {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY,
            'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
            'Accept': 'application/json'
        }

        params = {
            'language': language,
            'format': 'detailed'
        }

        response = requests.post(
            endpoint,
            headers=headers,
            params=params,
            data=audio_data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()

            # Extract transcript from response
            transcript = ""
            if 'NBest' in result and len(result['NBest']) > 0:
                transcript = result['NBest'][0]['Display']
            elif 'DisplayText' in result:
                transcript = result['DisplayText']
            else:
                transcript = "No speech could be recognized."

            return jsonify({'transcript': transcript})
        else:
            error_message = f"Speech recognition failed with status {response.status_code}"
            if response.text:
                error_message += f": {response.text}"
            return jsonify({'error': error_message}), 500

    except Exception as e:
        print(f"Azure Speech Recognition Error: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        cleanup_temp_files(temp_input_path, temp_output_path)


# =============================================================================
# AI-Powered Features Routes
# =============================================================================

@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    """
    Generate a summary of the transcript using Azure OpenAI.

    Returns:
        JSON response with summary or error message
    """
    data = request.json
    transcript_text = data.get('transcript_text')

    if not transcript_text:
        return jsonify({'error': 'No transcript provided'}), 400

    if not validate_azure_openai_config():
        return jsonify({'error': 'Azure OpenAI service not configured'}), 500

    try:
        system_prompt = "You are a helpful assistant that summarizes transcripts of a podcast. Your goal is to provide an exaustive summary, that cleary highlights relevant part/topics of the transcript of the podcast. Rembember to refer to the transcript as podcast.."
        user_prompt = f"""Generate a concise summary of the following podcast transcript.
        Follow these guidelines: Put a short paragraph at the beginning with a general overview, make a concise summary, prefer bullet points style, add links/references if needed.
        Summarize the transcript:
        {transcript_text}

        Summary:
        """

        result = call_azure_openai(system_prompt, user_prompt, max_tokens=500)

        if result and 'choices' in result:
            print(result)
            markdown_summary = result["choices"][0]["message"]["content"].strip()

            # Convert Markdown to HTML
            html_summary = markdown.markdown(markdown_summary)
            return jsonify({
                'markdown': markdown_summary,  # Use consistent key
                'html': html_summary
            })
        else:
            return jsonify({'error': 'Failed to generate summary'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generate_bookmark_comment', methods=['POST'])
def generate_bookmark_comment():
    """
    Generate an AI-powered comment for a bookmark based on transcript segment.

    Returns:
        JSON response with comment or error message
    """
    data = request.json
    transcript_text = data.get('transcript_text')

    if not transcript_text:
        return jsonify({'error': 'No transcript provided'}), 400

    if not validate_azure_openai_config():
        return jsonify({'error': 'Azure OpenAI service not configured'}), 500

    try:
        system_prompt = "You are a helpful assistant that creates brief, insightful comments about audio transcript segments."
        user_prompt = f"""Generate a brief, insightful comment about this audio transcript segment.
        Focus on key points, themes, or important information.
        Keep it concise (1-2 sentences max):

        "{transcript_text}"

        Comment:"""

        result = call_azure_openai(system_prompt, user_prompt, max_tokens=150)

        if result and 'choices' in result:
            comment = result["choices"][0]["message"]["content"].strip()
            return jsonify({'comment': comment})
        else:
            return jsonify({'error': 'Failed to generate comment'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    """
    Handle chat queries with transcript context using Azure OpenAI.

    Returns:
        JSON response with AI response or error message
    """
    data = request.json
    query = data.get('query')
    transcript_context = data.get('transcript_context', '')
    chat_history = data.get('chat_history', [])

    if not query:
        return jsonify({'error': 'No query provided'}), 400

    if not validate_azure_openai_config():
        return jsonify({'error': 'Azure OpenAI credentials not configured'}), 500

    try:
        # Build conversation messages
        messages = [
            {
                "role": "system",
                "content": f"You are a helpful assistant. Use the following transcript as context for answering questions: {transcript_context}"
            }
        ]

        # Add chat history
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current query
        messages.append({"role": "user", "content": query})

        # Make API call
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_OPENAI_KEY
        }

        payload = {
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800
        }

        response = requests.post(
            f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}",
            headers=headers,
            json=payload
        )

        if response.status_code == 200:
            response_data = response.json()
            assistant_message = response_data['choices'][0]['message']['content']
            return jsonify({'response': assistant_message})
        else:
            return jsonify({'error': f'Azure OpenAI API error: {response.text}'}), response.status_code

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# Command Interpretation Routes
# =============================================================================

@app.route('/interpret_command', methods=['POST'])
def interpret_command():
    """
    Interpret natural language commands for audio player control.

    Returns:
        JSON response with structured command or error message
    """
    try:
        data = request.json

        if not data or 'command' not in data:
            return jsonify({'error': 'No command provided'}), 400

        command = data['command']
        app_state = data.get('app_state', {})
        command_history = data.get('command_history', [])

        # Try AI-powered interpretation first
        if validate_azure_openai_config():
            ai_response = interpret_command_with_ai(command, app_state, command_history)
            if ai_response:
                ai_response['execute'] = True
                ai_response['message'] = f"Executing plan: {ai_response.get('intent', 'Unknown command')}"
                return jsonify(ai_response), 200

        # Fall back to rule-based interpretation
        fallback_response = fallback_command_interpretation(command)
        # Convert single action to plan format for consistency
        if 'action' in fallback_response:
            fallback_response['actions'] = [{
                'action': fallback_response.pop('action'),
                'parameters': fallback_response.pop('parameters', {})
            }]
            fallback_response['execution_mode'] = 'sequential'

        fallback_response['execute'] = True
        fallback_response['message'] = f"Executing plan: {fallback_response.get('intent', 'Unknown command')}"
        return jsonify(fallback_response), 200

    except Exception as e:
        print(f"Error in command interpretation: {str(e)}")
        return jsonify({'error': 'Error processing command', 'actions': [{'action': 'unknown', 'parameters': {}}]}), 200


def interpret_command_with_ai(command, app_state, command_history):
    """
    Use Azure OpenAI to interpret natural language commands.

    Args:
        command (str): User command
        app_state (dict): Current application state
        command_history (list): Recent command history

    Returns:
        dict: Structured command response or None if failed
    """
    system_prompt = """
    You are a command interpreter for an audio player web application.
    Your job is to convert natural language commands into structured actions or plans.
    The application allows users to:
    - Play/pause audio
    - Seek to specific times
    - Add bookmarks at specific points
    - Transcribe audio
    - Export transcripts and bookmarks
    - Search within transcripts
    - Change playback speed

    You can now handle complex commands that require multiple actions in sequence.

    Return a JSON object with:
    1. "intent": A brief description of what the user wants
    2. "actions": An array of action objects, each containing:
       - "action": The specific action to perform
       - "parameters": Parameters for that action
       - "delay": Optional delay in milliseconds before executing this action
    3. "execution_mode": Either "sequential" or "parallel"

    Single action example:
    {
      "intent": "Play audio",
      "actions": [
        {
          "action": "play",
          "parameters": {}
        }
      ],
      "execution_mode": "sequential"
    }

    Multiple actions example:
    {
      "intent": "Jump to 2 minutes, add bookmark, then continue playing",
      "actions": [
        {
          "action": "seek",
          "parameters": {"timeString": "00:02:00"}
        },
        {
          "action": "add_bookmark",
          "parameters": {"note": "Important section"},
          "delay": 500
        },
        {
          "action": "play",
          "parameters": {},
          "delay": 1000
        }
      ],
      "execution_mode": "sequential"
    }
    """

    user_prompt = f"""
    Command: "{command}"
    Current app state:
    - Audio loaded: {app_state.get('isAudioLoaded', False)}
    - Currently playing: {app_state.get('isPlaying', False)}
    - Current time: {app_state.get('currentTime', 0)} seconds
    - Duration: {app_state.get('duration', 0)} seconds
    - Has transcript: {app_state.get('hasTranscript', False)}
    - Number of bookmarks: {app_state.get('bookmarksCount', 0)}

    Recent commands:
    {' '.join([f'- "{cmd}"' for cmd in command_history[-3:]])}

    Parse this command and return a structured action plan. Consider:
    - If the command involves multiple steps, create a sequential plan
    - If actions can be done simultaneously, use parallel execution
    - Add appropriate delays between actions when needed
    - Break complex commands into logical steps
    """

    result = call_azure_openai(system_prompt, user_prompt, max_tokens=800, temperature=0.3)

    if result and 'choices' in result:
        content = result['choices'][0]['message']['content']
        print(f'DEBUG: content')
        return parse_json_from_text(content)

    return None


"""
PLAN VALIDATION
def validate_plan(plan_response, app_state):
    Validate that the plan is executable given current state
    if not app_state.get('isAudioLoaded', False):
        # Filter out actions that require audio to be loaded
        valid_actions = ['upload_prompt', 'help']
        plan_response['actions'] = [
            action for action in plan_response['actions']
            if action['action'] in valid_actions
        ]

    return plan_response
"""


# =============================================================================
# Application Entry Point
# =============================================================================

if __name__ == '__main__':
    print("Starting Audio Transcription Server")
    print("=" * 50)
    print(f"Server URL: http://localhost:5000")
    print(f"Whisper Model: {WHISPER_MODEL_SIZE}")
    print(f"Azure OpenAI: {'✓' if validate_azure_openai_config() else '✗'}")
    print(f"Azure Speech: {'✓' if validate_speech_config() else '✗'}")
    print("=" * 50)

    app.run(debug=True, port=5000)

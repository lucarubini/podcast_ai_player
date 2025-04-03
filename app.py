from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import whisper
import json
import requests
import uuid
from dotenv import load_dotenv

# Add after other configurations
# Load environment variables
load_dotenv()

# Azure OpenAI configuration
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_KEY = os.getenv('AZURE_OPENAI_KEY')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT')
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2023-05-15')



# Create Flask app with proper static and template folders
app = Flask(__name__,
            static_folder='static',
            template_folder='templates')
CORS(app)

# Load Whisper model - choose model size based on your needs
# Options: "tiny", "base", "small", "medium", "large"
model = whisper.load_model("base")

# Configuration
UPLOAD_FOLDER = 'uploads'
TRANSCRIPTION_FOLDER = 'transcriptions'

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TRANSCRIPTION_FOLDER, exist_ok=True)

@app.route('/')
def index():
    # Use render_template instead of raw file reading
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Generate unique ID for this upload
    file_id = str(uuid.uuid4())

    # Save the file
    file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{file.filename}")
    file.save(file_path)

    return jsonify({
        'message': 'File uploaded successfully',
        'file_id': file_id,
        'filename': file.filename
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
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

        # Process segments to include word-level timestamps
        segments = []
        for segment in result["segments"]:
            # Format the segment data
            segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
                "words": segment.get("words", [])
            })

        # Save transcription to file
        transcription_path = os.path.join(TRANSCRIPTION_FOLDER, f"{file_id}_transcription.json")
        with open(transcription_path, 'w') as f:
            json.dump(segments, f)

        return jsonify({
            'message': 'Transcription completed',
            'transcription_id': file_id,
            'segments': segments
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_transcription/<transcription_id>', methods=['GET'])
def get_transcription(transcription_id):
    transcription_path = os.path.join(TRANSCRIPTION_FOLDER, f"{transcription_id}_transcription.json")

    if not os.path.exists(transcription_path):
        return jsonify({'error': 'Transcription not found'}), 404

    with open(transcription_path, 'r') as f:
        segments = json.load(f)

    return jsonify({
        'segments': segments
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# Add this new route for summary generation
@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    data = request.json
    transcript_text = data.get('transcript_text')

    if not transcript_text:
        return jsonify({'error': 'No transcript provided'}), 400

    try:
        # Prepare the prompt for GPT
        prompt = f"Generate a concise summary of the following transcript:\n\n{transcript_text}\n\nSummary:"

        # Make request to Azure OpenAI
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_OPENAI_KEY
        }

        payload = {
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that summarizes transcripts."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 500
        }

        response = requests.post(
            f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-05-15",
            headers=headers,
            json=payload
        )

        if response.status_code == 200:
            result = response.json()
            summary = result["choices"][0]["message"]["content"].strip()
            return jsonify({
                'summary': summary
            })
        else:
            return jsonify({'error': f'API Error: {response.text}'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    query = data.get('query')
    transcript_context = data.get('transcript_context', '')
    chat_history = data.get('chat_history', [])

    if not query:
        return jsonify({'error': 'No query provided'}), 400

    if not AZURE_OPENAI_ENDPOINT or not AZURE_OPENAI_KEY:
        return jsonify({'error': 'Azure OpenAI credentials not configured'}), 500

    try:
        # Prepare the messages for the API
        messages = [
            {"role": "system", "content": f"You are a helpful assistant. Use the following transcript as context for answering questions: {transcript_context}"}
        ]

        # Add chat history if available
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current user query
        messages.append({"role": "user", "content": query})

        # Call Azure OpenAI API
        response = requests.post(
            f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={AZURE_OPENAI_API_VERSION}",
            headers={
                "Content-Type": "application/json",
                "api-key": AZURE_OPENAI_KEY
            },
            json={
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 800
            }
        )

        if response.status_code == 200:
            response_data = response.json()
            assistant_message = response_data['choices'][0]['message']['content']

            return jsonify({
                'response': assistant_message
            })
        else:
            return jsonify({'error': f'Azure OpenAI API error: {response.text}'}), response.status_code

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/interpret_command', methods=['POST'])
def interpret_command():
    try:
        data = request.json

        if not data or 'command' not in data:
            return jsonify({'error': 'No command provided'}), 400

        command = data['command']
        app_state = data.get('app_state', {})
        command_history = data.get('command_history', [])

        # Define the system prompt
        system_prompt = """
        You are a command interpreter for an audio player web application.
        The application allows users to:
        - Play/pause audio
        - Seek to specific times
        - Add bookmarks at specific points
        - Transcribe audio
        - Export transcripts and bookmarks
        - Search within transcripts
        - Change playback speed

        Your job is to convert natural language commands into structured actions.

        Return a JSON object with:
        1. "intent": A brief description of what the user wants
        2. "action": One of these actions:
           ["play", "pause", "seek", "add_bookmark", "transcribe", "export_transcript",
            "export_bookmarks", "skip_forward", "skip_backward", "change_playback_speed",
            "find_in_transcript", "upload_prompt", "help", "unknown"]
        3. "parameters": An object with relevant parameters for the action

        Example response:
        {
          "intent": "Jump to 2 minutes 30 seconds",
          "action": "seek",
          "parameters": {
            "timeString": "00:02:30"
          }
        }
        """

        # Build the prompt with context
        user_prompt = f"""
        Command: "{command}"

        Current app state:
        - Audio loaded: {app_state.get('isAudioLoaded', False)}
        - Currently playing: {app_state.get('isPlaying', False)}
        - Current time: {app_state.get('currentTime', 0)}
        - Has transcript: {app_state.get('hasTranscript', False)}
        - Number of bookmarks: {app_state.get('bookmarksCount', 0)}

        Recent commands:
        {' '.join([f'- "{cmd}"' for cmd in command_history[-3:]])}

        Parse this command and return the structured action JSON.
        """

        # Make API call to Azure OpenAI
        response = call_azure_openai(system_prompt, user_prompt)

        if not response:
            return jsonify({'error': 'Could not interpret command', 'action': 'unknown'}), 200

        # Return the structured command
        return jsonify(response), 200

    except Exception as e:
        print(f"Error in command interpretation: {str(e)}")
        return jsonify({'error': 'Error processing command', 'action': 'unknown'}), 200

def call_azure_openai(system_prompt, user_prompt):
    """Call Azure OpenAI to interpret the command."""
    try:
        # If Azure OpenAI credentials aren't configured, use a fallback interpretation
        if not AZURE_OPENAI_ENDPOINT or not AZURE_OPENAI_KEY:
            return fallback_interpretation(user_prompt)

        headers = {
            'Content-Type': 'application/json',
            'api-key': AZURE_OPENAI_KEY
        }

        payload = {
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            'max_tokens': 800,
            'temperature': 0.3
        }

        response = requests.post(
            f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-07-01-preview",
            headers=headers,
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']

            # Extract JSON from the content
            try:
                # First try to parse the entire content as JSON
                parsed_content = json.loads(content)
                return parsed_content
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from text
                import re
                json_match = re.search(r'```json\s*([\s\S]*?)\s*```|{[\s\S]*}', content)
                if json_match:
                    try:
                        return json.loads(json_match.group(1) or json_match.group(0))
                    except:
                        pass

            # If all parsing fails, use fallback
            return fallback_interpretation(user_prompt)
        else:
            print(f"Azure OpenAI API error: {response.status_code} - {response.text}")
            return fallback_interpretation(user_prompt)

    except Exception as e:
        print(f"Error calling Azure OpenAI: {str(e)}")
        return fallback_interpretation(user_prompt)

def fallback_interpretation(user_prompt):
    """Simple rule-based fallback for command interpretation."""
    command = user_prompt.lower().split('Command: "')[1].split('"')[0].lower().strip()

    # Basic rule-based parsing as fallback
    if 'play' in command and 'back' not in command and 'speed' not in command:
        return {
            'intent': 'Start playing audio',
            'action': 'play',
            'parameters': {}
        }
    elif 'pause' in command or 'stop' in command:
        return {
            'intent': 'Pause audio playback',
            'action': 'pause',
            'parameters': {}
        }
    elif any(x in command for x in ['go to', 'seek to', 'jump to']):
        # Extract time if available
        import re
        time_match = re.search(r'(\d+):(\d+)(?::(\d+))?', command)
        if time_match:
            minutes = int(time_match.group(1))
            seconds = int(time_match.group(2))
            hours = int(time_match.group(3)) if time_match.group(3) else 0
            return {
                'intent': f'Jump to {hours}:{minutes}:{seconds}',
                'action': 'seek',
                'parameters': {
                    'timeString': f'{hours:02d}:{minutes:02d}:{seconds:02d}'
                }
            }
    elif 'bookmark' in command:
        title_match = re.search(r'bookmark\s+(.+)', command)
        title = title_match.group(1) if title_match else 'Bookmark'
        return {
            'intent': f'Add bookmark: {title}',
            'action': 'add_bookmark',
            'parameters': {
                'title': title
            }
        }
    elif 'transcribe' in command:
        return {
            'intent': 'Transcribe audio',
            'action': 'transcribe',
            'parameters': {}
        }
    elif 'help' in command:
        return {
            'intent': 'Show command help',
            'action': 'help',
            'parameters': {}
        }

    # Default unknown action
    return {
        'intent': 'Unknown command',
        'action': 'unknown',
        'parameters': {}
    }


if __name__ == '__main__':
    print("Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)

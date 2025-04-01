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



if __name__ == '__main__':
    print("Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)

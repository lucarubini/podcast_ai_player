from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import whisper
import json
import uuid
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add these constants below other configurations
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")

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


if __name__ == '__main__':
    print("Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)

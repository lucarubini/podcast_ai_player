from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import whisper
import json
import time
import uuid

# Create a new Flask app - change static folder to the directory where your HTML file is
app = Flask(__name__)
CORS(app)

# Load Whisper model - choose model size based on your needs
# Options: "tiny", "base", "small", "medium", "large"
model = whisper.load_model("base")

UPLOAD_FOLDER = 'uploads'
TRANSCRIPTION_FOLDER = 'transcriptions'

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TRANSCRIPTION_FOLDER, exist_ok=True)

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

# Serve the index.html file at the root URL
@app.route('/')
def index():
    return send_file('index.html')

# Serve any static files
@app.route('/<path:path>')
def serve_static(path):
    return send_file(path)

# Helper function to send files more safely
def send_file(path):
    try:
        return open(path, 'r').read()
    except Exception as e:
        return f"File not found: {path}", 404

if __name__ == '__main__':
    print("Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)

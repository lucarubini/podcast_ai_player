from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import whisper
import json
import uuid

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

if __name__ == '__main__':
    print("Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)

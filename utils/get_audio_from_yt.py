#!/usr/bin/env python3
"""
Simple script to extract audio from video URLs
Supports YouTube, Vimeo, and many other platforms via yt-dlp
"""

import os
import sys
import argparse
from pathlib import Path

try:
    import yt_dlp
except ImportError:
    print("Error: yt-dlp is not installed. Install it with:")
    print("pip install yt-dlp")
    sys.exit(1)

def extract_audio(url, output_dir="./audio_downloads", audio_format="mp3", quality="192"):
    """
    Extract audio from a video URL

    Args:
        url (str): Video URL
        output_dir (str): Directory to save audio files
        audio_format (str): Audio format (mp3, wav, m4a, etc.)
        quality (str): Audio quality/bitrate
    """

    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Configure yt-dlp options
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': audio_format,
            'preferredquality': quality,
        }],
        'postprocessor_args': [
            '-ar', '44100',  # Sample rate
        ],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Extracting audio from: {url}")

            # Get video info
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown Title')
            duration = info.get('duration', 'Unknown')

            print(f"Title: {title}")
            print(f"Duration: {duration} seconds" if duration != 'Unknown' else "Duration: Unknown")

            # Download and extract audio
            ydl.download([url])
            print(f"✅ Audio extracted successfully to: {output_dir}")

    except yt_dlp.DownloadError as e:
        print(f"❌ Download error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

    return True

def main():
    parser = argparse.ArgumentParser(description='Extract audio from video URLs')
    parser.add_argument('url', help='Video URL to extract audio from')
    parser.add_argument('-o', '--output', default='./audio_downloads',
                       help='Output directory (default: ./audio_downloads)')
    parser.add_argument('-f', '--format', default='mp3', choices=['mp3', 'wav', 'm4a', 'flac'],
                       help='Audio format (default: mp3)')
    parser.add_argument('-q', '--quality', default='192',
                       help='Audio quality/bitrate (default: 192)')

    args = parser.parse_args()

    print("🎵 Video URL Audio Extractor")
    print("=" * 40)

    success = extract_audio(args.url, args.output, args.format, args.quality)

    if success:
        print("\n✅ Extraction completed successfully!")
    else:
        print("\n❌ Extraction failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadContainer = document.getElementById('uploadContainer');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const playerContainer = document.getElementById('playerContainer');
    const audioInfo = document.getElementById('audioInfo');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const messageEl = document.getElementById('message');
    const transcribeBtn = document.getElementById('transcribeBtn');
    const transcriptionContainer = document.getElementById('transcriptionContainer');
    const transcriptionContent = document.getElementById('transcriptionContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const transcriptFileInput = document.getElementById('transcriptFileInput');
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarksContainer = document.getElementById('bookmarksContainer');
    const bookmarksContent = document.getElementById('bookmarksContent');
    const noBookmarksMessage = document.getElementById('noBookmarksMessage');
    const clearBookmarksBtn = document.getElementById('clearBookmarksBtn');
    // Add new export button element
    const exportBookmarksBtn = document.getElementById('exportBookmarksBtn');
    
    // Create audio element
    const audioElement = new Audio();
    let isPlaying = false;
    
    // File tracking variables
    let currentFile = null;
    let fileId = null;
    let segments = [];
    
    // Bookmarks array
    let bookmarks = [];
    
    // Backend API URL - change this to match your Flask server
    const API_URL = 'http://localhost:5000';
    
    // Click event for the upload button
    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    // File selection event
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadContainer.addEventListener('dragover', handleDragOver);
    uploadContainer.addEventListener('dragleave', handleDragLeave);
    uploadContainer.addEventListener('drop', handleFileDrop);
    
    // Play/pause button event
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    // Progress bar click event
    progressContainer.addEventListener('click', setProgress);
    
    // Transcribe button event
    transcribeBtn.addEventListener('click', transcribeAudio);
    
    // Export transcript button event
    exportBtn.addEventListener('click', exportTranscript);
       
    // Import transcript
    importBtn.addEventListener('click', () => transcriptFileInput.click());
    transcriptFileInput.addEventListener('change', importTranscript);

    // Bookmark button event
    bookmarkBtn.addEventListener('click', addBookmark);
    
    // Clear bookmarks button event
    clearBookmarksBtn.addEventListener('click', clearBookmarks);
    
    // Export bookmarks button event
    exportBookmarksBtn.addEventListener('click', exportBookmarks);
   
   // Add the bookmarks toggle functionality
    setupBookmarksToggle();

    // Add the transcription toggle functionality
    setupTranscriptionToggle();

    // Audio events
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateTotalTime);
    audioElement.addEventListener('ended', resetPlayer);
    
    // Handle file selection
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
        }
    }
    
    // Handle drag over
    function handleDragOver(e) {
        e.preventDefault();
        uploadContainer.classList.add('drag-over');
    }
    
    // Handle drag leave
    function handleDragLeave(e) {
        e.preventDefault();
        uploadContainer.classList.remove('drag-over');
    }
    
    // Handle file drop
    function handleFileDrop(e) {
        e.preventDefault();
        uploadContainer.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
            uploadFile(file);
        } else {
            showMessage('Please upload an audio file');
        }
    }
    
    // Upload file to server
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.file_id) {
                // Store file details
                currentFile = file;
                fileId = data.file_id;
                
                // Create local URL for playback
                const objectURL = URL.createObjectURL(file);
                audioElement.src = objectURL;
                
                // Update UI
                audioInfo.textContent = file.name;
                playerContainer.style.display = 'block';
                    uploadContainer.style.display = 'none'; //make the upload box disappear after file is uploaded
                transcriptionContainer.style.display = 'none';
                transcriptionContent.innerHTML = '';
                segments = [];
                exportBtn.style.display = 'none';
                
                // Reset player state
                resetPlayerState();
                
                // Clear bookmarks
                clearBookmarks();
                
                // Disable bookmark button until transcription is done
                bookmarkBtn.disabled = true;
                exportBookmarksBtn.disabled = true;
                
                showMessage('Audio loaded successfully');
            } else {
                showMessage('Error uploading file: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Error uploading file');
        });
    }
    
    // Transcribe the audio file
    function transcribeAudio() {
        if (!fileId) {
            showMessage('Please upload a file first');
            return;
        }
        
        // Disable button and show loading indicator
        transcribeBtn.disabled = true;
        transcribeBtn.classList.add('btn-disabled');
        loadingIndicator.style.display = 'block';
        
        fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: fileId,
                filename: currentFile.name
            })
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            
            if (data.segments) {
                segments = data.segments;
                displayTranscription(segments);
                showMessage('Transcription completed');
                
                // Enable bookmark button now that transcription is available
                bookmarkBtn.disabled = false;
            } else {
                showMessage('Error: ' + data.error);
            }
            
            // Re-enable button
            transcribeBtn.disabled = false;
            transcribeBtn.classList.remove('btn-disabled');
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Error during transcription');
            loadingIndicator.style.display = 'none';
            transcribeBtn.disabled = false;
            transcribeBtn.classList.remove('btn-disabled');
        });
    }
    
    // Display transcription segments
    function displayTranscription(segments) {
        transcriptionContent.innerHTML = '';
        
        segments.forEach((segment, index) => {
            const segmentEl = document.createElement('div');
            segmentEl.className = 'transcript-segment';
            segmentEl.dataset.start = segment.start;
            segmentEl.dataset.end = segment.end;
            segmentEl.id = `segment-${index}`;
            
            const timeEl = document.createElement('div');
            timeEl.className = 'segment-time';
            timeEl.textContent = `[${formatTime(segment.start)} - ${formatTime(segment.end)}]`;
            timeEl.addEventListener('click', () => {
                audioElement.currentTime = segment.start;
                if (!isPlaying) {
                    togglePlayPause();
                }
            });
            
            const textEl = document.createElement('div');
            textEl.className = 'segment-text';
            textEl.textContent = segment.text;
            
            segmentEl.appendChild(timeEl);
            segmentEl.appendChild(textEl);
            transcriptionContent.appendChild(segmentEl);
        });
        
        // Show transcription container
        transcriptionContainer.style.display = 'block';
            
        // Show export button
        exportBtn.style.display = 'inline-block';
    }
    
    // Add bookmark at current time
    function addBookmark() {
        if (!audioElement.src || segments.length === 0) {
            showMessage('Please upload and transcribe audio first');
            return;
        }
        
        const currentTime = audioElement.currentTime;
        const bookmarkId = Date.now(); // Unique ID for the bookmark

        // Prompt for bookmark title
        const bookmarkTitle = prompt('Enter a title for this bookmark:', 'Bookmark') || 'Bookmark';

        // Find relevant transcript segments (5 seconds before, 2 seconds after)
        const relevantText = getRelevantTranscriptText(currentTime - 5, currentTime + 2);
        
        // Create bookmark object
        const bookmark = {
            id: bookmarkId,
            time: currentTime,
            text: relevantText,
            timeFormatted: formatTime(currentTime),
            title: bookmarkTitle
        };
        
        // Add to bookmarks array
        bookmarks.push(bookmark);
        
        // Display bookmark
        displayBookmarks();
        
        // Enable export button if we have bookmarks
        exportBookmarksBtn.disabled = bookmarks.length === 0;
        
        showMessage('Bookmark added');
    }
    
    // Get relevant transcript text for the given time range
    function getRelevantTranscriptText(startTime, endTime) {
        // Ensure times are within valid range
        startTime = Math.max(0, startTime);
        endTime = Math.min(audioElement.duration, endTime);
        
        let relevantText = '';
        
        // Find segments that overlap with the time range
        for (const segment of segments) {
            // Check if segment overlaps with the range
            if ((segment.start <= endTime) && (segment.end >= startTime)) {
                relevantText += segment.text + ' ';
            }
        }
        
        return relevantText.trim() || 'No transcript available for this timestamp';
    }
    
    // Display all bookmarks
    function displayBookmarks() {
        // Clear current bookmarks display
        bookmarksContent.innerHTML = '';
        
        // Show/hide no bookmarks message
        if (bookmarks.length === 0) {
            noBookmarksMessage.style.display = 'block';
            bookmarksContainer.style.display = 'block';
            exportBookmarksBtn.disabled = true;
            return;
        }
        
        noBookmarksMessage.style.display = 'none';
        exportBookmarksBtn.disabled = false;
        
        // Sort bookmarks by time
        bookmarks.sort((a, b) => a.time - b.time);
        
        // Create bookmark elements
        bookmarks.forEach(bookmark => {
            const bookmarkEl = document.createElement('div');
            bookmarkEl.className = 'bookmark-item';
            bookmarkEl.dataset.id = bookmark.id;
            
            const bookmarkHeader = document.createElement('div');
            bookmarkHeader.className = 'bookmark-actions';
        
            const titleEl = document.createElement('span');
            titleEl.className = 'bookmark-title';
            titleEl.textContent = bookmark.title;

            const timeEl = document.createElement('div');
            timeEl.className = 'bookmark-time';
            timeEl.textContent = formatTime(bookmark.time);
            timeEl.addEventListener('click', () => {
                // Jump to bookmark time and play
                audioElement.currentTime = bookmark.time;
                if (!isPlaying) {
                    togglePlayPause();
                }
            });
            
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'bookmark-delete';
            deleteBtn.innerHTML = '&times;'; // × symbol
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBookmark(bookmark.id);
            });
            
            bookmarkHeader.appendChild(titleEl);
            bookmarkHeader.appendChild(timeEl);
            bookmarkHeader.appendChild(deleteBtn);
            
            const textEl = document.createElement('div');
            textEl.className = 'bookmark-text';
            textEl.textContent = bookmark.text;
            
            bookmarkEl.appendChild(bookmarkHeader);
            bookmarkEl.appendChild(textEl);
            bookmarksContent.appendChild(bookmarkEl);
        });
        
        // Show bookmarks container
        bookmarksContainer.style.display = 'block';
    }
    
    // Delete a bookmark
    function deleteBookmark(id) {
        // Filter out the bookmark with the given id
        bookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
        
        // Update display
        displayBookmarks();
        
        // Disable export button if no bookmarks left
        exportBookmarksBtn.disabled = bookmarks.length === 0;
        
        showMessage('Bookmark deleted');
    }
    
    // Clear all bookmarks
    function clearBookmarks() {
        bookmarks = [];
        displayBookmarks();
        exportBookmarksBtn.disabled = true;
    }
    
    // Export bookmarks as JSONL
    function exportBookmarks() {
        if (bookmarks.length === 0) {
            showMessage('No bookmarks to export');
            return;
        }
        
        // Get the audio filename (without extension) for use in the export filename
        const audioName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, "") : "audio";
        
        // Prepare data for export
        let jsonlContent = '';
        
        // Sort bookmarks by time
        const sortedBookmarks = [...bookmarks].sort((a, b) => a.time - b.time);
        
        // Create JSONL content (one JSON object per line)
        sortedBookmarks.forEach(bookmark => {
            // Create export object with relevant fields
            const exportObj = {
                timestamp: bookmark.time,
                timestamp_formatted: formatTime(bookmark.time),
                text: bookmark.text,
                title: bookmark.title,
                audio_file: currentFile ? currentFile.name : null,
                file_id: fileId
            };
            
            // Add this object as a line in the JSONL file
            jsonlContent += JSON.stringify(exportObj) + '\n';
        });
        
        // Create Blob and download link
        const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${audioName}_bookmarks.jsonl`;
        
        // Append, click and remove
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showMessage('Bookmarks exported successfully');
        }, 100);
    }
    
    // Highlight active transcription segment
    function highlightCurrentSegment() {
        if (segments.length === 0) return;
        
        const currentTime = audioElement.currentTime;
        
        // Remove currently-playing class from all segments
        document.querySelectorAll('.transcript-segment').forEach(el => {
            el.classList.remove('currently-playing');
        });
        
        // Find and highlight current segment
        for (let i = 0; i < segments.length; i++) {
            if (currentTime >= segments[i].start && currentTime <= segments[i].end) {
                const segmentEl = document.getElementById(`segment-${i}`);
                if (segmentEl) {
                    segmentEl.classList.add('currently-playing');
                    
                    // Scroll to segment if it's not visible
                    if (!isElementInViewport(segmentEl, transcriptionContainer)) {
                        segmentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                break;
            }
        }
    }
    
    // Check if element is visible within container
    function isElementInViewport(el, container) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        return (
            rect.top >= containerRect.top &&
            rect.bottom <= containerRect.bottom
        );
    }
    
    // Toggle play/pause
    function togglePlayPause() {
        if (audioElement.src) {
            if (isPlaying) {
                audioElement.pause();
                playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            } else {
                audioElement.play();
                playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            }
            isPlaying = !isPlaying;
        }
    }
    
    // Update progress bar
    function updateProgress() {
        const { currentTime, duration } = audioElement;
        if (duration) {
            // Update progress bar
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            
            // Update current time display
            currentTimeEl.textContent = formatTime(currentTime);
            
            // Highlight current segment in transcription
            highlightCurrentSegment();
        }
    }
    
    // Update total time display
    function updateTotalTime() {
        if (audioElement.duration) {
            totalTimeEl.textContent = formatTime(audioElement.duration);
        }
    }
    
    // Set progress on click
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        if (audioElement.duration) {
            const seekTime = (clickX / width) * audioElement.duration;
            audioElement.currentTime = seekTime;
        }
    }
    
    // Reset player when audio ends
    function resetPlayer() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
    
    // Reset player state
    function resetPlayerState() {
        isPlaying = false;
        audioElement.currentTime = 0;
        progressBar.style.width = '0%';
        currentTimeEl.textContent = '00:00:00';
        playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            
            if (segments.length === 0) {
                exportBtn.style.display = 'none';
            }

    }
    
    // Format time to hh:mm:ss
    function formatTime(seconds) {
        seconds = Math.max(0, seconds); // Ensure seconds is not negative
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return [
            hrs.toString().padStart(2, '0'),
            mins.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }
    
    // Show message
    function showMessage(text) {
        messageEl.textContent = text;
        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    }


        // Function to handle the export
        function exportTranscript() {
            if (segments.length === 0) {
                showMessage('No transcript available to export');
                return;
            }
            
            // Create a data object with the segments
            const exportData = {
                filename: currentFile.name,
                transcript: segments
            };
            
            // Convert to JSON string
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create a blob with the data
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_${currentFile.name.replace(/\.[^/.]+$/, '')}.json`;
            
            // Trigger the download
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage('Transcript exported successfully');
        }

        // Function to handle import of transcript
        function importTranscript(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Check if it's a JSON file
            if (!file.type.includes('json')) {
                showMessage('Please select a JSON file');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    // Parse the JSON data
                    const importedData = JSON.parse(event.target.result);
                    
                    // Validate the data structure
                    if (!importedData.transcript || !Array.isArray(importedData.transcript)) {
                        throw new Error('Invalid transcript format');
                    }
                    
                    // Store the segments
                    segments = importedData.transcript;
                    
                    // Display the imported transcript
                    displayTranscription(segments);
                   
                    // Enable bookmark button now that transcription is available
                    bookmarkBtn.disabled = false;
                    
                    // Show a success message
                    showMessage('Transcript imported successfully');
                    
                    // If there's no audio file loaded but the transcript has a filename, show it
                    if (importedData.filename && !currentFile) {
                        audioInfo.textContent = `Transcript for: ${importedData.filename}`;
                        playerContainer.style.display = 'block';
                    }
                    
                } catch (error) {
                    console.error('Error parsing transcript:', error);
                    showMessage('Error importing transcript: Invalid format');
                }
            };
            
            reader.onerror = function() {
                showMessage('Error reading file');
            };
            
            reader.readAsText(file);
            
            // Reset the file input so the same file can be selected again
            transcriptFileInput.value = '';
        }


        // Function to toggle the bookmarks visibility
        function setupBookmarksToggle() {
            const toggleIcon = document.getElementById('toggleBookmarks');
            const bookmarksContent = document.getElementById('bookmarksContent');

            if (!toggleIcon || !bookmarksContent) return;

            // Set up the click handler
            document.querySelector('.header-with-toggle').addEventListener('click', function() {
                toggleIcon.classList.toggle('collapsed');
                bookmarksContent.classList.toggle('collapsed');

                // Save the state to localStorage
                const isCollapsed = bookmarksContent.classList.contains('collapsed');
                localStorage.setItem('bookmarksCollapsed', isCollapsed);
            });

            // Initialize based on saved state
            const savedState = localStorage.getItem('bookmarksCollapsed');
            if (savedState === 'true') {
                toggleIcon.classList.add('collapsed');
                bookmarksContent.classList.add('collapsed');
            }
        }


        // Function to toggle the transcription visibility
        function setupTranscriptionToggle() {
            const toggleIcon = document.getElementById('toggleTranscription');
            const transcriptionContent = document.getElementById('transcriptionContent');
            
            if (!toggleIcon || !transcriptionContent) return;
            
            // Set up the click handler
            document.querySelector('.transcription-header .header-with-toggle').addEventListener('click', function() {
                toggleIcon.classList.toggle('collapsed');
                transcriptionContent.classList.toggle('collapsed');
                
                // Save the state to localStorage
                const isCollapsed = transcriptionContent.classList.contains('collapsed');
                localStorage.setItem('transcriptionCollapsed', isCollapsed);
            });
            
            // Initialize based on saved state
            const savedState = localStorage.getItem('transcriptionCollapsed');
            if (savedState === 'true') {
                toggleIcon.classList.add('collapsed');
                transcriptionContent.classList.add('collapsed');
            }
        } 




    });

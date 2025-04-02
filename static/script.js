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
    
    // Summary
    const summaryContainer = document.getElementById('summaryContainer');
    const generateSummaryBtn = document.getElementById('generateSummaryBtn');
    const summaryText = document.getElementById('summaryText');
    const noSummaryMessage = document.getElementById('noSummaryMessage');
    const summaryLoading = document.getElementById('summaryLoading');

    // Chat
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');

    // Notes
    const notesContainer = document.getElementById('notesContainer');
    const notesContent = document.getElementById('notesContent');
    const noNotesMessage = document.getElementById('noNotesMessage');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const clearNotesBtn = document.getElementById('clearNotesBtn');
    const exportNotesBtn = document.getElementById('exportNotesBtn');
    const exportNotesJsonlBtn = document.getElementById('exportNotesJsonlBtn');
    const exportNotesTextBtn = document.getElementById('exportNotesTextBtn');
    const exportNotesSummaryBtn = document.getElementById('exportNotesSummaryBtn');

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
   
    let chatHistory = [];
    let isWaitingForResponse = false;

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
    
    // Add the summary toggle fucntionality
    setupSummaryToggle();

    // Generate summary button event
    generateSummaryBtn.addEventListener('click', generateSummary);

    // Audio events
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateTotalTime);
    audioElement.addEventListener('ended', resetPlayer);
    
    sendChatBtn.addEventListener('click', sendChatMessage);

    // Chat input enter key event
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Add chat toggle functionality
    setupChatToggle();


    // Notes array
    let notes = [];

    // Add Note button event
    addNoteBtn.addEventListener('click', addNewNote);

    // Clear notes button event
    clearNotesBtn.addEventListener('click', clearNotes);

    // Export notes button events
    exportNotesJsonlBtn.addEventListener('click', () => exportNotes('jsonl'));
    exportNotesTextBtn.addEventListener('click', () => exportNotes('text'));
    exportNotesSummaryBtn.addEventListener('click', () => exportNotes('summary'));

    // Add the notes toggle functionality
    setupNotesToggle();

    // Call the initialization
    initializeNotesContainer();


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
             
                summaryContainer.style.display = 'none';
                summaryText.style.display = 'none';
                noSummaryMessage.style.display = 'block';
                generateSummaryBtn.disabled = true;
                
                // Hide chat container when new file is uploaded
                chatContainer.style.display = 'none';
                chatMessages.innerHTML = '<div class="chat-message system-message">Ask questions about the transcript or request analysis.</div>';
                chatHistory = [];
                
                bookmarksContainer.style.display = 'none';

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

                // Show chat container now that transcription is complete
                chatContainer.style.display = 'block';
        
                // Show bookmarks container
                bookmarksContainer.style.display = 'block';
        
                // Show notes container
                notesContainer.style.display = 'block';

                // Add welcome message
                addMessageToChat('system', 'Transcription complete! You can now ask questions about the audio.');

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

        summaryContainer.style.display = 'block';
        generateSummaryBtn.disabled = false;
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
   

    // Function to add a "Copy to Note" button to each bookmark
    function enhanceBookmarkUI() {
        // Find all existing bookmark items
        document.querySelectorAll('.bookmark-item').forEach(bookmarkItem => {
            const bookmarkActions = bookmarkItem.querySelector('.bookmark-actions');
            
            // Check if the copy button already exists
            if (!bookmarkItem.querySelector('.bookmark-copy-note')) {
                const copyBtn = document.createElement('span');
                copyBtn.className = 'bookmark-copy-note';
                copyBtn.textContent = '📋';
                copyBtn.title = 'Copy to Notes';
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Get bookmark data
                    const bookmarkId = bookmarkItem.dataset.id;
                    const bookmark = bookmarks.find(b => b.id.toString() === bookmarkId);
                    
                    if (bookmark) {
                        // Create a new note from bookmark
                        const noteText = `Bookmark from [${bookmark.timeFormatted}]:\n${bookmark.text}`;
                        createNote(`${bookmark.title} (from bookmark)`, noteText);
                        showMessage('Bookmark copied to notes');
                    }
                });
                
                // Insert before the delete button
                const deleteBtn = bookmarkItem.querySelector('.bookmark-delete');
                bookmarkActions.insertBefore(copyBtn, deleteBtn);
            }
        });
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
            //bookmarksContainer.style.display = 'block';
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
        //bookmarksContainer.style.display = 'block';

        enhanceBookmarkUI();
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
                   
                    // Show chat container now that transcription is complete
                    chatContainer.style.display = 'block';
        
                    // Show bookmarks container
                    bookmarksContainer.style.display = 'block';

                    // Show notes container
                    notesContainer.style.display = 'block';

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
            document.querySelector('.bookmarks-header .header-with-toggle').addEventListener('click', function() {
                toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
                bookmarksContent.classList.toggle('collapsed');

                // Save the state to localStorage
                const isCollapsed = bookmarksContent.classList.contains('collapsed');
                localStorage.setItem('bookmarksCollapsed', isCollapsed);
            });

            // Initialize based on saved state
            const savedState = localStorage.getItem('bookmarksCollapsed');
            if (savedState === 'true') {
                toggleIcon.textContent = '►';
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
                toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
                transcriptionContent.classList.toggle('collapsed');
                
                // Save the state to localStorage
                const isCollapsed = transcriptionContent.classList.contains('collapsed');
                localStorage.setItem('transcriptionCollapsed', isCollapsed);
            });
            
            // Initialize based on saved state
            const savedState = localStorage.getItem('transcriptionCollapsed');
            if (savedState === 'true') {
                toggleIcon.textContent = '►';
                transcriptionContent.classList.add('collapsed');
            }
        } 

        function setupSummaryToggle() {
            const toggleIcon = document.getElementById('toggleSummary');
            const summaryContent = document.getElementById('summaryContent');
            
            if (!toggleIcon || !summaryContent) return;
            
            // set up the click handler
            document.querySelector('.summary-header .header-with-toggle').addEventListener('click', function() {
                toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
                summaryContent.classList.toggle('collapsed');
                
                // save the state to localstorage
                const isCollapsed = summaryContent.classList.contains('collapsed');
                localStorage.setItem('summaryCollapsed', isCollapsed);
            });
            
            // initialize based on saved state
            const savedState = localStorage.getItem('summaryCollapsed');
            if (savedState === 'true') {
                toggleIcon.textContent = '►';
                summaryContent.classList.add('collapsed');
            }
        }

        // Add this function to generate the summary
        function generateSummary() {
            if (segments.length === 0) {
                showMessage('Please transcribe the audio first');
                return;
            }
            
            // Disable button and show loading indicator
            generateSummaryBtn.disabled = true;
            noSummaryMessage.style.display = 'none';
            summaryLoading.style.display = 'block';
            
            // Compile all transcript text
            let transcriptText = '';
            segments.forEach(segment => {
                transcriptText += segment.text + ' ';
            });
            
            // Call the backend API
            fetch(`${API_URL}/generate_summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcript_text: transcriptText.trim()
                })
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading indicator
                summaryLoading.style.display = 'none';
                
                if (data.summary) {
                    // Display the summary
                    summaryText.textContent = data.summary;
                    summaryText.style.display = 'block';
                    showMessage('Summary generated successfully');
                } else {
                    showMessage('Error: ' + data.error);
                    noSummaryMessage.style.display = 'block';
                }
                
                // Re-enable button
                generateSummaryBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error generating summary');
                summaryLoading.style.display = 'none';
                noSummaryMessage.style.display = 'block';
                generateSummaryBtn.disabled = false;
            });
        }

        function setupChatToggle() {
            const toggleIcon = document.getElementById('toggleChat');
            const chatContent = document.getElementById('chatContent');
            
            if (!toggleIcon || !chatContent) return;
            
            // Set up the click handler
            document.querySelector('.chat-header .header-with-toggle').addEventListener('click', function() {
                toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
                chatContent.classList.toggle('collapsed');
                
                // Save the state to localStorage
                const isCollapsed = chatContent.classList.contains('collapsed');
                localStorage.setItem('chatCollapsed', isCollapsed);
            });
            
            // Initialize based on saved state
            const savedState = localStorage.getItem('chatCollapsed');
            if (savedState === 'true') {
                toggleIcon.textContent = '►';
                chatContent.classList.add('collapsed');
            }
        }

        // Function to send chat message
        function sendChatMessage() {
            if (isWaitingForResponse) return;
            
            const message = chatInput.value.trim();
            if (!message) return;
            
            // Clear input
            chatInput.value = '';
            
            // Add user message to UI
            addMessageToChat('user', message);
            
            // Show typing indicator
            showTypingIndicator();
            
            // Disable send button
            isWaitingForResponse = true;
            sendChatBtn.disabled = true;
            
            // Get relevant transcript context
            let transcriptContext = '';
            if (segments.length > 0) {
                // Format segments for context
                transcriptContext = segments.map(segment => 
                    `[${formatTime(segment.start)} - ${formatTime(segment.end)}]: ${segment.text}`
                ).join('\n');
            }
            
            // Make API request
            fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: message,
                    transcript_context: transcriptContext,
                    chat_history: chatHistory.slice(-10) // Send last 10 messages for context
                })
            })
            .then(response => response.json())
            .then(data => {
                // Remove typing indicator
                removeTypingIndicator();
                
                if (data.response) {
                    // Add assistant message to UI
                    addMessageToChat('assistant', data.response);
                } else if (data.error) {
                    // Show error as system message
                    addMessageToChat('system', `Error: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Chat error:', error);
                removeTypingIndicator();
                addMessageToChat('system', 'Error connecting to the assistant. Please try again later.');
            })
            .finally(() => {
                // Re-enable send button
                isWaitingForResponse = false;
                sendChatBtn.disabled = false;
            });
        }

        // Function to add message to chat
        function addMessageToChat(role, content) {
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `chat-message ${role}-message`;
            messageEl.textContent = content;
            
            // Add to chat container
            chatMessages.appendChild(messageEl);
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Add to chat history if it's a user or assistant message
            if (role === 'user' || role === 'assistant') {
                chatHistory.push({ role, content });
            }
            
            // Show chat container if it's hidden
            if (chatContainer.style.display === 'none' || !chatContainer.style.display) {
                chatContainer.style.display = 'block';
            }
        }

        // Function to show typing indicator
        function showTypingIndicator() {
            const typingEl = document.createElement('div');
            typingEl.className = 'chat-typing';
            typingEl.id = 'typingIndicator';
            
            const indicatorEl = document.createElement('div');
            indicatorEl.className = 'typing-indicator';
            
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'typing-dot';
                indicatorEl.appendChild(dot);
            }
            
            typingEl.appendChild(indicatorEl);
            chatMessages.appendChild(typingEl);
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Function to remove typing indicator
        function removeTypingIndicator() {
            const typingEl = document.getElementById('typingIndicator');
            if (typingEl) {
                typingEl.remove();
            }
        }


    // Function to add a new note
    function addNewNote() {
        const title = prompt('Enter a title for your note:', 'Note') || 'Note';
        createNote(title, '');
    }

    // Create a new note with title and optional initial content
    function createNote(title, content = '') {
        const noteId = Date.now(); // Unique ID for the note
        
        // Create note object
        const note = {
            id: noteId,
            title: title,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        // Add to notes array
        notes.push(note);
        
        // Display updated notes
        displayNotes();
        
        // If content is empty, immediately put the note in edit mode
        if (!content) {
            setTimeout(() => {
                const noteEl = document.querySelector(`.note-item[data-id="${noteId}"]`);
                if (noteEl) {
                    editNote(noteId);
                }
            }, 100);
        }
        
        showMessage('Note added');
    }

    // Display all notes
    function displayNotes() {
        // Clear current notes display
        notesContent.innerHTML = '';
        
        // Show/hide no notes message
        if (notes.length === 0) {
            noNotesMessage.style.display = 'block';
            return;
        }
        
        noNotesMessage.style.display = 'none';
        
        // Sort notes by timestamp (newest first)
        notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Create note elements
        notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';
            noteEl.dataset.id = note.id;
            
            const noteHeader = document.createElement('div');
            noteHeader.className = 'note-header';
            
            const titleEl = document.createElement('div');
            titleEl.className = 'note-title';
            titleEl.textContent = note.title;
            
            const actionsEl = document.createElement('div');
            actionsEl.className = 'note-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'note-action-btn note-edit-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Edit note';
            editBtn.addEventListener('click', () => editNote(note.id));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'note-action-btn note-delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Delete note';
            deleteBtn.addEventListener('click', () => deleteNote(note.id));
            
            actionsEl.appendChild(editBtn);
            actionsEl.appendChild(deleteBtn);
            
            noteHeader.appendChild(titleEl);
            noteHeader.appendChild(actionsEl);
            
            const contentEl = document.createElement('div');
            contentEl.className = 'note-content';
            contentEl.textContent = note.content;
            
            noteEl.appendChild(noteHeader);
            noteEl.appendChild(contentEl);
            notesContent.appendChild(noteEl);
        });
        
        // Show notes container
        notesContainer.style.display = 'block';
    }

    // Edit a note
    function editNote(id) {
        const noteEl = document.querySelector(`.note-item[data-id="${id}"]`);
        if (!noteEl) return;
        
        const note = notes.find(note => note.id.toString() === id.toString());
        if (!note) return;
        
        // Save the current content element
        const contentEl = noteEl.querySelector('.note-content');
        const currentContent = note.content;
        
        // Replace content with textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'note-textarea';
        textarea.value = currentContent;
        contentEl.replaceWith(textarea);
        
        // Add save/cancel buttons
        const actionsEl = document.createElement('div');
        actionsEl.className = 'note-edit-actions';
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-sm btn-success';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', () => {
            const newContent = textarea.value;
            saveNoteEdit(id, newContent);
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-sm';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            // Restore original content
            const newContentEl = document.createElement('div');
            newContentEl.className = 'note-content';
            newContentEl.textContent = currentContent;
            textarea.replaceWith(newContentEl);
            noteEl.removeChild(actionsEl);
        });
        
        actionsEl.appendChild(cancelBtn);
        actionsEl.appendChild(saveBtn);
        noteEl.appendChild(actionsEl);
        
        // Focus textarea
        textarea.focus();
    }

    // Save note edit
    function saveNoteEdit(id, newContent) {
        // Update note object
        const note = notes.find(note => note.id.toString() === id.toString());
        if (note) {
            note.content = newContent;
            note.timestamp = new Date().toISOString(); // Update timestamp
        }
        
        // Refresh display
        displayNotes();
        showMessage('Note updated');
    }

    // Delete a note
    function deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            // Filter out the note with the given id
            notes = notes.filter(note => note.id.toString() !== id.toString());
            
            // Update display
            displayNotes();
            showMessage('Note deleted');
        }
    }

    // Clear all notes
    function clearNotes() {
        if (notes.length === 0) return;
        
        if (confirm('Are you sure you want to delete all notes?')) {
            notes = [];
            displayNotes();
            showMessage('All notes cleared');
        }
    }

    // Export notes
    function exportNotes(format) {
        if (notes.length === 0) {
            showMessage('No notes to export');
            return;
        }
        
        // Get the audio filename (without extension) for use in the export filename
        const audioName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, "") : "audio";
        
        switch (format) {
            case 'jsonl':
                exportNotesAsJsonl(audioName);
                break;
            case 'text':
                exportNotesAsText(audioName);
                break;
            case 'summary':
                exportNotesAsSummary(audioName);
                break;
        }
    }

    // Export notes as JSONL
    function exportNotesAsJsonl(audioName) {
        // Prepare data for export
        let jsonlContent = '';
        
        // Sort notes by timestamp
        const sortedNotes = [...notes].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Create JSONL content (one JSON object per line)
        sortedNotes.forEach(note => {
            // Create export object with relevant fields
            const exportObj = {
                title: note.title,
                content: note.content,
                timestamp: note.timestamp,
                audio_file: currentFile ? currentFile.name : null,
                file_id: fileId
            };
            
            // Add this object as a line in the JSONL file
            jsonlContent += JSON.stringify(exportObj) + '\n';
        });
        
        // Create Blob and download link
        downloadFile(jsonlContent, `${audioName}_notes.jsonl`, 'application/x-jsonlines');
        showMessage('Notes exported as JSONL');
    }

    // Export notes as plain text
    function exportNotesAsText(audioName) {
        // Prepare data for export
        let textContent = `Notes for: ${currentFile ? currentFile.name : "Unknown audio"}\n`;
        textContent += `Exported on: ${new Date().toLocaleString()}\n\n`;
        
        // Sort notes by timestamp
        const sortedNotes = [...notes].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add each note to the text content
        sortedNotes.forEach((note, index) => {
            textContent += `--- Note ${index + 1}: ${note.title} ---\n`;
            textContent += `${note.content}\n\n`;
        });
        
        // Create Blob and download link
        downloadFile(textContent, `${audioName}_notes.txt`, 'text/plain');
        showMessage('Notes exported as text');
    }

    // Export notes as a summary (post-processed)
    function exportNotesAsSummary(audioName) {
        // Prepare data for export
        let summaryContent = `# Notes Summary for: ${currentFile ? currentFile.name : "Unknown audio"}\n\n`;
        
        // Sort notes by timestamp
        const sortedNotes = [...notes].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Group notes by potential topics or themes (simplified version)
        // This is a simple example - in a real app, you might use NLP or other techniques
        const topics = {};
        
        // Create a simple topic extraction based on title
        sortedNotes.forEach(note => {
            // Get the first word of the title as a simple "topic"
            const topicMatch = note.title.match(/^(\w+)/);
            const topic = topicMatch ? topicMatch[1] : 'Misc';
            
            if (!topics[topic]) {
                topics[topic] = [];
            }
            
            topics[topic].push(note);
        });
        
        // Add a table of contents
        summaryContent += "## Table of Contents\n\n";
        Object.keys(topics).forEach(topic => {
            summaryContent += `- [${topic}](#${topic.toLowerCase()})\n`;
        });
        summaryContent += "\n";
        
        // Add each topic section
        Object.entries(topics).forEach(([topic, topicNotes]) => {
            summaryContent += `## ${topic}\n\n`;
            
            topicNotes.forEach(note => {
                summaryContent += `### ${note.title}\n\n`;
                summaryContent += `${note.content}\n\n`;
            });
        });
        
        // Create Blob and download link
        downloadFile(summaryContent, `${audioName}_notes_summary.md`, 'text/markdown');
        showMessage('Notes exported as summary');
    }

    // Helper function for file downloads
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // Append, click and remove
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Function to toggle the notes visibility
    function setupNotesToggle() {
        const toggleIcon = document.getElementById('toggleNotes');
        
        if (!toggleIcon || !notesContent) return;
        
        // Set up the click handler
        document.querySelector('.notes-header .header-with-toggle').addEventListener('click', function() {
            toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
            notesContent.classList.toggle('collapsed');
            
            // Save the state to localStorage
            const isCollapsed = notesContent.classList.contains('collapsed');
            localStorage.setItem('notesCollapsed', isCollapsed);
        });
        
        // Initialize based on saved state
        const savedState = localStorage.getItem('notesCollapsed');
        if (savedState === 'true') {
            toggleIcon.textContent = '►';
            notesContent.classList.add('collapsed');
        }
    }


    // Initialize the notes container on page load
    function initializeNotesContainer() {
        // This is called after DOM is loaded
        // Display empty notes container
        displayNotes();
        
        // Add event to show notes container when a file is loaded
        // (This can be added in the uploadFile function)
    }



    function addMessageToChat(role, content) {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}-message`;
        
        // For assistant messages, add a container with save button
        if (role === 'assistant') {
            // Create container for message and button
            const messageContainer = document.createElement('div');
            messageContainer.className = 'chat-message-container';
            
            // Add content
            const contentEl = document.createElement('div');
            contentEl.className = 'chat-message-content';
            contentEl.textContent = content;
            
            // Create save button (only for assistant messages)
            const saveBtn = document.createElement('button');
            saveBtn.className = 'chat-save-note-btn';
            saveBtn.innerHTML = '📝';
            saveBtn.title = 'Save to notes';
            saveBtn.addEventListener('click', function() {
                saveMessageToNotes(content);
            });
            
            // Append elements
            messageContainer.appendChild(contentEl);
            messageContainer.appendChild(saveBtn);
            messageEl.appendChild(messageContainer);
        } else {
            // For user or system messages, just add content directly
            messageEl.textContent = content;
        }
        
        // Add to chat container
        chatMessages.appendChild(messageEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to chat history if it's a user or assistant message
        if (role === 'user' || role === 'assistant') {
            chatHistory.push({ role, content });
        }
        
        // Show chat container if it's hidden
        if (chatContainer.style.display === 'none' || !chatContainer.style.display) {
            chatContainer.style.display = 'block';
        }
    }

    // Function to save a chat message to notes
    function saveMessageToNotes(content) {
        // Create a title based on the first few words
        let titleWords = content.split(' ').slice(0, 4).join(' ');
        if (titleWords.length < content.length) {
            titleWords += '...';
        }
        const title = `Chat: ${titleWords}`;
        
        // Create the note
        createNote(title, content);
        showMessage('Chat message saved to notes');
    }


    });

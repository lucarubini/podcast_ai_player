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

    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');

    // Text Commands
    const commandContainer = document.getElementById('commandContainer');
    const commandInput = document.getElementById('commandInput');
    const executeCommandBtn = document.getElementById('executeCommandBtn');
    const commandHistory = document.getElementById('commandHistory');
    const commandToggleIcon = document.getElementById('toggleCommands');

    // Create audio element
    const audioElement = new Audio();
    let isPlaying = false;
    
    // File tracking variables
    let currentFile = null;
    let fileId = null;
    let segments = [];
    
    // Bookmarks array
    let bookmarks = [];
   
    // Command history array
    let commands = [];
    let isExecutingCommand = false;

    // Backend API URL - change this to match your Flask server
    const API_URL = 'http://localhost:5000';
   
    let chatHistory = [];
    let isWaitingForResponse = false;

    // Click event for the upload button
    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });
   

    // Set up event listeners
    executeCommandBtn.addEventListener('click', executeCommand);
    
    // Command input enter key event
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand();
        }
    });
    
    // Add command container toggle functionality
    setupCommandToggle();

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
             
                // Hide chat container when new file is uploaded
                chatContainer.style.display = 'none';
                chatMessages.innerHTML = '<div class="chat-message system-message">Ask questions about the transcript or request analysis.</div>';
                chatHistory = [];

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
                //toggleIcon.classList.toggle('collapsed');
                toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
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


        function setupChatToggle() {
            const toggleIcon = document.getElementById('toggleChat');
            const chatContent = document.getElementById('chatContent');
            
            if (!toggleIcon || !chatContent) return;
            
            // Set up the click handler
            document.querySelector('.chat-header .header-with-toggle').addEventListener('click', function() {
                toggleIcon.classList.toggle('collapsed');
                chatContent.classList.toggle('collapsed');
                
                // Save the state to localStorage
                const isCollapsed = chatContent.classList.contains('collapsed');
                localStorage.setItem('chatCollapsed', isCollapsed);
            });
            
            // Initialize based on saved state
            const savedState = localStorage.getItem('chatCollapsed');
            if (savedState === 'true') {
                toggleIcon.classList.add('collapsed');
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

        // Function to toggle command container visibility
        function setupCommandToggle() {
            const commandContent = document.getElementById('commandContent');
            
            if (!commandToggleIcon || !commandContent) return;
            
            // Set up the click handler
            document.querySelector('.command-header .header-with-toggle').addEventListener('click', function() {
                commandToggleIcon.textContent = commandToggleIcon.textContent === '▼' ? '►' : '▼';
                commandContent.classList.toggle('collapsed');
                
                // Save the state to localStorage
                const isCollapsed = commandContent.classList.contains('collapsed');
                localStorage.setItem('commandsCollapsed', isCollapsed);
            });
            
            // Initialize based on saved state
            const savedState = localStorage.getItem('commandsCollapsed');
            if (savedState === 'true') {
                commandToggleIcon.textContent = '►';
                commandContent.classList.add('collapsed');
            }
        }
        
        // Function to execute the command
        function executeCommand() {
            if (isExecutingCommand) return;
            
            const command = commandInput.value.trim();
            if (!command) return;
            
            // Clear input
            commandInput.value = '';
            
            // Add command to history UI
            addToCommandHistory('user', command);
            
            // Set executing state
            isExecutingCommand = true;
            executeCommandBtn.disabled = true;
            
            // Show processing indicator
            addToCommandHistory('system', 'Processing command...');
            
            // Get current application state for context
            const appState = {
                isAudioLoaded: !!audioElement.src,
                isPlaying: isPlaying,
                currentTime: audioElement.currentTime,
                duration: audioElement.duration,
                hasTranscript: segments.length > 0,
                bookmarksCount: bookmarks.length,
                fileName: currentFile ? currentFile.name : null,
                fileId: fileId
            };
            
            // Make API request to interpret command
            fetch(`${API_URL}/interpret_command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: command,
                    app_state: appState,
                    command_history: commands.slice(-5) // Send last 5 commands for context
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    addToCommandHistory('system', `Error: ${data.error}`);
                    return;
                }
                
                // Show detected intent in history
                addToCommandHistory('system', `Intent detected: ${data.intent}`);
                
                // Execute the command based on the interpreted action
                executeAction(data.action, data.parameters);
            })
            .catch(error => {
                console.error('Command interpretation error:', error);
                addToCommandHistory('system', 'Error interpreting command. Please try again.');
            })
            .finally(() => {
                // Reset executing state
                isExecutingCommand = false;
                executeCommandBtn.disabled = false;
            });
        }
        
        // Function to execute an action based on the interpreted command
        function executeAction(action, parameters) {
            switch (action) {
                case 'play':
                    if (audioElement.src) {
                        audioElement.play();
                        isPlaying = true;
                        playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
                        addToCommandHistory('system', 'Playing audio');
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
                    }
                    break;
                    
                case 'pause':
                    if (audioElement.src) {
                        audioElement.pause();
                        isPlaying = false;
                        playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                        addToCommandHistory('system', 'Paused audio');
                    }
                    break;
                    
                case 'seek':
                    if (audioElement.src) {
                        let seekTime = 0;
                        
                        if (parameters.timeString) {
                            // Convert time string (HH:MM:SS) to seconds
                            const timeParts = parameters.timeString.split(':').map(Number);
                            if (timeParts.length === 3) {
                                seekTime = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
                            } else if (timeParts.length === 2) {
                                seekTime = timeParts[0] * 60 + timeParts[1];
                            } else {
                                seekTime = timeParts[0];
                            }
                        } else if (parameters.seconds !== undefined) {
                            seekTime = parameters.seconds;
                        } else if (parameters.percentage) {
                            seekTime = audioElement.duration * (parameters.percentage / 100);
                        }
                        
                        // Ensure time is within valid range
                        seekTime = Math.min(Math.max(0, seekTime), audioElement.duration || 0);
                        
                        audioElement.currentTime = seekTime;
                        addToCommandHistory('system', `Jumped to ${formatTime(seekTime)}`);
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
                    }
                    break;
                    
                case 'add_bookmark':
                    if (segments.length === 0) {
                        addToCommandHistory('system', 'Please transcribe audio first before adding bookmarks');
                        return;
                    }
                    
                    // Use provided title or generate one
                    const bookmarkTitle = parameters.title || 'Bookmark';
                    
                    // Get current position
                    const currentTime = audioElement.currentTime;
                    const bookmarkId = Date.now();
                    
                    // Find relevant transcript text
                    const relevantText = getRelevantTranscriptText(currentTime - 5, currentTime + 2);
                    
                    // Create and add bookmark
                    const bookmark = {
                        id: bookmarkId,
                        time: currentTime,
                        text: relevantText,
                        timeFormatted: formatTime(currentTime),
                        title: bookmarkTitle
                    };
                    
                    bookmarks.push(bookmark);
                    displayBookmarks();
                    exportBookmarksBtn.disabled = bookmarks.length === 0;
                    
                    addToCommandHistory('system', `Added bookmark: "${bookmarkTitle}" at ${formatTime(currentTime)}`);
                    break;
                    
                case 'transcribe':
                    if (!fileId) {
                        addToCommandHistory('system', 'Please upload an audio file first');
                        return;
                    }
                    
                    // Call the existing transcribe function
                    addToCommandHistory('system', 'Starting transcription process...');
                    
                    // Start transcription (reusing existing function)
                    transcribeAudio();
                    break;
                    
                case 'upload_prompt':
                    // Just show a message instructing user to use file upload
                    addToCommandHistory('system', 'To upload a file, click the "Select File" button or drag and drop an audio file to the upload area');
                    break;
                    
                case 'export_transcript':
                    if (segments.length === 0) {
                        addToCommandHistory('system', 'No transcript available to export');
                        return;
                    }
                    
                    exportTranscript();
                    addToCommandHistory('system', 'Transcript exported successfully');
                    break;
                    
                case 'export_bookmarks':
                    if (bookmarks.length === 0) {
                        addToCommandHistory('system', 'No bookmarks to export');
                        return;
                    }
                    
                    exportBookmarks();
                    addToCommandHistory('system', 'Bookmarks exported successfully');
                    break;
                    
                case 'skip_forward':
                    if (audioElement.src) {
                        const skipAmount = parameters.seconds || 10; // Default to 10 seconds
                        const newTime = Math.min(audioElement.currentTime + skipAmount, audioElement.duration);
                        audioElement.currentTime = newTime;
                        addToCommandHistory('system', `Skipped forward ${skipAmount} seconds`);
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
                    }
                    break;
                    
                case 'skip_backward':
                    if (audioElement.src) {
                        const skipAmount = parameters.seconds || 10; // Default to 10 seconds
                        const newTime = Math.max(audioElement.currentTime - skipAmount, 0);
                        audioElement.currentTime = newTime;
                        addToCommandHistory('system', `Skipped backward ${skipAmount} seconds`);
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
                    }
                    break;
                    
                case 'change_playback_speed':
                    if (audioElement.src) {
                        const newSpeed = parameters.speed || 1.0;
                        // Limit to reasonable range
                        const limitedSpeed = Math.min(Math.max(0.25, newSpeed), 3.0);
                        audioElement.playbackRate = limitedSpeed;
                        addToCommandHistory('system', `Changed playback speed to ${limitedSpeed}x`);
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
                    }
                    break;
                    
                case 'find_in_transcript':
                    if (segments.length === 0) {
                        addToCommandHistory('system', 'No transcript available to search');
                        return;
                    }
                    
                    const searchTerm = parameters.searchTerm;
                    if (!searchTerm) {
                        addToCommandHistory('system', 'No search term provided');
                        return;
                    }
                    
                    const results = searchTranscript(searchTerm);
                    if (results.length === 0) {
                        addToCommandHistory('system', `No matches found for "${searchTerm}"`);
                    } else {
                        addToCommandHistory('system', `Found ${results.length} matches for "${searchTerm}"`);
                        
                        // If there's a specific occurrence requested
                        if (parameters.occurrence && parameters.occurrence <= results.length) {
                            const selectedResult = results[parameters.occurrence - 1];
                            audioElement.currentTime = selectedResult.start;
                            addToCommandHistory('system', `Jumped to occurrence ${parameters.occurrence} at ${formatTime(selectedResult.start)}`);
                        } 
                        // Otherwise, show the first few results
                        else {
                            const displayResults = results.slice(0, 3);
                            displayResults.forEach((result, i) => {
                                addToCommandHistory('system', `${i+1}. [${formatTime(result.start)}]: "${result.text}"`);
                            });
                            
                            if (results.length > 3) {
                                addToCommandHistory('system', `...and ${results.length - 3} more matches`);
                            }
                            
                            // Jump to the first occurrence
                            audioElement.currentTime = results[0].start;
                            addToCommandHistory('system', `Jumped to first occurrence at ${formatTime(results[0].start)}`);
                        }
                    }
                    break;
                    
                case 'help':
                    showCommandHelp();
                    break;
                    
                case 'unknown':
                default:
                    addToCommandHistory('system', 'Sorry, I don\'t understand that command. Type "help" to see available commands.');
                    break;
            }
        }
        
        // Function to search transcript for a term
        function searchTranscript(term) {
            if (!term || segments.length === 0) return [];
            
            const results = [];
            const termLower = term.toLowerCase();
            
            segments.forEach(segment => {
                if (segment.text.toLowerCase().includes(termLower)) {
                    results.push({
                        start: segment.start,
                        end: segment.end,
                        text: segment.text
                    });
                }
            });
            
            return results;
        }
        
        // Function to show command help
        function showCommandHelp() {
            const helpCommands = [
                "🎮 Available Commands:",
                "- Play/pause the audio",
                "- Seek to [time] (e.g., 'go to 2:30')",
                "- Skip forward/backward [seconds]",
                "- Add bookmark [title]",
                "- Transcribe this audio",
                "- Export transcript/bookmarks",
                "- Change speed to [0.5-3x]",
                "- Find '[word/phrase]' in transcript",
                "- Help (shows this message)"
            ];
            
            helpCommands.forEach(cmd => {
                addToCommandHistory('system', cmd);
            });
        }
        
        // Function to add message to command history
        function addToCommandHistory(role, content) {
            // Create history item element
            const historyItem = document.createElement('div');
            historyItem.className = `command-item ${role}-command`;
            
            // For user commands, add a prefix
            if (role === 'user') {
                const prefix = document.createElement('span');
                prefix.className = 'command-prefix';
                prefix.textContent = '> ';
                historyItem.appendChild(prefix);
            }
            
            const contentSpan = document.createElement('span');
            contentSpan.textContent = content;
            historyItem.appendChild(contentSpan);
            
            // Add to history container
            commandHistory.appendChild(historyItem);
            
            // Scroll to bottom
            commandHistory.scrollTop = commandHistory.scrollHeight;
            
            // Add to commands history if it's a user command
            if (role === 'user') {
                commands.push(content);
            }
        }


    });

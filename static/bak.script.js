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
    const resetChatBtn = document.getElementById('resetChatBtn');

    // Text Commands
    const commandContainer = document.getElementById('commandContainer');
    const commandInput = document.getElementById('commandInput');
    const executeCommandBtn = document.getElementById('executeCommandBtn');
    const commandHistory = document.getElementById('commandHistory');
    const commandToggleIcon = document.getElementById('toggleCommands');
    
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


    // PTT
    const pttButton = document.getElementById('pttButton');
    const languageSelect = document.getElementById('languageSelect');
    const pttTranscriptDisplay = document.getElementById('pttTranscriptDisplay');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let recognitionTimeout;

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

    // PTT
    pttButton.addEventListener('mousedown', startPtt);
    pttButton.addEventListener('mouseup', stopPtt);
    pttButton.addEventListener('mouseleave', (e) => { // Stop recording if mouse leaves button while pressed
        if (isRecording) {
            stopPtt(e);
        }
    });

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
    resetChatBtn.addEventListener('click', resetChat);

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


    // Function to start Push-to-Talk recording
    async function startPtt() {
         if (isRecording) return; // Prevent multiple recordings

         isRecording = true;
         pttButton.classList.add('recording');
         pttTranscriptDisplay.textContent = 'Listening...'; // Clear previous transcript
         showMessage('Recording started. Release button to stop.');

         // Pause the audio player
         if (isPlaying) {
             audioElement.pause();
             playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
             isPlaying = false;
         }

         try {
             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
             mediaRecorder = new MediaRecorder(stream);
             audioChunks = [];

             mediaRecorder.ondataavailable = event => {
                 audioChunks.push(event.data);
             };

             mediaRecorder.onstop = async () => {
                 const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                 // const audioUrl = URL.createObjectURL(audioBlob); // For debugging
                 // console.log('Recorded audio URL:', audioUrl); // For debugging
                 
                 pttButton.classList.remove('recording');
                 pttTranscriptDisplay.textContent = 'Processing...';

                 // Send to backend for Azure Speech Recognition
                 await sendAudioForRecognition(audioBlob);
                 
                 // Stop all tracks on the stream to release microphone
                 stream.getTracks().forEach(track => track.stop());
             };

             mediaRecorder.start();
         } catch (error) {
             console.error('Error accessing microphone:', error);
             showMessage('Error accessing microphone. Please allow microphone access.');
             pttButton.classList.remove('recording');
             isRecording = false;
             pttTranscriptDisplay.textContent = 'Microphone access denied or error.';
         }
     }

     // Function to stop Push-to-Talk recording
     function stopPtt() {
         if (!isRecording) return;

         isRecording = false;
         clearTimeout(recognitionTimeout); // Clear any pending recognition timeouts
         pttButton.classList.remove('recording');
         showMessage('Recording stopped. Processing transcription...');

         if (mediaRecorder && mediaRecorder.state === 'recording') {
             mediaRecorder.stop();
         }
         // Resume audio after 1.5 seconds if it was playing before dictation
         setTimeout(() => {
             if (!isPlaying && audioElement.src && !audioElement.paused) {
                  audioElement.play();
                  playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
                  isPlaying = true;
             }
         }, 1500);
     }

     // Function to send audio blob to backend for speech recognition
     async function sendAudioForRecognition(audioBlob) {
         const formData = new FormData();
         formData.append('audio', audioBlob, 'audio.webm');
         formData.append('language', languageSelect.value); // Send selected language

         try {
             const response = await fetch(`${API_URL}/recognize_speech`, {
                 method: 'POST',
                 body: formData
             });

             const data = await response.json();

             if (data.transcript) {
                 pttTranscriptDisplay.textContent = data.transcript;
                 showMessage('Transcription received!');
                 // Optionally, add the transcript to the command input directly
                 commandInput.value = data.transcript;
             } else {
                 pttTranscriptDisplay.textContent = 'No transcript or error.';
                 showMessage('Error: ' + (data.error || 'Unknown transcription error.'));
             }
         } catch (error) {
             console.error('Error sending audio for recognition:', error);
             pttTranscriptDisplay.textContent = 'Error communicating with speech service.';
             showMessage('Network error or speech service issue.');
         }
     }

     // This is a placeholder for future wake-up word integration.
     // The structure for startPtt and stopPtt allows for easy replacement
     // of button events with wake-up word detection events.
     function setupWakeWordDetection() {
         // In a real scenario, this would involve a library or service
         // that listens for a wake-up word and triggers startPtt()
         // when detected, and potentially stopPtt() after a period of silence.
         console.log("Wake-up word detection not implemented yet. Using PTT.");
     }
     // Call this if you were to enable wake word detection
     // setupWakeWordDetection();


    });

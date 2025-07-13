document.addEventListener('DOMContentLoaded', function() {
    // ========================================================================
    // DOM ELEMENT REFERENCES
    // ========================================================================
    
    // Upload and File Handling Elements
    const uploadContainer = document.getElementById('uploadContainer');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const transcriptFileInput = document.getElementById('transcriptFileInput');
    
    // Audio Player Elements
    const playerContainer = document.getElementById('playerContainer');
    const audioInfo = document.getElementById('audioInfo');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    
    // Transcription Elements
    const transcribeBtn = document.getElementById('transcribeBtn');
    const transcriptionContainer = document.getElementById('transcriptionContainer');
    const transcriptionContent = document.getElementById('transcriptionContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    
    // Bookmark Elements
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarksContainer = document.getElementById('bookmarksContainer');
    const bookmarksContent = document.getElementById('bookmarksContent');
    const noBookmarksMessage = document.getElementById('noBookmarksMessage');
    const clearBookmarksBtn = document.getElementById('clearBookmarksBtn');
    const exportBookmarksBtn = document.getElementById('exportBookmarksBtn');
    
    // Summary Elements
    const summaryContainer = document.getElementById('summaryContainer');
    const generateSummaryBtn = document.getElementById('generateSummaryBtn');
    const summaryText = document.getElementById('summaryText');
    const noSummaryMessage = document.getElementById('noSummaryMessage');
    const summaryLoading = document.getElementById('summaryLoading');
    
    // Chat Elements
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const resetChatBtn = document.getElementById('resetChatBtn');
    
    // Command Elements
    const commandContainer = document.getElementById('commandContainer');
    const commandInput = document.getElementById('commandInput');
    const executeCommandBtn = document.getElementById('executeCommandBtn');
    const commandHistory = document.getElementById('commandHistory');
    const commandToggleIcon = document.getElementById('toggleCommands');
    
    // Notes Elements
    const notesContainer = document.getElementById('notesContainer');
    const notesContent = document.getElementById('notesContent');
    const noNotesMessage = document.getElementById('noNotesMessage');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const clearNotesBtn = document.getElementById('clearNotesBtn');
    const exportNotesBtn = document.getElementById('exportNotesBtn');
    const exportNotesJsonlBtn = document.getElementById('exportNotesJsonlBtn');
    const exportNotesTextBtn = document.getElementById('exportNotesTextBtn');
    const exportNotesSummaryBtn = document.getElementById('exportNotesSummaryBtn');
    
    // Push-to-Talk (PTT) Elements
    const pttButton = document.getElementById('pttButton');
    const languageSelect = document.getElementById('languageSelect');
    const pttTranscriptDisplay = document.getElementById('pttTranscriptDisplay');
    
    // General UI Elements
    const messageEl = document.getElementById('message');
    
    // ========================================================================
    // STATE VARIABLES
    // ========================================================================
    
    // Audio Player State
    const audioElement = new Audio();
    let isPlaying = false;

    // File Management State
    let currentFile = null;
    let fileId = null;
    let segments = [];

    // Bookmarks
    let bookmarkCounter = 1;
    
    // PTT State
    let wasPlayingBeforePTT = false;
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let recognitionTimeout;
    
    // Feature Data Arrays
    let bookmarks = [];
    let commands = [];
    let notes = [];
    let chatHistory = [];
    
    // UI State Flags
    let isExecutingCommand = false;
    let isWaitingForResponse = false;
    
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    
    // Backend API URL - change this to match your Flask server
    const API_URL = 'http://localhost:5000';
    
    // ========================================================================
    // EVENT LISTENERS SETUP
    // ========================================================================
    
    // File Upload Event Listeners
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    uploadContainer.addEventListener('dragover', handleDragOver);
    uploadContainer.addEventListener('dragleave', handleDragLeave);
    uploadContainer.addEventListener('drop', handleFileDrop);
    
    // Audio Player Event Listeners
    playPauseBtn.addEventListener('click', togglePlayPause);
    progressContainer.addEventListener('click', setProgress);
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateTotalTime);
    audioElement.addEventListener('ended', resetPlayer);
    
    // Transcription Event Listeners
    transcribeBtn.addEventListener('click', transcribeAudio);
    exportBtn.addEventListener('click', exportTranscript);
    importBtn.addEventListener('click', () => transcriptFileInput.click());
    transcriptFileInput.addEventListener('change', importTranscript);
    
    // Bookmark Event Listeners
    bookmarkBtn.addEventListener('click', addBookmark);
    clearBookmarksBtn.addEventListener('click', clearBookmarks);
    exportBookmarksBtn.addEventListener('click', exportBookmarks);
    
    // Summary Event Listeners
    generateSummaryBtn.addEventListener('click', generateSummary);
    
    // Chat Event Listeners
    sendChatBtn.addEventListener('click', sendChatMessage);
    resetChatBtn.addEventListener('click', resetChat);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Command Event Listeners
    executeCommandBtn.addEventListener('click', executeCommand);
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand();
        }
    });
    
    // Notes Event Listeners
    addNoteBtn.addEventListener('click', addNewNote);
    clearNotesBtn.addEventListener('click', clearNotes);
    exportNotesJsonlBtn.addEventListener('click', () => exportNotes('jsonl'));
    exportNotesTextBtn.addEventListener('click', () => exportNotes('text'));
    exportNotesSummaryBtn.addEventListener('click', () => exportNotes('summary'));
    
    // PTT Event Listeners
    pttButton.addEventListener('mousedown', startPtt);
    pttButton.addEventListener('mouseup', stopPtt);
    pttButton.addEventListener('mouseleave', (e) => {
        // Stop recording if mouse leaves button while pressed
        if (isRecording) {
            stopPtt(e);
        }
    });
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    // Initialize UI toggle functionality
    setupCommandToggle();
    setupBookmarksToggle();
    setupTranscriptionToggle();
    setupSummaryToggle();
    setupChatToggle();
    setupNotesToggle();
    
    // Initialize notes container
    initializeNotesContainer();

    // ========================================================================
    // FILE HANDLING FUNCTIONS
    // ========================================================================

    /**
     * Handles file selection from input element
     * @param {Event} e - File input change event
     */
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
        }
    }

    /**
     * Handles drag over event for file upload area
     * @param {Event} e - Drag over event
     */
    function handleDragOver(e) {
        e.preventDefault();
        uploadContainer.classList.add('drag-over');
    }

    /**
     * Handles drag leave event for file upload area
     * @param {Event} e - Drag leave event
     */
    function handleDragLeave(e) {
        e.preventDefault();
        uploadContainer.classList.remove('drag-over');
    }

    /**
     * Handles file drop event for drag and drop upload
     * @param {Event} e - Drop event
     */
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

    /**
     * Uploads audio file to server and initializes player
     * @param {File} file - Audio file to upload
     */
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

                // Update UI state
                updateUIAfterFileUpload(file.name);
                resetPlayerState();
                clearBookmarks();
                
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

    /**
     * Updates UI elements after successful file upload
     * @param {string} fileName - Name of uploaded file
     */
    function updateUIAfterFileUpload(fileName) {
        // Update player info
        audioInfo.textContent = fileName;
        playerContainer.style.display = 'block';
        uploadContainer.style.display = 'none';
        
        // Reset transcription UI
        transcriptionContainer.style.display = 'none';
        transcriptionContent.innerHTML = '';
        segments = [];
        exportBtn.style.display = 'none';
        
        // Reset summary UI
        summaryContainer.style.display = 'none';
        summaryText.style.display = 'none';
        noSummaryMessage.style.display = 'block';
        generateSummaryBtn.disabled = true;
        
        // Reset chat UI
        chatContainer.style.display = 'none';
        chatMessages.innerHTML = '<div class="chat-message system-message">Ask questions about the transcript or request analysis.</div>';
        chatHistory = [];
        
        // Reset bookmarks UI
        bookmarksContainer.style.display = 'none';
        bookmarkBtn.disabled = true;
        exportBookmarksBtn.disabled = true;
    }

    // ========================================================================
    // TRANSCRIPTION FUNCTIONS
    // ========================================================================

    /**
     * Initiates transcription of uploaded audio file
     */
    function transcribeAudio() {
        if (!fileId) {
            showMessage('Please upload a file first');
            return;
        }

        // Update UI for transcription in progress
        setTranscriptionInProgress(true);

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
            setTranscriptionInProgress(false);

            if (data.segments) {
                segments = data.segments;
                displayTranscription(segments);
                enablePostTranscriptionFeatures();
                showMessage('Transcription completed');
            } else {
                showMessage('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Error during transcription');
            setTranscriptionInProgress(false);
        });
    }

    /**
     * Sets UI state for transcription in progress
     * @param {boolean} inProgress - Whether transcription is in progress
     */
    function setTranscriptionInProgress(inProgress) {
        transcribeBtn.disabled = inProgress;
        transcribeBtn.classList.toggle('btn-disabled', inProgress);
        loadingIndicator.style.display = inProgress ? 'block' : 'none';
    }

    /**
     * Enables features that require completed transcription
     */
    function enablePostTranscriptionFeatures() {
        // Enable bookmark functionality
        bookmarkBtn.disabled = false;
        
        // Show interface containers
        chatContainer.style.display = 'block';
        bookmarksContainer.style.display = 'block';
        notesContainer.style.display = 'block';
        
        // Add welcome message to chat
        addMessageToChat('system', 'Transcription complete! You can now ask questions about the audio.');
    }

    /**
     * Displays transcription segments with clickable timestamps
     * @param {Array} segments - Array of transcription segments
     */
    function displayTranscription(segments) {
        transcriptionContent.innerHTML = '';

        segments.forEach((segment, index) => {
            const segmentEl = createTranscriptionSegmentElement(segment, index);
            transcriptionContent.appendChild(segmentEl);
        });

        // Show transcription UI elements
        transcriptionContainer.style.display = 'block';
        exportBtn.style.display = 'inline-block';
        summaryContainer.style.display = 'block';
        generateSummaryBtn.disabled = false;
    }

    /**
     * Creates a DOM element for a transcription segment
     * @param {Object} segment - Transcription segment data
     * @param {number} index - Segment index
     * @returns {HTMLElement} - Created segment element
     */
    function createTranscriptionSegmentElement(segment, index) {
        const segmentEl = document.createElement('div');
        segmentEl.className = 'transcript-segment';
        segmentEl.dataset.start = segment.start;
        segmentEl.dataset.end = segment.end;
        segmentEl.id = `segment-${index}`;

        // Create clickable timestamp
        const timeEl = document.createElement('div');
        timeEl.className = 'segment-time';
        timeEl.textContent = `[${formatTime(segment.start)} - ${formatTime(segment.end)}]`;
        timeEl.addEventListener('click', () => {
            audioElement.currentTime = segment.start;
            if (!isPlaying) {
                togglePlayPause();
            }
        });

        // Create text content
        const textEl = document.createElement('div');
        textEl.className = 'segment-text';
        textEl.textContent = segment.text;

        segmentEl.appendChild(timeEl);
        segmentEl.appendChild(textEl);
        
        return segmentEl;
    }

    // ========================================================================
    // BOOKMARK FUNCTIONS
    // ========================================================================

    /**
     * Adds a bookmark at the current audio playback time
     */
    function addBookmark() {
        if (!audioElement.src || segments.length === 0) {
            showMessage('Please upload and transcribe audio first');
            return;
        }

        const currentTime = audioElement.currentTime;
        const bookmarkId = Date.now();
        
        // Get relevant transcript text around current time
        const relevantText = getRelevantTranscriptText(currentTime - 5, currentTime + 2);

        const bookmark = {
            id: bookmarkId,
            time: currentTime,
            text: relevantText,
            timeFormatted: formatTime(currentTime),
            title: `Bookmark ${bookmarkCounter}`,
            comments: ''
        };

        bookmarks.push(bookmark);
        bookmarkCounter++;
        displayBookmarks();
        
        exportBookmarksBtn.disabled = bookmarks.length === 0;
        showMessage('Bookmark added');
    }

    /**
     * Retrieves relevant transcript text for a given time range
     * @param {number} startTime - Start time in seconds
     * @param {number} endTime - End time in seconds
     * @returns {string} - Concatenated transcript text
     */
    function getRelevantTranscriptText(startTime, endTime) {
        // Ensure times are within valid range
        startTime = Math.max(0, startTime);
        endTime = Math.min(audioElement.duration, endTime);

        let relevantText = '';

        // Find segments that overlap with the time range
        for (const segment of segments) {
            if ((segment.start <= endTime) && (segment.end >= startTime)) {
                relevantText += segment.text + ' ';
            }
        }

        return relevantText.trim() || 'No transcript available for this timestamp';
    }

    /**
     * Displays all bookmarks in the bookmarks container
     */
    function displayBookmarks() {
        bookmarksContent.innerHTML = '';

        // Handle empty bookmarks state
        if (bookmarks.length === 0) {
            noBookmarksMessage.style.display = 'block';
            exportBookmarksBtn.disabled = true;
            return;
        }

        noBookmarksMessage.style.display = 'none';
        exportBookmarksBtn.disabled = false;

        // Sort bookmarks by time and display
        bookmarks.sort((a, b) => a.time - b.time);
        bookmarks.forEach(bookmark => {
            const bookmarkEl = createBookmarkElement(bookmark);
            bookmarksContent.appendChild(bookmarkEl);
        });
    }

    /**
     * Creates a DOM element for a bookmark
     * @param {Object} bookmark - Bookmark data object
     * @returns {HTMLElement} - Created bookmark element
     */
    function createBookmarkElement(bookmark) {
        const bookmarkEl = document.createElement('div');
        bookmarkEl.className = 'bookmark-item';
        bookmarkEl.dataset.id = bookmark.id;

        // Create header with title and time
        const bookmarkHeader = document.createElement('div');
        bookmarkHeader.className = 'bookmark-actions';

        const titleEl = document.createElement('span');
        titleEl.className = 'bookmark-title';
        titleEl.textContent = bookmark.title;

        const timeEl = document.createElement('div');
        timeEl.className = 'bookmark-time';
        timeEl.textContent = formatTime(bookmark.time);
        timeEl.addEventListener('click', () => {
            audioElement.currentTime = bookmark.time;
            if (!isPlaying) {
                togglePlayPause();
            }
        });

        // Create action buttons
        const actionButtons = createBookmarkActionButtons(bookmark);

        bookmarkHeader.appendChild(titleEl);
        bookmarkHeader.appendChild(timeEl);
        bookmarkHeader.appendChild(actionButtons);

        // Create text content
        const textEl = document.createElement('div');
        textEl.className = 'bookmark-text';
        textEl.textContent = bookmark.text;

        // Create comments section
        const commentsEl = document.createElement('div');
        commentsEl.className = 'bookmark-comments';
        if (bookmark.comments) {
            commentsEl.innerHTML = `<strong>Comments:</strong> ${bookmark.comments}`;
        }

        bookmarkEl.appendChild(bookmarkHeader);
        bookmarkEl.appendChild(textEl);
        bookmarkEl.appendChild(commentsEl);
        
        return bookmarkEl;
    }

    /**
     * Creates action buttons for a bookmark
     * @param {Object} bookmark - Bookmark data object
     * @returns {HTMLElement} - Container with action buttons
     */
    function createBookmarkActionButtons(bookmark) {
        const actionButtons = document.createElement('div');
        actionButtons.className = 'bookmark-action-buttons';

        // Edit comments button
        const editCommentsBtn = document.createElement('span');
        editCommentsBtn.className = 'bookmark-edit-comments';
        editCommentsBtn.textContent = '✏️';
        editCommentsBtn.title = 'Edit comments';
        editCommentsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editBookmarkComments(bookmark.id);
        });

        // Generate AI comments button
        const generateCommentsBtn = document.createElement('span');
        generateCommentsBtn.className = 'bookmark-generate-comments';
        generateCommentsBtn.textContent = '🤖';
        generateCommentsBtn.title = 'Generate AI comments';
        generateCommentsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            generateBookmarkComments(bookmark.id);
        });

        // Copy to notes button
        const copyBtn = document.createElement('span');
        copyBtn.className = 'bookmark-copy-note';
        copyBtn.textContent = '📋';
        copyBtn.title = 'Copy to Notes';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyBookmarkToNote(bookmark.id);
        });

        // Delete button
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'bookmark-delete';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBookmark(bookmark.id);
        });

        actionButtons.appendChild(editCommentsBtn);
        actionButtons.appendChild(generateCommentsBtn);
        actionButtons.appendChild(copyBtn);
        actionButtons.appendChild(deleteBtn);

        return actionButtons;
    }

    // ========================================
    // BOOKMARK MANAGEMENT FUNCTIONS
    // ========================================

    /**
     * Edit bookmark comments in-place with textarea interface
     * @param {string} id - The bookmark ID
     */
    function editBookmarkComments(id) {
        const bookmark = bookmarks.find(b => b.id === id);
        if (!bookmark) return;

        const bookmarkEl = document.querySelector(`.bookmark-item[data-id="${id}"]`);
        const commentsEl = bookmarkEl.querySelector('.bookmark-comments');

        // Create textarea for editing
        const textarea = document.createElement('textarea');
        textarea.className = 'bookmark-comments-textarea';
        textarea.value = bookmark.comments || '';
        textarea.placeholder = 'Add your comments here...';

        // Create save/cancel buttons
        const editActions = document.createElement('div');
        editActions.className = 'bookmark-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-sm btn-success';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', () => {
            bookmark.comments = textarea.value;
            displayBookmarks();
            showMessage('Comments updated');
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-sm';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            displayBookmarks();
        });

        editActions.appendChild(cancelBtn);
        editActions.appendChild(saveBtn);

        // Replace comments section with edit interface
        commentsEl.innerHTML = '';
        commentsEl.appendChild(textarea);
        commentsEl.appendChild(editActions);

        textarea.focus();
    }

    /**
     * Load prompt template from file or use default fallback
     * @returns {Promise<string>} The prompt template text
     */
    async function loadPromptTemplate() {
        try {
            const response = await fetch('prompts/smart_bookmark.txt');
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.warn('Could not load prompt file, using default:', error);
        }

        // Fallback to default prompt
        return `Generate a brief, insightful comment about this audio transcript segment. Focus on key points, themes, or important information. Keep it concise (1-2 sentences):

    "{{bookmark_text}}"`;
    }

    /**
     * Generate AI-powered comments for a bookmark using API
     * @param {string} id - The bookmark ID
     */
    async function generateBookmarkComments(id) {
        const bookmark = bookmarks.find(b => b.id === id);
        if (!bookmark) return;

        const bookmarkEl = document.querySelector(`.bookmark-item[data-id="${id}"]`);
        const commentsEl = bookmarkEl.querySelector('.bookmark-comments');

        // Show loading indicator
        commentsEl.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><p>Generating comments...</p></div>';

        try {
            // Load prompt from file
            const promptTemplate = await loadPromptTemplate();

            // Replace placeholder with actual bookmark text
            const prompt = promptTemplate.replace('{{bookmark_text}}', bookmark.text);

            // Make API call
            const response = await fetch(`${API_URL}/generate_summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcript_text: prompt
                })
            });

            const data = await response.json();

            if (data.summary) {
                // Update bookmark with generated comments
                bookmark.comments = data.summary;
                displayBookmarks();
                showMessage('AI comments generated');
            } else {
                showMessage('Error generating comments: ' + data.error);
                displayBookmarks();
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error generating comments: ' + error.message);
            displayBookmarks();
        }
    }

    /**
     * Copy bookmark content to notes including comments
     * @param {string} id - The bookmark ID
     */
    function copyBookmarkToNote(id) {
        const bookmark = bookmarks.find(b => b.id === id);
        if (!bookmark) return;

        // Create note text with comments if available
        let noteText = `Bookmark from [${bookmark.timeFormatted}]:\n${bookmark.text}`;
        if (bookmark.comments) {
            noteText += `\n\nComments: ${bookmark.comments}`;
        }

        createNote(`${bookmark.title} (from bookmark)`, noteText);
        showMessage('Bookmark copied to notes');
    }

    /**
     * Delete a bookmark by ID
     * @param {string} id - The bookmark ID to delete
     */
    function deleteBookmark(id) {
        // Filter out the bookmark with the given id
        bookmarks = bookmarks.filter(bookmark => bookmark.id !== id);

        // Update display
        displayBookmarks();

        // Disable export button if no bookmarks left
        exportBookmarksBtn.disabled = bookmarks.length === 0;

        showMessage('Bookmark deleted');
    }

    /**
     * Clear all bookmarks and reset UI
     */
    function clearBookmarks() {
        bookmarks = [];
        displayBookmarks();
        exportBookmarksBtn.disabled = true;
    }

    /**
     * Export bookmarks as JSONL file with metadata
     */
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
                comments: bookmark.comments || '',
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

    // ========================================
    // AUDIO PLAYER FUNCTIONS
    // ========================================

    /**
     * Highlight the currently playing transcript segment
     */
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

    /**
     * Check if element is visible within container viewport
     * @param {HTMLElement} el - The element to check
     * @param {HTMLElement} container - The container element
     * @returns {boolean} True if element is visible
     */
    function isElementInViewport(el, container) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        return (
            rect.top >= containerRect.top &&
            rect.bottom <= containerRect.bottom
        );
    }

    /**
     * Toggle play/pause state of audio player
     */
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

    /**
     * Update progress bar and time display during playback
     */
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

    /**
     * Update total time display when audio metadata loads
     */
    function updateTotalTime() {
        if (audioElement.duration) {
            totalTimeEl.textContent = formatTime(audioElement.duration);
        }
    }

    /**
     * Set audio progress based on user click on progress bar
     * @param {Event} e - The click event
     */
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        if (audioElement.duration) {
            const seekTime = (clickX / width) * audioElement.duration;
            audioElement.currentTime = seekTime;
        }
    }

    /**
     * Reset player UI when audio ends
     */
    function resetPlayer() {
        isPlaying = false;
        playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }

    /**
     * Reset player to initial state
     */
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

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Format time in seconds to HH:MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
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

    /**
     * Display a temporary message to the user
     * @param {string} text - The message to display
     */
    function showMessage(text) {
        messageEl.textContent = text;
        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    }

    // ========================================
    // TRANSCRIPT MANAGEMENT FUNCTIONS
    // ========================================

    /**
     * Export transcript data as JSON file
     */
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

    /**
     * Import transcript from JSON file
     * @param {Event} e - The file input change event
     */
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

                // Show containers
                chatContainer.style.display = 'block';
                bookmarksContainer.style.display = 'block';
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

    // ========================================
    // UI TOGGLE FUNCTIONS
    // ========================================

    /**
     * Setup bookmarks section toggle functionality
     */
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

    /**
     * Setup transcription section toggle functionality
     */
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

    /**
     * Setup summary section toggle functionality
     */
    function setupSummaryToggle() {
        const toggleIcon = document.getElementById('toggleSummary');
        const summaryContent = document.getElementById('summaryContent');

        if (!toggleIcon || !summaryContent) return;

        // Set up the click handler
        document.querySelector('.summary-header .header-with-toggle').addEventListener('click', function() {
            toggleIcon.textContent = toggleIcon.textContent === '▼' ? '►' : '▼';
            summaryContent.classList.toggle('collapsed');

            // Save the state to localStorage
            const isCollapsed = summaryContent.classList.contains('collapsed');
            localStorage.setItem('summaryCollapsed', isCollapsed);
        });

        // Initialize based on saved state
        const savedState = localStorage.getItem('summaryCollapsed');
        if (savedState === 'true') {
            toggleIcon.textContent = '►';
            summaryContent.classList.add('collapsed');
        }
    }

    /**
     * Setup chat section toggle functionality
     */
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

    // ========================================
    // SUMMARY GENERATION FUNCTIONS
    // ========================================

    /**
     * Generate AI summary of the entire transcript
     */
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

    // ========================================
    // CHAT FUNCTIONS
    // ========================================

    /**
     * Send chat message to AI assistant
     */
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

    /**
     * Add message to chat interface
     * @param {string} role - Message role (user, assistant, system)
     * @param {string} content - Message content
     */
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

    /**
     * Show typing indicator in chat
     */
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

    /**
     * Remove typing indicator from chat
     */
    function removeTypingIndicator() {
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) {
            typingEl.remove();
        }
    }
    
    // =============================================================================
    // COMMAND INTERFACE FUNCTIONS
    // =============================================================================

    /**
     * Sets up the command container toggle functionality
     * Handles expanding/collapsing the command panel and persists state
     */

    // =============================================================================
    // Plan Execution State
    // =============================================================================
    let currentPlanExecution = {
        isExecuting: false,
        currentPlan: null
    };

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

    /**
     * Executes a command from the command input
     * Handles API communication and command interpretation
     * Now supports both single actions and action plans
     */
    function executeCommand() {
        if (isExecutingCommand || currentPlanExecution.isExecuting) return;

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
            console.log(command);
            addToCommandHistory('system', `Intent detected: ${data.intent}`);

            // Check if this is a plan (multiple actions) or single action
            if (data.actions && Array.isArray(data.actions)) {
                // Execute the plan
                executePlan(data);
            } else if (data.action) {
                // Legacy single action support
                executeAction(data.action, data.parameters);
            } else {
                addToCommandHistory('system', 'No valid action found in command response');
            }
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

    // =============================================================================
    // Plan Execution Functions
    // =============================================================================

    /**
     * Executes a plan containing multiple actions
     * Supports both sequential and parallel execution
     */
    async function executePlan(planResponse) {
        if (currentPlanExecution.isExecuting) {
            addToCommandHistory('system', 'Another plan is already executing, please wait...');
            return;
        }
        
        currentPlanExecution.isExecuting = true;
        currentPlanExecution.currentPlan = planResponse;
        
        try {
            addToCommandHistory('system', `Executing plan: ${planResponse.intent}`);
            
            if (planResponse.execution_mode === 'parallel') {
                await executeActionsParallel(planResponse.actions);
            } else {
                await executeActionsSequential(planResponse.actions);
            }
            
            addToCommandHistory('system', 'Plan execution completed successfully');
        } catch (error) {
            console.error('Plan execution failed:', error);
            addToCommandHistory('system', `Plan execution failed: ${error.message}`);
        } finally {
            currentPlanExecution.isExecuting = false;
            currentPlanExecution.currentPlan = null;
        }
    }

    /**
     * Executes actions one after another with optional delays
     */
    async function executeActionsSequential(actions) {
        for (let i = 0; i < actions.length; i++) {
            const actionItem = actions[i];
            
            // Add delay if specified
            if (actionItem.delay) {
                addToCommandHistory('system', `Waiting ${actionItem.delay}ms before next action...`);
                await sleep(actionItem.delay);
            }
            
            // Execute the action
            addToCommandHistory('system', `Executing step ${i + 1}/${actions.length}: ${actionItem.action}`);
            await executeActionAsync(actionItem.action, actionItem.parameters);
        }
    }

    /**
     * Executes actions simultaneously
     */
    async function executeActionsParallel(actions) {
        addToCommandHistory('system', `Executing ${actions.length} actions simultaneously...`);
        
        const promises = actions.map(async (actionItem, index) => {
            if (actionItem.delay) {
                await sleep(actionItem.delay);
            }
            
            addToCommandHistory('system', `Parallel action ${index + 1}: ${actionItem.action}`);
            return executeActionAsync(actionItem.action, actionItem.parameters);
        });
        
        await Promise.all(promises);
    }

    /**
     * Async wrapper for executeAction to support plan execution
     */
    async function executeActionAsync(action, parameters) {
        return new Promise((resolve, reject) => {
            try {
                executeAction(action, parameters);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Utility function for delays
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Executes a specific action based on interpreted command
     * Main command dispatcher for all audio player actions
     * Enhanced with better error handling for plan execution
     */
    function executeAction(action, parameters) {
        try {
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
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
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

                    // Use provided title or note, or generate one
                    const bookmarkTitle = parameters.title || parameters.note || 'bookmark';

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

                    addToCommandHistory('system', `Added bookmark "${bookmarkTitle}" at ${formatTime(currentTime)}`);
                    break;

                case 'transcribe':
                    if (!fileId) {
                        addToCommandHistory('system', 'Please upload an audio file first');
                        return;
                    }

                    // Call the existing transcribe function
                    addToCommandHistory('system', 'Starting transcription process...');
                    transcribeAudio();
                    break;

                case 'upload_prompt':
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
                        const skipAmount = parameters.seconds || 10;
                        const newTime = Math.min(audioElement.currentTime + skipAmount, audioElement.duration);
                        audioElement.currentTime = newTime;
                        addToCommandHistory('system', `Skipped forward ${skipAmount} seconds`);
                    } else {
                        addToCommandHistory('system', 'No audio file loaded');
                    }
                    break;

                case 'skip_backward':
                    if (audioElement.src) {
                        const skipAmount = parameters.seconds || 10;
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

                    const searchTerm = parameters.searchTerm || parameters.query;
                    if (!searchTerm) {
                        addToCommandHistory('system', 'No search term provided');
                        return;
                    }

                    const results = searchTranscript(searchTerm);
                    if (results.length === 0) {
                        addToCommandHistory('system', `No matches found for "${searchTerm}"`);
                    } else {
                        addToCommandHistory('system', `Found ${results.length} matches for "${searchTerm}"`);

                        if (parameters.occurrence && parameters.occurrence <= results.length) {
                            const selectedResult = results[parameters.occurrence - 1];
                            audioElement.currentTime = selectedResult.start;
                            addToCommandHistory('system', `Jumped to occurrence ${parameters.occurrence} at ${formatTime(selectedResult.start)}`);
                        } else {
                            const displayResults = results.slice(0, 3);
                            displayResults.forEach((result, i) => {
                                addToCommandHistory('system', `${i+1}. [${formatTime(result.start)}]: "${result.text}"`);
                            });

                            if (results.length > 3) {
                                addToCommandHistory('system', `...and ${results.length - 3} more matches`);
                            }

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
        } catch (error) {
            console.error(`Error executing action ${action}:`, error);
            addToCommandHistory('system', `Error executing ${action}: ${error.message}`);
            throw error; // Re-throw for plan execution error handling
        }
    }

    /**
     * Searches the transcript for a specific term
     * Returns array of matching segments with timing information
     */
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

    /**
     * Displays command help information
     * Shows available commands and their descriptions
     * Updated with multi-action command examples
     */
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
            "- Help (shows this message)",
            "",
            "🔗 Multi-Action Commands:",
            "- 'Jump to 2:30, add bookmark, then play'",
            "- 'Transcribe and export transcript'",
            "- 'Pause, seek to beginning, then play'",
            "- 'Add bookmark and continue playing'"
        ];

        helpCommands.forEach(cmd => {
            addToCommandHistory('system', cmd);
        });
    }

    /**
     * Adds a message to the command history display
     * Handles both user commands and system responses
     */
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

    // =============================================================================
    // NOTES MANAGEMENT FUNCTIONS
    // =============================================================================

    /**
     * Adds a new note with user-provided title
     * Prompts for title and creates empty note for editing
     */
    function addNewNote() {
        const title = prompt('Enter a title for your note:', 'Note') || 'Note';
        createNote(title, '');
    }

    /**
     * Creates a new note with specified title and content
     * Adds to notes array and updates display
     */
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

    /**
     * Displays all notes in the notes container
     * Sorts by timestamp and creates interactive note elements
     */
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

    /**
     * Puts a note into edit mode
     * Replaces content with textarea and adds save/cancel buttons
     */
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

    /**
     * Saves changes to a note being edited
     * Updates note content and timestamp, refreshes display
     */
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

    /**
     * Deletes a note after confirmation
     * Removes from notes array and updates display
     */
    function deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            // Filter out the note with the given id
            notes = notes.filter(note => note.id.toString() !== id.toString());
            
            // Update display
            displayNotes();
            showMessage('Note deleted');
        }
    }

    /**
     * Clears all notes after confirmation
     * Empties notes array and updates display
     */
    function clearNotes() {
        if (notes.length === 0) return;
        
        if (confirm('Are you sure you want to delete all notes?')) {
            notes = [];
            displayNotes();
            showMessage('All notes cleared');
        }
    }

    /**
     * Exports notes in specified format
     * Supports JSONL, text, and summary formats
     */
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

    /**
     * Exports notes as JSONL format
     * One JSON object per line for structured data processing
     */
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

    /**
     * Exports notes as plain text format
     * Human-readable format with headers and timestamps
     */
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

    /**
     * Exports notes as a markdown summary
     * Organized by topics with table of contents
     */
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

    /**
     * Helper function for creating and downloading files
     * Creates blob and triggers download with specified filename and mime type
     */
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

    /**
     * Sets up the notes container toggle functionality
     * Handles expanding/collapsing the notes panel and persists state
     */
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

    /**
     * Initializes the notes container on page load
     * Sets up empty notes display and prepares for file loading
     */
    function initializeNotesContainer() {
        // This is called after DOM is loaded
        // Display empty notes container
        displayNotes();
        
        // Add event to show notes container when a file is loaded
        // (This can be added in the uploadFile function)
    }

    // =============================================================================
    // CHAT FUNCTIONS
    // =============================================================================

    /**
     * Adds a message to the chat interface
     * Handles different message types and provides save-to-notes functionality
     */
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

    /**
     * Saves a chat message to the notes system
     * Creates a note with abbreviated title from message content
     */
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

    /**
     * Resets the chat history
     * Clears all messages except initial system message
     */
    function resetChat() {
        // Clear the chat history array
        chatHistory = [];
        
        // Clear the chat messages UI (keeping only the initial system message)
        chatMessages.innerHTML = '<div class="chat-message system-message">Ask questions about the transcript or request analysis.</div>';
        
        // Show confirmation message
        showMessage('Chat history has been reset');
    }

    // =============================================================================
    // PUSH-TO-TALK VOICE RECOGNITION MODULE
    // =============================================================================

    // -----------------------------------------------------------------------------
    // Core PTT Recording Functions
    // -----------------------------------------------------------------------------

    /**
     * Starts Push-to-Talk recording session
     * Handles microphone access, audio recording, and UI state management
     */
    async function startPtt() {
        if (isRecording) return; // Prevent multiple recordings

        isRecording = true;
        pttButton.classList.add('recording');
        pttTranscriptDisplay.textContent = 'Listening...';
        showMessage('Recording started. Release button to stop.');

        // Pause current audio playback if active
        pauseAudioForPTT();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            // Set up recording event handlers
            setupRecordingEventHandlers(stream);

            mediaRecorder.start();
        } catch (error) {
            handleMicrophoneError(error);
        }
    }

    /**
     * Stops Push-to-Talk recording and processes the audio
     * Triggers transcription and optionally resumes audio playback
     */
    function stopPtt() {
        if (!isRecording) return;

        isRecording = false;
        clearTimeout(recognitionTimeout);
        pttButton.classList.remove('recording');
        showMessage('Recording stopped. Processing transcription...');

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }

        // Resume audio playback after processing delay
        scheduleAudioResume();
    }

    // -----------------------------------------------------------------------------
    // Audio Recording Event Handlers
    // -----------------------------------------------------------------------------

    /**
     * Sets up MediaRecorder event handlers for audio processing
     * @param {MediaStream} stream - The audio stream to manage
     */
    function setupRecordingEventHandlers(stream) {
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            pttButton.classList.remove('recording');
            pttTranscriptDisplay.textContent = 'Processing...';

            // Send audio for speech recognition
            await sendAudioForRecognition(audioBlob);

            // Release microphone resources
            stream.getTracks().forEach(track => track.stop());
        };
    }

    /**
     * Handles microphone access errors
     * @param {Error} error - The error object from getUserMedia
     */
    function handleMicrophoneError(error) {
        console.error('Error accessing microphone:', error);
        showMessage('Error accessing microphone. Please allow microphone access.');
        pttButton.classList.remove('recording');
        isRecording = false;
        pttTranscriptDisplay.textContent = 'Microphone access denied or error.';
    }

    // -----------------------------------------------------------------------------
    // Audio Playback Management
    // -----------------------------------------------------------------------------

    /**
     * Pauses current audio playback when PTT is activated
     * Tracks playback state for later resumption
     */
    function pauseAudioForPTT() {
        wasPlayingBeforePTT = isPlaying;
        if (isPlaying) {
            audioElement.pause();
            playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            isPlaying = false;
        }
    }

    /**
     * Schedules audio playback resumption after PTT processing
     * Only resumes if audio was playing before PTT activation
     */
    function scheduleAudioResume() {
        setTimeout(() => {
            if (wasPlayingBeforePTT && audioElement.src) {
                audioElement.play();
                playPauseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
                isPlaying = true;
            }
            // Reset the flag
            wasPlayingBeforePTT = false;
        }, 900);
    }

    // -----------------------------------------------------------------------------
    // Speech Recognition & API Communication
    // -----------------------------------------------------------------------------

    /**
     * Sends recorded audio blob to backend for speech recognition
     * @param {Blob} audioBlob - The recorded audio data
     */
    async function sendAudioForRecognition(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('language', languageSelect.value);

        try {
            const response = await fetch(`${API_URL}/recognize_speech`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.transcript) {
                handleSuccessfulTranscription(data.transcript);
            } else {
                handleTranscriptionError(data.error);
            }
        } catch (error) {
            handleNetworkError(error);
        }
    }

    /**
     * Handles successful speech transcription
     * @param {string} transcript - The transcribed text
     */
    function handleSuccessfulTranscription(transcript) {
        pttTranscriptDisplay.textContent = transcript;
        showMessage('Transcription received!');
        commandInput.value = transcript;

        // Auto-execute the transcribed command
        executeCommandFromTranscript(transcript);
    }

    /**
     * Handles transcription errors from the API
     * @param {string} error - The error message from the API
     */
    function handleTranscriptionError(error) {
        pttTranscriptDisplay.textContent = 'No transcript or error.';
        showMessage('Error: ' + (error || 'Unknown transcription error.'));
    }

    /**
     * Handles network errors during transcription
     * @param {Error} error - The network error object
     */
    function handleNetworkError(error) {
        console.error('Error sending audio for recognition:', error);
        pttTranscriptDisplay.textContent = 'Error communicating with speech service.';
        showMessage('Network error or speech service issue.');
    }

    // -----------------------------------------------------------------------------
    // Command Execution & Processing
    // -----------------------------------------------------------------------------

    /**
     * Executes a command derived from voice transcript
     * Handles command interpretation and execution flow
     * @param {string} transcript - The transcribed voice command
     */
    function executeCommandFromTranscript(transcript) {
        if (isExecutingCommand) return;

        const command = transcript.trim();
        if (!command) return;

        // Update UI and state
        addToCommandHistory('user', command);
        setExecutingState(true);
        addToCommandHistory('system', 'Processing voice command...');

        // Prepare application context
        const appState = buildApplicationState();
        
        // Send command for interpretation
        interpretCommand(command, appState);
    }

    /**
     * Builds current application state for command context
     * @returns {Object} Current application state object
     */
    function buildApplicationState() {
        return {
            isAudioLoaded: !!audioElement.src,
            isPlaying: isPlaying,
            currentTime: audioElement.currentTime,
            duration: audioElement.duration,
            hasTranscript: segments.length > 0,
            bookmarksCount: bookmarks.length,
            fileName: currentFile ? currentFile.name : null,
            fileId: fileId
        };
    }

    /**
     * Sends command to backend for interpretation
     * @param {string} command - The voice command to interpret
     * @param {Object} appState - Current application state
     */
    function interpretCommand(command, appState) {
        fetch(`${API_URL}/interpret_command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: command,
                app_state: appState,
                command_history: commands.slice(-5) // Last 5 commands for context
            })
        })
        .then(response => response.json())
        .then(data => handleCommandResponse(data))
        .catch(error => handleCommandError(error))
        .finally(() => setExecutingState(false));
    }

    /**
     * Handles successful command interpretation response
     * @param {Object} data - Response data from command interpretation
     */
    function handleCommandResponse(data) {
        if (data.error) {
            addToCommandHistory('system', `Error: ${data.error}`);
            return;
        }

        // Show detected intent and execute action
        addToCommandHistory('system', `Voice command detected: ${data.intent}`);
        executeAction(data.action, data.parameters);

        // Clear command input after delay for visual feedback
        setTimeout(() => {
            commandInput.value = '';
        }, 2000);
    }

    /**
     * Handles command interpretation errors
     * @param {Error} error - The error object
     */
    function handleCommandError(error) {
        console.error('Command interpretation error:', error);
        addToCommandHistory('system', 'Error interpreting voice command. Please try again.');
    }

    /**
     * Sets the command execution state and updates UI
     * @param {boolean} isExecuting - Whether a command is currently executing
     */
    function setExecutingState(isExecuting) {
        isExecutingCommand = isExecuting;
        executeCommandBtn.disabled = isExecuting;
    }

    // -----------------------------------------------------------------------------
    // Future Enhancement Placeholder
    // -----------------------------------------------------------------------------

    /**
     * Placeholder for wake-up word detection integration
     * Structure allows for easy replacement of button events with wake-word detection
     */
    function setupWakeWordDetection() {
        // Future implementation would integrate with wake-word detection library
        // and trigger startPtt() when wake-word is detected
        console.log("Wake-up word detection not implemented yet. Using PTT.");
    }

    // Uncomment to enable wake word detection when implemented
    // setupWakeWordDetection();

});

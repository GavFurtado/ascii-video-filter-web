// Updated app.js with SSE progress tracking
const uploadForm = document.querySelector('#uploadForm');
const videoInput = document.querySelector('#videoInput');
const label = document.querySelector('.uploadButton');
const colors = document.getElementById('colorToggle');
const fonts = document.querySelector('.custom-select');
const charSet = document.querySelector('#charSet')
// Enhanced loading state management with progress

const showLoading = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Processing your video...</p>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="progress-text" id="progress-text">Starting...</div>
            </div>
            <div class="progress-log" id="progress-log"></div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
};

const updateProgress = (percentage, message) => {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill && progressText) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% - ${message}`;
    }
};

const addLogMessage = (message, type = 'info') => {
    const progressLog = document.getElementById('progress-log');
    if (progressLog) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = message;
        progressLog.appendChild(logEntry);

        // Limit log entries to prevent overflow
        const entries = progressLog.children;
        if (entries.length > 10) {
            progressLog.removeChild(entries[0]);
        }

        // Auto-scroll to bottom
        progressLog.scrollTop = progressLog.scrollHeight;
    }
};

const hideLoading = () => {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
};

const connectToProgressStream = (sessionId) => {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`http://localhost:8080/progress/${sessionId}`);

        eventSource.onopen = () => {
            console.log('Connected to progress stream');
            addLogMessage('Connected to processing stream', 'success');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Progress update:', data);

                switch (data.type) {
                    case 'connected':
                        addLogMessage(data.message, 'success');
                        break;

                    case 'progress':
                        updateProgress(data.percentage, 'Processing...');
                        addLogMessage(`Progress: ${data.percentage}%`, 'info');
                        break;

                    case 'output':
                        if (data.message.trim()) {
                            addLogMessage(data.message, 'info');
                        }
                        break;

                    case 'error':
                        addLogMessage(`Error: ${data.message}`, 'error');
                        break;

                    case 'complete':
                        updateProgress(100, 'Complete!');
                        addLogMessage('Processing completed successfully!', 'success');
                        eventSource.close();

                        // Wait a moment to show completion, then redirect
                        setTimeout(() => {
                            hideLoading();
                            window.location.href = `results.html?video=${encodeURIComponent(data.filename)}`;
                        }, 2000);

                        resolve(data.filename);
                        break;
                }
            } catch (err) {
                console.error('Error parsing SSE data:', err);
                addLogMessage('Error parsing server response', 'error');
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            addLogMessage('Connection error occurred', 'error');
            eventSource.close();
            reject(new Error('SSE connection failed'));
        };

        // Cleanup function
        const cleanup = () => {
            if (eventSource.readyState !== EventSource.CLOSED) {
                eventSource.close();
            }
        };

        // Auto-cleanup after reasonable timeout (e.g., 10 minutes)
        setTimeout(cleanup, 10 * 60 * 1000);

        return cleanup;
    });
};

videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        label.innerText = file.name;
        label.classList = "fileInInput";
    }
});

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!videoInput.files || videoInput.files.length === 0) {
        alert("No video selected!");
        return;
    }

    const dataForm = new FormData();
    dataForm.append('file', videoInput.files[0]);
    dataForm.append('colors', colors.checked);
    dataForm.append('fonts', fonts.value);
    dataForm.append('charSet', charSet.value);

    // Show loading spinner
    showLoading();

    try {
        // Start the upload and processing
        const res = await fetch("http://localhost:8080/upload", {
            method: 'POST',
            body: dataForm
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.log(`File upload failed: ${errorText || 'Unknown error'}`);
            hideLoading();
            alert(`Upload failed: ${errorText || 'Unknown error'}`);
            return;
        }

        const json = await res.json();
        const sessionId = json.sessionId;

        addLogMessage('Upload successful, starting processing...', 'success');

        // Connect to progress stream
        try {
            await connectToProgressStream(sessionId);
        } catch (streamError) {
            console.error('Progress stream error:', streamError);
            hideLoading();
            alert('Processing started but progress updates failed. Please check results page manually.');
        }

    } catch (err) {
        console.log("Error occurred:", err);
        hideLoading();
        alert("An error occurred while processing your video");
    }
});

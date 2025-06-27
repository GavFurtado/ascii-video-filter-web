const uploadForm = document.querySelector('#uploadForm');
const videoInput = document.querySelector('#videoInput');
const label = document.querySelector('.uploadButton');
const colors = document.getElementById('colorToggle');
const fonts = document.querySelector('.custom-select');

// Loading state management
const showLoading = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Processing your video...</p>
            <p class="loading-subtext">This may take a few moments</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
};

const hideLoading = () => {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
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

    // Show loading spinner
    showLoading();

    try {
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
        const filename = json.filename;

        // Hide loading and redirect to results page
        hideLoading();
        window.location.href = `results.html?video=${encodeURIComponent(filename)}`;

    } catch (err) {
        console.log("Error occurred:", err);
        hideLoading();
        alert("An error occurred while processing your video");
    }
});

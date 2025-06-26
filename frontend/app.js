const uploadForm = document.querySelector('#uploadForm');
const videoInput = document.querySelector('#videoInput');
const label = document.querySelector('.uploadButton');
const colors = document.getElementById('colorToggle');
const fonts = document.querySelector('.custom-select');


videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        label.innerText = file.name
        label.classList = "fileInInput"
    }
});

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!videoInput.files || videoInput.files.length === 0) {
        alert("no video selected bruh");
        return;
    }
    const dataForm = new FormData();
    //here we send shit to backend 
    dataForm.append('file', videoInput.files[0]);
    dataForm.append('colors', colors.checked);
    dataForm.append('fonts', fonts.value);
    try {
        const res = await fetch("http://localhost:8080/upload", {
            method: 'POST',
            body: dataForm
        })
        if (!res.ok) {
            const errorText = await res.text();
            console.log(`File upload failed: ${errorText || 'Unknown error'}`);
            return;

        }

        const json = await res.json();
        const filename = json.filename;

        window.location.href = `/view?video=${encodeURIComponent(filename)}`;
    }
    catch (err) {
        console.log("error occured", err)
    }


});




const uploadForm = document.querySelector('#uploadForm');
const videoInput = document.querySelector('#videoInput');
const label = document.querySelector('.uploadButton');

videoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    label.innerText = file.name
    label.classList = "fileInInput"
}
});

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    console.log("entered")
    if (!videoInput.files || videoInput.files.length===0) {
        alert("no video selected bruh");
        return;
    }
    const dataForm = new FormData();
    //here we send shit to backend 
    dataForm.append('video',videoInput.files[0]);
    try{
        const res = await fetch("we put the ip of backend here bruh",{
            method:'POST',
            body:videoInput.files[0]
        })
        if(!res.ok){
            alert('file not uploaded ')
        }

    }
    catch(err){
        console.log(err)
    }
    // we go to dif page with video, if it goes thru backend

});

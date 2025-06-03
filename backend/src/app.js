import express from "express"
import upload from "./middleware/multer.middleware.js"
import cors from 'cors'

const app = express();
app.use(cors())
app.post("/upload", upload.single("file"), (req, res) => {
    if(!req.file){
        console.log("File not received bruh");
        return res.status("400").send("No File uploaded bruh");

    }
    res.send("shits uploaded")
});




export default app;

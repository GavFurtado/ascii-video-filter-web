import express from "express";
import upload from "./middleware/multer.middleware.js";
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(`filename: ${__filename}`)
console.log(`dirname: ${__dirname}`)


app.use("/processed", express.static(path.join(__dirname, "processed")));

app.post("/upload", upload.single("file"), (req, res) => {
    const fontFileName = {
        "RobotoMono": "RobotoMono-Bold.ttf",
        "RubikMono": "RubikMonoOne-Regular.ttf"
    }
    const isWindows = process.platform === "win32";

    // Step 1: Validate input
    if (!req.file) {
        console.error("File not received.");
        return res.status(400).send("No file uploaded.");
    }

    const { colors: colorEnabled, fonts: font } = req.body;
    if (typeof colorEnabled === "undefined" || !font) {
        console.error("Missing configuration (colorEnabled/font).");
        console.error(`COLOR: ${colorEnabled}, FONTS: ${font}`);
        return res.status(400).send("Missing configuration.");
    }

    // Step 2: Build paths
    const inputPath = req.file.path;
    const outputFileName = `output-${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, "processed", outputFileName);
    const binaryName = isWindows ? "AsciiVideoFilter.exe" : "AsciiVideoFilter";
    const executablePath = path.join(__dirname, "../bin", binaryName);
    console.log(`inputPath: ${inputPath}`)
    console.log(`outputFileName: ${outputFileName}`)
    console.log(`outputPath: ${outputPath}`)
    console.log(`executablePath: ${executablePath}`)

    // Step 3: Build args
    if (typeof font !== 'string' || !(font in fontFileName)) { // if not a supported/invalid font
        return res.status(400).send("Invalid Configuration Options.")
    }
    const fontPath = path.join(__dirname, "assets", `${fontFileName[font]}`);
    const args = [
        "-i", inputPath,
        "-o", outputPath,
        "-f", fontPath
    ];

    if (colorEnabled === "false") {
        args.push("--no-colour");
    }

    // Step 4: Spawn child process with env + shell
    const options = {
        shell: true,
        env: {
            ...process.env,
            PATH: `${path.join(__dirname, "lib")};${process.env.PATH}`
        }
    };

    console.log(`Running command: ${executablePath} ${args.join(" ")}`);
    const child = spawn(executablePath, args, options);

    // Step 5: Stream logs live
    child.stdout.on("data", (data) => process.stdout.write(data));
    child.stderr.on("data", (data) => process.stderr.write(data));

    child.on("close", (code) => {
        if (code !== 0) {
            console.error(`Process exited with code ${code}`);
            return res.status(500).send("Processing failed.");
        }

        console.log("Processing complete. Sending file:", outputFileName);
        res.json({ filename: outputFileName });
    });
});


app.use(express.static(path.join(__dirname, 'public')));
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

export default app;

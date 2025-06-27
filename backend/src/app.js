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

    if (typeof font !== 'string' || !(font in fontFileName)) { // if not a supported/invalid font
        return res.status(400).send("Invalid Configuration Options.")
    }
    // Step 2: Build paths
    let inputPath;
    let outputFileName = `output-${Date.now()}.mp4`;
    let outputPath;
    let binaryName = isWindows ? "AsciiVideoFilter.exe" : "AsciiVideoFilter";
    let executablePath;
    let fontPath = path.join(__dirname, "assets", fontFileName[font]);

    if (!isWindows) {
        inputPath = req.file.path;
        outputPath = path.join(__dirname, "processed", outputFileName);
        executablePath = path.join(__dirname, "../bin", binaryName);
    } else {
        inputPath = `"${req.file.path}"`;  // quoting for Windows shell
        outputPath = `"${path.join(__dirname, "processed", outputFileName)}"`;
        executablePath = `"${path.join(__dirname, "../bin", binaryName)}"`;
    }

    // Debug logging
    console.log("inputPath:", inputPath);
    console.log("outputFileName:", outputFileName);
    console.log("outputPath:", outputPath);
    console.log("executablePath:", executablePath);


    // Step 3: Build args
    const args = [
        "-i", inputPath,
        "-o", outputPath,
        "-f", fontPath,
    ];

    if (colorEnabled === "false") {
        args.push("--no-colour");
    }

    // Step 4: Options
    const options = {
        shell: isWindows,
        env: {
            ...process.env,
            PATH: `${path.join(__dirname, "lib")}${isWindows ? ";" : ":"}${process.env.PATH}`,
        },
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


app.use('/processed', express.static(path.join(__dirname, 'processed')));
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});
export default app;

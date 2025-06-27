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

// Store active processing sessions
const activeSessions = new Map();

app.use("/processed", express.static(path.join(__dirname, "processed")));

// SSE endpoint for progress updates
app.get("/progress/:sessionId", (req, res) => {
    const sessionId = req.params.sessionId;

    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type": "connected", "message": "Progress stream connected"}\n\n');

    // Store this response object for the session
    if (activeSessions.has(sessionId)) {
        activeSessions.get(sessionId).res = res;
    } else {
        activeSessions.set(sessionId, { res });
    }

    // Handle client disconnect
    req.on('close', () => {
        console.log(`Client disconnected from session ${sessionId}`);
        if (activeSessions.has(sessionId)) {
            const session = activeSessions.get(sessionId);
            if (session.res === res) {
                activeSessions.delete(sessionId);
            }
        }
    });
});

app.post("/upload", upload.single("file"), (req, res) => {
    const fontFileName = {
        "RobotoMono": "RobotoMono-Bold.ttf",
        "RubikMono": "RubikMonoOne-Regular.ttf"
    }
    const charsets = {
        "Detailed": "detailed",
        "Standard": "standard",
        "Binary": "binary",
    }
    const isWindows = process.platform === "win32";

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Validate input
    if (!req.file) {
        console.error("File not received.");
        return res.status(400).send("No file uploaded.");
    }

    const { colors: colorEnabled, fonts: font, characterSet } = req.body;
    if (typeof colorEnabled === "undefined" || !font) {
        console.error("Missing configuration (colorEnabled/font).");
        console.error(`COLOR: ${colorEnabled}, FONTS: ${font}, CHARSET: ${characterSet}`);
        return res.status(400).send("Missing configuration.");
    }

    if (typeof font !== 'string' || !(font in fontFileName)) {
        return res.status(400).send("Invalid Configuration Options.")
    }
    if (typeof font !== 'string' || !(characterSet in charsets)) {
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
        inputPath = `"${req.file.path}"`;
        outputPath = `"${path.join(__dirname, "processed", outputFileName)}"`;
        executablePath = `"${path.join(__dirname, "../bin", binaryName)}"`;
    }

    // Step 3: Build args
    const args = [
        "-i", inputPath,
        "-o", outputPath,
        "-f", fontPath,
        "-p", charsets[characterSet]
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

    // Return session ID immediately
    res.json({ sessionId, message: "Processing started" });

    // Helper function to send progress updates
    const sendProgress = (data) => {
        if (activeSessions.has(sessionId)) {
            const session = activeSessions.get(sessionId);
            if (session.res && !session.res.destroyed) {
                session.res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
        }
    };

    console.log(`Running command: ${executablePath} ${args.join(" ")}`);
    const child = spawn(executablePath, args, options);

    // Step 5: Stream logs and progress
    child.stdout.on("data", (data) => {
        const output = data.toString();
        process.stdout.write(data); // Keep console logging

        // Parse progress from output (adjust regex based on your progress format)
        const progressMatch = output.match(/\[={0,30}.*?\]\s*(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
            const percentage = parseFloat(progressMatch[1]);
            sendProgress({
                type: "progress",
                percentage: percentage,
                message: output.trim()
            });
        } else {
            // Send general output
            sendProgress({
                type: "output",
                message: output.trim()
            });
        }
    });

    child.stderr.on("data", (data) => {
        const output = data.toString();
        process.stderr.write(data); // Keep console logging
        sendProgress({
            type: "error",
            message: output.trim()
        });
    });

    child.on("close", (code) => {
        if (code !== 0) {
            console.error(`Process exited with code ${code}`);
            sendProgress({
                type: "error",
                message: `Processing failed with code ${code}`
            });
        } else {
            console.log("Processing complete. File:", outputFileName);
            sendProgress({
                type: "complete",
                filename: outputFileName,
                message: "Processing completed successfully!"
            });
        }

        // Clean up session after a delay
        setTimeout(() => {
            if (activeSessions.has(sessionId)) {
                const session = activeSessions.get(sessionId);
                if (session.res && !session.res.destroyed) {
                    session.res.end();
                }
                activeSessions.delete(sessionId);
            }
        }, 5000);
    });
});

app.use('/processed', express.static(path.join(__dirname, 'processed')));
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

export default app;

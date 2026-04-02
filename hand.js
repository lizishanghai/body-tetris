// MediaPipe Hands Detection (right hand only)

class HandDetector {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.landmarks = null; // 21 landmarks for right hand
        this.ready = false;
        this.onResults = null;
    }

    async init(videoElement) {
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                this.landmarks = results.multiHandLandmarks[0];
            } else {
                this.landmarks = null;
            }
            if (this.onResults) {
                this.onResults(results);
            }
        });

        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
        this.ready = true;
    }

    // Landmark indices:
    // 0: wrist
    // 5: index finger MCP
    // 9: middle finger MCP
    // 13: ring finger MCP
    // 17: pinky MCP
    // 8: index finger tip
    // 12: middle finger tip

    getWrist() {
        return this.landmarks ? this.landmarks[0] : null;
    }

    getMiddleMCP() {
        return this.landmarks ? this.landmarks[9] : null;
    }

    getIndexMCP() {
        return this.landmarks ? this.landmarks[5] : null;
    }

    getPinkyMCP() {
        return this.landmarks ? this.landmarks[17] : null;
    }

    // Hand angle: angle from wrist to middle finger MCP
    // Used to detect hand rotation
    getHandAngle() {
        const wrist = this.getWrist();
        const mcp = this.getMiddleMCP();
        if (!wrist || !mcp) return null;
        return Math.atan2(mcp.y - wrist.y, mcp.x - wrist.x);
    }

    isDetecting() {
        return this.landmarks !== null;
    }
}

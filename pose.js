// MediaPipe Pose Detection

class PoseDetector {
    constructor() {
        this.pose = null;
        this.camera = null;
        this.landmarks = null;
        this.ready = false;
        this.onResults = null;
    }

    async init(videoElement) {
        this.pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.pose.onResults((results) => {
            if (results.poseLandmarks) {
                this.landmarks = results.poseLandmarks;
            } else {
                this.landmarks = null;
            }
            if (this.onResults) {
                this.onResults(results);
            }
        });

        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.pose.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
        this.ready = true;
    }

    // Key landmark indices for pose control
    // 11: left shoulder, 12: right shoulder
    // 13: left elbow, 14: right elbow
    // 15: left wrist, 16: right wrist
    // 23: left hip, 24: right hip

    getLeftWrist() {
        return this.landmarks ? this.landmarks[15] : null;
    }

    getRightWrist() {
        return this.landmarks ? this.landmarks[16] : null;
    }

    getLeftShoulder() {
        return this.landmarks ? this.landmarks[11] : null;
    }

    getRightShoulder() {
        return this.landmarks ? this.landmarks[12] : null;
    }

    getLeftElbow() {
        return this.landmarks ? this.landmarks[13] : null;
    }

    getRightElbow() {
        return this.landmarks ? this.landmarks[14] : null;
    }

    getLeftHip() {
        return this.landmarks ? this.landmarks[23] : null;
    }

    getRightHip() {
        return this.landmarks ? this.landmarks[24] : null;
    }

    // Get midpoint between two shoulders (torso center X)
    getTorsoCenter() {
        const ls = this.getLeftShoulder();
        const rs = this.getRightShoulder();
        if (!ls || !rs) return null;
        return {
            x: (ls.x + rs.x) / 2,
            y: (ls.y + rs.y) / 2
        };
    }

    isDetecting() {
        return this.landmarks !== null;
    }
}

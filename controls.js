// Maps pose data to Tetris game actions

class GameControls {
    constructor(poseDetector, game) {
        this.pose = poseDetector;
        this.game = game;

        // Smoothing buffers
        this.xHistory = [];
        this.smoothingWindow = 5;

        // Gesture cooldowns (ms)
        this.rotateLeftCooldown = 0;
        this.rotateRightCooldown = 0;
        this.dropCooldown = 0;
        this.COOLDOWN_TIME = 500;

        // Gesture state tracking
        this.leftHandWasRaised = false;
        this.rightHandWasRaised = false;
        this.handsWerePushedDown = false;

        // Raise both hands to start/restart
        this.bothHandsRaisedTimer = 0;
        this.HANDS_RAISED_DURATION = 1000; // hold for 1 second

        // Move speed limiter
        this.lastMoveTime = 0;
        this.MOVE_INTERVAL = 80; // ms between moves
    }

    update(timestamp) {
        if (!this.pose.isDetecting()) return;

        // Decrease cooldowns
        const dt = timestamp - (this._lastTimestamp || timestamp);
        this._lastTimestamp = timestamp;
        this.rotateLeftCooldown = Math.max(0, this.rotateLeftCooldown - dt);
        this.rotateRightCooldown = Math.max(0, this.rotateRightCooldown - dt);
        this.dropCooldown = Math.max(0, this.dropCooldown - dt);

        if (this.game.state === 'start' || this.game.state === 'gameover') {
            this._checkStartGesture(timestamp);
            return;
        }

        if (this.game.state !== 'playing') return;

        this._updateMovement(timestamp);
        this._checkRotation();
        this._checkDrop();
    }

    _smoothX(rawX) {
        this.xHistory.push(rawX);
        if (this.xHistory.length > this.smoothingWindow) {
            this.xHistory.shift();
        }
        const sum = this.xHistory.reduce((a, b) => a + b, 0);
        return sum / this.xHistory.length;
    }

    _updateMovement(timestamp) {
        if (timestamp - this.lastMoveTime < this.MOVE_INTERVAL) return;

        // Use the average X of both wrists for horizontal control
        const lw = this.pose.getLeftWrist();
        const rw = this.pose.getRightWrist();
        if (!lw || !rw) return;

        // MediaPipe x is mirrored (0=right side of screen, 1=left side)
        // Average both wrists for more stable control
        const avgX = (lw.x + rw.x) / 2;
        const smoothedX = this._smoothX(avgX);

        // Map to grid column (mirrored: low x = right side = high column)
        const targetCol = Math.round((1 - smoothedX) * (COLS - 1));
        this.game.moveTo(targetCol);
        this.lastMoveTime = timestamp;
    }

    _checkRotation() {
        const lw = this.pose.getLeftWrist();
        const rw = this.pose.getRightWrist();
        const ls = this.pose.getLeftShoulder();
        const rs = this.pose.getRightShoulder();
        if (!lw || !rw || !ls || !rs) return;

        // Left hand raised above left shoulder = rotate left
        const leftRaised = lw.y < ls.y - 0.15;
        // Right hand raised above right shoulder = rotate right
        const rightRaised = rw.y < rs.y - 0.15;

        // Trigger on transition from not-raised to raised
        if (leftRaised && !this.leftHandWasRaised && this.rotateLeftCooldown <= 0) {
            this.game.rotateLeft();
            this.rotateLeftCooldown = this.COOLDOWN_TIME;
        }

        if (rightRaised && !this.rightHandWasRaised && this.rotateRightCooldown <= 0) {
            this.game.rotateRight();
            this.rotateRightCooldown = this.COOLDOWN_TIME;
        }

        this.leftHandWasRaised = leftRaised;
        this.rightHandWasRaised = rightRaised;
    }

    _checkDrop() {
        const lw = this.pose.getLeftWrist();
        const rw = this.pose.getRightWrist();
        const lh = this.pose.getLeftHip();
        const rh = this.pose.getRightHip();
        if (!lw || !rw || !lh || !rh) return;

        // Both wrists below hips = hard drop
        const bothBelow = lw.y > lh.y + 0.05 && rw.y > rh.y + 0.05;

        if (bothBelow && !this.handsWerePushedDown && this.dropCooldown <= 0) {
            this.game.hardDrop();
            this.dropCooldown = this.COOLDOWN_TIME * 1.5;
        }

        this.handsWerePushedDown = bothBelow;
    }

    _checkStartGesture(timestamp) {
        const lw = this.pose.getLeftWrist();
        const rw = this.pose.getRightWrist();
        const ls = this.pose.getLeftShoulder();
        const rs = this.pose.getRightShoulder();
        if (!lw || !rw || !ls || !rs) {
            this.bothHandsRaisedTimer = 0;
            return;
        }

        const bothRaised = lw.y < ls.y - 0.15 && rw.y < rs.y - 0.15;

        if (bothRaised) {
            if (this.bothHandsRaisedTimer === 0) {
                this.bothHandsRaisedTimer = timestamp;
            } else if (timestamp - this.bothHandsRaisedTimer >= this.HANDS_RAISED_DURATION) {
                this.game.start();
                this.bothHandsRaisedTimer = 0;
                this.xHistory = [];
            }
        } else {
            this.bothHandsRaisedTimer = 0;
        }
    }
}

// Maps right-hand gestures to Tetris game actions

class GameControls {
    constructor(handDetector, game) {
        this.hand = handDetector;
        this.game = game;

        // Gesture cooldowns (ms)
        this.moveCooldown = 0;
        this.rotateCooldown = 0;
        this.dropCooldown = 0;
        this.MOVE_COOLDOWN_TIME = 200;
        this.ROTATE_COOLDOWN_TIME = 400;
        this.DROP_COOLDOWN_TIME = 800;

        // Previous frame state for velocity/delta detection
        this.prevWristX = null;
        this.prevWristY = null;
        this.prevHandAngle = null;

        // Thresholds
        this.SWIPE_X_THRESHOLD = 0.04;   // horizontal swipe sensitivity
        this.SWIPE_Y_THRESHOLD = 0.06;   // downward swipe sensitivity
        this.ROTATE_THRESHOLD = 0.35;     // radians (~20 degrees)

        // Start gesture
        this.handDetectedTimer = 0;
        this.HAND_DETECTED_DURATION = 1500; // hold hand visible for 1.5s to start

        this._lastTimestamp = 0;
    }

    update(timestamp) {
        if (!this.hand.isDetecting()) {
            this._resetState();
            return;
        }

        // Decrease cooldowns
        const dt = timestamp - (this._lastTimestamp || timestamp);
        this._lastTimestamp = timestamp;
        this.moveCooldown = Math.max(0, this.moveCooldown - dt);
        this.rotateCooldown = Math.max(0, this.rotateCooldown - dt);
        this.dropCooldown = Math.max(0, this.dropCooldown - dt);

        if (this.game.state === 'start' || this.game.state === 'gameover') {
            this._checkStartGesture(timestamp);
            return;
        }

        if (this.game.state !== 'playing') return;

        const wrist = this.hand.getWrist();
        const angle = this.hand.getHandAngle();
        if (!wrist) return;

        this._checkSwipeLeftRight(wrist);
        this._checkSwipeDown(wrist);
        this._checkRotation(angle);

        // Update previous state
        this.prevWristX = wrist.x;
        this.prevWristY = wrist.y;
        this.prevHandAngle = angle;
    }

    _resetState() {
        this.prevWristX = null;
        this.prevWristY = null;
        this.prevHandAngle = null;
        this.handDetectedTimer = 0;
    }

    _checkSwipeLeftRight(wrist) {
        if (this.prevWristX === null || this.moveCooldown > 0) return;

        const deltaX = wrist.x - this.prevWristX;

        // MediaPipe X is mirrored: negative deltaX = hand moved right on screen
        if (deltaX < -this.SWIPE_X_THRESHOLD) {
            this.game.moveRight();
            this.moveCooldown = this.MOVE_COOLDOWN_TIME;
        } else if (deltaX > this.SWIPE_X_THRESHOLD) {
            this.game.moveLeft();
            this.moveCooldown = this.MOVE_COOLDOWN_TIME;
        }
    }

    _checkSwipeDown(wrist) {
        if (this.prevWristY === null || this.dropCooldown > 0) return;

        const deltaY = wrist.y - this.prevWristY;

        // Positive deltaY = hand moving down
        if (deltaY > this.SWIPE_Y_THRESHOLD) {
            this.game.hardDrop();
            this.dropCooldown = this.DROP_COOLDOWN_TIME;
        }
    }

    _checkRotation(angle) {
        if (this.prevHandAngle === null || angle === null || this.rotateCooldown > 0) return;

        let deltaAngle = angle - this.prevHandAngle;

        // Normalize to [-π, π]
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        // Mirrored camera: positive delta = counter-clockwise on screen = rotate left
        if (deltaAngle > this.ROTATE_THRESHOLD) {
            this.game.rotateLeft();
            this.rotateCooldown = this.ROTATE_COOLDOWN_TIME;
        } else if (deltaAngle < -this.ROTATE_THRESHOLD) {
            this.game.rotateRight();
            this.rotateCooldown = this.ROTATE_COOLDOWN_TIME;
        }
    }

    _checkStartGesture(timestamp) {
        // Just show hand for 1.5 seconds to start
        if (this.hand.isDetecting()) {
            if (this.handDetectedTimer === 0) {
                this.handDetectedTimer = timestamp;
            } else if (timestamp - this.handDetectedTimer >= this.HAND_DETECTED_DURATION) {
                this.game.start();
                this.handDetectedTimer = 0;
                this._resetState();
            }
        } else {
            this.handDetectedTimer = 0;
        }
    }
}

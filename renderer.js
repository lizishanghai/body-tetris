// Renderer: draws webcam feed + Tetris overlay

class GameRenderer {
    constructor(canvas, videoElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.video = videoElement;

        // Grid dimensions (calculated on resize)
        this.cellSize = 0;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.gridWidth = 0;
        this.gridHeight = 0;

        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Calculate grid size to fit in center of screen
        const maxGridHeight = this.canvas.height * 0.85;
        const maxGridWidth = this.canvas.width * 0.4;

        this.cellSize = Math.floor(Math.min(maxGridHeight / ROWS, maxGridWidth / COLS));
        this.gridWidth = this.cellSize * COLS;
        this.gridHeight = this.cellSize * ROWS;
        this.gridOffsetX = Math.floor((this.canvas.width - this.gridWidth) / 2);
        this.gridOffsetY = Math.floor((this.canvas.height - this.gridHeight) / 2);
    }

    render(game, handDetector) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Draw webcam feed as background (mirrored)
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.video, 0, 0, w, h);
        ctx.restore();

        // Darken background slightly
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, w, h);

        // Draw hand landmarks
        if (handDetector.isDetecting()) {
            this._drawHand(handDetector.landmarks, handDetector.getHandAngle());
        }

        // Draw game grid background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.gridOffsetX, this.gridOffsetY, this.gridWidth, this.gridHeight);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= ROWS; r++) {
            const y = this.gridOffsetY + r * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(this.gridOffsetX, y);
            ctx.lineTo(this.gridOffsetX + this.gridWidth, y);
            ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            const x = this.gridOffsetX + c * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, this.gridOffsetY);
            ctx.lineTo(x, this.gridOffsetY + this.gridHeight);
            ctx.stroke();
        }

        // Draw placed blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (game.grid[r][c]) {
                    this._drawBlock(c, r, game.grid[r][c], 1);
                }
            }
        }

        // Draw ghost piece
        if (game.currentPiece && game.state === 'playing') {
            const ghostY = game.getGhostY();
            this._drawPiece(game.currentPiece, game.currentPiece.x, ghostY, 0.3);
        }

        // Draw current piece
        if (game.currentPiece && game.state === 'playing') {
            this._drawPiece(game.currentPiece, game.currentPiece.x, game.currentPiece.y, 1);
        }

        // Draw grid border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.gridOffsetX, this.gridOffsetY, this.gridWidth, this.gridHeight);

        // Draw HUD
        this._drawHUD(game);

        // Draw state overlays
        if (game.state === 'start') {
            this._drawOverlay('HAND TETRIS', 'Show your right hand to start', handDetector);
        } else if (game.state === 'gameover') {
            this._drawOverlay('GAME OVER', `Score: ${game.score} | Show hand to restart`, handDetector);
        }

        // Draw control labels at bottom
        this._drawControlLabels();
    }

    _drawBlock(col, row, color, alpha) {
        const ctx = this.ctx;
        const x = this.gridOffsetX + col * this.cellSize;
        const y = this.gridOffsetY + row * this.cellSize;
        const s = this.cellSize;
        const pad = 1;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x + pad, y + pad, s - pad * 2, s - pad * 2);

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + pad, y + pad, s - pad * 2, 3);
        ctx.fillRect(x + pad, y + pad, 3, s - pad * 2);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + s - pad - 3, y + pad, 3, s - pad * 2);
        ctx.fillRect(x + pad, y + s - pad - 3, s - pad * 2, 3);

        ctx.globalAlpha = 1;
    }

    _drawPiece(piece, px, py, alpha) {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    this._drawBlock(px + c, py + r, piece.color, alpha);
                }
            }
        }
    }

    _drawHUD(game) {
        const ctx = this.ctx;

        // Score - top left of grid
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${game.score}`, this.gridOffsetX, this.gridOffsetY - 30);
        ctx.fillText(`LEVEL: ${game.level}`, this.gridOffsetX, this.gridOffsetY - 10);

        // Next piece - top right of grid
        const nextX = this.gridOffsetX + this.gridWidth + 20;
        const nextY = this.gridOffsetY;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('NEXT', nextX, nextY - 5);

        if (game.nextPiece) {
            // Draw next piece preview background
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(nextX, nextY, this.cellSize * 4 + 10, this.cellSize * 4 + 10);

            const shape = game.nextPiece.shape;
            const previewCellSize = this.cellSize * 0.8;
            const offsetX = nextX + 5 + (4 - shape[0].length) * previewCellSize / 2;
            const offsetY = nextY + 5 + (4 - shape.length) * previewCellSize / 2;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        const bx = offsetX + c * previewCellSize;
                        const by = offsetY + r * previewCellSize;
                        ctx.fillStyle = game.nextPiece.color;
                        ctx.fillRect(bx + 1, by + 1, previewCellSize - 2, previewCellSize - 2);
                    }
                }
            }
        }

        // Lines cleared
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText(`LINES: ${game.linesCleared}`, nextX, nextY + this.cellSize * 4 + 30);
    }

    _drawHand(landmarks, angle) {
        if (!landmarks) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Hand connections (finger chains)
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
            [0, 5], [5, 6], [6, 7], [7, 8],       // index
            [0, 9], [9, 10], [10, 11], [11, 12],  // middle
            [0, 13], [13, 14], [14, 15], [15, 16], // ring
            [0, 17], [17, 18], [18, 19], [19, 20], // pinky
            [5, 9], [9, 13], [13, 17]              // palm
        ];

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 2;

        for (const [a, b] of connections) {
            const la = landmarks[a];
            const lb = landmarks[b];
            if (la && lb) {
                ctx.beginPath();
                ctx.moveTo(w - la.x * w, la.y * h);
                ctx.lineTo(w - lb.x * w, lb.y * h);
                ctx.stroke();
            }
        }

        // Draw all 21 landmarks
        for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            if (!lm) continue;
            const isWrist = i === 0;
            const isTip = [4, 8, 12, 16, 20].includes(i);
            ctx.fillStyle = isWrist
                ? 'rgba(255, 255, 0, 0.9)'
                : isTip
                    ? 'rgba(255, 100, 100, 0.8)'
                    : 'rgba(0, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(w - lm.x * w, lm.y * h, isWrist ? 8 : 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw hand angle indicator from wrist
        if (angle !== null) {
            const wrist = landmarks[0];
            const wx = w - wrist.x * w;
            const wy = wrist.y * h;
            const indicatorLen = 40;
            // Mirror the angle for display
            const displayAngle = Math.PI - angle;
            const ex = wx + Math.cos(displayAngle) * indicatorLen;
            const ey = wy - Math.sin(displayAngle) * indicatorLen;

            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(ex, ey, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawOverlay(title, subtitle, handDetector) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(title, w / 2, h / 2 - 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.fillText(subtitle, w / 2, h / 2 + 20);

        if (!handDetector.isDetecting()) {
            ctx.fillStyle = '#ff6666';
            ctx.font = '16px monospace';
            ctx.fillText('Waiting for hand...', w / 2, h / 2 + 60);
        } else {
            ctx.fillStyle = '#66ff66';
            ctx.font = '16px monospace';
            ctx.fillText('Hand detected!', w / 2, h / 2 + 60);
        }
    }

    _drawControlLabels() {
        const ctx = this.ctx;
        const y = this.gridOffsetY + this.gridHeight + 30;
        const centerX = this.canvas.width / 2;
        const spacing = 140;

        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';

        const labels = [
            { text: '[MOVE]', x: centerX - spacing, desc: 'Swipe Left/Right' },
            { text: '[DROP]', x: centerX, desc: 'Swipe Down' },
            { text: '[ROTATE]', x: centerX + spacing, desc: 'Twist Hand' }
        ];

        for (const label of labels) {
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            const tw = ctx.measureText(label.text).width;
            ctx.fillRect(label.x - tw / 2 - 8, y - 14, tw + 16, 22);

            // Text
            ctx.fillStyle = '#00ff00';
            ctx.fillText(label.text, label.x, y);

            // Description
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '11px monospace';
            ctx.fillText(label.desc, label.x, y + 18);
            ctx.font = 'bold 14px monospace';
        }
    }
}

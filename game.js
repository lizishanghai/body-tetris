// Tetris Game Engine

const COLS = 10;
const ROWS = 20;

const TETROMINOES = {
    I: { shape: [[1,1,1,1]], color: '#00f0f0' },
    O: { shape: [[1,1],[1,1]], color: '#f0f000' },
    T: { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
    S: { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
    Z: { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
    J: { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
    L: { shape: [[0,0,1],[1,1,1]], color: '#f0a000' }
};

const PIECE_NAMES = Object.keys(TETROMINOES);

class TetrisGame {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.currentPiece = null;
        this.nextPiece = null;
        this.state = 'start'; // start, playing, paused, gameover
        this.dropTimer = 0;
        this.lastUpdate = 0;
        this.reset();
    }

    reset() {
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.dropTimer = 0;
        this.currentPiece = null;
        this.nextPiece = this._randomPiece();
        this.spawnPiece();
    }

    _randomPiece() {
        const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
        const t = TETROMINOES[name];
        return {
            name,
            shape: t.shape.map(row => [...row]),
            color: t.color,
            x: 0,
            y: 0
        };
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this._randomPiece();
        this.currentPiece.x = Math.floor((COLS - this.currentPiece.shape[0].length) / 2);
        this.currentPiece.y = 0;

        if (this._collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
            this.state = 'gameover';
        }
    }

    _collides(shape, px, py) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = px + c;
                const ny = py + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && this.grid[ny][nx]) return true;
            }
        }
        return false;
    }

    moveLeft() {
        if (this.state !== 'playing' || !this.currentPiece) return;
        if (!this._collides(this.currentPiece.shape, this.currentPiece.x - 1, this.currentPiece.y)) {
            this.currentPiece.x--;
        }
    }

    moveRight() {
        if (this.state !== 'playing' || !this.currentPiece) return;
        if (!this._collides(this.currentPiece.shape, this.currentPiece.x + 1, this.currentPiece.y)) {
            this.currentPiece.x++;
        }
    }

    moveDown() {
        if (this.state !== 'playing' || !this.currentPiece) return false;
        if (!this._collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            return true;
        }
        this._lockPiece();
        return false;
    }

    hardDrop() {
        if (this.state !== 'playing' || !this.currentPiece) return;
        let dropDistance = 0;
        while (!this._collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this._lockPiece();
    }

    rotateLeft() {
        if (this.state !== 'playing' || !this.currentPiece) return;
        this._rotate(-1);
    }

    rotateRight() {
        if (this.state !== 'playing' || !this.currentPiece) return;
        this._rotate(1);
    }

    _rotate(direction) {
        const piece = this.currentPiece;
        const oldShape = piece.shape;
        const rows = oldShape.length;
        const cols = oldShape[0].length;
        const newShape = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (direction === 1) {
                    newShape[c][rows - 1 - r] = oldShape[r][c];
                } else {
                    newShape[cols - 1 - c][r] = oldShape[r][c];
                }
            }
        }

        // Wall kick: try offsets 0, -1, +1, -2, +2
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
            if (!this._collides(newShape, piece.x + kick, piece.y)) {
                piece.shape = newShape;
                piece.x += kick;
                return;
            }
        }
    }

    _lockPiece() {
        const piece = this.currentPiece;
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (!piece.shape[r][c]) continue;
                const ny = piece.y + r;
                const nx = piece.x + c;
                if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                    this.grid[ny][nx] = piece.color;
                }
            }
        }
        this._clearLines();
        this.spawnPiece();
    }

    _clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every(cell => cell !== null)) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill(null));
                cleared++;
                r++; // re-check this row
            }
        }
        if (cleared > 0) {
            const points = [0, 100, 300, 500, 800];
            this.score += (points[cleared] || 800) * this.level;
            this.linesCleared += cleared;
            this.level = Math.floor(this.linesCleared / 10) + 1;
        }
    }

    getDropInterval() {
        // Speed increases with level
        return Math.max(100, 1000 - (this.level - 1) * 80);
    }

    getGhostY() {
        if (!this.currentPiece) return 0;
        let ghostY = this.currentPiece.y;
        while (!this._collides(this.currentPiece.shape, this.currentPiece.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    // Move piece to a specific column (for arm tracking)
    moveTo(targetCol) {
        if (this.state !== 'playing' || !this.currentPiece) return;
        const pieceWidth = this.currentPiece.shape[0].length;
        const clampedCol = Math.max(0, Math.min(COLS - pieceWidth, targetCol));
        // Move one step at a time towards target
        if (this.currentPiece.x < clampedCol) {
            this.moveRight();
        } else if (this.currentPiece.x > clampedCol) {
            this.moveLeft();
        }
    }

    update(timestamp) {
        if (this.state !== 'playing') return;
        if (!this.lastUpdate) this.lastUpdate = timestamp;

        this.dropTimer += timestamp - this.lastUpdate;
        this.lastUpdate = timestamp;

        if (this.dropTimer >= this.getDropInterval()) {
            this.dropTimer = 0;
            this.moveDown();
        }
    }

    start() {
        this.state = 'playing';
        this.reset();
        this.lastUpdate = 0;
        this.dropTimer = 0;
    }
}

// Main entry point

(async function () {
    const canvas = document.getElementById('gameCanvas');
    const video = document.getElementById('webcam');

    const game = new TetrisGame();
    const poseDetector = new PoseDetector();
    const renderer = new GameRenderer(canvas, video);
    const controls = new GameControls(poseDetector, game);

    // Also allow keyboard controls for testing
    document.addEventListener('keydown', (e) => {
        if (game.state === 'start' || game.state === 'gameover') {
            if (e.key === 'Enter') game.start();
            return;
        }
        if (game.state !== 'playing') return;
        switch (e.key) {
            case 'ArrowLeft': game.moveLeft(); break;
            case 'ArrowRight': game.moveRight(); break;
            case 'ArrowDown': game.moveDown(); break;
            case 'ArrowUp': game.rotateRight(); break;
            case 'z': case 'Z': game.rotateLeft(); break;
            case ' ': game.hardDrop(); break;
        }
    });

    // Game loop
    function loop(timestamp) {
        controls.update(timestamp);
        game.update(timestamp);
        renderer.render(game, poseDetector);
        requestAnimationFrame(loop);
    }

    // Start render loop immediately (shows start screen)
    requestAnimationFrame(loop);

    // Initialize pose detection
    try {
        await poseDetector.init(video);
        console.log('Pose detection initialized');
    } catch (err) {
        console.error('Failed to initialize pose detection:', err);
        // Game still works with keyboard controls
    }
})();

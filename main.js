// Initialize the Canvas 2D context
const canvas = document.getElementById('glcanvas');
const ctx = canvas.getContext('2d');

if (!ctx) {
    console.error('Canvas 2D context not supported in this browser!');
    alert('Canvas 2D context not supported in this browser!');
} else {
    console.log('Canvas 2D context initialized');
}

// Set the canvas size to match the window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let bars = [];
let audioContext, analyser, audio, source;
let isPlaying = false;
let animationFrameId;

let frequencyData = new Uint8Array(0);
const fallingShapes = [];
const particles = [];
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

const message = "ALL YOU TOUCH AND ALL YOU SEE IS ALL YOUR LIFE WILL EVER BE";
const letterSize = 18;
const messageWidth = message.length * letterSize
const startX = centerX - messageWidth / 2;

const initialLetters = message.split('').map((char, index) => ({
    x: startX + index * letterSize,
    y: centerY - 50,
    size: letterSize,
    color: 'white',
    letter: char,
    speedX: 0,
    speedY: 0,
    rotation: 0,
    rotationSpeed: 0
}));

let letters = JSON.parse(JSON.stringify(initialLetters));

const colorsGradient = [
    { r: 75, g: 0, b: 130 }, // indigo
    { r: 138, g: 43, b: 226 }, // violet
    { r: 0, g: 0, b: 255 }     // blue
];

const defaultAmplitudeRatio = 0.5; // Default amplitude ratio for initial colors

const initialBouncingShapes = [
    { x: centerX - 60, y: centerY, speedX: (Math.random() - 0.5) * 4, speedY: (Math.random() - 0.5) * 4, radius: 15, color: getColorFromAmplitude(defaultAmplitudeRatio), shape: 'play', rotation: 0 },
    { x: centerX, y: centerY, speedX: (Math.random() - 0.5) * 4, speedY: (Math.random() - 0.5) * 4, radius: 15, color: getColorFromAmplitude(defaultAmplitudeRatio), shape: 'pause', rotation: 0 },
    { x: centerX + 60, y: centerY, speedX: (Math.random() - 0.5) * 4, speedY: (Math.random() - 0.5) * 4, radius: 15, color: getColorFromAmplitude(defaultAmplitudeRatio), shape: 'stop', rotation: 0 }
];
let bouncingShapes = JSON.parse(JSON.stringify(initialBouncingShapes));

function interpolateColor(color1, color2, factor) {
    const result = {
        r: Math.round(color1.r + factor * (color2.r - color1.r)),
        g: Math.round(color1.g + factor * (color2.g - color1.g)),
        b: Math.round(color1.b + factor * (color2.b - color1.b))
    };
    return `rgb(${result.r}, ${result.g}, ${result.b})`;
}

function getColorFromAmplitude(amplitudeRatio) {
    if (amplitudeRatio <= 0.5) {
        return interpolateColor(colorsGradient[0], colorsGradient[1], amplitudeRatio * 2);
    } else {
        return interpolateColor(colorsGradient[1], colorsGradient[2], (amplitudeRatio - 0.5) * 2);
    }
}

function updateBars() {
    const barWidth = (canvas.width / frequencyData.length) * 4; // Make each bar 4 times thicker
    const maxHeight = canvas.height * 0.25; // 25% of the canvas height
    bars.length = 0; // Clear existing bars

    frequencyData.forEach((value, index) => {
        const barHeight = (value / 255) * maxHeight; // Scale bar height to 75% of canvas height
        const x = index * barWidth;
        const y = canvas.height - barHeight;
        const amplitudeRatio = value / 255;
        const color = getColorFromAmplitude(amplitudeRatio); // Use the color gradient
        bars.push({ x, y, width: barWidth, height: barHeight, color });
    });
}

function createFallingShape(speedMultiplier, sizeMultiplier, amplitudeRatio) {
    const size = (Math.random() * 4) * sizeMultiplier; // Adjust size based on amplitude
    const x = Math.random() * canvas.width;
    const y = 0;
    const color = getColorFromAmplitude(amplitudeRatio); // Use the color gradient
    const speedY = (Math.random() * 3) * speedMultiplier;

    fallingShapes.push({ x, y, size, color, speedY });
}
function createParticles(parent, angle) {
    const numParticles = Math.floor(Math.random() * 5) + 5;
    for (let i = 0; i < numParticles; i++) {
        const size = parent.size / 2;
        const x = parent.x;
        const y = parent.y;
        const color = parent.color;
        const speedX = Math.cos(angle) * (Math.random() * 2);
        const speedY = Math.sin(angle) * (Math.random() * 2);

        particles.push({ x, y, size, color, speedX, speedY, life: 50 });
    }
}


const MAX_FALLING_SHAPES = 900; // Define the maximum number of falling shapes

function updateFallingShapes() {
    fallingShapes.forEach((shape, index) => {
        shape.y += shape.speedY; // Update shape position
        // Check for collision with bars
        bars.forEach(bar => {
            if (shape.x > bar.x && shape.x < bar.x + bar.width && shape.y + shape.size > bar.y) {
                const dx = shape.x - (bar.x + bar.width / 2);
                const dy = shape.y - bar.y;
                createParticles(shape, Math.atan2(dy, dx)); // Create particles on collision
                fallingShapes.splice(index, 1); // Remove the shape on collision
            }
        });

        // Check for collision with the floor
        if (shape.y + shape.size >= canvas.height) {
            createParticles(shape, Math.PI / 2); // Create particles when it hits the bottom
            fallingShapes.splice(index, 1); // Remove the shape when it hits the bottom
        }

        // Check for collision with pause, play, and stop symbols
        bouncingShapes.forEach(symbol => {
            const dx = shape.x - symbol.x;
            const dy = shape.y - symbol.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < shape.size + symbol.radius) {
                createParticles(shape, Math.atan2(dy, dx)); // Create particles on collision
                fallingShapes.splice(index, 1); // Remove the shape on collision
            }
        });
    });
}

function updateBouncingShapes(amplitudeRatio) {
    bouncingShapes.forEach((shape, index) => {
        // Update the color based on the amplitude ratio
        shape.color = getColorFromAmplitude(amplitudeRatio);

        // Check for collision with canvas borders
        if (shape.x - shape.radius < 0 || shape.x + shape.radius > canvas.width) {
            shape.speedX = -shape.speedX;
        }
        if (shape.y - shape.radius < 0 || shape.y + shape.radius > canvas.height) {
            shape.speedY = -shape.speedY;
        }

        // Check for collision with other bouncing shapes
        for (let j = index + 1; j < bouncingShapes.length; j++) {
            const otherShape = bouncingShapes[j];
            const dx = shape.x - otherShape.x;
            const dy = shape.y - otherShape.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < shape.radius + otherShape.radius) {
                // Simple elastic collision response
                const angle = Math.atan2(dy, dx);
                const speed1 = Math.sqrt(shape.speedX * shape.speedX + shape.speedY * shape.speedY);
                const speed2 = Math.sqrt(otherShape.speedX * otherShape.speedX + otherShape.speedY * otherShape.speedY);

                shape.speedX = speed2 * Math.cos(angle);
                shape.speedY = speed2 * Math.sin(angle);
                otherShape.speedX = speed1 * Math.cos(angle + Math.PI);
                otherShape.speedY = speed1 * Math.sin(angle + Math.PI);
            }
        }

        // Check for collision with bars
        bars.forEach(bar => {
            if (shape.x > bar.x && shape.x < bar.x + bar.width && shape.y + shape.radius > bar.y) {
                shape.speedY = -shape.speedY; // Bounce off the bar
            }
        });
    });
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.speedY += 0.1; // Gravity effect
        particle.life -= 1;

        if (particle.life <= 0) {
            particles.splice(index, 1); // Remove the particle when its life ends
        }
    });
}

function updateLetters() {
    letters.forEach(letter => {
        // Find the corresponding bar based on the letter's x position
        const barIndex = Math.floor(letter.x / (canvas.width / frequencyData.length));
        if (barIndex >= 0 && barIndex < bars.length) {
            letter.color = bars[barIndex].color;
        }
    });
}

function drawShape(x, y, size, shape, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    switch (shape) {
        case 'play':
            ctx.moveTo(-size, -size);
            ctx.lineTo(size, 0);
            ctx.lineTo(-size, size);
            ctx.closePath();
            break;
        case 'pause':
            ctx.rect(-size / 2 - 5, -size, 10, size * 2);
            ctx.rect(size / 2 - 5, -size, 10, size * 2);
            break;
        case 'stop':
            ctx.rect(-size, -size, size * 2, size * 2);
            break;
        case 'circle':
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            break;
        case 'triangle':
            ctx.moveTo(-size, size);
            ctx.lineTo(size, size);
            ctx.lineTo(0, -size);
            ctx.closePath();
            break;
        case 'square':
            ctx.rect(-size, -size, size * 2, size * 2);
            break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawLetter(x, y, size, letter, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.font = `${size}px Arial`;
    ctx.fillText(letter, -size / 2, size / 2);
    ctx.restore();
}

function renderBars() {
    bars.forEach(bar => {
        ctx.fillStyle = bar.color;
        ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
    });
}

function renderFallingShapes() {
    fallingShapes.forEach(shape => {
        ctx.fillStyle = shape.color;
        drawShape(shape.x, shape.y, shape.size, 'circle', 0);
    });
}

function renderParticles() {
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        drawShape(particle.x, particle.y, particle.size, 'circle', 0);
    });
}

function drawLetters() {
    letters.forEach(letter => {
        ctx.fillStyle = letter.color;
        drawLetter(letter.x, letter.y, letter.size, letter.letter, letter.rotation);
    });
}

function drawBouncingShapes() {
    bouncingShapes.forEach(shape => {
        ctx.fillStyle = shape.color;
        drawShape(shape.x, shape.y, shape.radius, shape.shape, shape.rotation);
    });
}

function startAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        audio = new Audio('breathe.mp3');  // Replace with your file
        audio.crossOrigin = 'anonymous';

        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // Initialize frequencyData with the correct size
        frequencyData = new Uint8Array(analyser.frequencyBinCount);

        // Add event listener for the ended event
        audio.addEventListener('ended', onAudioEnded);
    }

    letters.forEach(letter => {
        letter.speedX = (Math.random() - 0.5) * 2;
        letter.speedY = (Math.random() - 0.5) * 2;
        letter.rotationSpeed = (Math.random() - 0.5) * 0.1;
    });

    audio.play().then(() => {
        console.log('Audio is playing');
        isPlaying = true;
        render();
    }).catch(error => {
        console.error('Audio play error:', error);
    });
}

function onAudioEnded() {
    console.log('Audio has ended');
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    fallingShapes.length = 0;
    particles.length = 0;

    // Define the new message
    const newMessage = "AND IN THE END ALL THATS LEFT IS DUST AND REGRETS";
    const letterSize = 18;
    const letterSpacing = 18; // Adjust the spacing between letters if needed
    const messageWidth = newMessage.length * letterSpacing;
    const startX = centerX - messageWidth / 2;

    // Update the initialLetters array with the new message
    const newInitialLetters = newMessage.split('').map((char, index) => ({
        x: startX + index * letterSpacing,
        y: centerY - 50,
        size: letterSize,
        color: 'white',
        letter: char,
        speedX: 0,
        speedY: 0,
        rotation: 0,
        rotationSpeed: 0
    }));

    // Reset the letters array to the new initialLetters
    letters = JSON.parse(JSON.stringify(newInitialLetters));
    bouncingShapes = JSON.parse(JSON.stringify(initialBouncingShapes));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBouncingShapes();
    drawLetters();
}

function pauseAudio() {
    if (audio) {
        audio.pause();
        isPlaying = false;
        cancelAnimationFrame(animationFrameId);
    }
}

function stopAudio() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        cancelAnimationFrame(animationFrameId);
        fallingShapes.length = 0;
        particles.length = 0;
        letters = JSON.parse(JSON.stringify(initialLetters));
        bouncingShapes = JSON.parse(JSON.stringify(initialBouncingShapes));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBouncingShapes();
        drawLetters();
    }
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    bouncingShapes.forEach(shape => {
        const dx = x - shape.x;
        const dy = y - shape.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < shape.radius) {
            switch (shape.shape) {
                case 'play':
                    if (!isPlaying) startAudio();
                    break;
                case 'pause':
                    if (isPlaying) pauseAudio();
                    break;
                case 'stop':
                    stopAudio();
                    break;
            }
        }
    });
});

let frameCounter = 0;


function render() {
    analyser.getByteFrequencyData(frequencyData);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxAmplitude = 255;
    const amplitude = Math.max(...frequencyData);
    const amplitudeRatio = amplitude / maxAmplitude;

    let speedMultiplier; // Adjust speed based on amplitude
    let sizeMultiplier; // Adjust size based on amplitude
    let creationAmount;
    // Determine shape creation interval based on amplitude ratio
    let shapeCreationInterval;
    if (amplitudeRatio > 0.85) {
        speedMultiplier = 5;
        sizeMultiplier = 1.5;
        creationAmount = 3;
        shapeCreationInterval = 1; // High amplitude: create up to 2 shapes per frame
        frameCounter++;
    } else if (amplitudeRatio > 0.65) {
        speedMultiplier = 3;
        sizeMultiplier = 1;
        creationAmount = 2;
        shapeCreationInterval = 6; // Mid amplitude: create 1 shape every 4 frames
        frameCounter++;
    } else if (amplitudeRatio > 0.45) {
        speedMultiplier = 1;
        sizeMultiplier = 0.5;
        creationAmount = 1;
        shapeCreationInterval = 12; // Low amplitude: create 1 shape every 8 frames
        frameCounter++;
    }

    // Create falling shapes based on the calculated interval
    if (fallingShapes.length < MAX_FALLING_SHAPES && (frameCounter % shapeCreationInterval === 0)) {
        for (let i = 0; i < creationAmount; i++) {
            createFallingShape(speedMultiplier, sizeMultiplier, amplitudeRatio);
        }
        frameCounter = 0;
    }

    updateBars();
    updateFallingShapes(speedMultiplier);
    updateParticles();
    updateLetters();
    renderFallingShapes();
    renderParticles();
    updateBouncingShapes(amplitudeRatio); // Pass the amplitude ratio
    drawBouncingShapes();
    drawLetters();
    renderBars();

    animationFrameId = requestAnimationFrame(render);
}
// Initial draw of bouncing shapes and letters
drawBouncingShapes();
drawLetters();
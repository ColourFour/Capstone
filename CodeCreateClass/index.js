const gameBoard = document.querySelector("#gameBoard");
const ctx = gameBoard.getContext("2d");
const scoreText = document.querySelector("#scoreText");
const resetBtn = document.querySelector("#resetBtn"); // needed #

const gameWidth = gameBoard.width;
const gameHeight = gameBoard.height; // fix typo (gameBoard, not gameboard)

const boardBackground = "black";
const snakeColor = "gold";
const snakeBorder = "white";
const foodColor = "green";
const unitSize = 25;

let running = false;
let xVelocity = unitSize;  // moving right initially
let yVelocity = 0;
let foodX;
let foodY;
let score = 0;
let speed = 300;
let snake = [
    { x: unitSize * 4, y: 0 },
    { x: unitSize * 3, y: 0 },
    { x: unitSize * 2, y: 0 },
    { x: unitSize,     y: 0 },
    { x: 0,            y: 0 }
];

window.addEventListener("keydown", changeDirection);
resetBtn.addEventListener("click", resetGame);

gameStart();

function gameStart() {
    running = true;
    score = 0;
    speed = 300;
    scoreText.textContent = score;
    xVelocity = unitSize;
    yVelocity = 0;
    createFood();
    nextTick();
}

function nextTick() {
    if (running) {
        setTimeout(() => {
            clearBoard();
            drawFood();
            moveSnake();
            drawSnake();
            checkGameOver();
            nextTick();
        }, speed);
    } else {
        displayGameOver();
    }
}

function clearBoard() {
    ctx.fillStyle = boardBackground;
    ctx.fillRect(0, 0, gameWidth, gameHeight); // fix fillRect spelling
}

function createFood() {
    function randomFood(min, max) {
        const randNum =
            Math.round((Math.random() * (max - min) + min) / unitSize) *
            unitSize;
        return randNum;
    }
    foodX = randomFood(0, gameWidth - unitSize);
    foodY = randomFood(0, gameHeight - unitSize); // use gameHeight for Y
}

function drawFood() {
    ctx.fillStyle = foodColor;
    ctx.fillRect(foodX, foodY, unitSize, unitSize);
}

function moveSnake() {
    const head = {
        x: snake[0].x + xVelocity,
        y: snake[0].y + yVelocity
    };

    // add new head
    snake.unshift(head);

    // check if food eaten
    if (head.x === foodX && head.y === foodY) {
        score += 1;
        scoreText.textContent = score;
        updateSpeed();
        createFood();
    } else {
        // remove tail if no food
        snake.pop();
    }
}

function drawSnake() {
    ctx.fillStyle = snakeColor;
    ctx.strokeStyle = snakeBorder;
    snake.forEach(snakePart => {
        ctx.fillRect(snakePart.x, snakePart.y, unitSize, unitSize);
        ctx.strokeRect(snakePart.x, snakePart.y, unitSize, unitSize);
    });
}

function changeDirection(event) {
    const keyPressed = event.key; // 'ArrowUp', 'ArrowDown', etc.

    const goingUp = yVelocity === -unitSize;
    const goingDown = yVelocity === unitSize;
    const goingRight = xVelocity === unitSize;
    const goingLeft = xVelocity === -unitSize;

    switch (keyPressed) {
        case "ArrowLeft":
            if (!goingRight) {
                xVelocity = -unitSize;
                yVelocity = 0;
            }
            break;
        case "ArrowRight":
            if (!goingLeft) {
                xVelocity = unitSize;
                yVelocity = 0;
            }
            break;
        case "ArrowUp":
            if (!goingDown) {
                xVelocity = 0;
                yVelocity = -unitSize;
            }
            break;
        case "ArrowDown":
            if (!goingUp) {
                xVelocity = 0;
                yVelocity = unitSize;
            }
            break;
    }
}

function checkGameOver() {
    const head = snake[0];

    // wall collision
    if (
        head.x < 0 ||
        head.x >= gameWidth ||
        head.y < 0 ||
        head.y >= gameHeight
    ) {
        running = false;
        return;
    }

    // self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            running = false;
            return;
        }
    }
}

function displayGameOver() {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", gameWidth / 2, gameHeight / 2);
}

function resetGame() {
    snake = [
        { x: unitSize * 4, y: 0 },
        { x: unitSize * 3, y: 0 },
        { x: unitSize * 2, y: 0 },
        { x: unitSize,     y: 0 },
        { x: 0,            y: 0 }
    ];
    gameStart();
}

function updateSpeed() {
    speed = speed - 25;
    if (speed < 25){
        speed = 25}
}
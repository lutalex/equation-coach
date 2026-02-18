import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GRID_SIZE = 16;
const GAME_TICK_MS = 150;
const AUTO_EXIT_SECONDS = 120;

const DIRECTION_TO_VECTOR = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE_DIRECTION = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right"
};

const INITIAL_SNAKE = [
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnFood(snake) {
  if (snake.length >= GRID_SIZE * GRID_SIZE) {
    return snake[0];
  }

  const occupied = new Set(snake.map((segment) => `${segment.x}:${segment.y}`));
  let next = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) };

  while (occupied.has(`${next.x}:${next.y}`)) {
    next = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) };
  }

  return next;
}

function createInitialGame() {
  const initialSnake = INITIAL_SNAKE.map((segment) => ({ ...segment }));
  return {
    snake: initialSnake,
    food: spawnFood(initialSnake),
    score: 0,
    gameOver: false
  };
}

function directionByTouch(clientX, clientY, width, height) {
  const dx = clientX - width / 2;
  const dy = clientY - height / 2;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "up" : "down";
}

export default function SnakeGame({ onExit }) {
  const [game, setGame] = useState(() => createInitialGame());
  const [secondsLeft, setSecondsLeft] = useState(AUTO_EXIT_SECONDS);
  const directionRef = useRef("right");
  const gameOverRef = useRef(false);

  useEffect(() => {
    gameOverRef.current = game.gameOver;
  }, [game.gameOver]);

  const setDirection = useCallback((nextDirection) => {
    if (!nextDirection) return;
    if (gameOverRef.current) return;
    if (OPPOSITE_DIRECTION[nextDirection] === directionRef.current) return;
    directionRef.current = nextDirection;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const nextDirection = KEY_TO_DIRECTION[event.key];
      if (!nextDirection) return;
      event.preventDefault();
      setDirection(nextDirection);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setDirection]);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setGame((prev) => {
        if (prev.gameOver) {
          return prev;
        }

        const head = prev.snake[0];
        const vector = DIRECTION_TO_VECTOR[directionRef.current];
        const nextHead = {
          x: head.x + vector.x,
          y: head.y + vector.y
        };

        const hitWall =
          nextHead.x < 0 ||
          nextHead.y < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y >= GRID_SIZE;

        const ateFood = nextHead.x === prev.food.x && nextHead.y === prev.food.y;
        const bodyToCheck = ateFood ? prev.snake : prev.snake.slice(0, -1);
        const hitBody = bodyToCheck.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        );

        if (hitWall || hitBody) {
          return { ...prev, gameOver: true };
        }

        const nextSnake = [nextHead, ...prev.snake];
        if (!ateFood) {
          nextSnake.pop();
        }

        return {
          snake: nextSnake,
          food: ateFood ? spawnFood(nextSnake) : prev.food,
          score: ateFood ? prev.score + 1 : prev.score,
          gameOver: false
        };
      });
    }, GAME_TICK_MS);

    return () => window.clearInterval(tickId);
  }, []);

  useEffect(() => {
    const countdownId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const exitId = window.setTimeout(() => {
      onExit();
    }, AUTO_EXIT_SECONDS * 1000);

    return () => {
      window.clearInterval(countdownId);
      window.clearTimeout(exitId);
    };
  }, [onExit]);

  const handleTouchStart = (event) => {
    if (event.touches.length === 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    const touch = event.touches[0];
    const nextDirection = directionByTouch(
      touch.clientX,
      touch.clientY,
      window.innerWidth,
      window.innerHeight
    );
    setDirection(nextDirection);
  };

  const restartGame = () => {
    directionRef.current = "right";
    setGame(createInitialGame());
  };

  const snakeCells = useMemo(() => {
    return new Set(game.snake.map((segment) => `${segment.x}:${segment.y}`));
  }, [game.snake]);

  const head = game.snake[0];
  const headKey = `${head.x}:${head.y}`;
  const foodKey = `${game.food.x}:${game.food.y}`;

  return (
    <div className="snake-page" onTouchStart={handleTouchStart}>
      <div className="snake-card">
        <header className="snake-header">
          <div>
            <h1>Змейка</h1>
            <p>Счёт: {game.score}</p>
          </div>
          <button className="snake-exit-btn" type="button" onClick={onExit}>
            К уравнениям
          </button>
        </header>

        <p className="snake-timer">Автовозврат через: {secondsLeft} сек</p>

        <div className="snake-board" style={{ "--snake-grid-size": GRID_SIZE }}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const key = `${x}:${y}`;
            const isSnake = snakeCells.has(key);
            const isHead = key === headKey;
            const isFood = key === foodKey;

            const className = [
              "snake-cell",
              isSnake ? "snake-cell-body" : "",
              isHead ? "snake-cell-head" : "",
              isFood ? "snake-cell-food" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return <div key={key} className={className} />;
          })}
        </div>

        <p className="snake-help">
          Клавиатура: стрелки. Мобильный режим: верх/низ/лево/право по области экрана.
        </p>

        {game.gameOver && (
          <div className="snake-overlay">
            <h2>Игра окончена</h2>
            <p>Финальный счёт: {game.score}</p>
            <div className="snake-overlay-actions">
              <button className="snake-restart-btn" type="button" onClick={restartGame}>
                Начать заново
              </button>
              <button className="snake-exit-btn" type="button" onClick={onExit}>
                К уравнениям
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

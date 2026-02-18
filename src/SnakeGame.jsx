import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GRID_SIZE = 16;
const GAME_TICK_MS_CLASSIC = 150;
const GAME_TICK_MS_SPECIAL = 170;
const AUTO_EXIT_SECONDS = 120;

const SNAKE_MODES = {
  CLASSIC: "classic",
  SPECIAL: "special"
};

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

function toCellKey(cell) {
  return `${cell.x}:${cell.y}`;
}

function isSameCell(first, second) {
  if (!first || !second) return false;
  return first.x === second.x && first.y === second.y;
}

function cloneSnake(snake) {
  return snake.map((segment) => ({ ...segment }));
}

function createHorizontalWall(y, fromX, toX, gaps = []) {
  const gapSet = new Set(gaps);
  const wall = [];
  for (let x = fromX; x <= toX; x += 1) {
    if (gapSet.has(x)) continue;
    wall.push({ x, y });
  }
  return wall;
}

function createVerticalWall(x, fromY, toY, gaps = []) {
  const gapSet = new Set(gaps);
  const wall = [];
  for (let y = fromY; y <= toY; y += 1) {
    if (gapSet.has(y)) continue;
    wall.push({ x, y });
  }
  return wall;
}

const SPECIAL_LAYOUTS = [
  {
    walls: [
      ...createHorizontalWall(3, 1, 14, [7]),
      ...createVerticalWall(10, 5, 13, [9])
    ],
    food: { x: 13, y: 1 },
    exit: { x: 1, y: 14 }
  },
  {
    walls: [
      ...createVerticalWall(5, 1, 14, [6]),
      ...createHorizontalWall(10, 7, 14, [11])
    ],
    food: { x: 14, y: 12 },
    exit: { x: 1, y: 1 }
  },
  {
    walls: [
      ...createHorizontalWall(5, 2, 13, [4, 10]),
      ...createHorizontalWall(11, 2, 13, [8]),
      ...createVerticalWall(8, 1, 4, [2])
    ],
    food: { x: 12, y: 13 },
    exit: { x: 2, y: 1 }
  },
  {
    walls: [
      ...createVerticalWall(12, 2, 14, [7]),
      ...createHorizontalWall(7, 1, 10, [4]),
      ...createVerticalWall(3, 9, 14, [11])
    ],
    food: { x: 1, y: 12 },
    exit: { x: 14, y: 2 }
  }
];

function spawnFood(snake, blockedCells = []) {
  if (snake.length >= GRID_SIZE * GRID_SIZE) {
    return snake[0];
  }

  const occupied = new Set([
    ...snake.map((segment) => toCellKey(segment)),
    ...blockedCells.map((segment) => toCellKey(segment))
  ]);
  let next = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) };

  while (occupied.has(toCellKey(next))) {
    next = { x: randomInt(0, GRID_SIZE - 1), y: randomInt(0, GRID_SIZE - 1) };
  }

  return next;
}

function createClassicGame(score = 0) {
  const initialSnake = cloneSnake(INITIAL_SNAKE);
  return {
    snake: initialSnake,
    food: spawnFood(initialSnake),
    score,
    gameOver: false,
    walls: [],
    exit: null,
    phase: "food",
    level: 1
  };
}

function createSpecialGame(level = 1, score = 0) {
  const initialSnake = cloneSnake(INITIAL_SNAKE);
  const layout = SPECIAL_LAYOUTS[(level - 1) % SPECIAL_LAYOUTS.length];

  return {
    snake: initialSnake,
    food: { ...layout.food },
    score,
    gameOver: false,
    walls: layout.walls.map((cell) => ({ ...cell })),
    exit: { ...layout.exit },
    phase: "food",
    level
  };
}

function createGameByMode(mode) {
  if (mode === SNAKE_MODES.SPECIAL) {
    return createSpecialGame(1, 0);
  }
  return createClassicGame(0);
}

function directionByTouch(clientX, clientY, width, height) {
  const dx = clientX - width / 2;
  const dy = clientY - height / 2;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "up" : "down";
}

function stepClassicGame(prev, direction) {
  const head = prev.snake[0];
  const vector = DIRECTION_TO_VECTOR[direction];
  const nextHead = {
    x: head.x + vector.x,
    y: head.y + vector.y
  };

  const hitWallBoundary =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y >= GRID_SIZE;

  const ateFood = isSameCell(nextHead, prev.food);
  const bodyToCheck = ateFood ? prev.snake : prev.snake.slice(0, -1);
  const hitBody = bodyToCheck.some((segment) => isSameCell(segment, nextHead));

  if (hitWallBoundary || hitBody) {
    return { ...prev, gameOver: true };
  }

  const nextSnake = [nextHead, ...prev.snake];
  if (!ateFood) {
    nextSnake.pop();
  }

  return {
    ...prev,
    snake: nextSnake,
    food: ateFood ? spawnFood(nextSnake) : prev.food,
    score: ateFood ? prev.score + 1 : prev.score
  };
}

function stepSpecialGame(prev, direction) {
  const head = prev.snake[0];
  const vector = DIRECTION_TO_VECTOR[direction];
  const nextHead = {
    x: head.x + vector.x,
    y: head.y + vector.y
  };

  const hitWallBoundary =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y >= GRID_SIZE;

  const wallSet = new Set(prev.walls.map((cell) => toCellKey(cell)));
  const hitObstacle = wallSet.has(toCellKey(nextHead));
  const ateFood = prev.phase === "food" && isSameCell(nextHead, prev.food);
  const reachedExit = prev.phase === "exit" && isSameCell(nextHead, prev.exit);
  const bodyToCheck = ateFood ? prev.snake : prev.snake.slice(0, -1);
  const hitBody = bodyToCheck.some((segment) => isSameCell(segment, nextHead));

  if (hitWallBoundary || hitObstacle || hitBody) {
    return { ...prev, gameOver: true };
  }

  const nextSnake = [nextHead, ...prev.snake];
  if (!ateFood) {
    nextSnake.pop();
  }

  if (ateFood) {
    return {
      ...prev,
      snake: nextSnake,
      score: prev.score + 1,
      phase: "exit",
      food: null
    };
  }

  if (reachedExit) {
    return createSpecialGame(prev.level + 1, prev.score + 2);
  }

  return {
    ...prev,
    snake: nextSnake
  };
}

export default function SnakeGame({ mode = SNAKE_MODES.CLASSIC, onExit }) {
  const isSpecialMode = mode === SNAKE_MODES.SPECIAL;
  const [game, setGame] = useState(() => createGameByMode(mode));
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
    const tickMs = isSpecialMode ? GAME_TICK_MS_SPECIAL : GAME_TICK_MS_CLASSIC;
    const tickId = window.setInterval(() => {
      setGame((prev) => {
        if (prev.gameOver) {
          return prev;
        }

        return isSpecialMode
          ? stepSpecialGame(prev, directionRef.current)
          : stepClassicGame(prev, directionRef.current);
      });
    }, tickMs);

    return () => window.clearInterval(tickId);
  }, [isSpecialMode]);

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
    setGame(createGameByMode(mode));
  };

  const snakeCells = useMemo(() => {
    return new Set(game.snake.map((segment) => toCellKey(segment)));
  }, [game.snake]);

  const wallCells = useMemo(() => {
    return new Set(game.walls.map((segment) => toCellKey(segment)));
  }, [game.walls]);

  const head = game.snake[0];
  const headKey = toCellKey(head);
  const foodKey = game.food ? toCellKey(game.food) : "";
  const exitKey = game.exit ? toCellKey(game.exit) : "";

  const objectiveText = isSpecialMode
    ? game.phase === "food"
      ? "Цель: добраться до яблока"
      : "Цель: добраться до выхода"
    : "Цель: собирать яблоки";

  return (
    <div className={`snake-page${isSpecialMode ? " special" : ""}`} onTouchStart={handleTouchStart}>
      <div className="snake-card">
        <header className="snake-header">
          <div>
            <h1>{isSpecialMode ? "Змейка: спецрежим" : "Змейка"}</h1>
            <p>
              Счёт: {game.score}
              {isSpecialMode ? ` · Уровень: ${game.level}` : ""}
            </p>
          </div>
          <button className="snake-exit-btn" type="button" onClick={onExit}>
            К уравнениям
          </button>
        </header>

        <p className="snake-timer">Автовозврат через: {secondsLeft} сек</p>
        <p className="snake-objective">{objectiveText}</p>

        <div className="snake-board" style={{ "--snake-grid-size": GRID_SIZE }}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const key = `${x}:${y}`;
            const isWall = wallCells.has(key);
            const isSnake = snakeCells.has(key);
            const isHead = key === headKey;
            const isFood = key === foodKey;
            const isExit = isSpecialMode && game.phase === "exit" && key === exitKey;

            const className = [
              "snake-cell",
              isWall ? "snake-cell-wall" : "",
              isSnake ? "snake-cell-body" : "",
              isHead ? "snake-cell-head" : "",
              isFood ? "snake-cell-food" : "",
              isExit ? "snake-cell-exit" : ""
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
            <p>
              Финальный счёт: {game.score}
              {isSpecialMode ? ` · Уровень: ${game.level}` : ""}
            </p>
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

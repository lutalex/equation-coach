import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SnakeGame from "./SnakeGame.jsx";

const MESSAGES = [
  "Отлично получается! Продолжай!",
  "Супер! Ты на правильном пути!",
  "Круто! Математика тебе по плечу!",
  "Так держать! Еще чуть-чуть!",
  "Вот это темп! Ты молодец!"
];

const BACKGROUNDS = [
  {
    id: "standard",
    name: "Стандартный",
    cost: 0,
    className: "bg-default",
    previewClass: "preview-default"
  },
  {
    id: "new-year",
    name: "Новогодний",
    cost: 120,
    className: "bg-newyear",
    previewClass: "preview-newyear"
  },
  {
    id: "easter",
    name: "Пасхальный",
    cost: 90,
    className: "bg-easter",
    previewClass: "preview-easter"
  }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEquation() {
  const type = randomInt(0, 3);
  let text = "";
  let answer = 0;

  if (type === 0) {
    const x = randomInt(2, 20);
    const a = randomInt(2, 12);
    const product = a * x;
    const divisors = [];
    for (let d = 2; d <= 12; d += 1) {
      if (product % d === 0) divisors.push(d);
    }
    const b = divisors.length
      ? divisors[randomInt(0, divisors.length - 1)]
      : 1;
    const c = product / b;
    text = `(${a} · x) : ${b} = ${c}`;
    answer = x;
  } else if (type === 1) {
    const x = randomInt(2, 20);
    const k = randomInt(3, 12);
    const maxM = Math.max(10, k * x - 5);
    const m = randomInt(10, maxM);
    const n = k * x - m;
    text = `${k} · x - ${m} = ${n}`;
    answer = x;
  } else if (type === 2) {
    const x = randomInt(2, 20);
    const a = randomInt(20, 120);
    const b = randomInt(x, x + 80);
    const c = a + (b - x);
    text = `${a} + (${b} - x) = ${c}`;
    answer = x;
  } else {
    const x = randomInt(2, 20);
    const a = randomInt(2, x);
    const b = randomInt(40, 200);
    const c = x - a + b;
    text = `(x - ${a}) + ${b} = ${c}`;
    answer = x;
  }

  return { text, answer };
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [equation, setEquation] = useState(() => generateEquation());
  const [answer, setAnswer] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(10);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const [floating, setFloating] = useState([]);
  const [message, setMessage] = useState("");
  const [ownedBackgroundIds, setOwnedBackgroundIds] = useState(["standard"]);
  const [activeBackgroundId, setActiveBackgroundId] = useState("standard");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const pickerRef = useRef(null);

  const pointsColor = useMemo(() => {
    return currentPoints === 10 ? "var(--green)" : "var(--orange)";
  }, [currentPoints]);

  const activeBackground = useMemo(() => {
    return BACKGROUNDS.find((item) => item.id === activeBackgroundId) ?? BACKGROUNDS[0];
  }, [activeBackgroundId]);

  const availableBackgrounds = useMemo(() => {
    return BACKGROUNDS.filter((item) => ownedBackgroundIds.includes(item.id));
  }, [ownedBackgroundIds]);

  const hasThreeDigitNumber = useMemo(() => {
    return /\b\d{3}\b/.test(equation.text);
  }, [equation.text]);

  const navigateToPath = useCallback((nextPath) => {
    if (window.location.pathname === nextPath) return;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  }, []);

  const openSnakeGame = useCallback(() => {
    navigateToPath("/snake-game");
  }, [navigateToPath]);

  const returnToEquations = useCallback(() => {
    navigateToPath("/");
  }, [navigateToPath]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
        setIsShopOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const showMessage = (newScore) => {
    if (newScore > 0 && newScore % 50 === 0) {
      const pick = MESSAGES[randomInt(0, MESSAGES.length - 1)];
      setMessage(pick);
      window.setTimeout(() => setMessage(""), 2800);
    }
  };

  const spawnEmoji = (type) => {
    const id = makeId();
    const emoji = type === "success" ? "👍" : "😢";
    setFloating((prev) => [...prev, { id, emoji }]);
    window.setTimeout(() => {
      setFloating((prev) => prev.filter((item) => item.id !== id));
    }, 1900);
  };

  const resetForNext = () => {
    setEquation(generateEquation());
    setAnswer("");
    setAttempt(0);
    setCurrentPoints(10);
    setError(false);
    setShake(false);
  };

  const checkAnswer = () => {
    const normalized = answer.trim().replace(",", ".");
    const userValue = Number(normalized);
    const isCorrect = Number.isFinite(userValue) && userValue === equation.answer;

    if (isCorrect) {
      const newScore = score + currentPoints;
      setScore(newScore);
      showMessage(newScore);
      spawnEmoji("success");
      resetForNext();
      return;
    }

    if (attempt === 0) {
      setAttempt(1);
      setCurrentPoints(5);
      setError(true);
      setShake(true);
      window.setTimeout(() => {
        setError(false);
        setShake(false);
      }, 1500);
      return;
    }

    spawnEmoji("fail");
    resetForNext();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    checkAnswer();
  };

  const openShop = () => {
    setIsShopOpen(true);
    setIsPickerOpen(false);
  };

  const buyBackground = (backgroundId) => {
    const background = BACKGROUNDS.find((item) => item.id === backgroundId);
    if (!background) return;
    if (ownedBackgroundIds.includes(backgroundId)) return;
    if (score < background.cost) return;

    setScore((prev) => prev - background.cost);
    setOwnedBackgroundIds((prev) => [...prev, backgroundId]);
    setActiveBackgroundId(backgroundId);
    setIsShopOpen(false);
  };

  const handleAnswerLabelClick = () => {
    if (!hasThreeDigitNumber) return;
    openSnakeGame();
  };

  if (pathname === "/snake-game") {
    return <SnakeGame onExit={returnToEquations} />;
  }

  return (
    <div className={`app ${activeBackground.className}`}>
      <div className="background-control" ref={pickerRef}>
        <button
          className="background-toggle"
          type="button"
          onClick={() => setIsPickerOpen((prev) => !prev)}
        >
          <span className={`bg-thumb ${activeBackground.previewClass}`} />
          <span className="background-toggle-name">{activeBackground.name}</span>
          <span className={`caret${isPickerOpen ? " open" : ""}`}>▾</span>
        </button>

        {isPickerOpen && (
          <div className="background-menu">
            {availableBackgrounds.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`background-option${item.id === activeBackgroundId ? " active" : ""}`}
                onClick={() => {
                  setActiveBackgroundId(item.id);
                  setIsPickerOpen(false);
                }}
              >
                <span className={`bg-thumb ${item.previewClass}`} />
                <span className="background-option-name">{item.name}</span>
              </button>
            ))}
            <div className="menu-divider" />
            <button className="open-shop-btn" type="button" onClick={openShop}>
              Магазин
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <header className="header">
          <div>
            <h1>Тренажер уравнений</h1>
            <p className="subtitle">Решай и набирай баллы</p>
          </div>
          <div className="score">
            <span>Ваши баллы</span>
            <strong>{score}</strong>
          </div>
        </header>

        {message && <div className="message">{message}</div>}

        <div className="equation-block">
          <div className="equation">{equation.text}</div>
          <div className="points" style={{ color: pointsColor }}>
            Баллы за правильный ответ: {currentPoints}
          </div>
        </div>

        <form className="answer-form" onSubmit={handleSubmit}>
          <div className="answer-group">
            <button
              className={`answer-label answer-label-trigger${hasThreeDigitNumber ? " active" : ""}`}
              type="button"
              disabled={!hasThreeDigitNumber}
              onClick={handleAnswerLabelClick}
            >
              x =
            </button>
            <input
              className={`answer-input${error ? " error" : ""}${shake ? " shake" : ""}`}
              type="text"
              inputMode="numeric"
              placeholder="Ваш ответ"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  checkAnswer();
                }
              }}
            />
          </div>
          <button className="submit-btn" type="submit">
            Ещё, плиз!
          </button>
        </form>
      </div>

      <div className="emoji-layer">
        {floating.map((item) => (
          <div key={item.id} className="emoji">
            {item.emoji}
          </div>
        ))}
      </div>

      {isShopOpen && (
        <div className="shop-overlay" role="presentation" onClick={() => setIsShopOpen(false)}>
          <div
            className="shop-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Магазин фонов"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shop-header">
              <h2>Магазин фонов</h2>
              <button className="shop-close" type="button" onClick={() => setIsShopOpen(false)}>
                ✕
              </button>
            </div>
            <p className="shop-balance">Ваши баллы: {score}</p>

            <div className="shop-grid">
              {BACKGROUNDS.map((item) => {
                const isOwned = ownedBackgroundIds.includes(item.id);
                const canBuy = score >= item.cost;
                return (
                  <article className="shop-card" key={item.id}>
                    <span className={`shop-thumb ${item.previewClass}`} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.cost === 0 ? "Бесплатно" : `${item.cost} баллов`}</p>
                    </div>
                    {isOwned ? (
                      <button className="shop-buy-btn owned" type="button" disabled>
                        Куплено
                      </button>
                    ) : (
                      <button
                        className="shop-buy-btn"
                        type="button"
                        disabled={!canBuy}
                        onClick={() => buyBackground(item.id)}
                      >
                        {canBuy ? "Купить" : "Не хватает баллов"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

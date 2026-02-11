import React, { useMemo, useState } from "react";

const MESSAGES = [
  "Отлично получается! Продолжай!",
  "Супер! Ты на правильном пути!",
  "Круто! Математика тебе по плечу!",
  "Так держать! Еще чуть-чуть!",
  "Вот это темп! Ты молодец!"
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
  const [equation, setEquation] = useState(() => generateEquation());
  const [answer, setAnswer] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(10);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const [floating, setFloating] = useState([]);
  const [message, setMessage] = useState("");

  const pointsColor = useMemo(() => {
    return currentPoints === 10 ? "var(--green)" : "var(--orange)";
  }, [currentPoints]);

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

  return (
    <div className="app">
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
            <span className="answer-label">x =</span>
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
    </div>
  );
}

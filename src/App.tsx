// src/App.tsx
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

import { db, auth } from "./firebase";
import { onValue, ref, update } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

/* ---------- Small helpers ---------- */

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function moistureColor(value: number | null): string {
  if (value === null) return "#22c55e";
  if (value < 30) return "#f97316";
  if (value > 80) return "#0ea5e9";
  return "#22c55e";
}

/* ---------- Gauge Component ---------- */

type GaugeProps = {
  label: string;
  value: number | null;
  unit?: string;
  min: number;
  max: number;
  color?: string;
};

function Gauge({
  label,
  value,
  unit = "",
  min,
  max,
  color = "#22c55e",
}: GaugeProps) {
  const percent =
    value === null ? 0 : clamp01((value - min) / (max - min));
  const angle = -90 + 180 * percent;
  const display =
    value === null ? "--" : value.toFixed(unit === "%" ? 0 : 1);

  let hint = "";
  if (value === null) {
    hint = "Waiting for sensor data...";
  } else if (label === "Soil Moisture") {
    if (value < 30) hint = "Soil is dry – pump may turn ON in auto mode.";
    else if (value > 80) hint = "Soil is very wet – consider stopping pump.";
    else hint = "Soil moisture is in optimal range.";
  } else if (label === "Soil Temperature") {
    hint = "Monitor soil temperature for crop health.";
  } else if (label === "Surrounding Humidity") {
    hint = "Ambient humidity around your field.";
  }

  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className="gauge">
        <div className="gauge-arc" />
        <div
          className="gauge-needle"
          style={{
            transform: `translate(-50%, -4px) rotate(${angle}deg)`,
            borderLeftColor: color,
          }}
        />
        <div className="gauge-center">
          {display} {unit}
        </div>
      </div>
      <div className="gauge-scale">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {hint && <div className="gauge-hint">{hint}</div>}
    </div>
  );
}

/* ---------- Soil Moisture History Chart (single line) ---------- */

type LineChartPoint = { label: string; value: number };

type LineChartProps = {
  points: LineChartPoint[];
};

function MiniLineChart({ points }: LineChartProps) {
  if (!points.length) {
    return <div className="mini-chart-empty">No data yet</div>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 240;
  const height = 90;
  const padding = 10;

  const coords = points.map((p, i) => {
    const x =
      padding +
      (i / Math.max(1, points.length - 1)) * (width - 2 * padding);
    const y =
      height -
      padding -
      ((p.value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const yMinLabel = min.toFixed(1);
  const yMaxLabel = max.toFixed(1);
  const xStartLabel = points[0].label;
  const xEndLabel = points[points.length - 1].label;

  return (
    <div className="mini-chart-container">
      <div className="mini-chart-main-row">
        <div className="mini-chart-ylabels">
          <span>{yMaxLabel}</span>
          <span>{yMinLabel}</span>
        </div>

        <svg width={width} height={height} className="mini-chart">
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          <polyline
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            points={coords.join(" ")}
          />
        </svg>
      </div>

      <div className="mini-chart-xlabels">
        <span>{xStartLabel}</span>
        <span>{xEndLabel}</span>
      </div>
    </div>
  );
}

/* ---------- Weather Chart (min + max temperature vs day + hover tooltip) ---------- */

type WeatherPoint = {
  label: string;
  min: number;
  max: number;
};

type WeatherChartProps = {
  points: WeatherPoint[];
};

function WeatherChart({ points }: WeatherChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!points.length) {
    return <div className="mini-chart-empty">No data yet</div>;
  }

  const allValues = points.flatMap((p) => [p.min, p.max]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);

  let yMin = Math.floor(rawMin / 5) * 5;
  let yMax = Math.ceil(rawMax / 5) * 5;
  if (yMax - yMin < 10) yMax = yMin + 10;

  const range = yMax - yMin;

  const width = 260;
  const height = 140;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 30;
  const paddingBottom = 24;

  const usableWidth = width - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;

  const toCoords = (selector: (p: WeatherPoint) => number) =>
    points.map((p, i) => {
      const x =
        paddingLeft +
        (i / Math.max(1, points.length - 1)) * usableWidth;
      const value = selector(p);
      const clamped = Math.max(yMin, Math.min(yMax, value));
      const y =
        paddingTop +
        (1 - (clamped - yMin) / range) * usableHeight;
      return { x, y };
    });

  const maxCoords = toCoords((p) => p.max);
  const minCoords = toCoords((p) => p.min);

  const areaPath = [
    `M ${maxCoords[0].x} ${maxCoords[0].y}`,
    ...maxCoords.slice(1).map((c) => `L ${c.x} ${c.y}`),
    ...minCoords
      .slice()
      .reverse()
      .map((c) => `L ${c.x} ${c.y}`),
    "Z",
  ].join(" ");

  const ticks: number[] = [];
  const tickStep = range <= 20 ? 5 : 10;
  for (let t = yMin; t <= yMax + 0.1; t += tickStep) {
    ticks.push(t);
  }

  // --- tooltip computation ---
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipText = "";

  if (hoverIndex !== null) {
    const maxC = maxCoords[hoverIndex];
    const minC = minCoords[hoverIndex];
    tooltipX = (maxC.x + minC.x) / 2;
    tooltipY = Math.min(maxC.y, minC.y) - 10;
    const day = points[hoverIndex];
    tooltipText = `${day.label}: Max ${day.max.toFixed(
      1
    )}°C, Min ${day.min.toFixed(1)}°C`;

    // keep tooltip fully inside chart horizontally & vertically
    const tooltipWidth = 140;
    const tooltipHeight = 22;
    const halfWidth = tooltipWidth / 2;

    const minX = paddingLeft + halfWidth;
    const maxX = width - paddingRight - halfWidth;
    tooltipX = Math.max(minX, Math.min(maxX, tooltipX));

    const minY = paddingTop + tooltipHeight + 4; // don’t go above top area
    if (tooltipY < minY) {
      tooltipY = minY;
    }
  }

  return (
    <div className="weather-chart-container">
      <svg width={width} height={height} className="mini-chart">
        {ticks.map((t) => {
          const y =
            paddingTop +
            (1 - (t - yMin) / range) * usableHeight;
          return (
            <g key={t}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
              <text
                x={paddingLeft - 4}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="#6b7280"
              >
                {t}
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
          stroke="#9ca3af"
          strokeWidth="1"
        />
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#9ca3af"
          strokeWidth="1"
        />

        <path
          d={areaPath}
          fill="#fecaca"
          fillOpacity={0.6}
          stroke="none"
        />

        {/* Max line + hoverable points */}
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          points={maxCoords.map((c) => `${c.x},${c.y}`).join(" ")}
        />
        {maxCoords.map((c, i) => (
          <circle
            key={`max-${i}`}
            cx={c.x}
            cy={c.y}
            r={hoverIndex === i ? 4 : 2}
            fill="#ef4444"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}

        {/* Min line + hoverable points */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={minCoords.map((c) => `${c.x},${c.y}`).join(" ")}
        />
        {minCoords.map((c, i) => (
          <circle
            key={`min-${i}`}
            cx={c.x}
            cy={c.y}
            r={hoverIndex === i ? 4 : 2}
            fill="#3b82f6"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}

        {points.map((p, i) => {
          const x =
            paddingLeft +
            (i / Math.max(1, points.length - 1)) * usableWidth;
          return (
            <text
              key={p.label}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {p.label}
            </text>
          );
        })}

        <text
          x={paddingLeft + usableWidth / 2}
          y={paddingTop - 10}
          textAnchor="middle"
          fontSize="10"
          fill="#374151"
        >
          Temperature (°C)
        </text>

        {/* Tooltip */}
        {hoverIndex !== null && (
          <g className="weather-tooltip">
            <rect
              x={tooltipX - 70}
              y={tooltipY - 20}
              width={140}
              height={22}
              rx={6}
              ry={6}
              fill="#111827"
              opacity={0.9}
            />
            <text
              x={tooltipX}
              y={tooltipY - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#f9fafb"
            >
              {tooltipText}
            </text>
          </g>
        )}
      </svg>

      <div className="weather-legend">
        <div className="weather-legend-item">
          <span className="weather-legend-dot weather-legend-dot-max" />
          <span>Max temp</span>
        </div>
        <div className="weather-legend-item">
          <span className="weather-legend-dot weather-legend-dot-min" />
          <span>Min temp</span>
        </div>
      </div>
    </div>
  );
}


/* ---------- Weather data fetching ---------- */

async function fetchWeatherPoints(
  city: string,
  apiKey: string
): Promise<WeatherPoint[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
    city
  )}&appid=${apiKey}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API error");

  const data: any = await res.json();

  const buckets: Record<
    string,
    { min: number; max: number; date: Date }
  > = {};

  (data.list || []).forEach((item: any) => {
    const dt = new Date(item.dt * 1000);
    const dayKey = dt.toISOString().slice(0, 10);

    const tMin = item.main.temp_min as number;
    const tMax = item.main.temp_max as number;

    if (!buckets[dayKey]) {
      buckets[dayKey] = { min: tMin, max: tMax, date: dt };
    } else {
      buckets[dayKey].min = Math.min(buckets[dayKey].min, tMin);
      buckets[dayKey].max = Math.max(buckets[dayKey].max, tMax);
    }
  });

  const days = Object.values(buckets)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return days.map((d) => ({
    label: d.date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
    min: d.min,
    max: d.max,
  }));
}

function demoWeatherPoints(): WeatherPoint[] {
  const now = new Date();
  return Array.from({ length: 5 }).map((_, i) => {
    const base = 22 + i * 1.5;
    return {
      label: new Date(
        now.getTime() + i * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      min: base - 3,
      max: base + 3,
    };
  });
}

/* ---------- Auth Screen (Login + Sign up) ---------- */

type AuthMode = "signin" | "signup";

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged in App will handle redirect
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "Something went wrong, please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left gradient area */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <h1 className="auth-title">Welcome to Smart Irrigation</h1>
          <p className="auth-text">
            Monitor soil moisture, temperature and pump status of your IoT
            based Smart Irrigation System in real time.
          </p>
        </div>
      </div>

      {/* Right login card */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-logo-row">
            <div className="auth-logo-circle">🌱</div>
            <span className="auth-logo-text">Smart Irrigation</span>
          </div>

          <div className="auth-tabs">
            <button
              className={"auth-tab" + (mode === "signin" ? " active" : "")}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
            <button
              className={"auth-tab" + (mode === "signup" ? " active" : "")}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <h2 className="auth-card-title">
            {mode === "signin" ? "User Login" : "Create Account"}
          </h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="auth-label">
              Password
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </label>

            {mode === "signup" && (
              <label className="auth-label">
                Confirm Password
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </label>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Enter Dashboard"
                : "Sign Up"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

/* ==================== MAIN APP (Dashboard + Auth) ==================== */

export default function App() {
  // authentication
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // theme
  const [darkMode, setDarkMode] = useState(false);

  // sensor data
  const [temp, setTemp] = useState<number | null>(null);
  const [hum, setHum] = useState<number | null>(null);
  const [soil, setSoil] = useState<number | null>(null);
  const [pump, setPump] = useState<string>("--");

  const [auto, setAuto] = useState(true);
  const [manualPump, setManualPump] = useState(false);
  const [statusText, setStatusText] = useState("");

  const [weatherPoints, setWeatherPoints] = useState<WeatherPoint[]>([]);
  const [soilHistory, setSoilHistory] = useState<LineChartPoint[]>([]);

  const [lastSeen, setLastSeen] = useState<number | null>(null);

  const [heartbeat, setHeartbeat] = useState<number | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(false);


  /* --- Auth listener --- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  /* --- Dark mode switch --- */
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  /* --- Firebase realtime data --- */
  useEffect(() => {
    const dataRef = ref(db, "irrigation/data");
    onValue(dataRef, (snap) => {
      const d = snap.val() || {};
      const newTemp =
        typeof d.temperature === "number" ? d.temperature : null;
      const newHum =
        typeof d.humidity === "number" ? d.humidity : null;
      const newSoil = typeof d.soil === "number" ? d.soil : null;

      setTemp(newTemp);
      setHum(newHum);
      setSoil(newSoil);

      if (typeof d.pumpStatus === "string") setPump(d.pumpStatus);
    });

    const controlRef = ref(db, "irrigation/control");
    onValue(controlRef, (snap) => {
      const c = snap.val() || {};
      setAuto(!!c.auto);
      setManualPump(!!c.manualPump);
    });

    const statusRef = ref(db, "irrigation/status/lastSeen");
      onValue(statusRef, (snap) => {
      const v = snap.val();
      if (typeof v === "number") {
        setLastSeen(v);
      } else {
        setLastSeen(null);
      }
    });

  }, []);

/* --- ESP32 Online / Offline Detection (5 sec, SERVER TIME) --- */
useEffect(() => {
  if (lastSeen === null) {
    setIsOnline(false);
    return;
  }

  const timer = setInterval(() => {
    const diff = Date.now() - lastSeen;

    if (diff > 5000) {
      setIsOnline(false);
      setTemp(null);
      setHum(null);
      setSoil(null);
      setPump("OFF");
    } else {
      setIsOnline(true);
    }
  }, 1000);

  return () => clearInterval(timer);
}, [lastSeen]);

  /* --- Soil Moisture History (FROM FIREBASE - persistent) --- */
useEffect(() => {
  const historyRef = ref(db, "irrigation/history/soil");

  onValue(historyRef, (snap) => {
    const data = snap.val();

    if (!data) {
      setSoilHistory([]);
      return;
    }

    const points: LineChartPoint[] = Object.entries(data)
      .map(([timestamp, value]) => ({
        label: new Date(Number(timestamp)).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: Number(value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-15); // keep last 15 points only

    setSoilHistory(points);
  });
}, []);


  /* --- Weather (once) --- */
  useEffect(() => {
    const API_KEY =
      import.meta.env.VITE_WEATHER_API_KEY as string | undefined;
    const CITY = "Indore,IN";

    const load = async () => {
      if (!API_KEY) {
        console.warn(
          "No VITE_WEATHER_API_KEY set, using demo weather data"
        );
        setWeatherPoints(demoWeatherPoints());
        return;
      }

      try {
        const points = await fetchWeatherPoints(CITY, API_KEY);
        setWeatherPoints(points);
      } catch (err) {
        console.error("Weather error, using demo data", err);
        setWeatherPoints(demoWeatherPoints());
      }
    };

    load();
  }, []);

  /* --- Control toggles --- */
  const updateControl = (newAuto: boolean, newManual: boolean) => {
    update(ref(db, "irrigation/control"), {
      auto: newAuto,
      manualPump: newManual,
    });
    setStatusText(
      `Auto = ${newAuto ? "ON" : "OFF"}, Manual Pump = ${
        newManual ? "ON" : "OFF"
      }`
    );
  };

  const toggleAuto = () => {
    const newAuto = !auto;
    const newManual = newAuto ? false : manualPump;
    setAuto(newAuto);
    setManualPump(newManual);
    updateControl(newAuto, newManual);
  };

  const toggleManual = () => {
    if (auto) return;
    const newManual = !manualPump;
    setManualPump(newManual);
    updateControl(auto, newManual);
  };

  const pumpOn = pump === "ON";

  /* --- Auth conditional rendering --- */
  if (authLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (!user) {
    // not logged in -> show login/signup screen
    return <AuthScreen />;
  }

  /* --- If logged in -> show dashboard --- */
  return (
    <div className="page">
      <header className="top-bar">
        <span className="app-name">Smart Irrigation</span>
        <div className="top-right">
          <button
            className={`dark-toggle ${darkMode ? "on" : ""}`}
            onClick={() => setDarkMode((prev) => !prev)}
          >
            <span className="dark-toggle-icon">
              {darkMode ? "🌙" : "☀"}
            </span>
            <span className="dark-toggle-thumb" />
          </button>
          <button
            className="logout-btn"
            onClick={() => signOut(auth)}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-wrapper">
        <div className="dash-header">
          <div>
            <h2 className="dash-title">Web Dashboard</h2>
            <p className="dash-subtitle">
              Live view of sensor data from IoT based Smart Irrigation
              System.
            </p>
          </div>
        </div>

        <div className="layout-row">
          {/* LEFT SIDE */}
          <div className="left-column">
            <h4 className="section-label">
              Live Sensors &amp; Controls
            </h4>
            <div className="card-row">
              <Gauge
                label="Soil Moisture"
                value={soil}
                min={0}
                max={100}
                color={moistureColor(soil)}
              />
              <Gauge
                label="Soil Temperature"
                value={temp}
                unit="°C"
                min={0}
                max={100}
              />
              <Gauge
                label="Surrounding Humidity"
                value={hum}
                unit="%"
                min={0}
                max={100}
              />
              <div className="card">
                <div className="card-title">Water Pump Status</div>
                <div className="pump-circle-wrapper">
                  <div
                    className={`pump-circle ${
                      pumpOn ? "on" : "off"
                    }`}
                  />
                </div>
                <div className="pump-text">
                  <span
                    className={`status-pill ${
                      pumpOn ? "on" : "off"
                    }`}
                  >
                    <span className="status-pill-dot" />
                    {pumpOn ? "Pump ON" : "Pump OFF"}
                  </span>
                </div>
              </div>
            </div>

            <div className="controls-panel">
              <div className="control-row">
                <span className="control-label">Auto Mode</span>
                <button
                  className={`toggle-btn ${
                    auto ? "toggle-on" : ""
                  }`}
                  onClick={toggleAuto}
                >
                  <div className="toggle-circle" />
                </button>
              </div>

              <div className="control-row">
                <span className="control-label">Manual Pump</span>
                <button
                  className={`toggle-btn ${
                    manualPump ? "toggle-on" : ""
                  } ${auto ? "disabled" : ""}`}
                  disabled={auto}
                  onClick={toggleManual}
                >
                  <div className="toggle-circle" />
                </button>
              </div>

              <p className="status-text">
                {isOnline ? "ESP32 ONLINE" : "ESP32 OFFLINE"}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="right-column">
            <h4 className="section-label">Weather &amp; Analytics</h4>
            <div className="graphs-panel">
              <h3 className="graphs-title">
                Weather Temperature (Next Days)
                <span
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    marginLeft: 6,
                  }}
                >
                  (Min/Max °C vs Day – Indore)
                </span>
              </h3>
              <WeatherChart points={weatherPoints} />

              <h3
                className="graphs-title"
                style={{ marginTop: "14px" }}
              >
                Soil Moisture History
                <span
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    marginLeft: 6,
                  }}
                >
                  (0–100 vs Time)
                </span>
                {soilHistory.length > 0 && (
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 11,
                      color: "#22c55e",
                    }}
                  >
                    Latest:{" "}
                    {soilHistory[
                      soilHistory.length - 1
                    ].value.toFixed(0)}
                    %
                  </span>
                )}
              </h3>
              <MiniLineChart points={soilHistory} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
import { useEffect, useState } from "react";
import "./App.css";
import { db } from "./firebase";
import { onValue, ref, update } from "firebase/database";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

type GaugeProps = {
  label: string;
  value: number | null;
  unit?: string;
  min: number;
  max: number;
};

function Gauge({ label, value, unit = "", min, max }: GaugeProps) {
  const percent =
    value === null ? 0 : clamp01((value - min) / (max - min));
  const angle = -90 + 180 * percent;
  const display =
    value === null ? "--" : value.toFixed(unit === "%" ? 0 : 1);

  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className="gauge">
        <div className="gauge-arc" />
        <div
          className="gauge-needle"
          style={{
            transform: `translate(-50%, -4px) rotate(${angle}deg)`,
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
    </div>
  );
}

export default function App() {
  const [temp, setTemp] = useState<number | null>(null);
  const [hum, setHum] = useState<number | null>(null);
  const [soil, setSoil] = useState<number | null>(null);
  const [pump, setPump] = useState<string>("--");

  const [auto, setAuto] = useState(true);
  const [manualPump, setManualPump] = useState(false);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const dataRef = ref(db, "irrigation/data");
    onValue(dataRef, (snap) => {
      const d = snap.val() || {};
      setTemp(typeof d.temperature === "number" ? d.temperature : null);
      setHum(typeof d.humidity === "number" ? d.humidity : null);
      setSoil(typeof d.soil === "number" ? d.soil : null);
      if (typeof d.pumpStatus === "string") setPump(d.pumpStatus);
    });

    const controlRef = ref(db, "irrigation/control");
    onValue(controlRef, (snap) => {
      const c = snap.val() || {};
      setAuto(!!c.auto);
      setManualPump(!!c.manualPump);
    });
  }, []);

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
    if (auto) return; // manual disabled in auto mode
    const newManual = !manualPump;
    setManualPump(newManual);
    updateControl(auto, newManual);
  };

  const pumpOn = pump === "ON";

  return (
    <div className="page">
      {/* Top bar */}
      <header className="top-bar">
        <span className="app-name">Smart Irrigation</span>
        <span className="top-tab active">Web Dashboard</span>
      </header>

      {/* Centered dashboard content */}
      <main className="dashboard-wrapper">
        <div className="dash-header">
          <h2 className="dash-title">Web Dashboard Template</h2>
          <p className="dash-subtitle">
            Live view of sensor data from your IoT based Smart Irrigation System.
          </p>
        </div>

        {/* Row of cards in the center */}
        <div className="card-row">
          <Gauge
            label="Soil Moisture"
            value={soil}
            min={0}
            max={100}
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

          {/* Pump card */}
          <div className="card">
            <div className="card-title">Water Pump Status</div>
            <div className="pump-circle-wrapper">
              <div className={`pump-circle ${pumpOn ? "on" : "off"}`} />
            </div>
            <div className="pump-text">{pumpOn ? "ON" : "OFF"}</div>
          </div>
        </div>

        {/* Control panel below row */}
        <div className="controls-panel">
          <div className="control-row">
            <span className="control-label">Auto Mode</span>
            <button
              className={`toggle-btn ${auto ? "toggle-on" : ""}`}
              onClick={toggleAuto}
            >
              <div className="toggle-circle" />
            </button>
          </div>

          <div className="control-row">
            <span className="control-label">Manual Pump</span>
            <button
              className={`toggle-btn ${manualPump ? "toggle-on" : ""} ${
                auto ? "disabled" : ""
              }`}
              disabled={auto}
              onClick={toggleManual}
            >
              <div className="toggle-circle" />
            </button>
          </div>

          <p className="status-text">{statusText}</p>
        </div>
      </main>
    </div>
  );
}

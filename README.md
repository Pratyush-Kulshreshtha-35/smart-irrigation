# 🌱 Smart Irrigation – IoT Web Dashboard

A complete **IoT-based Smart Irrigation System** that monitors soil conditions and controls irrigation using **ESP32, Firebase, and a React Web Dashboard**.

---

## 🔥 Features

- Live monitoring of:
  - Soil Moisture
  - Soil Temperature
  - Surrounding Humidity
- Auto & Manual Water Pump Control
- ESP32 Online / Offline detection (Heartbeat)
- Soil Moisture History Graph
- 5-Day Weather Forecast (Min / Max)
- Firebase Authentication (Sign In / Sign Up)
- Dark / Light Theme
- Responsive UI

---

## 🛠️ Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | React + TypeScript + Vite |
| Database | Firebase Realtime Database |
| Auth | Firebase Authentication |
| Hosting | Firebase Hosting |
| Weather API | OpenWeather |
| IoT | ESP32, DHT22, Soil Moisture Sensor, Relay, Pump |

---

## 📸 Screenshots

> Place images in `screenshots/` folder

- `login.png`
- `dashboard.png`
- `status.png`

---

## 🔌 ESP32 Firmware

ESP32 code is available inside:

/esp32/esp32_smart_irrigation.ino


The ESP32:
- Reads sensor data every 5 seconds
- Controls pump based on Auto / Manual mode
- Sends heartbeat to detect online/offline status

---

## 🔗 Firebase Database Structure

### Sensor Data

```json
/irrigation/data/
{
  "soil": 62,
  "temperature": 27.4,
  "humidity": 58,
  "pumpStatus": "ON"
}
```
---

### Control Commands

```json
/irrigation/control/
{
  "auto": true,
  "manualPump": false
}
```

---

### ESP32 Heartbeat

```json
/irrigation/status/
{
  "lastSeen": 123456789
}
```

---

## ⚡ Circuit Connections

### 📋 Connection Table

| Component                | ESP32 Pin          | Notes                        |
| ------------------------ | ------------------ | ---------------------------- |
| DHT22 Data               | GPIO 15            | Use 10kΩ pull-up resistor    |
| DHT22 VCC                | 3.3V               | ⚠️ Do **NOT** use 5V         |
| DHT22 GND                | GND                | Common ground                |
| Soil Moisture Sensor AO  | GPIO 34            | Analog input only            |
| Soil Moisture Sensor VCC | 3.3V               | Stable readings              |
| Soil Moisture Sensor GND | GND                | Common ground                |
| Relay IN                 | GPIO 26            | LOW-trigger relay            |
| Relay VCC                | 5V                 | External 5V supply           |
| Relay GND                | GND                | Must be common with ESP32    |
| Pump +                   | External Battery + | Connected via Relay COM → NO |
| Pump −                   | External Battery − | Direct connection            |

---

## ⚠️ Important:

Do NOT power pump from ESP32

Use separate battery for pump

Common GND between ESP32 & relay module

---

## 🚀 Project Setup

```
git clone https://github.com/Pratyush-Kulshreshtha-35/smart-irrigation.git
cd smart-irrigation
npm install
npm run dev
```

---

## ⭐ Contribution

1. Fork repository
2. Create feature branch
3. Commit changes
4. Open pull request

---

## 👨‍💻 Author

### Pratyush Kulshreshtha

### IoT • Web Development • Firebase • React

### 🔗 GitHub: https://github.com/Pratyush-Kulshreshtha-35

---
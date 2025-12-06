# 🌱 Smart Irrigation – Web Dashboard

A modern web dashboard to monitor and control an **IoT-based Smart Irrigation System** in real time using ESP32, sensors, and Firebase.

---

## 🔥 Features

- Live sensor monitoring (Soil Moisture, Temperature, Humidity)
- Automatic and manual water pump control
- 5-day weather forecast with min/max temperature graph
- Live soil moisture history graph
- Firebase login (Sign-in & Sign-up authentication)
- Dark/Light theme toggle
- Smooth and responsive UI

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React + TypeScript + Vite |
| Styling | Custom CSS |
| Database | Firebase Realtime Database |
| Authentication | Firebase Auth |
| Hosting | Firebase Hosting |
| IoT Hardware | ESP32 + DHT22 + Soil Moisture Sensor + Relay + Pump |

---

## 📂 Project Setup

### 1️⃣ Clone the Repository
```bash
git clone <your-repository-link>
cd smart-irrigation
2️⃣ Install Dependencies
bash
Copy code
npm install
3️⃣ Create .env File (Required)
Create a file named .env in the root of the project and add:

ini
Copy code
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_WEATHER_API_KEY=your_openweather_api_key
4️⃣ Start Development Locally
bash
Copy code
npm run dev
5️⃣ Build for Production
bash
Copy code
npm run build
6️⃣ Deploy to Firebase Hosting
bash
Copy code
firebase deploy
🔌 ESP32 → Firebase Data Format
ESP32 should upload data to:

bash
Copy code
/irrigation/data/
Example structure:

json
Copy code
{
  "soil": 63,
  "temperature": 28.7,
  "humidity": 54.3,
  "pumpStatus": "ON"
}
The dashboard reads control commands from:

bash
Copy code
/irrigation/control/
Example:

json
Copy code
{
  "auto": true,
  "manualPump": false
}
⭐ Contribution
Contributions are welcome!
To improve UI, backend logic or add new features:

markdown
Copy code
1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Push and open a pull request
👨‍💻 Author
Pratyush Kulshreshtha
IoT • Web Development • Firebase • React
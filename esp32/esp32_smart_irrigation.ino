#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>

/* ------------ WiFi ------------ */
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

/* ------------ Firebase ------------ */
#define API_KEY "YOUR_API_KEY"
#define DATABASE_URL "YOUR_DATABASE_URL"
#define USER_EMAIL "YOUR_EMAIL"
#define USER_PASSWORD "YOUR_PASSWORD"

/* ------------ Pins ------------ */
#define DHTPIN 15
#define DHTTYPE DHT22
#define SOIL_PIN 34
#define RELAY_PIN 26

#define SOIL_THRESHOLD 60   // soil < 60 → pump ON in auto

/* ------------ Objects ------------ */
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
DHT dht(DHTPIN, DHTTYPE);

/* ------------ Timing ------------ */
unsigned long lastRead = 0;
const unsigned long INTERVAL = 5000;  // 5 sec

/* ------------ Heartbeat ------------ */
unsigned long heartbeat = 0;

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // relay OFF (LOW trigger)

  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (!Firebase.ready()) return;
  if (millis() - lastRead < INTERVAL) return;
  lastRead = millis();

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ DHT failed");
    return;
  }

  int soilRaw = analogRead(SOIL_PIN);
  int soil = map(soilRaw, 4095, 0, 0, 100);
  soil = constrain(soil, 0, 100);

  bool autoMode = false;
  bool manualPump = false;

  Firebase.RTDB.getBool(&fbdo, "/irrigation/control/auto");
  autoMode = fbdo.boolData();

  Firebase.RTDB.getBool(&fbdo, "/irrigation/control/manualPump");
  manualPump = fbdo.boolData();

  bool pumpON = autoMode ? (soil < SOIL_THRESHOLD) : manualPump;
  digitalWrite(RELAY_PIN, pumpON ? LOW : HIGH);

  /* ---- DATA ---- */
  Firebase.RTDB.setFloat(&fbdo, "/irrigation/data/temperature", temperature);
  Firebase.RTDB.setFloat(&fbdo, "/irrigation/data/humidity", humidity);
  Firebase.RTDB.setInt(&fbdo, "/irrigation/data/soil", soil);
  Firebase.RTDB.setString(&fbdo,
    "/irrigation/data/pumpStatus",
    pumpON ? "ON" : "OFF"
  );

  FirebaseJson json;
json.set(".sv", "timestamp");

Firebase.RTDB.setJSON(
  &fbdo,
  "/irrigation/status/lastSeen",
  &json
);

  Serial.println("📡Firebase Updated");
  Serial.println("📡 Updated | HB = " + String(heartbeat));
  Serial.println("Temp: " + String(temperature));
  Serial.println("Humidity: " + String(humidity));
  Serial.println("Soil: " + String(soil));
  Serial.println("Pump: " + String(pumpON ? "ON" : "OFF"));
  Serial.println("------------------------");
}

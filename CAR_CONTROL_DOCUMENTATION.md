# ESP32 Car Control via WebSocket - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Hardware Setup](#hardware-setup)
3. [Software Setup](#software-setup)
4. [Backend Configuration](#backend-configuration)
5. [ESP32 Code Setup](#esp32-code-setup)
6. [React Native Integration](#react-native-integration)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)
9. [Testing](#testing)

---

## Overview

This system allows you to control an ESP32-based car remotely via WebSocket. The car can be controlled from:
- React Native mobile app
- Web browser
- Any WebSocket client

### Features

- ✅ Real-time bidirectional communication
- ✅ Forward, Backward, Left, Right, Stop commands
- ✅ Adjustable motor speed (0-255)
- ✅ Connection status monitoring
- ✅ Auto-reconnect functionality
- ✅ REST API alternative for car control

---

## Hardware Setup

### Components Required

1. **ESP32 NodeMCU** (1x)
2. **Motor Driver Modules** (2x) - L298N or similar
3. **DC Motors** (4x) - For 4 wheels
4. **Power Supply** - Appropriate for motors (typically 7-12V)
5. **Jumper Wires**

### Pin Connections

#### Motor A (Left Wheels)
- **ENA** → GPIO 33 (PWM)
- **IN1** → GPIO 25
- **IN2** → GPIO 26

#### Motor B (Right Wheels)
- **ENB** → GPIO 32 (PWM)
- **IN3** → GPIO 14
- **IN4** → GPIO 12

### Wiring Diagram

```
ESP32          Motor Driver A          Motor Driver B
GPIO 33 ────── ENA
GPIO 25 ────── IN1
GPIO 26 ────── IN2
GPIO 32 ────── ENB
GPIO 14 ────── IN3
GPIO 12 ────── IN4

Motor Driver A ──── Motor A (Left)
Motor Driver B ──── Motor B (Right)
```

---

## Software Setup

### Backend Dependencies

The backend already includes all necessary dependencies:
- `express` - Web framework
- `ws` - WebSocket library
- `cors` - CORS middleware

### ESP32 Libraries

Install these libraries in Arduino IDE:

1. **WiFi** (Built-in)
2. **WebSocketsClient** by Markus Sattler
   - Install via: Tools → Manage Libraries → Search "WebSockets"
3. **ArduinoJson** by Benoit Blanchon
   - Install via: Tools → Manage Libraries → Search "ArduinoJson"

---

## Backend Configuration

### 1. Server Setup

The server is already configured to handle car control. Key files:

- **`bin/www`** - WebSocket server setup
- **`routes/car.js`** - Car control routes
- **`app.js`** - Express app configuration

### 2. Server IP Configuration

Find your server's IP address:

```bash
# Linux/Mac
hostname -I | awk '{print $1}'

# Windows
ipconfig
```

Update the ESP32 code with this IP address (see ESP32 Code Setup section).

### 3. Start the Server

```bash
npm start
# or for development
npm run dev
```

The server will start on port 3000 (or PORT environment variable).

---

## ESP32 Code Setup

### 1. Open the Arduino File

Open `iot_ino/car_soket.ino` in Arduino IDE.

### 2. Configure WiFi

Update WiFi credentials:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 3. Configure Server IP

Update server IP address:

```cpp
const char* serverHost = "192.168.0.115";  // Your server IP
const uint16_t serverPort = 3000;
const char* serverPath = "/ws";
```

### 4. Upload to ESP32

1. Select board: **Tools → Board → ESP32 Dev Module**
2. Select port: **Tools → Port → (Your ESP32 port)**
3. Upload: **Sketch → Upload**

### 5. Monitor Serial Output

Open Serial Monitor (115200 baud) to see connection status:

```
🚗 ESP32 Car Controller Starting...
📡 Connecting to WiFi...
✅ WiFi Connected! IP: 192.168.0.xxx
🔌 Connecting to WebSocket...
✅ WebSocket CONNECTED to: ws://192.168.0.115:3000/ws
📤 Sent identification: ESP32-Car
```

---

## React Native Integration

### 1. Copy the Component

Copy `react-native-car-control.js` into your React Native project.

### 2. Import and Use

```javascript
import CarControl from './react-native-car-control';

// In your app
<CarControl />
```

### 3. Configure Server IP

Update the default server IP in the component:

```javascript
const [serverIP, setServerIP] = useState('192.168.0.115'); // Your server IP
```

### 4. Platform-Specific Configuration

#### Android

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

#### iOS

Add to `ios/YourApp/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

### 5. Run the App

```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

---

## API Reference

### WebSocket Protocol

#### Connection URL

```
ws://SERVER_IP:3000/ws
```

#### Message Format

**From Client to Server (Car Control):**

```json
{
  "command": "forward|backward|left|right|stop",
  "speed": 200
}
```

**From Server to Client (Status):**

```json
{
  "type": "car_status",
  "data": {
    "connected": true,
    "lastUpdate": "2024-01-01T12:00:00.000Z",
    "status": "ready",
    "lastCommand": "forward",
    "lastCommandTime": "2024-01-01T12:00:01.000Z"
  }
}
```

**From Server to Client (Acknowledgment):**

```json
{
  "type": "car_ack",
  "command": "forward",
  "status": "executed"
}
```

**From ESP32 to Server (Identification):**

```json
{
  "type": "esp32_car",
  "device": "ESP32-Car",
  "status": "ready"
}
```

### REST API Endpoints

#### Get Car Status

```http
GET /car/status
```

**Response:**

```json
{
  "car": {
    "connected": true,
    "lastUpdate": "2024-01-01T12:00:00.000Z",
    "status": "ready",
    "lastCommand": "forward",
    "lastCommandTime": "2024-01-01T12:00:01.000Z"
  },
  "uptime": 3600
}
```

#### Control Car

```http
POST /car/control
Content-Type: application/json

{
  "command": "forward",
  "speed": 200
}
```

**Response:**

```json
{
  "success": true,
  "command": "forward",
  "speed": 200,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Valid Commands:**
- `forward` - Move forward
- `backward` - Move backward
- `left` - Turn left
- `right` - Turn right
- `stop` - Stop all motors

**Speed Range:** 0-255 (PWM value)

---

## Troubleshooting

### ESP32 Issues

#### WiFi Connection Failed

**Problem:** ESP32 cannot connect to WiFi

**Solutions:**
- Check WiFi SSID and password
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check signal strength
- Restart ESP32

#### WebSocket Connection Failed

**Problem:** ESP32 cannot connect to server

**Solutions:**
- Verify server IP address is correct
- Ensure server is running
- Check firewall settings (port 3000)
- Ensure ESP32 and server are on same network
- Check Serial Monitor for error messages

#### Motors Not Moving

**Problem:** Commands received but motors don't move

**Solutions:**
- Check motor driver connections
- Verify power supply is connected
- Check PWM pins (ENA, ENB) are connected
- Test motors directly with power supply
- Verify motor speed is not 0

### Backend Issues

#### Car Not Connecting

**Problem:** Server doesn't detect ESP32 car

**Solutions:**
- Check server logs for connection attempts
- Verify WebSocket path is `/ws`
- Check CORS configuration
- Ensure server is listening on `0.0.0.0` (all interfaces)

#### Commands Not Reaching Car

**Problem:** Commands sent but car doesn't respond

**Solutions:**
- Check server logs for command forwarding
- Verify ESP32 car client is connected
- Check WebSocket connection status
- Restart both server and ESP32

### React Native Issues

#### Connection Refused

**Problem:** App cannot connect to server

**Solutions:**
- Verify server IP address
- Ensure both devices on same network
- Check Android cleartext traffic setting
- Check iOS local networking permission
- Verify server is running

#### Commands Not Working

**Problem:** Connected but car doesn't move

**Solutions:**
- Check car status (should show "connected: true")
- Verify ESP32 car is connected to server
- Check server logs for command forwarding
- Test with REST API endpoint

---

## Testing

### 1. Test Server Connection

```bash
# Check server status
curl http://localhost:3000/car/status

# Test car control
curl -X POST http://localhost:3000/car/control \
  -H "Content-Type: application/json" \
  -d '{"command":"forward","speed":200}'
```

### 2. Test WebSocket Connection

Use a WebSocket client (like `wscat`):

```bash
npm install -g wscat
wscat -c ws://192.168.0.115:3000/ws
```

Send command:
```json
{"command":"forward","speed":200}
```

### 3. Test ESP32

1. Upload code to ESP32
2. Open Serial Monitor (115200 baud)
3. Verify connection messages
4. Send test command from server

### 4. Test React Native App

1. Connect app to server
2. Verify connection status shows "Connected"
3. Verify car status shows "Online"
4. Test each control button
5. Check Serial Monitor for command execution

---

## Command Flow Diagram

```
React Native App
    │
    │ WebSocket Message
    │ {"command": "forward", "speed": 200}
    ▼
Backend Server (bin/www)
    │
    │ Forward to ESP32 Car
    │ WebSocket Message
    ▼
ESP32 Car (car_soket.ino)
    │
    │ Execute Command
    │ moveForward()
    ▼
Motors
    │
    │ Acknowledge
    │ {"type": "ack", "command": "forward"}
    ▼
Backend Server
    │
    │ Broadcast to Clients
    │ {"type": "car_ack", "command": "forward"}
    ▼
React Native App
```

---

## Advanced Configuration

### Adjust Motor Speed

In React Native component:
```javascript
const [motorSpeed, setMotorSpeed] = useState(200); // 0-255
```

In ESP32 code:
```cpp
uint8_t motorSpeed = 200; // Default speed
```

### Change Control Behavior

**Continuous Movement:**
- Hold button → Move
- Release button → Stop

**Toggle Movement:**
- Press button → Start moving
- Press again → Stop

Modify the React Native component's `onPress` handlers accordingly.

### Add More Commands

1. Add command handler in ESP32 code:
```cpp
else if (command == "custom") {
  // Your custom logic
}
```

2. Add button in React Native component
3. Update server validation in `bin/www`

---

## Security Considerations

⚠️ **Important:** This setup is for local development only!

For production:
1. Use WSS (Secure WebSocket) with SSL/TLS
2. Implement authentication
3. Add rate limiting
4. Use environment variables for sensitive data
5. Implement command validation
6. Add logging and monitoring

---

## Support

For issues or questions:
1. Check Serial Monitor output
2. Check server logs
3. Verify network connectivity
4. Review this documentation
5. Check hardware connections

---

## License

This project is provided as-is for educational and development purposes.

---

**Last Updated:** 2024
**Version:** 1.0.0


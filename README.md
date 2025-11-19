# ESP32 Camera IoT Frontend

React Native app for ESP32 camera streaming with disease prediction.

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Update `.env` with your computer's IP:

```env
EXPO_PUBLIC_PRODUCTION_URL=https://iot-backend-uy96.onrender.com
EXPO_PUBLIC_LOCAL_URL=http://YOUR_IP:3000
```

**Find your IP:**
- Windows: `ipconfig`
- Mac/Linux: `ifconfig` or `ip addr`
- Look for `192.168.x.x` or `10.0.x.x`

### 3. Start Development Server

```bash
npm start
```

**Important:** Restart Expo after changing `.env`

### 4. Run on Device

**Development (Expo Go):**
```bash
npm start
# Scan QR code with Expo Go app
```

**Native Build:**
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

## Platform Configuration

- **Android Emulator**: Uses `http://10.0.2.2:3000` (automatic)
- **iOS Simulator**: Uses `http://localhost:3000` (automatic)
- **Physical Device**: Uses `EXPO_PUBLIC_LOCAL_URL` from `.env`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_PRODUCTION_URL` | Production backend | `https://iot-backend-uy96.onrender.com` |
| `EXPO_PUBLIC_LOCAL_URL` | Local backend (physical device) | `http://192.168.0.115:3000` |

## Features

- Real-time camera streaming via WebSocket
- Disease prediction with AI
- Production/Development mode toggle
- Works on emulators and physical devices

## Troubleshooting

**Can't connect from physical device?**
1. Check phone and computer are on same WiFi
2. Verify IP in `.env` matches your computer's IP
3. Restart Expo after changing `.env`
4. Ensure backend server is running

**Environment variables not working?**
1. Make sure `.env` file exists in project root
2. Variables must be prefixed with `EXPO_PUBLIC_`
3. Restart Expo dev server after changes

751268
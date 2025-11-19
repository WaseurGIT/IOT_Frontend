# IoT Services Documentation

This folder contains service modules for interacting with the ESP32 IoT backend.

## 📦 Available Services

### Car Control Services

#### 🚗 `carSocket.ts` - WebSocket Car Control (Recommended)
Real-time WebSocket-based car control with auto-reconnection.

```typescript
import { carSocket } from './carSocket';

// Connect
carSocket.connect('http://192.168.0.115:3000');

// Send commands
carSocket.sendCommand('forward', 200);
carSocket.sendCommand('backward', 150);
carSocket.sendCommand('left', 200);
carSocket.sendCommand('right', 200);
carSocket.sendCommand('stop', 0);

// Listen to events
carSocket.on('connected', (connected) => console.log('Connected:', connected));
carSocket.on('status', (status) => console.log('Car status:', status));
carSocket.on('acknowledgment', (data) => console.log('Command ack:', data));

// Disconnect
carSocket.disconnect();
```

**Features:**
- ✅ Auto-reconnection (up to 5 attempts)
- ✅ Event-driven architecture
- ✅ Type-safe TypeScript interfaces
- ✅ Built-in error handling
- ✅ Connection status monitoring

---

#### 🚙 `carApi.ts` - REST API Car Control (Alternative)
HTTP-based car control for when WebSocket is unavailable.

```typescript
import { carApi } from './carApi';

// Set base URL
carApi.setBaseURL('http://192.168.0.115:3000');

// Send command
await carApi.sendCommand('forward', 200);

// Emergency stop
await carApi.emergencyStop();

// Get status
const status = await carApi.getStatus();

// Command sequence with delays
await carApi.sendCommandSequence([
  { command: 'forward', speed: 200, delay: 1000 },
  { command: 'right', speed: 150, delay: 500 },
  { command: 'stop', speed: 0 }
]);
```

**Use Cases:**
- ✅ Backup when WebSocket fails
- ✅ One-off commands
- ✅ Scripted command sequences
- ✅ Testing and debugging

---

### Camera Services

#### 📷 `cameraSocket.ts` - WebSocket Camera Streaming
Real-time camera frame streaming via WebSocket.

```typescript
import { cameraSocket } from './cameraSocket';

// Connect
cameraSocket.connect('http://192.168.0.115:3000');

// Listen for frames
cameraSocket.on('frame', (data) => {
  const imageUri = `data:image/jpeg;base64,${data.image}`;
  // Display image
});

cameraSocket.on('connected', (connected) => {
  console.log('Camera WebSocket:', connected);
});

// Disconnect
cameraSocket.disconnect();
```

---

#### 📸 `cameraApi.ts` - REST API Camera Operations
HTTP-based camera operations and ML predictions.

```typescript
import { cameraApi } from './cameraApi';

// Set base URL
cameraApi.setBaseURL('http://192.168.0.115:3000');

// Capture image with AI prediction
const result = await cameraApi.capture();
console.log('Disease:', result.disease_prediction?.disease);
console.log('Confidence:', result.disease_prediction?.confidence);

// Get status
const status = await cameraApi.getStatus();

// List saved images (development only)
const images = await cameraApi.listImages();

// Delete image (development only)
await cameraApi.deleteImage('filename.jpg');
```

---

## 🎯 Quick Integration Guide

### Step 1: Import Services

```typescript
import { carSocket } from './services/carSocket';
import { carApi } from './services/carApi';
import { cameraSocket } from './services/cameraSocket';
import { cameraApi } from './services/cameraApi';
```

### Step 2: Setup in Component

```typescript
useEffect(() => {
  const BACKEND_URL = 'http://192.168.0.115:3000';
  
  // Setup camera
  cameraSocket.connect(BACKEND_URL);
  cameraApi.setBaseURL(BACKEND_URL);
  
  // Setup car
  carSocket.connect(BACKEND_URL);
  carApi.setBaseURL(BACKEND_URL);
  
  // Event listeners
  carSocket.on('connected', (connected) => setCarConnected(connected));
  carSocket.on('status', (status) => setCarStatus(status));
  cameraSocket.on('frame', (data) => setFrame(data.image));
  
  return () => {
    carSocket.disconnect();
    cameraSocket.disconnect();
  };
}, []);
```

### Step 3: Use in Your App

```typescript
// Control car
const moveForward = () => carSocket.sendCommand('forward', 200);
const stop = () => carSocket.sendCommand('stop', 0);

// Capture image
const capture = async () => {
  const result = await cameraApi.capture();
  if (result.disease_prediction) {
    console.log('Disease detected:', result.disease_prediction.disease);
  }
};
```

---

## 🔧 TypeScript Interfaces

### CarStatus
```typescript
interface CarStatus {
  connected: boolean;
  lastUpdate: string;
  status: string;
  lastCommand?: string;
  lastCommandTime?: string;
  deviceInfo?: string;
}
```

### CarCommand
```typescript
interface CarCommand {
  command: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  speed: number;  // 0-255
  timestamp?: number;
}
```

### DiseasePrediction
```typescript
interface DiseasePrediction {
  disease: string;
  confidence: number;
  model_used?: string;
  guidance?: {
    description?: string;
    severity?: string;
    remedies?: string[];
    follow_up?: string;
  };
}
```

---

## 📊 Service Comparison

| Feature | WebSocket Services | REST API Services |
|---------|-------------------|-------------------|
| Real-time data | ✅ Yes | ❌ No |
| Auto-reconnect | ✅ Yes | N/A |
| Event-driven | ✅ Yes | ❌ No |
| Latency | ⚡ Low (~10ms) | 🐢 Higher (~50-200ms) |
| Reliability | 🌐 Network dependent | ✅ More reliable |
| Use case | Streaming, Control | Commands, Data fetch |

---

## 🛠️ Troubleshooting

### WebSocket won't connect
```typescript
// Check if backend URL is correct
carSocket.connect('http://192.168.0.115:3000');

// Listen for errors
carSocket.on('error', (error) => {
  console.error('Connection error:', error);
});

// Check connection status
if (!carSocket.isConnected()) {
  console.log('Not connected, retrying...');
}
```

### Commands not working
```typescript
// Verify car is connected to server
carSocket.on('status', (status) => {
  if (!status.connected) {
    console.warn('ESP32 car not connected to server');
  }
});

// Check command response
carSocket.on('acknowledgment', (data) => {
  console.log('Command executed:', data.command);
});
```

### Camera frames not appearing
```typescript
// Check frame data
cameraSocket.on('frame', (data) => {
  console.log('Frame received, size:', data.image?.length);
  console.log('Timestamp:', data.timestamp);
});

// Verify connection
cameraSocket.on('connected', (connected) => {
  if (!connected) {
    console.warn('Camera WebSocket disconnected');
  }
});
```

---

## 📚 Additional Resources

- **Full API Documentation:** See `/apidoc.md`
- **Car Control Guide:** See `/CAR_CONTROL_DOCUMENTATION.md`
- **Backend Setup:** Check backend repository

---

## 🤝 Support

For issues or questions:
1. Check the service console logs
2. Verify backend server is running
3. Ensure network connectivity
4. Review API documentation

---

**Last Updated:** 2024
**Version:** 1.0.0


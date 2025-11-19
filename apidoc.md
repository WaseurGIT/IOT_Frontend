# IoT Backend API Documentation for React Native

Complete API documentation for integrating ESP32 Camera streaming and Car control in React Native applications.

## 🚀 Quick Start with Services

This project includes pre-built services for easy integration:
- **`carSocket.ts`** - WebSocket service for real-time car control
- **`carApi.ts`** - REST API service for car control (alternative/backup)
- **`cameraSocket.ts`** - WebSocket service for camera streaming
- **`cameraApi.ts`** - REST API service for camera operations

### Usage Example

```typescript
import { carSocket } from './services/carSocket';
import { carApi } from './services/carApi';

// WebSocket car control (recommended for real-time)
carSocket.connect('http://192.168.0.115:3000');
carSocket.sendCommand('forward', 200);

// REST API car control (alternative)
await carApi.sendCommand('forward', 200);
```

## Base URL

```
http://your-server-ip:3000
```

For production (Render.com):
```
https://your-app.onrender.com
```

---

## WebSocket Connection

### Connect to WebSocket

**Endpoint:** `ws://your-server-ip:3000/ws`

**React Native Implementation:**

```javascript
import React, { useEffect, useRef, useState } from 'react';
import { View, Image } from 'react-native';

const CameraStream = () => {
  const ws = useRef(null);
  const [frameData, setFrameData] = useState(null);
  const [cameraConnected, setcameraConnected] = useState(false);
  const [carConnected, setCarConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket('ws://YOUR_SERVER_IP:3000/ws');

    ws.current.onopen = () => {
      console.log('✅ WebSocket Connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'frame':
            // New camera frame received
            setFrameData(`data:image/jpeg;base64,${data.image}`);
            break;
            
          case 'camera_connected':
            setcameraConnected(true);
            console.log('📷 Camera connected:', data.device);
            break;
            
          case 'camera_disconnected':
            setcameraConnected(false);
            console.log('📷 Camera disconnected');
            break;
            
          case 'car_connected':
            setCarConnected(true);
            console.log('🚗 Car connected:', data.device);
            break;
            
          case 'car_disconnected':
            setCarConnected(false);
            console.log('🚗 Car disconnected');
            break;
            
          case 'car_ack':
            console.log('✅ Car acknowledged:', data.command);
            break;
            
          case 'camera_status':
            console.log('📊 Camera Status:', data.data);
            break;
            
          case 'car_status':
            console.log('📊 Car Status:', data.data);
            break;
            
          case 'error':
            console.error('❌ Error:', data.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('🔌 WebSocket Disconnected');
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <View>
      {frameData && (
        <Image
          source={{ uri: frameData }}
          style={{ width: 320, height: 240 }}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

export default CameraStream;
```

### WebSocket Message Types

#### From Server to Client:

1. **frame** - Camera frame data
```json
{
  "type": "frame",
  "image": "base64_encoded_jpeg_data",
  "timestamp": 1699999999999
}
```

2. **camera_connected** - Camera device connected
```json
{
  "type": "camera_connected",
  "device": "ESP32-CAM"
}
```

3. **camera_disconnected** - Camera device disconnected
```json
{
  "type": "camera_disconnected"
}
```

4. **car_connected** - Car device connected
```json
{
  "type": "car_connected",
  "device": "ESP32-CAR",
  "status": "ready"
}
```

5. **car_disconnected** - Car device disconnected
```json
{
  "type": "car_disconnected"
}
```

6. **car_ack** - Car command acknowledgment
```json
{
  "type": "car_ack",
  "command": "forward",
  "status": "executed"
}
```

7. **camera_status** - Initial camera status
```json
{
  "type": "camera_status",
  "data": {
    "connected": true,
    "lastUpdate": "2025-11-17T10:30:00.000Z",
    "frameCount": 1234,
    "fps": 15
  }
}
```

8. **car_status** - Initial car status
```json
{
  "type": "car_status",
  "data": {
    "connected": true,
    "lastUpdate": "2025-11-17T10:30:00.000Z",
    "status": "ready",
    "lastCommand": "forward",
    "lastCommandTime": "2025-11-17T10:29:55.000Z",
    "deviceInfo": "ESP32-CAR"
  }
}
```

9. **error** - Error message
```json
{
  "type": "error",
  "message": "Car not connected",
  "command": "forward"
}
```

---

## 🔧 Car Control Services (Recommended)

### CarSocket Service (WebSocket)

The `carSocket` service provides a clean, event-driven interface for WebSocket car control.

#### Import and Setup

```typescript
import { carSocket, CarStatus } from '../services/carSocket';

// Connect to backend
carSocket.connect('http://192.168.0.115:3000');

// Setup event listeners
carSocket.on('connected', (connected: boolean) => {
  console.log('Connection status:', connected);
});

carSocket.on('status', (status: CarStatus) => {
  console.log('Car status:', status);
});

carSocket.on('acknowledgment', (data) => {
  console.log('Command acknowledged:', data.command);
});

carSocket.on('device_connected', (data) => {
  console.log('ESP32 car connected:', data.device);
});

carSocket.on('device_disconnected', () => {
  console.log('ESP32 car disconnected');
});

carSocket.on('error', (error) => {
  console.error('Car error:', error);
});
```

#### Send Commands

```typescript
// Send car command
carSocket.sendCommand('forward', 200);
carSocket.sendCommand('backward', 150);
carSocket.sendCommand('left', 200);
carSocket.sendCommand('right', 200);
carSocket.sendCommand('stop', 0);

// Check connection status
if (carSocket.isConnected()) {
  carSocket.sendCommand('forward', 255);
}

// Disconnect
carSocket.disconnect();
```

#### CarSocket Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `connected` | `boolean` | WebSocket connection status |
| `status` | `CarStatus` | ESP32 car status updates |
| `acknowledgment` | `{command: string, status: string}` | Command execution confirmation |
| `device_connected` | `{device: string, status: string}` | ESP32 car connected to server |
| `device_disconnected` | `boolean` | ESP32 car disconnected from server |
| `error` | `Error \| string` | Error messages |

#### CarStatus Interface

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

---

### CarAPI Service (REST)

Alternative HTTP-based car control when WebSocket is not available.

#### Import and Setup

```typescript
import { carApi } from '../services/carApi';

// Set base URL
carApi.setBaseURL('http://192.168.0.115:3000');
```

#### Send Commands

```typescript
// Send single command
try {
  const response = await carApi.sendCommand('forward', 200);
  console.log('Command sent:', response);
} catch (error) {
  console.error('Failed to send command:', error);
}

// Emergency stop
await carApi.emergencyStop();

// Get car status
const status = await carApi.getStatus();
console.log('Car status:', status.car);

// Get connected clients
const clients = await carApi.getClients();
console.log('Connected clients:', clients.totalClients);
```

#### Command Sequence

```typescript
// Execute multiple commands with delays
await carApi.sendCommandSequence([
  { command: 'forward', speed: 200, delay: 1000 },
  { command: 'right', speed: 150, delay: 500 },
  { command: 'forward', speed: 200, delay: 1000 },
  { command: 'stop', speed: 0 }
]);
```

---

## Car Control API

### 1. Send Car Control Command (WebSocket)

**Recommended Method for Real-time Control**

```javascript
const sendCarCommand = (command, speed = 200) => {
  if (ws.current && ws.current.readyState === WebSocket.OPEN) {
    const commandData = {
      command: command,
      speed: speed,
      timestamp: Date.now()
    };
    ws.current.send(JSON.stringify(commandData));
  }
};

// Usage
sendCarCommand('forward', 255);  // Full speed forward
sendCarCommand('backward', 150); // Medium speed backward
sendCarCommand('left', 200);     // Turn left
sendCarCommand('right', 200);    // Turn right
sendCarCommand('stop', 0);       // Stop
```

**Valid Commands:**
- `forward` - Move forward
- `backward` - Move backward
- `left` - Turn left
- `right` - Turn right
- `stop` - Stop all motors

**Speed Range:** 0-255

---

### 2. Send Car Control Command (REST API)

**Alternative Method via HTTP**

**Endpoint:** `POST /car/control`

**Request Body:**
```json
{
  "command": "forward",
  "speed": 200
}
```

**React Native Implementation:**

```javascript
const sendCarCommandREST = async (command, speed = 200) => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/car/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: command,
        speed: speed,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Command sent:', data.command);
    } else {
      console.error('❌ Command failed:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Error sending command:', error);
  }
};

// Usage
await sendCarCommandREST('forward', 255);
```

**Success Response (200):**
```json
{
  "success": true,
  "command": "forward",
  "speed": 200,
  "timestamp": "2025-11-17T10:30:00.000Z",
  "message": "Command sent to car"
}
```

**Error Response (400 - Invalid Command):**
```json
{
  "error": "Invalid command",
  "validCommands": ["forward", "backward", "left", "right", "stop"]
}
```

**Error Response (503 - Car Not Connected):**
```json
{
  "error": "Car not connected",
  "message": "ESP32 car is not connected to the server",
  "connected": false
}
```

---

### 3. Get Car Status

**Endpoint:** `GET /car/status`

**React Native Implementation:**

```javascript
const getCarStatus = async () => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/car/status');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting car status:', error);
  }
};
```

**Success Response (200):**
```json
{
  "car": {
    "connected": true,
    "lastUpdate": "2025-11-17T10:30:00.000Z",
    "status": "ready",
    "lastCommand": "forward",
    "lastCommandTime": "2025-11-17T10:29:55.000Z",
    "deviceInfo": "ESP32-CAR"
  },
  "server": {
    "uptime": 3600.5,
    "connectedClients": 3
  }
}
```

---

### 4. Get Connected Clients Info

**Endpoint:** `GET /car/clients`

**React Native Implementation:**

```javascript
const getConnectedClients = async () => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/car/clients');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting clients:', error);
  }
};
```

**Success Response (200):**
```json
{
  "totalClients": 3,
  "carConnected": true,
  "cameraConnected": true,
  "webClients": 1,
  "clients": [
    {
      "id": 0,
      "readyState": 1,
      "protocol": "",
      "extensions": {},
      "_socket": {
        "remoteAddress": "192.168.1.100",
        "remotePort": 54321
      }
    }
  ]
}
```

---

## Camera API

### 1. Get Camera Snapshot

**Endpoint:** `GET /camera/snapshot`

**Description:** Get the latest camera frame as JPEG image

**React Native Implementation:**

```javascript
const getCameraSnapshot = async () => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/camera/snapshot');
    
    if (response.ok) {
      const blob = await response.blob();
      // Convert blob to base64 if needed
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        console.log('Snapshot received');
        return base64data;
      };
    }
  } catch (error) {
    console.error('Error getting snapshot:', error);
  }
};
```

**Success Response (200):**
- Content-Type: `image/jpeg`
- Body: JPEG image binary data

**Error Response (404):**
```json
{
  "error": "No frame available"
}
```

---

### 2. Capture Image and Predict Disease

**Endpoint:** `POST /camera/capture`

**Description:** Captures the current frame and sends it to ML service for plant disease prediction

**React Native Implementation:**

```javascript
const captureAndPredict = async () => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/camera/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Image captured');
      
      if (data.disease_prediction) {
        console.log('🌱 Disease:', data.disease_prediction.disease);
        console.log('🎯 Confidence:', data.disease_prediction.confidence);
        console.log('⚠️  Severity:', data.disease_prediction.severity);
        console.log('💊 Remedies:', data.disease_prediction.remedies);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error capturing image:', error);
  }
};
```

**Success Response (200) - Development Mode:**
```json
{
  "success": true,
  "size": 45678,
  "timestamp": "2025-11-17T10-30-00-000Z",
  "mode": "development",
  "filename": "ESP32_CAM_2025-11-17T10-30-00-000Z.jpg",
  "path": "/uploads/ESP32_CAM_2025-11-17T10-30-00-000Z.jpg",
  "url": "/uploads/ESP32_CAM_2025-11-17T10-30-00-000Z.jpg",
  "disease_prediction": {
    "disease": "Tomato_Early_blight",
    "confidence": 0.9523,
    "severity": "moderate",
    "remedies": [
      "Remove infected leaves",
      "Apply fungicide",
      "Improve air circulation"
    ],
    "description": "Early blight is a common tomato disease...",
    "prevention": [
      "Rotate crops",
      "Water at soil level",
      "Mulch plants"
    ]
  }
}
```

**Success Response (200) - Production Mode (Render.com):**
```json
{
  "success": true,
  "size": 45678,
  "timestamp": "2025-11-17T10-30-00-000Z",
  "mode": "production",
  "disease_prediction": {
    "disease": "Tomato_Early_blight",
    "confidence": 0.9523,
    "severity": "moderate",
    "remedies": ["..."],
    "description": "...",
    "prevention": ["..."]
  }
}
```

**Error Response (404):**
```json
{
  "error": "No frame available"
}
```

---

### 3. Get Camera Status

**Endpoint:** `GET /camera/status`

**React Native Implementation:**

```javascript
const getCameraStatus = async () => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/camera/status');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting camera status:', error);
  }
};
```

**Success Response (200):**
```json
{
  "esp32": {
    "connected": true,
    "lastUpdate": "2025-11-17T10:30:00.000Z",
    "frameCount": 1234,
    "fps": 15
  },
  "clients": 3,
  "uptime": 3600.5
}
```

---

### 4. Get Saved Images List (Development Only)

**Endpoint:** `GET /camera/images`

**Description:** Get list of all saved images (only works in development mode)

**React Native Implementation:**

```javascript
const getSavedImages = async () => {
  try {
    const response = await fetch('http://YOUR_SERVER_IP:3000/camera/images');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting images:', error);
  }
};
```

**Success Response (200):**
```json
{
  "images": [
    {
      "filename": "ESP32_CAM_2025-11-17T10-30-00-000Z.jpg",
      "path": "/uploads/ESP32_CAM_2025-11-17T10-30-00-000Z.jpg",
      "size": 45678,
      "created": "2025-11-17T10:30:00.000Z"
    }
  ]
}
```

---

### 5. Delete Saved Image (Development Only)

**Endpoint:** `DELETE /camera/images/:filename`

**React Native Implementation:**

```javascript
const deleteImage = async (filename) => {
  try {
    const response = await fetch(
      `http://YOUR_SERVER_IP:3000/camera/images/${filename}`,
      { method: 'DELETE' }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Image deleted"
}
```

**Error Response (404):**
```json
{
  "error": "Image not found"
}
```

---

### 6. Predict Disease from Saved Image (Development Only)

**Endpoint:** `POST /camera/predict/:filename`

**Description:** Predict disease from a previously saved image

**React Native Implementation:**

```javascript
const predictFromSavedImage = async (filename) => {
  try {
    const response = await fetch(
      `http://YOUR_SERVER_IP:3000/camera/predict/${filename}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error predicting:', error);
  }
};
```

**Success Response (200):**
```json
{
  "success": true,
  "filename": "ESP32_CAM_2025-11-17T10-30-00-000Z.jpg",
  "prediction": {
    "disease": "Tomato_Early_blight",
    "confidence": 0.9523,
    "severity": "moderate",
    "remedies": ["..."],
    "description": "...",
    "prevention": ["..."]
  },
  "top_predictions": [
    {
      "disease": "Tomato_Early_blight",
      "confidence": 0.9523
    },
    {
      "disease": "Tomato_Late_blight",
      "confidence": 0.0312
    }
  ]
}
```

---

## Complete React Native Component Example (Using Services)

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { cameraSocket } from './services/cameraSocket';
import { cameraApi } from './services/cameraApi';
import { carSocket, CarStatus } from './services/carSocket';
import { carApi } from './services/carApi';

const SERVER_URL = 'http://YOUR_SERVER_IP:3000';

const IoTController = () => {
  const [frameData, setFrameData] = useState<string | null>(null);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [carConnected, setCarConnected] = useState(false);
  const [carStatus, setCarStatus] = useState<CarStatus | null>(null);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    // Setup Camera WebSocket
    cameraSocket.connect(SERVER_URL);
    
    cameraSocket.on('connected', (connected: boolean) => {
      setCameraConnected(connected);
    });
    
    cameraSocket.on('frame', (data: any) => {
      setFrameData(`data:image/jpeg;base64,${data.image}`);
    });

    // Setup Car WebSocket
    carSocket.connect(SERVER_URL);
    
    carSocket.on('connected', (connected: boolean) => {
      setCarConnected(connected);
    });
    
    carSocket.on('status', (status: CarStatus) => {
      setCarStatus(status);
    });

    carSocket.on('acknowledgment', (data: any) => {
      console.log('Car command acknowledged:', data.command);
    });

    // Set API base URLs
    cameraApi.setBaseURL(SERVER_URL);
    carApi.setBaseURL(SERVER_URL);

    // Cleanup
    return () => {
      cameraSocket.disconnect();
      carSocket.disconnect();
    };
  }, []);

  const sendCarCommand = (command: 'forward' | 'backward' | 'left' | 'right' | 'stop', speed = 200) => {
    if (carSocket.isConnected()) {
      carSocket.sendCommand(command, speed);
    } else {
      Alert.alert('Error', 'Car not connected to server');
    }
  };

  const captureAndPredict = async () => {
    setIsCapturing(true);
    setPredictionResult(null);

    try {
      const data = await cameraApi.capture();

      if (data.success && data.disease_prediction) {
        setPredictionResult(data.disease_prediction);
        Alert.alert(
          'Disease Detected',
          `${data.disease_prediction.disease}\nConfidence: ${(
            data.disease_prediction.confidence * 100
          ).toFixed(1)}%`
        );
      } else {
        Alert.alert('Info', 'Image captured but no disease detected');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image');
      console.error(error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera Stream */}
      <View style={styles.cameraContainer}>
        <Text style={styles.title}>ESP32 Camera</Text>
        <Text
          style={[
            styles.status,
            { color: cameraConnected ? '#4CAF50' : '#F44336' },
          ]}
        >
          {cameraConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>

        {frameData ? (
          <Image
            source={{ uri: frameData }}
            style={styles.camera}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.noCamera}>
            <Text>No camera feed</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.disabledButton]}
          onPress={captureAndPredict}
          disabled={isCapturing || !cameraConnected}
        >
          <Text style={styles.buttonText}>
            {isCapturing ? 'Capturing...' : '📸 Capture & Predict'}
          </Text>
        </TouchableOpacity>

        {predictionResult && (
          <View style={styles.predictionCard}>
            <Text style={styles.predictionTitle}>
              🌱 {predictionResult.disease}
            </Text>
            <Text style={styles.predictionConfidence}>
              Confidence: {(predictionResult.confidence * 100).toFixed(1)}%
            </Text>
            <Text style={styles.predictionSeverity}>
              Severity: {predictionResult.severity}
            </Text>
            {predictionResult.remedies && (
              <View style={styles.remediesContainer}>
                <Text style={styles.remediesTitle}>💊 Remedies:</Text>
                {predictionResult.remedies.map((remedy, index) => (
                  <Text key={index} style={styles.remedyItem}>
                    • {remedy}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Car Controls */}
      <View style={styles.carContainer}>
        <Text style={styles.title}>Car Control</Text>
        <Text
          style={[
            styles.status,
            { color: carConnected ? '#4CAF50' : '#F44336' },
          ]}
        >
          {carConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.forwardButton]}
            onPress={() => sendCarCommand('forward', 200)}
            disabled={!carConnected}
          >
            <Text style={styles.controlText}>⬆️</Text>
          </TouchableOpacity>

          <View style={styles.horizontalControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => sendCarCommand('left', 200)}
              disabled={!carConnected}
            >
              <Text style={styles.controlText}>⬅️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={() => sendCarCommand('stop', 0)}
              disabled={!carConnected}
            >
              <Text style={styles.controlText}>⏹️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => sendCarCommand('right', 200)}
              disabled={!carConnected}
            >
              <Text style={styles.controlText}>➡️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.controlButton, styles.backwardButton]}
            onPress={() => sendCarCommand('backward', 200)}
            disabled={!carConnected}
          >
            <Text style={styles.controlText}>⬇️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  cameraContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    marginBottom: 10,
  },
  camera: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  noCamera: {
    width: '100%',
    height: 240,
    backgroundColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  predictionCard: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  predictionConfidence: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  predictionSeverity: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  remediesContainer: {
    marginTop: 8,
  },
  remediesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  remedyItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    marginLeft: 10,
  },
  controls: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  controlButton: {
    width: 70,
    height: 70,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
    margin: 5,
  },
  controlText: {
    fontSize: 30,
  },
  forwardButton: {
    marginBottom: 5,
  },
  backwardButton: {
    marginTop: 5,
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
});

export default IoTController;
```

---

## Environment Variables

Configure these in your `.env` file:

```env
PORT=3000
NODE_ENV=production
ML_SERVICE_URL=https://iot-ml-mib6.onrender.com
RENDER=true
```

---

## Error Handling Best Practices

```javascript
// Always handle connection errors
const safeAPICall = async (apiFunction) => {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.message.includes('Network request failed')) {
      Alert.alert(
        'Connection Error',
        'Cannot connect to server. Please check your connection.'
      );
    } else {
      Alert.alert('Error', error.message);
    }
    console.error('API Error:', error);
    return null;
  }
};

// Implement reconnection logic for WebSocket
const connectWithRetry = (maxRetries = 5) => {
  let retryCount = 0;
  
  const connect = () => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onclose = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Reconnecting... (${retryCount}/${maxRetries})`);
        setTimeout(connect, 3000 * retryCount);
      } else {
        Alert.alert('Connection Lost', 'Unable to reconnect to server');
      }
    };
  };
  
  connect();
};
```

---

## Notes

### 1. Using Services vs Raw API

**✅ Recommended: Use the Service Classes**
- `carSocket.ts` and `carApi.ts` for car control
- `cameraSocket.ts` and `cameraApi.ts` for camera operations

**Benefits:**
- ✅ Type-safe TypeScript interfaces
- ✅ Built-in error handling
- ✅ Auto-reconnection logic
- ✅ Event-driven architecture
- ✅ Cleaner, more maintainable code
- ✅ Consistent API across the app
- ✅ Better debugging with console logs

**Example Comparison:**

```typescript
// ❌ Without Services (verbose, error-prone)
const ws = new WebSocket('ws://192.168.0.115:3000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'car_ack') {
    // handle...
  }
};
ws.send(JSON.stringify({ command: 'forward', speed: 200 }));

// ✅ With Services (clean, type-safe)
carSocket.connect('http://192.168.0.115:3000');
carSocket.on('acknowledgment', (data) => console.log(data));
carSocket.sendCommand('forward', 200);
```

### 2. Production Mode (Render.com)

- Images are NOT saved on disk (ephemeral filesystem)
- Only prediction results are returned
- Image management endpoints (`/camera/images/*`) may not work

### 3. Development Mode

- Images are saved in `/uploads` directory
- Full image management available

### 4. WebSocket vs REST

- Use **WebSocket** (`carSocket`, `cameraSocket`) for real-time streaming and control
- Use **REST API** (`carApi`, `cameraApi`) for one-off commands or when WebSocket is not available

### 5. ML Service

- Hosted on Render.com (may have cold starts - first request slow)
- 15-second timeout for predictions
- Automatically processes images and returns disease predictions

### 6. Security

- In production, implement proper authentication
- Use HTTPS/WSS for secure connections
- Validate all inputs
- Rate limit car commands to prevent abuse

---

## Support

For issues or questions, please refer to the main project documentation.

**Server Repository:** IoT Backend  
**ML Service:** https://iot-ml-mib6.onrender.com


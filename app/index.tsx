import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsModal } from '../components/SettingsModal';
import { SocketCameraStream } from '../components/SocketCameraStream';
import "../global.css";
import { useCamera } from '../providers/CameraProvider';
import { cameraApi, DiseasePrediction } from '../services/cameraApi';

type ParsedDiseasePrediction = {
  plant: string;
  condition: string;
  confidence: number;
  severity: string;
  description: string;
  remedies: string[];
  followUp?: string;
  raw: DiseasePrediction;
};

const parsePrediction = (prediction: DiseasePrediction): ParsedDiseasePrediction => {
  const diseaseParts = typeof prediction.disease === 'string'
    ? prediction.disease.split('___')
    : [];
  const [plant = 'Unknown Plant', condition = 'Unknown Condition'] = diseaseParts;

  const guidance = prediction.guidance ?? {};
  const severityRaw = typeof guidance?.severity === 'string' ? guidance.severity.trim() : '';

  return {
    plant,
    condition,
    confidence: typeof prediction.confidence === 'number' ? prediction.confidence : 0,
    severity: severityRaw !== '' ? severityRaw.toLowerCase() : 'unknown',
    description: typeof guidance?.description === 'string' && guidance.description.trim() !== ''
      ? guidance.description
      : 'No description provided.',
    remedies: Array.isArray(guidance?.remedies) ? guidance.remedies : [],
    followUp: typeof guidance?.follow_up === 'string' ? guidance.follow_up : undefined,
    raw: prediction,
  };
};

export default function Index() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { backendUrl, isProduction, checkConnection } = useCamera();
  const [isCapturing, setIsCapturing] = useState(false);
  const [prediction, setPrediction] = useState<ParsedDiseasePrediction | null>(null);

  // Car control state
  const [carConnected, setCarConnected] = useState(false);
  const [carConnecting, setCarConnecting] = useState(false);
  const [carStatus, setCarStatus] = useState<any>(null);
  const [lastCarCommand, setLastCarCommand] = useState<string | null>(null);
  const [motorSpeed, setMotorSpeed] = useState(200);
  const [showCarControls, setShowCarControls] = useState(false);
  
  // WebSocket reference for car control
  const carWs = useRef<WebSocket | null>(null);
  const carReconnectAttempts = useRef(0);
  const maxCarReconnectAttempts = 5;

  useEffect(() => {
    // Update API base URL when backend URL changes
    cameraApi.setBaseURL(backendUrl);
    // Check connection on mount
    handleCheckConnection();
  }, [backendUrl]);

  const handleCheckConnection = async () => {
    setConnectionStatus('checking');
    const connected = await checkConnection();
    setConnectionStatus(connected ? 'connected' : 'disconnected');
    
    if (!connected) {
      Alert.alert(
        'Connection Failed',
        'Unable to connect to backend server. Please check settings.',
        [
          { text: 'Open Settings', onPress: () => setSettingsVisible(true) },
          { text: 'Retry', onPress: handleCheckConnection },
        ]
      );
    }
  };

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      console.log('📸 Capturing image with prediction...');
      console.log('🔗 Backend URL:', backendUrl);
      console.log('🎯 Capture endpoint:', `${backendUrl}/capture`);

      // Call backend API to capture and predict
      const result = await cameraApi.capture();

      if (result.success) {
        console.log('✅ Capture successful:', result.filename);
        console.log('💾 Image saved on backend server');
        
        // Store prediction if available
        if (result.disease_prediction) {
          const parsed = parsePrediction(result.disease_prediction);
          setPrediction(parsed);
          console.log('🌱 Disease detected:', result.disease_prediction.disease);
          console.log('🎯 Confidence:', (parsed.confidence * 100).toFixed(1) + '%');
        } else {
          setPrediction(null);
          console.log('⚠️  No prediction available');
        }

        // Show success message with prediction
        let message = '';
        if (result.disease_prediction) {
          const parsed = parsePrediction(result.disease_prediction);
          const severityLabel = parsed.severity ? parsed.severity.toUpperCase() : 'UNKNOWN';
          const remediesList = parsed.remedies.length > 0
            ? parsed.remedies.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')
            : 'No remedies provided.';

          message = `🌱 Plant: ${parsed.plant}\n🦠 Disease: ${parsed.condition}\n🎯 Confidence: ${(parsed.confidence * 100).toFixed(1)}%\n⚠️  Severity: ${severityLabel}\n\n`;
          message += `📋 Description:\n${parsed.description}\n\n`;
          message += `💊 Top Remedies:\n${remediesList}\n\n`;
        }
        
        message += `✅ Image saved on backend server\n📁 File: ${result.filename}`;
        
        Alert.alert(
          result.disease_prediction ? '🌱 Disease Detected!' : '📸 Image Captured',
          message,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Capture error:', error);
      
      let errorMessage = 'Failed to capture image.\n\n';
      
      if (error.response?.status === 404) {
        errorMessage += '❌ Backend endpoint not found (404)\n\n';
        errorMessage += 'Possible causes:\n';
        errorMessage += '• Backend server not running\n';
        errorMessage += '• Wrong backend URL\n';
        errorMessage += '• Route not registered\n\n';
        errorMessage += `Current URL: ${backendUrl}\n`;
        errorMessage += '\nTry:\n';
        errorMessage += '1. Check backend is running (npm run dev)\n';
        errorMessage += '2. Verify URL in Settings\n';
        errorMessage += `3. Test with browser: ${backendUrl}/status`;
      } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        errorMessage += '❌ Network connection failed\n\n';
        errorMessage += 'Check:\n';
        errorMessage += '• Backend server is running\n';
        errorMessage += `• Can reach: ${backendUrl}\n`;
        errorMessage += '• Firewall not blocking connection';
      } else if (error.response?.status === 500) {
        errorMessage += '❌ Backend server error\n\n';
        errorMessage += 'The backend encountered an error.\n';
        errorMessage += 'Check backend console logs.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      Alert.alert('Capture Failed', errorMessage, [
        { text: 'Open Settings', onPress: () => setSettingsVisible(true) },
        { text: 'OK' }
      ]);
    } finally {
      setIsCapturing(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      default: return 'Checking...';
    }
  };

  // Car Control Functions
  const connectCarWebSocket = () => {
    if (carWs.current?.readyState === WebSocket.OPEN) {
      Alert.alert('Info', 'Car already connected');
      return;
    }

    setCarConnecting(true);
    carReconnectAttempts.current = 0;

    try {
      // Extract IP and port from backendUrl (e.g., "http://192.168.0.115:3000")
      const url = backendUrl.replace('http://', '').replace('https://', '');
      const wsUrl = `ws://${url}/ws`;
      console.log('🚗 Connecting car to:', wsUrl);
      
      carWs.current = new WebSocket(wsUrl);

      carWs.current.onopen = () => {
        console.log('✅ Car WebSocket Connected');
        setCarConnected(true);
        setCarConnecting(false);
        carReconnectAttempts.current = 0;
      };

      carWs.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'car_status') {
            setCarStatus(data.data);
          } else if (data.type === 'car_ack') {
            setLastCarCommand(data.command);
            console.log('✅ Car command acknowledged:', data.command);
          }
        } catch (error) {
          console.error('❌ Error parsing car message:', error);
        }
      };

      carWs.current.onerror = (error) => {
        console.error('❌ Car WebSocket Error:', error);
        setCarConnecting(false);
        
        if (carReconnectAttempts.current < maxCarReconnectAttempts) {
          carReconnectAttempts.current++;
          setTimeout(() => {
            console.log(`🔄 Car reconnect attempt ${carReconnectAttempts.current}/${maxCarReconnectAttempts}`);
            connectCarWebSocket();
          }, 2000);
        }
      };

      carWs.current.onclose = (event) => {
        console.log('🔌 Car WebSocket Disconnected', event.code);
        setCarConnected(false);
        setCarConnecting(false);
        
        // Auto-reconnect if not manually closed
        if (event.code !== 1000 && carReconnectAttempts.current < maxCarReconnectAttempts) {
          carReconnectAttempts.current++;
          setTimeout(() => {
            console.log(`🔄 Car auto-reconnecting... (${carReconnectAttempts.current}/${maxCarReconnectAttempts})`);
            connectCarWebSocket();
          }, 3000);
        }
      };

    } catch (error: any) {
      console.error('❌ Car connection error:', error);
      setCarConnecting(false);
      Alert.alert('Error', 'Failed to connect car: ' + error.message);
    }
  };

  const disconnectCarWebSocket = () => {
    carReconnectAttempts.current = maxCarReconnectAttempts; // Prevent auto-reconnect
    if (carWs.current) {
      carWs.current.close(1000, 'User disconnected');
      carWs.current = null;
    }
    setCarConnected(false);
    setCarStatus(null);
    setLastCarCommand(null);
  };

  const sendCarCommand = (command: string) => {
    if (!carWs.current || carWs.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Error', 'Car not connected to server');
      return;
    }

    if (!carStatus?.connected) {
      Alert.alert('Error', 'ESP32 car is not connected to server');
      return;
    }

    const message = JSON.stringify({
      command: command,
      speed: motorSpeed,
    });

    carWs.current.send(message);
    setLastCarCommand(command);
    console.log('📤 Car command sent:', command, 'speed:', motorSpeed);
  };

  // Cleanup car WebSocket on unmount
  useEffect(() => {
    return () => {
      if (carWs.current) {
        carWs.current.close();
      }
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      
      <View className="flex-1 px-4 pt-2 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <View className="flex-row items-center">
              <Text className="text-white text-3xl font-bold">ESP32 IoT Hub</Text>
              <View className="ml-3 bg-blue-600 px-2 py-1 rounded-lg">
                <Text className="text-white text-xs font-bold">WebSocket</Text>
              </View>
            </View>
            <View className="flex-row items-center mt-2">
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: getStatusColor() }}
              />
              <Text className="text-gray-400 text-sm">
                Camera: {getStatusText()}
              </Text>
              {carConnected && (
                <>
                  <View className="w-1 h-1 rounded-full mx-2 bg-gray-600" />
                  <View className="w-2 h-2 rounded-full mr-2 bg-green-500" />
                  <Text className="text-gray-400 text-sm">Car: Connected</Text>
                </>
              )}
            </View>
            <Text className="text-gray-500 text-xs mt-1">
              {backendUrl.replace('http://', '').replace('https://', '')}
            </Text>
          </View>
          
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleCheckConnection}
              className="bg-gray-800 p-3 rounded-2xl active:opacity-70"
            >
              <MaterialIcons name="refresh" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSettingsVisible(true)}
              className="bg-gray-800 p-3 rounded-2xl active:opacity-70"
            >
              <MaterialIcons name="settings" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Stream */}
        <View className="flex-1 mb-4">
          {connectionStatus === 'connected' ? (
            <SocketCameraStream
              backendUrl={backendUrl}
              onError={() => setConnectionStatus('disconnected')}
              onConnected={() => setConnectionStatus('connected')}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-gray-900 rounded-3xl">
              <MaterialIcons
                name={connectionStatus === 'checking' ? 'wifi-tethering' : 'videocam-off'}
                size={80}
                color="#6B7280"
              />
              <Text className="text-gray-400 text-xl font-semibold mt-4">
                {connectionStatus === 'checking' ? 'Connecting...' : 'Camera Offline'}
              </Text>
              <Text className="text-gray-500 text-center mt-2 px-8">
                {connectionStatus === 'checking'
                  ? 'Establishing connection to backend server'
                  : 'Check your backend server and network connection'}
              </Text>
              <TouchableOpacity
                onPress={() => setSettingsVisible(true)}
                className="mt-6 bg-blue-600 px-6 py-3 rounded-2xl active:opacity-80"
              >
                <Text className="text-white font-semibold">Open Settings</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Disease Prediction Card */}
        {prediction && (
          <View className="bg-gradient-to-br from-green-900/40 to-blue-900/40 rounded-3xl p-4 mb-4 border border-green-500/30">
            <View className="flex-row items-center mb-3">
              <MaterialIcons name="local-florist" size={24} color="#10B981" />
              <Text className="text-white text-xl font-bold ml-2">Disease Analysis</Text>
              <TouchableOpacity 
                onPress={() => setPrediction(null)}
                className="ml-auto"
              >
                <MaterialIcons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="max-h-48">
              <View className="space-y-3">
                {/* Plant & Disease */}
                <View className="flex-row justify-between items-center bg-gray-900/50 p-3 rounded-xl">
                  <View>
                    <Text className="text-gray-400 text-xs uppercase">Plant</Text>
                    <Text className="text-white font-bold text-lg">{prediction.plant}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-400 text-xs uppercase">Disease</Text>
                    <Text className="text-red-400 font-bold text-lg">{prediction.condition}</Text>
                  </View>
                </View>

                {/* Confidence & Severity */}
                <View className="flex-row gap-2">
                  <View className="flex-1 bg-gray-900/50 p-3 rounded-xl">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Confidence</Text>
                    <Text className="text-green-400 font-bold text-2xl">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-1 bg-gray-900/50 p-3 rounded-xl">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Severity</Text>
                    <Text 
                      className="font-bold text-2xl capitalize"
                      style={{ 
                        color: prediction.severity === 'critical' ? '#EF4444' :
                               prediction.severity === 'high' ? '#F97316' :
                               prediction.severity === 'moderate' ? '#F59E0B' : '#10B981'
                      }}
                    >
                      {prediction.severity}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <View className="bg-gray-900/50 p-3 rounded-xl">
                  <Text className="text-gray-400 text-xs uppercase mb-1">Description</Text>
                  <Text className="text-gray-300 text-sm">{prediction.description}</Text>
                </View>

                {/* Remedies */}
                <View className="bg-gray-900/50 p-3 rounded-xl">
                  <Text className="text-gray-400 text-xs uppercase mb-2">Recommended Actions</Text>
                  {prediction.remedies.map((remedy, index) => (
                    <View key={index} className="flex-row items-start mb-2">
                      <Text className="text-green-400 mr-2">•</Text>
                      <Text className="text-gray-300 text-sm flex-1">{remedy}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Car Control Panel */}
        {showCarControls && (
          <View className="bg-gray-900 rounded-3xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <MaterialIcons name="directions-car" size={24} color="#3B82F6" />
                <Text className="text-white text-xl font-bold ml-2">Car Control</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCarControls(false)}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Car Connection Status */}
            <View className="bg-gray-800 rounded-2xl p-3 mb-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-400 text-sm">WebSocket:</Text>
                <Text className={`font-bold ${carConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {carConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </Text>
              </View>
              {carStatus && (
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-gray-400 text-sm">ESP32 Car:</Text>
                  <Text className={`font-bold ${carStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                    {carStatus.connected ? '🟢 Online' : '🔴 Offline'}
                  </Text>
                </View>
              )}
              {lastCarCommand && (
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-gray-400 text-sm">Last Command:</Text>
                  <Text className="text-white font-bold uppercase">{lastCarCommand}</Text>
                </View>
              )}
            </View>

            {/* Connection Button */}
            {!carConnected && !carConnecting ? (
              <TouchableOpacity
                onPress={connectCarWebSocket}
                className="bg-green-600 py-3 rounded-2xl mb-4 active:opacity-80"
              >
                <Text className="text-white font-bold text-center">Connect to Car</Text>
              </TouchableOpacity>
            ) : carConnecting ? (
              <View className="bg-gray-800 py-3 rounded-2xl mb-4">
                <Text className="text-blue-400 font-bold text-center">Connecting...</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={disconnectCarWebSocket}
                className="bg-red-600 py-3 rounded-2xl mb-4 active:opacity-80"
              >
                <Text className="text-white font-bold text-center">Disconnect Car</Text>
              </TouchableOpacity>
            )}

            {/* Motor Speed Control */}
            <View className="bg-gray-800 rounded-2xl p-3 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-400 text-sm">Motor Speed</Text>
                <Text className="text-white font-bold">{motorSpeed}/255</Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setMotorSpeed(Math.max(0, motorSpeed - 25))}
                  className="bg-gray-700 px-4 py-2 rounded-xl active:opacity-70"
                >
                  <Text className="text-white font-bold">-</Text>
                </TouchableOpacity>
                <TextInput
                  className="flex-1 bg-gray-700 text-white text-center rounded-xl px-3 py-2 font-bold"
                  value={motorSpeed.toString()}
                  onChangeText={(text) => {
                    const speed = parseInt(text) || 0;
                    setMotorSpeed(Math.max(0, Math.min(255, speed)));
                  }}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={() => setMotorSpeed(Math.min(255, motorSpeed + 25))}
                  className="bg-gray-700 px-4 py-2 rounded-xl active:opacity-70"
                >
                  <Text className="text-white font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Directional Controls */}
            {carConnected && carStatus?.connected && (
              <View>
                <Text className="text-gray-400 text-sm text-center mb-3">
                  Hold buttons to move, release to stop
                </Text>
                
                {/* Forward Button */}
                <TouchableOpacity
                  onPressIn={() => sendCarCommand('forward')}
                  onPressOut={() => sendCarCommand('stop')}
                  className="bg-green-600 py-4 rounded-2xl mb-2 active:opacity-80"
                >
                  <Text className="text-white font-bold text-center text-lg">⬆️ FORWARD</Text>
                </TouchableOpacity>

                {/* Left, Stop, Right Row */}
                <View className="flex-row gap-2 mb-2">
                  <TouchableOpacity
                    onPressIn={() => sendCarCommand('left')}
                    onPressOut={() => sendCarCommand('stop')}
                    className="flex-1 bg-blue-600 py-4 rounded-2xl active:opacity-80"
                  >
                    <Text className="text-white font-bold text-center text-lg">⬅️ LEFT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => sendCarCommand('stop')}
                    className="flex-1 bg-red-600 py-4 rounded-2xl active:opacity-80"
                  >
                    <Text className="text-white font-bold text-center text-lg">🛑 STOP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPressIn={() => sendCarCommand('right')}
                    onPressOut={() => sendCarCommand('stop')}
                    className="flex-1 bg-blue-600 py-4 rounded-2xl active:opacity-80"
                  >
                    <Text className="text-white font-bold text-center text-lg">➡️ RIGHT</Text>
                  </TouchableOpacity>
                </View>

                {/* Backward Button */}
                <TouchableOpacity
                  onPressIn={() => sendCarCommand('backward')}
                  onPressOut={() => sendCarCommand('stop')}
                  className="bg-orange-600 py-4 rounded-2xl active:opacity-80"
                >
                  <Text className="text-white font-bold text-center text-lg">⬇️ BACKWARD</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Control Panel */}
        <View className="bg-gray-900 rounded-3xl p-4">
          <View className="flex-row gap-3">
            {/* Capture Button */}
            <TouchableOpacity
              onPress={handleCapture}
              disabled={connectionStatus !== 'connected' || isCapturing}
              className={`flex-1 flex-row items-center justify-center py-5 rounded-2xl ${
                connectionStatus === 'connected' && !isCapturing
                  ? 'bg-blue-600 active:opacity-80'
                  : 'bg-gray-800'
              }`}
            >
              <MaterialIcons
                name={isCapturing ? 'hourglass-empty' : 'camera'}
                size={28}
                color={connectionStatus === 'connected' && !isCapturing ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                className={`ml-3 text-lg font-bold ${
                  connectionStatus === 'connected' && !isCapturing
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                {isCapturing ? 'Capturing...' : 'Capture'}
              </Text>
            </TouchableOpacity>

            {/* Car Control Toggle Button */}
            <TouchableOpacity
              onPress={() => setShowCarControls(!showCarControls)}
              className={`${showCarControls ? 'bg-blue-600' : 'bg-gray-800'} p-5 rounded-2xl active:opacity-70`}
            >
              <MaterialIcons name="directions-car" size={28} color={showCarControls ? '#FFFFFF' : '#3B82F6'} />
            </TouchableOpacity>

            {/* Info Button */}
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'ESP32 IoT Hub',
                  `Mode: WebSocket + HTTP API\n\nBackend URL: ${backendUrl}\n\nDevice: Physical Device\n\nFeatures:\n━━━━━━━━━━━━━━━━━\nCamera:\n• Real-time streaming\n• AI Disease Prediction\n• VGA resolution (~10 FPS)\n• Plant disease detection\n\nCar Control:\n• WebSocket control\n• Forward/Backward/Left/Right\n• Adjustable motor speed\n• Real-time command feedback`,
                  [{ text: 'OK' }]
                );
              }}
              className="bg-gray-800 p-5 rounded-2xl active:opacity-70"
            >
              <MaterialIcons name="info-outline" size={28} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View className="flex-row justify-around mt-4 pt-4 border-t border-gray-800">
            <View className="items-center">
              <Text className="text-gray-500 text-xs uppercase tracking-wider mb-1">Device</Text>
              <Text className="text-white font-bold text-sm">Physical</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-xs uppercase tracking-wider mb-1">Resolution</Text>
              <Text className="text-white font-bold text-sm">VGA</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-xs uppercase tracking-wider mb-1">Frame Rate</Text>
              <Text className="text-white font-bold text-sm">~10 FPS</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-xs uppercase tracking-wider mb-1">Format</Text>
              <Text className="text-white font-bold text-sm">JPEG</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </SafeAreaView>
  );
}

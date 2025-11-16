/**
 * React Native Car Control Component
 * 
 * This component allows you to control an ESP32 car via WebSocket
 * Copy this code into your React Native app
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

const CarControl = () => {
  // Connection state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // Car state
  const [carStatus, setCarStatus] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  
  // Configuration
  const [serverIP, setServerIP] = useState('192.168.0.115');
  const [serverPort, setServerPort] = useState('3000');
  const [motorSpeed, setMotorSpeed] = useState(200);
  
  // WebSocket reference
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  const connectWebSocket = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      Alert.alert('Info', 'Already connected');
      return;
    }

    setConnecting(true);
    reconnectAttempts.current = 0;

    try {
      const wsUrl = `ws://${serverIP}:${serverPort}/ws`;
      console.log('🔌 Connecting to:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket Connected');
        setConnected(true);
        setConnecting(false);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'car_status') {
            setCarStatus(data.data);
          } else if (data.type === 'car_ack') {
            setLastCommand(data.command);
            console.log('✅ Command acknowledged:', data.command);
          } else if (data.type === 'error') {
            Alert.alert('Error', data.message || 'An error occurred');
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket Error:', error);
        setConnecting(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => {
            console.log(`🔄 Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
            connectWebSocket();
          }, 2000);
        } else {
          Alert.alert(
            'Connection Failed',
            `Failed to connect after ${maxReconnectAttempts} attempts.\n\n` +
            'Please check:\n' +
            '• Server IP address is correct\n' +
            '• Server is running\n' +
            '• Both devices are on same network'
          );
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket Disconnected', event.code, event.reason);
        setConnected(false);
        setConnecting(false);
        
        // Auto-reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => {
            console.log(`🔄 Auto-reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connectWebSocket();
          }, 3000);
        }
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      setConnecting(false);
      Alert.alert('Error', 'Failed to create WebSocket connection: ' + error.message);
    }
  };

  /**
   * Disconnect from WebSocket server
   */
  const disconnectWebSocket = () => {
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
    if (ws.current) {
      ws.current.close(1000, 'User disconnected');
      ws.current = null;
    }
    setConnected(false);
    setCarStatus(null);
    setLastCommand(null);
  };

  /**
   * Send car control command
   */
  const sendCommand = (command) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    if (!carStatus?.connected) {
      Alert.alert('Error', 'Car is not connected');
      return;
    }

    const message = JSON.stringify({
      command: command,
      speed: motorSpeed,
    });

    ws.current.send(message);
    setLastCommand(command);
    console.log('📤 Command sent:', command);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚗 Car Control</Text>
      </View>

      {/* Configuration Section */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Server IP (e.g., 192.168.0.115)"
          value={serverIP}
          onChangeText={setServerIP}
          editable={!connected && !connecting}
          keyboardType="numeric"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Port (default: 3000)"
          value={serverPort}
          onChangeText={setServerPort}
          editable={!connected && !connecting}
          keyboardType="numeric"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Motor Speed (0-255)"
          value={motorSpeed.toString()}
          onChangeText={(text) => {
            const speed = parseInt(text) || 200;
            setMotorSpeed(Math.max(0, Math.min(255, speed)));
          }}
          keyboardType="numeric"
        />
      </View>

      {/* Connection Controls */}
      <View style={styles.buttonContainer}>
        {!connected && !connecting ? (
          <TouchableOpacity
            style={[styles.button, styles.connectButton]}
            onPress={connectWebSocket}
          >
            <Text style={styles.buttonText}>Connect to Server</Text>
          </TouchableOpacity>
        ) : connecting ? (
          <View style={styles.connectingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.connectingText}>Connecting...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.disconnectButton]}
            onPress={disconnectWebSocket}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>WebSocket:</Text>
          <Text style={[styles.statusValue, connected && styles.statusConnected]}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
        </View>
        
        {carStatus && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Car:</Text>
            <Text style={[styles.statusValue, carStatus.connected && styles.statusConnected]}>
              {carStatus.connected ? '🟢 Online' : '🔴 Offline'}
            </Text>
          </View>
        )}
        
        {lastCommand && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Command:</Text>
            <Text style={styles.statusValue}>{lastCommand.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Control Buttons */}
      {connected && carStatus?.connected && (
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Car Controls</Text>
          
          {/* Forward Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.forwardButton]}
            onPress={() => sendCommand('forward')}
            onPressIn={() => sendCommand('forward')}
            onPressOut={() => sendCommand('stop')}
          >
            <Text style={styles.controlButtonText}>⬆️ FORWARD</Text>
          </TouchableOpacity>

          {/* Left/Right Row */}
          <View style={styles.horizontalControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.leftButton]}
              onPress={() => sendCommand('left')}
              onPressIn={() => sendCommand('left')}
              onPressOut={() => sendCommand('stop')}
            >
              <Text style={styles.controlButtonText}>⬅️ LEFT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={() => sendCommand('stop')}
            >
              <Text style={styles.controlButtonText}>🛑 STOP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.rightButton]}
              onPress={() => sendCommand('right')}
              onPressIn={() => sendCommand('right')}
              onPressOut={() => sendCommand('stop')}
            >
              <Text style={styles.controlButtonText}>➡️ RIGHT</Text>
            </TouchableOpacity>
          </View>

          {/* Backward Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.backwardButton]}
            onPress={() => sendCommand('backward')}
            onPressIn={() => sendCommand('backward')}
            onPressOut={() => sendCommand('stop')}
          >
            <Text style={styles.controlButtonText}>⬇️ BACKWARD</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          💡 Hold buttons to move, release to stop
        </Text>
        <Text style={styles.infoText}>
          📡 Server: ws://{serverIP}:{serverPort}/ws
        </Text>
        <Text style={styles.infoText}>
          ⚙️ Speed: {motorSpeed}/255
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  configSection: {
    padding: 15,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
    fontSize: 16,
  },
  buttonContainer: {
    margin: 10,
    marginTop: 0,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  connectingText: {
    marginLeft: 10,
    color: '#2196F3',
    fontSize: 16,
  },
  statusSection: {
    padding: 15,
    backgroundColor: 'white',
    margin: 10,
    marginTop: 0,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  statusConnected: {
    color: '#4CAF50',
  },
  controlSection: {
    padding: 15,
    backgroundColor: 'white',
    margin: 10,
    marginTop: 0,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlButton: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  forwardButton: {
    backgroundColor: '#4CAF50',
  },
  backwardButton: {
    backgroundColor: '#FF9800',
  },
  leftButton: {
    backgroundColor: '#2196F3',
    flex: 1,
    marginRight: 5,
  },
  rightButton: {
    backgroundColor: '#2196F3',
    flex: 1,
    marginLeft: 5,
  },
  stopButton: {
    backgroundColor: '#f44336',
    flex: 1,
    marginHorizontal: 5,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  infoSection: {
    padding: 15,
    margin: 10,
    marginTop: 0,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 5,
  },
});

export default CarControl;


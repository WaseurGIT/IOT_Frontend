/**
 * Car Control WebSocket Service
 * Manages real-time WebSocket connection for ESP32 car control
 */

export interface CarStatus {
  connected: boolean;
  lastUpdate: string;
  status: string;
  lastCommand?: string;
  lastCommandTime?: string;
  deviceInfo?: string;
}

export interface CarCommand {
  command: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  speed: number;
  timestamp?: number;
}

class CarSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000; // 2 seconds
  private wsUrl: string = '';

  /**
   * Convert HTTP/HTTPS URL to WebSocket URL
   */
  private convertToWebSocketUrl(backendUrl: string): string {
    try {
      const url = new URL(backendUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws`;
    } catch (error) {
      // If URL parsing fails, try simple string replacement
      if (backendUrl.startsWith('http://')) {
        return backendUrl.replace('http://', 'ws://') + '/ws';
      } else if (backendUrl.startsWith('https://')) {
        return backendUrl.replace('https://', 'wss://') + '/ws';
      } else if (backendUrl.startsWith('ws://') || backendUrl.startsWith('wss://')) {
        // Already a WebSocket URL, just ensure /ws path
        return backendUrl.endsWith('/ws') ? backendUrl : backendUrl + '/ws';
      }
      // Default to ws://
      return `ws://${backendUrl}/ws`;
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(backendUrl: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('🚗 Car already connected to WebSocket');
      return this.socket;
    }

    // Convert HTTP URL to WebSocket URL
    this.wsUrl = this.convertToWebSocketUrl(backendUrl);
    console.log(`🚗 Connecting car to: ${this.wsUrl}`);

    this.connectWebSocket();
    return this.socket;
  }

  private connectWebSocket() {
    try {
      // Close existing connection if any
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      const ws = new WebSocket(this.wsUrl);
      this.socket = ws;

      ws.onopen = () => {
        console.log('✅ Car WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Clear any pending reconnection
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        
        this.emit('connected', true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'car_status':
              // Car status update
              this.emit('status', message.data as CarStatus);
              break;
              
            case 'car_ack':
              // Command acknowledgment from ESP32 car
              this.emit('acknowledgment', {
                command: message.command,
                status: message.status
              });
              break;
              
            case 'car_connected':
              // ESP32 car device connected
              this.emit('device_connected', {
                device: message.device,
                status: message.status
              });
              break;
              
            case 'car_disconnected':
              // ESP32 car device disconnected
              this.emit('device_disconnected', true);
              break;
              
            case 'error':
              // Error from server
              console.error('❌ Car control error:', message.message);
              this.emit('error', message.message);
              break;
              
            default:
              console.log('📨 Unknown car message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Failed to parse car WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('🚨 Car WebSocket error:', error);
        this.emit('error', error);
      };

      ws.onclose = (event) => {
        console.log('❌ Car WebSocket disconnected', event.code, event.reason);
        this.emit('connected', false);
        
        // Auto-reconnect if not manually closed
        if (event.code !== 1000) { // Not a normal closure
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Failed to create car WebSocket:', error);
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max car reconnection attempts reached');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting car... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectDelay);
  }

  /**
   * Send car control command
   */
  sendCommand(command: CarCommand['command'], speed: number = 200): boolean {
    if (!this.isConnected()) {
      console.error('❌ Cannot send command: Car WebSocket not connected');
      return false;
    }

    const message: CarCommand = {
      command,
      speed,
      timestamp: Date.now()
    };

    try {
      this.socket?.send(JSON.stringify(message));
      console.log('📤 Car command sent:', command, 'speed:', speed);
      return true;
    } catch (error) {
      console.error('❌ Failed to send car command:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting car WebSocket...');
      
      // Clear reconnection timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Close with normal closure code (1000) to prevent auto-reconnect
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get WebSocket instance
   */
  getSocket(): WebSocket | null {
    return this.socket;
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }
}

// Export singleton instance
export const carSocket = new CarSocketService();


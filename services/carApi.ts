/**
 * Car Control REST API Service
 * Alternative HTTP-based car control for when WebSocket is not available
 */

import axios from 'axios';

export interface CarStatus {
  connected: boolean;
  lastUpdate: string;
  status: string;
  lastCommand?: string;
  lastCommandTime?: string;
  deviceInfo?: string;
}

export interface CarControlResponse {
  success: boolean;
  command: string;
  speed: number;
  timestamp: string;
  message?: string;
  error?: string;
}

export interface CarStatusResponse {
  car: CarStatus;
  server: {
    uptime: number;
    connectedClients: number;
  };
}

export interface ClientsResponse {
  totalClients: number;
  carConnected: boolean;
  cameraConnected: boolean;
  webClients: number;
  clients: any[];
}

class CarAPI {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Set base URL for API requests
   */
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  /**
   * Send car control command via REST API
   * @param command - forward, backward, left, right, or stop
   * @param speed - Motor speed (0-255)
   */
  async sendCommand(
    command: 'forward' | 'backward' | 'left' | 'right' | 'stop',
    speed: number = 200
  ): Promise<CarControlResponse> {
    try {
      console.log('🚗 Sending car command:', command, 'speed:', speed);
      const response = await axios.post<CarControlResponse>(
        `${this.baseURL}/car/control`,
        {
          command,
          speed
        },
        { timeout: 5000 }
      );
      console.log('✅ Car command response:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Car command error:');
      console.error('  - URL:', `${this.baseURL}/car/control`);
      console.error('  - Status:', error.response?.status);
      console.error('  - Message:', error.message);
      console.error('  - Data:', error.response?.data);
      throw error;
    }
  }

  /**
   * Get car status
   */
  async getStatus(): Promise<CarStatusResponse> {
    try {
      const response = await axios.get<CarStatusResponse>(
        `${this.baseURL}/car/status`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error: any) {
      console.error('Status error:', error);
      throw error;
    }
  }

  /**
   * Get connected clients information
   */
  async getClients(): Promise<ClientsResponse> {
    try {
      const response = await axios.get<ClientsResponse>(
        `${this.baseURL}/car/clients`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error: any) {
      console.error('Clients error:', error);
      throw error;
    }
  }

  /**
   * Send multiple commands in sequence
   * Useful for complex movements
   */
  async sendCommandSequence(
    commands: Array<{ command: 'forward' | 'backward' | 'left' | 'right' | 'stop'; speed?: number; delay?: number }>
  ): Promise<void> {
    for (const cmd of commands) {
      await this.sendCommand(cmd.command, cmd.speed || 200);
      if (cmd.delay) {
        await new Promise(resolve => setTimeout(resolve, cmd.delay));
      }
    }
  }

  /**
   * Emergency stop - send stop command immediately
   */
  async emergencyStop(): Promise<CarControlResponse> {
    return this.sendCommand('stop', 0);
  }
}

// Export singleton instance with default URL
export const carApi = new CarAPI('http://192.168.0.115:3000');
export default carApi;


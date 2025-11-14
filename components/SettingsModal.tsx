import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCamera } from '../providers/CameraProvider';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { backendUrl, setBackendUrl, isProduction, setIsProduction, checkConnection } = useCamera();

  const [tempBackendUrl, setTempBackendUrl] = useState(backendUrl);
  const [tempIsProduction, setTempIsProduction] = useState(isProduction);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Update temp values when modal opens
  React.useEffect(() => {
    if (visible) {
      setTempBackendUrl(backendUrl);
      setTempIsProduction(isProduction);
    }
  }, [visible, backendUrl, isProduction]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Temporarily update URL for testing
    const originalUrl = backendUrl;
    await setBackendUrl(tempBackendUrl);
    
    const isConnected = await checkConnection();
    setTestResult(isConnected ? 'success' : 'error');
    
    if (!isConnected) {
      // Revert to original URL if test failed
      await setBackendUrl(originalUrl);
      setTempBackendUrl(originalUrl);
    }
    
    setIsTesting(false);
  };

  const handleSave = () => {
    setIsProduction(tempIsProduction);
    setBackendUrl(tempBackendUrl);
    setTestResult(null);
    onClose();
  };

  const handleProductionToggle = (value: boolean) => {
    setTempIsProduction(value);
    if (value) {
      // Switch to production URL
      setTempBackendUrl('https://iot-backend-uy96.onrender.com');
    } else {
      // Switch to local development URL
      if (Platform.OS === 'android') {
        setTempBackendUrl('http://10.0.2.2:3000');
      } else if (Platform.OS === 'ios') {
        setTempBackendUrl('http://localhost:3000');
      } else {
        setTempBackendUrl('http://192.168.0.115:3000');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 items-center justify-center p-6">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="w-full max-w-md"
        >
          <View className="bg-gray-900 rounded-3xl p-6 shadow-2xl max-h-[90%]">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <MaterialIcons name="settings" size={28} color="#3B82F6" />
                <Text className="text-white text-2xl font-bold ml-3">Settings</Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Info Banner */}
              <View className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-4 mb-6">
                <View className="flex-row items-start">
                  <MaterialIcons name="flash-on" size={20} color="#60A5FA" style={{ marginTop: 2 }} />
                  <View className="flex-1 ml-3">
                    <Text className="text-blue-300 font-bold text-sm mb-1">WebSocket Mode</Text>
                    <Text className="text-blue-300/80 text-xs">
                      Real-time streaming via WebSocket. Supports local and production servers.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Production Mode Toggle */}
              <View className="mb-6">
                <Text className="text-gray-400 text-sm font-semibold mb-3 uppercase tracking-wider">
                  Deployment Mode
                </Text>
                <View className="bg-gray-800 rounded-2xl p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-lg mb-1">
                        {tempIsProduction ? 'Production Mode' : 'Local Development'}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {tempIsProduction
                          ? 'Connected to Render.com production server'
                          : 'Connected to local development server'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleProductionToggle(!tempIsProduction)}
                      className={`w-14 h-8 rounded-full p-1 ${
                        tempIsProduction ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <View
                        className={`w-6 h-6 rounded-full bg-white transition-all ${
                          tempIsProduction ? 'ml-6' : 'ml-0'
                        }`}
                      />
                    </TouchableOpacity>
                  </View>
                  {tempIsProduction && (
                    <View className="mt-3 pt-3 border-t border-gray-700">
                      <Text className="text-yellow-400 text-xs">
                        ⚠️ Production mode may have slower initial connection (cold start)
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Backend URL Input */}
              <View className="mb-6">
                <Text className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
                  Backend Server URL
                </Text>
                <TextInput
                  value={tempBackendUrl}
                  onChangeText={setTempBackendUrl}
                  placeholder="http://10.0.2.2:3000"
                  placeholderTextColor="#6B7280"
                  className="bg-gray-800 text-white px-4 py-4 rounded-2xl text-lg border-2 border-gray-700 focus:border-blue-500"
                />
                
                {/* Quick Select Buttons */}
                {!tempIsProduction && (
                  <View className="mt-3 bg-gray-800 rounded-xl p-3">
                    <Text className="text-gray-400 text-xs font-semibold mb-2">Quick Select (Local):</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {Platform.OS === 'android' && (
                        <TouchableOpacity
                          onPress={() => {
                            setTempBackendUrl('http://10.0.2.2:3000');
                            setTempIsProduction(false);
                          }}
                          className="bg-gray-700 px-3 py-2 rounded-lg active:opacity-70"
                        >
                          <Text className="text-blue-400 text-xs font-semibold">Emulator</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setTempBackendUrl('http://localhost:3000');
                          setTempIsProduction(false);
                        }}
                        className="bg-gray-700 px-3 py-2 rounded-lg active:opacity-70"
                      >
                        <Text className="text-blue-400 text-xs font-semibold">Localhost</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setTempBackendUrl('http://192.168.0.115:3000');
                          setTempIsProduction(false);
                        }}
                        className="bg-gray-700 px-3 py-2 rounded-lg active:opacity-70"
                      >
                        <Text className="text-blue-400 text-xs font-semibold">LAN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {tempIsProduction && (
                  <View className="mt-3 bg-gray-800 rounded-xl p-3">
                    <Text className="text-gray-400 text-xs font-semibold mb-2">Production Server:</Text>
                    <View className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                      <Text className="text-green-400 text-sm font-semibold">
                        {tempBackendUrl}
                      </Text>
                      <Text className="text-green-400/70 text-xs mt-1">
                        Secure WebSocket (WSS) connection
                      </Text>
                    </View>
                  </View>
                )}

                {/* Help Text */}
                {!tempIsProduction && (
                  <View className="mt-3 bg-gray-800 rounded-xl p-3">
                    <Text className="text-gray-400 text-xs leading-relaxed">
                      <Text className="font-bold">Android Emulator:</Text> use 10.0.2.2{'\n'}
                      <Text className="font-bold">iOS Simulator:</Text> use localhost{'\n'}
                      <Text className="font-bold">Physical Device:</Text> use your computer's IP (192.168.x.x)
                    </Text>
                  </View>
                )}
                {tempIsProduction && (
                  <View className="mt-3 bg-gray-800 rounded-xl p-3">
                    <Text className="text-gray-400 text-xs leading-relaxed">
                      <Text className="font-bold">Production Mode:</Text>{'\n'}
                      • First connection may take 30-60 seconds (cold start){'\n'}
                      • Uses secure WebSocket (WSS) protocol{'\n'}
                      • Works from anywhere with internet connection{'\n'}
                      • Service may sleep after 15 minutes of inactivity
                    </Text>
                  </View>
                )}
              </View>

              {/* Test Connection */}
              <TouchableOpacity
                onPress={handleTestConnection}
                disabled={isTesting}
                className={`flex-row items-center justify-center py-4 rounded-2xl mb-4 ${
                  isTesting ? 'bg-gray-700' : 'bg-gray-800'
                }`}
              >
                {isTesting ? (
                  <>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text className="text-blue-400 font-semibold ml-3">Testing...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="wifi-tethering" size={20} color="#3B82F6" />
                    <Text className="text-blue-400 font-semibold ml-2">Test Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Test Result */}
              {testResult && (
                <View
                  className={`flex-row items-center p-4 rounded-2xl mb-4 ${
                    testResult === 'success' ? 'bg-green-900/30' : 'bg-red-900/30'
                  }`}
                >
                  <MaterialIcons
                    name={testResult === 'success' ? 'check-circle' : 'error'}
                    size={24}
                    color={testResult === 'success' ? '#10B981' : '#EF4444'}
                  />
                  <Text
                    className={`ml-3 font-semibold flex-1 ${
                      testResult === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {testResult === 'success'
                      ? 'Backend Connected!'
                      : 'Connection Failed. Check URL and backend server.'}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 bg-gray-800 py-4 rounded-2xl active:opacity-80"
                >
                  <Text className="text-gray-300 text-center font-semibold text-lg">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 bg-blue-600 py-4 rounded-2xl active:opacity-80"
                >
                  <Text className="text-white text-center font-semibold text-lg">Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

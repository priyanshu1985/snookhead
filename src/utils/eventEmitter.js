import { DeviceEventEmitter } from 'react-native';

const eventEmitter = {
  emit: (eventName, data) => {
    DeviceEventEmitter.emit(eventName, data);
  },
  addListener: (eventName, callback) => {
    return DeviceEventEmitter.addListener(eventName, callback);
  },
};

export default eventEmitter;

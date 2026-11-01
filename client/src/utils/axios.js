
import axios from 'axios';
import { SessionEpoch } from './sessionEpoch';

const sessionEpoch = new SessionEpoch();
let apiToken = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const requestSession = sessionEpoch.beginRequest();
  config.__sessionVersion = requestSession.version;
  config.__sessionFinish = requestSession.finish;
  if (!config.signal) config.signal = requestSession.signal;

  if (apiToken) {
    config.headers.Authorization = `Bearer ${apiToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const config = response.config;
    config.__sessionFinish?.();
    if (!sessionEpoch.isCurrent(config.__sessionVersion)) {
      return Promise.reject(new axios.CanceledError('Session changed while request was in flight'));
    }
    return response;
  },
  (error) => {
    const config = error.config;
    config?.__sessionFinish?.();
    if (error.response?.status === 401 && sessionEpoch.isCurrent(config?.__sessionVersion) && apiToken) {
      sessionEpoch.advance();
      apiToken = null;
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.dispatchEvent(new Event('eventhub:session-invalid'));
    }
    return Promise.reject(error);
  },
);

export const advanceApiSession = () => sessionEpoch.advance();
export const isCurrentApiSession = (version) => sessionEpoch.isCurrent(version);
export const currentApiSession = () => sessionEpoch.version;
export const setApiSessionToken = (token) => { apiToken = token || null; };

export default api;

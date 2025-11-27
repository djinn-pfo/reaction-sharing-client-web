import { j as jsxRuntimeExports, C as Canvas, P as PerspectiveCamera, G as Grid, O as OrbitControls, D as DynamicDrawUsage, B as BoxGeometry, c as clientExports } from "./three-D9Ijme76.js";
import { b as reactExports, u as useNavigate, R as React, c as useParams, B as BrowserRouter, d as Routes, e as Route } from "./vendor-BUN9aCdl.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
console.log("🐛 debug.js loaded!");
console.log("=== WebSocket Debug Info ===");
console.log("WebSocket type:", typeof WebSocket);
console.log("WebSocket constructor:", WebSocket);
console.log("User Agent:", navigator.userAgent);
if (typeof WebSocket !== "undefined") {
  console.log("✅ WebSocket API is available");
  window.testWebSocket = function(url = "ws://192.168.3.39:8080/ws?userId=debug") {
    console.log("Testing WebSocket connection to:", url);
    const ws2 = new WebSocket(url);
    ws2.onopen = () => {
      console.log("✅ WebSocket connected successfully!");
      ws2.close();
    };
    ws2.onerror = (error) => {
      console.log("❌ WebSocket error:", error);
    };
    ws2.onclose = (event) => {
      console.log("🔌 WebSocket closed:", event.code, event.reason);
    };
    setTimeout(() => {
      if (ws2.readyState === WebSocket.CONNECTING) {
        console.log("⏰ Connection timeout");
        ws2.close();
      }
    }, 5e3);
    return ws2;
  };
  console.log("Use testWebSocket() to test connection");
} else {
  console.log("❌ WebSocket API is NOT available");
}
const parseIceServers = () => {
  const serverUrls = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,turn:openrelay.metered.ca:80?transport=tcp,turn:openrelay.metered.ca:443?transport=tcp".split(",").map((s2) => s2.trim()).filter(Boolean);
  const turnUsername = "openrelayproject";
  const turnPassword = "openrelayproject";
  return serverUrls.map((url) => {
    if (url.startsWith("turn:")) {
      return {
        urls: url,
        username: turnUsername,
        credential: turnPassword
      };
    } else {
      return { urls: url };
    }
  });
};
const config = {
  env: "development",
  appName: "ReactionSharingPlatform_Dev",
  apiBaseUrl: "https://os3-294-36938.vs.sakura.ne.jp",
  signalingUrl: "wss://os3-294-36938.vs.sakura.ne.jp/ws-dev",
  ionSfuUrl: "https://os3-294-36938.vs.sakura.ne.jp:7001",
  laughApiUrl: "https://os3-294-36938.vs.sakura.ne.jp/laugh-api-dev",
  staticBaseUrl: "https://os3-294-36938.vs.sakura.ne.jp",
  iceServers: parseIceServers(),
  logLevel: "debug",
  maxParticipants: parseInt("10"),
  videoResolution: "360p",
  targetFps: parseInt("30")
};
const validateConfig = () => {
  const required = [
    "apiBaseUrl",
    "signalingUrl",
    "ionSfuUrl",
    "laughApiUrl",
    "staticBaseUrl"
  ];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map((k2) => `VITE_${k2.replace(/([A-Z])/g, "_$1").toUpperCase()}`).join(", ")}`
    );
  }
  console.log(`🚀 App running in ${config.env} mode:`, {
    appName: config.appName,
    apiBaseUrl: config.apiBaseUrl,
    signalingUrl: config.signalingUrl,
    ionSfuUrl: config.ionSfuUrl,
    laughApiUrl: config.laughApiUrl,
    staticBaseUrl: config.staticBaseUrl,
    logLevel: config.logLevel,
    maxParticipants: config.maxParticipants,
    videoResolution: config.videoResolution,
    targetFps: config.targetFps
  });
};
const initialState = {
  isInitialized: false,
  localStream: null,
  peers: /* @__PURE__ */ new Map(),
  connectionState: "new",
  error: null,
  receivedEmotions: /* @__PURE__ */ new Map()
};
const webrtcReducer = (state, action) => {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...state,
        isInitialized: true,
        localStream: action.payload.localStream,
        error: null
      };
    case "ADD_PEER": {
      const newPeers = new Map(state.peers);
      newPeers.set(action.payload.peerId, {
        id: action.payload.peerId,
        username: action.payload.username,
        connection: action.payload.connection,
        connectionState: "new"
      });
      return {
        ...state,
        peers: newPeers
      };
    }
    case "REMOVE_PEER": {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        peer.connection.close();
        peer.dataChannel?.close();
        newPeers.delete(action.payload.peerId);
      }
      return {
        ...state,
        peers: newPeers
      };
    }
    case "UPDATE_PEER_CONNECTION_STATE": {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        newPeers.set(action.payload.peerId, {
          ...peer,
          connectionState: action.payload.state
        });
      }
      return {
        ...state,
        peers: newPeers
      };
    }
    case "SET_PEER_REMOTE_STREAM": {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        newPeers.set(action.payload.peerId, {
          ...peer,
          remoteStream: action.payload.stream
        });
      }
      return {
        ...state,
        peers: newPeers
      };
    }
    case "SET_PEER_DATA_CHANNEL": {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        newPeers.set(action.payload.peerId, {
          ...peer,
          dataChannel: action.payload.dataChannel
        });
      }
      return {
        ...state,
        peers: newPeers
      };
    }
    case "SET_CONNECTION_STATE":
      return {
        ...state,
        connectionState: action.payload.state
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload.error
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null
      };
    case "ADD_RECEIVED_EMOTION": {
      const { userId, emotionData } = action.payload;
      const newReceivedEmotions = new Map(state.receivedEmotions);
      const userEmotions = newReceivedEmotions.get(userId) || [];
      const updatedEmotions = [...userEmotions, emotionData].slice(-50);
      newReceivedEmotions.set(userId, updatedEmotions);
      return {
        ...state,
        receivedEmotions: newReceivedEmotions
      };
    }
    case "CLEANUP":
      state.peers.forEach((peer) => {
        peer.connection.close();
        peer.dataChannel?.close();
      });
      state.localStream?.getTracks().forEach((track) => track.stop());
      return {
        ...initialState
      };
    default:
      return state;
  }
};
const WebRTCContext = reactExports.createContext(null);
const WebRTCProvider = ({ children }) => {
  const [state, dispatch] = reactExports.useReducer(webrtcReducer, initialState);
  const initializeWebRTC = reactExports.useCallback(async (constraints) => {
    try {
      dispatch({ type: "CLEAR_ERROR" });
      const defaultConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );
      dispatch({
        type: "INITIALIZE",
        payload: { localStream }
      });
    } catch (error) {
      console.error("Failed to initialize WebRTC:", error);
      dispatch({
        type: "SET_ERROR",
        payload: { error: `WebRTC初期化に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}` }
      });
      throw error;
    }
  }, []);
  const createPeerConnection = reactExports.useCallback(async (peerId, _username) => {
    try {
      const rtcConfig = {
        iceServers: config.iceServers,
        iceCandidatePoolSize: 10
      };
      const connection = new RTCPeerConnection(rtcConfig);
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => {
          connection.addTrack(track, state.localStream);
        });
      }
      connection.onconnectionstatechange = () => {
        console.log(`🔗 [WebRTC] Peer ${peerId} connection state:`, connection.connectionState);
        dispatch({
          type: "UPDATE_PEER_CONNECTION_STATE",
          payload: {
            peerId,
            state: connection.connectionState
          }
        });
      };
      connection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log(`📹 [WebRTC] Received remote track from peer ${peerId}:`, {
          streamId: remoteStream.id,
          trackCount: remoteStream.getTracks().length,
          tracks: remoteStream.getTracks().map((t2) => ({ kind: t2.kind, id: t2.id }))
        });
        dispatch({
          type: "SET_PEER_REMOTE_STREAM",
          payload: { peerId, stream: remoteStream }
        });
      };
      connection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        console.log(`📊 [WebRTC] Received data channel from peer ${peerId}:`, dataChannel.label);
        setupDataChannel(dataChannel, peerId);
        dispatch({
          type: "SET_PEER_DATA_CHANNEL",
          payload: { peerId, dataChannel }
        });
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 [WebRTC] New ICE candidate for peer ${peerId}:`, event.candidate.candidate);
        } else {
          console.log(`🧊 [WebRTC] ICE gathering complete for peer ${peerId}`);
        }
      };
      return connection;
    } catch (error) {
      console.error("Failed to create peer connection:", error);
      throw error;
    }
  }, [state.localStream]);
  const setupDataChannel = reactExports.useCallback((dataChannel, peerId) => {
    dataChannel.onopen = () => {
      console.log(`Data channel opened for peer: ${peerId}`);
    };
    dataChannel.onclose = () => {
      console.log(`Data channel closed for peer: ${peerId}`);
    };
    dataChannel.onerror = (error) => {
      console.error(`Data channel error for peer ${peerId}:`, error);
    };
    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📥 Received emotion data from peer ${peerId}:`, data);
        if (data.userId && data.data && typeof data.data.intensity === "number") {
          const emotionData = {
            userId: data.userId,
            timestamp: data.timestamp || Date.now(),
            intensity: data.data.intensity,
            laughLevel: data.data.laughLevel || "low",
            confidence: data.data.confidence || 0
          };
          dispatch({
            type: "ADD_RECEIVED_EMOTION",
            payload: { userId: data.userId, emotionData }
          });
          console.log(`😊 Processed emotion: ${data.userId} intensity=${data.data.intensity}`);
        }
      } catch (error) {
        console.error("Failed to parse data channel message:", error);
      }
    };
  }, []);
  const addPeer = reactExports.useCallback((peerId, username, connection) => {
    dispatch({
      type: "ADD_PEER",
      payload: { peerId, username, connection }
    });
  }, []);
  const removePeer = reactExports.useCallback((peerId) => {
    dispatch({
      type: "REMOVE_PEER",
      payload: { peerId }
    });
  }, []);
  const sendDataToPeer = reactExports.useCallback((peerId, data) => {
    const peer = state.peers.get(peerId);
    if (!peer?.dataChannel || peer.dataChannel.readyState !== "open") {
      console.warn(`Cannot send data to peer ${peerId}: data channel not ready`);
      return false;
    }
    try {
      peer.dataChannel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to send data to peer ${peerId}:`, error);
      return false;
    }
  }, [state.peers]);
  const broadcastData = reactExports.useCallback((data) => {
    let successCount = 0;
    state.peers.forEach((_peer, peerId) => {
      if (sendDataToPeer(peerId, data)) {
        successCount++;
      }
    });
    console.log(`Broadcasted data to ${successCount}/${state.peers.size} peers`);
  }, [state.peers, sendDataToPeer]);
  const sendEmotionData = reactExports.useCallback((normalizedLandmarks, userId, confidence = 0.9) => {
    if (!normalizedLandmarks || normalizedLandmarks.length === 0) {
      console.warn("No normalized landmarks to send");
      return false;
    }
    const landmarkData = {
      userId,
      timestamp: Date.now(),
      type: "mediapipe",
      data: {
        confidence,
        landmarks: flattenLandmarks(normalizedLandmarks),
        velocityModel: "nonlinear_damper"
      }
    };
    console.log("📤 Sending normalized landmark data via WebRTC Data Channel:", {
      userId,
      landmarkCount: normalizedLandmarks.length,
      confidence,
      peerCount: state.peers.size
    });
    broadcastData(landmarkData);
    return true;
  }, [broadcastData, state.peers.size]);
  const flattenLandmarks = reactExports.useCallback((landmarks) => {
    const flattened = [];
    landmarks.forEach((landmark) => {
      flattened.push(landmark.x, landmark.y, landmark.z || 0);
    });
    return flattened;
  }, []);
  const cleanup = reactExports.useCallback(() => {
    dispatch({ type: "CLEANUP" });
  }, []);
  const contextValue = {
    state,
    actions: {
      initializeWebRTC,
      createPeerConnection,
      addPeer,
      removePeer,
      sendDataToPeer,
      broadcastData,
      sendEmotionData,
      setupDataChannel,
      cleanup
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WebRTCContext.Provider, { value: contextValue, children });
};
const useWebRTC = () => {
  const context = reactExports.useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTC must be used within a WebRTCProvider");
  }
  return context;
};
const authConfig = {
  // 認証機能の有効/無効
  enabled: false,
  // デフォルトユーザー名
  username: "dev_user",
  // パスワードハッシュ
  passwordHash: "02a65e04e69708a9fe8ce3e017e7557a5ca1079b9bbf1671a1f33e9b2887ceb6",
  // セッション有効期限（時間単位）
  sessionDurationHours: Number("24") || 24,
  // セッション有効期限（ミリ秒）
  get sessionDurationMs() {
    return this.sessionDurationHours * 60 * 60 * 1e3;
  }
};
function validateAuthConfig() {
}
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function verifyPassword(password, expectedHash) {
  const hash = await hashPassword(password);
  return hash === expectedHash;
}
const SESSION_STORAGE_KEY = "auth_session";
function saveSession(sessionData) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}
function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}
const AuthContext = reactExports.createContext(void 0);
function AuthProvider({ children }) {
  const [authState, setAuthState] = reactExports.useState({
    authenticated: false,
    loading: true,
    error: null
  });
  reactExports.useEffect(() => {
    const initAuth = () => {
      {
        setAuthState({
          authenticated: true,
          loading: false,
          error: null
        });
        return;
      }
    };
    initAuth();
  }, []);
  const login = async (password) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const isValid = await verifyPassword(password, authConfig.passwordHash);
      if (!isValid) {
        setAuthState({
          authenticated: false,
          loading: false,
          error: "パスワードが正しくありません"
        });
        return false;
      }
      const token = generateSessionToken();
      const expiresAt = Date.now() + authConfig.sessionDurationMs;
      saveSession({ token, expiresAt });
      setAuthState({
        authenticated: true,
        loading: false,
        error: null
      });
      return true;
    } catch (error) {
      console.error("Login error:", error);
      setAuthState({
        authenticated: false,
        loading: false,
        error: "ログイン中にエラーが発生しました"
      });
      return false;
    }
  };
  const logout = () => {
    clearSession();
    setAuthState({
      authenticated: false,
      loading: false,
      error: null
    });
  };
  const checkAuth = () => {
    {
      return true;
    }
  };
  const contextValue = {
    ...authState,
    login,
    logout,
    checkAuth
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AuthContext.Provider, { value: contextValue, children });
}
function useAuth() {
  const context = reactExports.useContext(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
  };
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      className: classes,
      disabled: disabled || loading,
      ...props,
      children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "svg",
          {
            className: "animate-spin -ml-1 mr-2 h-4 w-4",
            fill: "none",
            viewBox: "0 0 24 24",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                }
              )
            ]
          }
        ),
        children
      ]
    }
  );
};
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnBackdrop = true
}) => {
  reactExports.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm",
      onClick: handleBackdropClick,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative w-full ${sizeClasses[size]} bg-white rounded-xl shadow-2xl transform transition-all`, children: [
        (title || showCloseButton) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [
          title && /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-gray-900", children: title }),
          showCloseButton && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onClose,
              className: "p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6", children })
      ] })
    }
  );
};
const UserNameModal = ({
  isOpen,
  onSubmit,
  onClose,
  initialValue = ""
}) => {
  const [userName, setUserName] = reactExports.useState(initialValue);
  const [error, setError] = reactExports.useState("");
  reactExports.useEffect(() => {
    setUserName(initialValue);
  }, [initialValue]);
  const validateUserName = (name) => {
    if (!name.trim()) {
      return "ユーザー名を入力してください";
    }
    if (name.length < 3) {
      return "ユーザー名は3文字以上で入力してください";
    }
    if (name.length > 20) {
      return "ユーザー名は20文字以下で入力してください";
    }
    if (!/^[a-zA-Z0-9あ-んア-ヶ一-龯\s]+$/.test(name)) {
      return "ユーザー名には英数字、ひらがな、カタカナ、漢字のみ使用できます";
    }
    return "";
  };
  const handleSubmit = (e2) => {
    e2.preventDefault();
    const trimmedName = userName.trim();
    const validationError = validateUserName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    onSubmit(trimmedName);
  };
  const handleInputChange = (e2) => {
    const value = e2.target.value;
    setUserName(value);
    if (error) {
      const validationError = validateUserName(value.trim());
      if (!validationError) {
        setError("");
      }
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Modal,
    {
      isOpen,
      onClose,
      title: "ユーザー名を設定",
      size: "sm",
      closeOnBackdrop: false,
      showCloseButton: !!initialValue,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "userName", className: "block text-sm font-medium text-gray-700 mb-2", children: "ユーザー名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              id: "userName",
              value: userName,
              onChange: handleInputChange,
              placeholder: "あなたの名前を入力してください",
              className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"}`,
              autoFocus: true,
              maxLength: 20
            }
          ),
          error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-600", children: error }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-gray-500", children: "3-20文字で入力してください（英数字、ひらがな、カタカナ、漢字）" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 pt-4", children: [
          initialValue && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "secondary",
              onClick: onClose,
              className: "flex-1",
              children: "キャンセル"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "submit",
              variant: "primary",
              className: "flex-1",
              disabled: !userName.trim() || !!error,
              children: initialValue ? "変更" : "参加"
            }
          )
        ] })
      ] })
    }
  );
};
const RoomCard = ({
  room,
  onJoin,
  disabled = false
}) => {
  const isFull = room.participants >= room.maxParticipants;
  const occupancyPercentage = room.participants / room.maxParticipants * 100;
  const getOccupancyColor = () => {
    if (occupancyPercentage >= 90) return "bg-red-500";
    if (occupancyPercentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  const getStatusText = () => {
    if (isFull) return "満室";
    if (occupancyPercentage >= 70) return "混雑";
    return "空きあり";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card p-6 hover:shadow-xl transition-shadow duration-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-1", children: room.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600", children: [
          "ルームID: ",
          room.id
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `px-2 py-1 rounded text-xs font-medium ${isFull ? "bg-red-100 text-red-800" : occupancyPercentage >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`, children: getStatusText() })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm text-gray-600 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "参加者" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          room.participants,
          " / ",
          room.maxParticipants
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `h-2 rounded-full transition-all duration-300 ${getOccupancyColor()}`,
          style: { width: `${Math.min(occupancyPercentage, 100)}%` }
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "primary",
        onClick: onJoin,
        disabled: disabled || isFull,
        className: "w-full",
        children: isFull ? "満室のため参加できません" : "ルームに参加"
      }
    ),
    disabled && !isFull && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500 mt-2 text-center", children: "参加するにはユーザー名を設定してください" })
  ] });
};
const RoomList = ({
  rooms,
  onJoinRoom,
  disabled = false
}) => {
  if (rooms.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "svg",
        {
          className: "w-12 h-12 text-gray-400 mx-auto mb-4",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: 2,
              d: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500", children: "現在参加可能なルームがありません" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: rooms.map((room) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    RoomCard,
    {
      room,
      onJoin: () => onJoinRoom(room.id),
      disabled
    },
    room.id
  )) });
};
const DB_NAME = "LolupLiveDB";
const DB_VERSION = 1;
const STORE_NAME = "laughPresets";
class IndexedDBManager {
  db = null;
  /**
   * データベースを開く
   */
  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          objectStore.createIndex("pattern", "pattern", { unique: false });
          objectStore.createIndex("level", "level", { unique: false });
          console.log(`📦 [IndexedDB] Created object store: ${STORE_NAME}`);
        }
      };
    });
  }
  /**
   * プリセットを保存
   */
  async savePreset(preset) {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.put(preset);
      request.onsuccess = () => {
        console.log(`💾 [IndexedDB] Saved preset: ${preset.id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * プリセットを取得
   */
  async getPreset(presetId) {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.get(presetId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 全プリセットを取得
   */
  async getAllPresets() {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * パターンで検索
   */
  async getPresetsByPattern(pattern) {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("pattern");
    return new Promise((resolve, reject) => {
      const request = index.getAll(pattern);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * プリセットを削除
   */
  async deletePreset(presetId) {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.delete(presetId);
      request.onsuccess = () => {
        console.log(`🗑️ [IndexedDB] Deleted preset: ${presetId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * 全プリセットを削除
   */
  async clearAll() {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log(`🗑️ [IndexedDB] Cleared all presets`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * プリセット数を取得
   */
  async count() {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * データベースを閉じる
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log(`🔒 [IndexedDB] Database closed`);
    }
  }
}
class LaughPresetService {
  dbManager;
  constructor() {
    this.dbManager = new IndexedDBManager();
  }
  /**
   * プリセット一覧を取得（APIから）
   */
  async fetchPresets() {
    try {
      console.log(`📡 [LaughPresetService] Fetching presets from ${config.laughApiUrl}/api/v1/laugh/presets`);
      const response = await fetch(`${config.laughApiUrl}/api/v1/laugh/presets`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const backendData = await response.json();
      console.log(`✅ [LaughPresetService] Fetched ${backendData.presets.length} patterns from backend`);
      const presets = [];
      for (const item of backendData.presets) {
        const levels = ["small", "medium", "large"];
        for (const level of levels) {
          presets.push({
            id: `${item.id}_${level}`,
            pattern: item.id,
            level,
            url: item.files[level],
            duration: 1.5,
            // デフォルト値（実際の長さは不明）
            size: 15e4
            // デフォルト値（実際のサイズは不明）
          });
        }
      }
      console.log(`✅ [LaughPresetService] Converted to ${presets.length} presets`);
      return presets;
    } catch (error) {
      console.error("❌ [LaughPresetService] Failed to fetch presets:", error);
      throw error;
    }
  }
  /**
   * プリセット音声ファイルをダウンロード
   */
  async downloadPresetAudio(url) {
    const fullUrl = `${config.staticBaseUrl}${url}`;
    console.log(`⬇️ [LaughPresetService] Downloading audio: ${fullUrl}`);
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ [LaughPresetService] Downloaded audio: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
    return arrayBuffer;
  }
  /**
   * プリセットをIndexedDBに保存
   */
  async savePreset(preset, audioData) {
    const data = {
      id: preset.id,
      pattern: preset.pattern,
      level: preset.level,
      duration: preset.duration,
      size: preset.size,
      audioData,
      downloadedAt: Date.now()
    };
    await this.dbManager.savePreset(data);
  }
  /**
   * 全プリセットをダウンロードして保存
   */
  async downloadAllPresets(presets, onProgress) {
    const total = presets.length;
    console.log(`🚀 [LaughPresetService] Starting download of ${total} presets`);
    for (let i2 = 0; i2 < total; i2++) {
      const preset = presets[i2];
      try {
        const audioData = await this.downloadPresetAudio(preset.url);
        await this.savePreset(preset, audioData);
        onProgress?.(i2 + 1, total);
        console.log(`✅ [LaughPresetService] Progress: ${i2 + 1}/${total} - ${preset.id}`);
      } catch (error) {
        console.error(`❌ [LaughPresetService] Failed to download ${preset.id}:`, error);
      }
    }
    console.log(`🎉 [LaughPresetService] Download complete! ${total} presets saved`);
  }
  /**
   * IndexedDBからプリセットを取得
   */
  async getPreset(presetId) {
    return await this.dbManager.getPreset(presetId);
  }
  /**
   * キャッシュされた全プリセットを取得
   */
  async getAllCachedPresets() {
    return await this.dbManager.getAllPresets();
  }
  /**
   * パターンで検索
   */
  async getPresetsByPattern(pattern) {
    return await this.dbManager.getPresetsByPattern(pattern);
  }
  /**
   * プリセット数を取得
   */
  async getPresetCount() {
    return await this.dbManager.count();
  }
  /**
   * 全プリセットを削除
   */
  async clearAllPresets() {
    await this.dbManager.clearAll();
  }
  /**
   * データベースを閉じる
   */
  close() {
    this.dbManager.close();
  }
}
const useLaughPresets = () => {
  const [presets, setPresets] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [downloadProgress, setDownloadProgress] = reactExports.useState(0);
  const [isDownloading, setIsDownloading] = reactExports.useState(false);
  const presetServiceRef = reactExports.useRef(new LaughPresetService());
  reactExports.useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("🔄 [useLaughPresets] Fetching presets...");
        const fetchedPresets = await presetServiceRef.current.fetchPresets();
        setPresets(fetchedPresets);
        console.log(`✅ [useLaughPresets] Loaded ${fetchedPresets.length} presets`);
      } catch (err) {
        console.error("❌ [useLaughPresets] Failed to load presets:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadPresets();
  }, []);
  const downloadAllPresets = reactExports.useCallback(async () => {
    if (presets.length === 0) {
      console.warn("⚠️ [useLaughPresets] No presets to download");
      return;
    }
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      console.log(`🚀 [useLaughPresets] Starting download of ${presets.length} presets`);
      await presetServiceRef.current.downloadAllPresets(presets, (current, total) => {
        setDownloadProgress(current);
        console.log(`📊 [useLaughPresets] Progress: ${current}/${total}`);
      });
      console.log("🎉 [useLaughPresets] All presets downloaded successfully");
    } catch (err) {
      console.error("❌ [useLaughPresets] Failed to download presets:", err);
      throw err;
    } finally {
      setIsDownloading(false);
    }
  }, [presets]);
  const downloadPreset = reactExports.useCallback(async (preset) => {
    try {
      console.log(`⬇️ [useLaughPresets] Downloading single preset: ${preset.id}`);
      const audioData = await presetServiceRef.current.downloadPresetAudio(preset.url);
      await presetServiceRef.current.savePreset(preset, audioData);
      console.log(`✅ [useLaughPresets] Preset ${preset.id} downloaded`);
    } catch (err) {
      console.error(`❌ [useLaughPresets] Failed to download preset ${preset.id}:`, err);
      throw err;
    }
  }, []);
  const getCachedCount = reactExports.useCallback(async () => {
    try {
      const count = await presetServiceRef.current.getPresetCount();
      console.log(`📊 [useLaughPresets] Cached presets: ${count}`);
      return count;
    } catch (err) {
      console.error("❌ [useLaughPresets] Failed to get cached count:", err);
      return 0;
    }
  }, []);
  return {
    presets,
    loading,
    error,
    downloadProgress,
    isDownloading,
    downloadAllPresets,
    downloadPreset,
    getCachedCount
  };
};
class LaughPlayer {
  presetService;
  previousIntensity = 0;
  isPlaying = false;
  // 再生中フラグ
  currentAudio = null;
  // 現在再生中のAudio要素
  isMuted = false;
  // ミュートフラグ
  constructor() {
    this.presetService = new LaughPresetService();
  }
  /**
   * トリガー判定とレベル決定
   *
   * @param currentIntensity 現在の感情強度 (0-100)
   * @returns トリガー判定結果
   */
  checkTrigger(currentIntensity) {
    const delta = currentIntensity - this.previousIntensity;
    if (delta < 10) {
      this.previousIntensity = currentIntensity;
      return {
        shouldTrigger: false,
        level: null,
        presetId: null
      };
    }
    let level = null;
    if (currentIntensity < 20) {
      level = null;
    } else if (currentIntensity < 40) {
      level = "small";
    } else if (currentIntensity < 70) {
      level = "medium";
    } else {
      level = "large";
    }
    this.previousIntensity = currentIntensity;
    console.log(`🎯 [LaughPlayer] Trigger check: intensity=${currentIntensity}, Δ=${delta}, level=${level}`);
    return {
      shouldTrigger: level !== null,
      level,
      presetId: null
      // patternと組み合わせて後で設定される
    };
  }
  /**
   * 音声を再生（ArrayBufferから）
   *
   * @param audioData 音声データ（ArrayBuffer）
   */
  async playAudioFromBuffer(audioData) {
    try {
      if (this.isMuted) {
        console.log(`🔇 [LaughPlayer] Muted, skipping playback`);
        return;
      }
      if (this.isPlaying) {
        console.log(`⏭️ [LaughPlayer] Already playing, skipping new playback`);
        return;
      }
      const blob = new Blob([audioData], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.isPlaying = true;
      await audio.play();
      console.log(`🔊 [LaughPlayer] Audio playing (${(audioData.byteLength / 1024).toFixed(2)} KB)`);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentAudio = null;
        console.log(`✅ [LaughPlayer] Audio playback completed, ready for next`);
      };
      audio.onerror = (error) => {
        console.error("❌ [LaughPlayer] Audio playback error:", error);
        URL.revokeObjectURL(url);
        this.isPlaying = false;
        this.currentAudio = null;
      };
    } catch (error) {
      console.error("❌ [LaughPlayer] Failed to play audio:", error);
      this.isPlaying = false;
      this.currentAudio = null;
      throw error;
    }
  }
  /**
   * プリセットIDで音声を再生
   *
   * @param presetId プリセットID（例: "male1_medium"）
   */
  async playPreset(presetId) {
    try {
      console.log(`🎵 [LaughPlayer] Playing preset: ${presetId}`);
      const preset = await this.presetService.getPreset(presetId);
      if (!preset) {
        throw new Error(`Preset not found: ${presetId}`);
      }
      await this.playAudioFromBuffer(preset.audioData);
    } catch (error) {
      console.error(`❌ [LaughPlayer] Failed to play preset ${presetId}:`, error);
      throw error;
    }
  }
  /**
   * previousIntensityをリセット
   */
  resetIntensity() {
    this.previousIntensity = 0;
    console.log(`🔄 [LaughPlayer] Intensity reset to 0`);
  }
  /**
   * previousIntensityを取得
   */
  getPreviousIntensity() {
    return this.previousIntensity;
  }
  /**
   * previousIntensityを設定（テスト用）
   */
  setPreviousIntensity(value) {
    this.previousIntensity = value;
  }
  /**
   * 再生中かどうかを取得
   */
  getIsPlaying() {
    return this.isPlaying;
  }
  /**
   * 現在の再生を停止（緊急時用）
   */
  stopCurrentPlayback() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isPlaying = false;
      console.log(`🛑 [LaughPlayer] Playback stopped`);
    }
  }
  /**
   * ミュート状態を設定
   */
  setMuted(muted) {
    this.isMuted = muted;
    console.log(`${muted ? "🔇" : "🔊"} [LaughPlayer] Mute ${muted ? "enabled" : "disabled"}`);
  }
  /**
   * ミュート状態を取得
   */
  getMuted() {
    return this.isMuted;
  }
}
const useLaughPlayer = (options) => {
  const { selectedPattern, onLaughTriggered } = options;
  const playerRef = reactExports.useRef(new LaughPlayer());
  const processIntensity = reactExports.useCallback(async (intensity) => {
    const player = playerRef.current;
    const result = player.checkTrigger(intensity);
    if (result.shouldTrigger && result.level) {
      const presetId = `${selectedPattern}_${result.level}`;
      console.log(`🎵 [useLaughPlayer] Triggering laugh: ${presetId}`);
      try {
        await player.playPreset(presetId);
        onLaughTriggered?.(presetId, result.level);
        console.log(`✅ [useLaughPlayer] Laugh played successfully: ${presetId}`);
      } catch (error) {
        console.error(`❌ [useLaughPlayer] Failed to play laugh ${presetId}:`, error);
      }
    }
  }, [selectedPattern, onLaughTriggered]);
  const playPreset = reactExports.useCallback(async (presetId) => {
    try {
      console.log(`🎵 [useLaughPlayer] Playing other user's laugh: ${presetId}`);
      await playerRef.current.playPreset(presetId);
      console.log(`✅ [useLaughPlayer] Other user's laugh played: ${presetId}`);
    } catch (error) {
      console.error(`❌ [useLaughPlayer] Failed to play preset ${presetId}:`, error);
    }
  }, []);
  const resetIntensity = reactExports.useCallback(() => {
    playerRef.current.resetIntensity();
    console.log(`🔄 [useLaughPlayer] Intensity reset`);
  }, []);
  const getPreviousIntensity = reactExports.useCallback(() => {
    return playerRef.current.getPreviousIntensity();
  }, []);
  const setMuted = reactExports.useCallback((muted) => {
    playerRef.current.setMuted(muted);
  }, []);
  const getMuted = reactExports.useCallback(() => {
    return playerRef.current.getMuted();
  }, []);
  return {
    processIntensity,
    playPreset,
    resetIntensity,
    getPreviousIntensity,
    setMuted,
    getMuted
  };
};
const LoadingSpinner = ({
  size = "md",
  color = "primary",
  className = ""
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };
  const colorClasses = {
    primary: "text-primary-600",
    white: "text-white",
    gray: "text-gray-400"
  };
  const classes = `animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      className: classes,
      fill: "none",
      viewBox: "0 0 24 24",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "circle",
          {
            className: "opacity-25",
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            strokeWidth: "4"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            className: "opacity-75",
            fill: "currentColor",
            d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          }
        )
      ]
    }
  ) });
};
const PATTERN_ICONS = {
  male1: "😄",
  male2: "😆",
  male3: "🤣",
  female1: "😊",
  female2: "😁",
  female3: "😂"
};
const PATTERN_LABELS = {
  male1: "女性1",
  male2: "男性1",
  male3: "男性2",
  female1: "女性2",
  female2: "女性3",
  female3: "女性4"
};
const LaughPresetSelector = ({
  initialPattern = "male1",
  onSelect
}) => {
  const [selectedPattern, setSelectedPattern] = reactExports.useState(initialPattern);
  const [isDownloaded, setIsDownloaded] = reactExports.useState(false);
  const [isPreviewing, setIsPreviewing] = reactExports.useState(null);
  const {
    presets,
    loading: presetsLoading,
    downloadProgress,
    isDownloading,
    downloadAllPresets,
    getCachedCount
  } = useLaughPresets();
  const { playPreset } = useLaughPlayer({
    selectedPattern
  });
  reactExports.useEffect(() => {
    const savedPattern = localStorage.getItem("laughPattern");
    if (savedPattern) {
      setSelectedPattern(savedPattern);
    }
  }, []);
  reactExports.useEffect(() => {
    const checkCached = async () => {
      const count = await getCachedCount();
      if (count >= 18) {
        setIsDownloaded(true);
        console.log("✅ [LaughPresetSelector] All presets already cached");
      }
    };
    checkCached();
  }, [getCachedCount]);
  reactExports.useEffect(() => {
    if (presets.length > 0 && !isDownloaded && !isDownloading) {
      console.log("🚀 [LaughPresetSelector] Starting auto-download...");
      downloadAllPresets().then(() => {
        setIsDownloaded(true);
        console.log("🎉 [LaughPresetSelector] Auto-download complete");
      }).catch((error) => {
        console.error("❌ [LaughPresetSelector] Auto-download failed:", error);
      });
    }
  }, [presets, isDownloaded, isDownloading, downloadAllPresets]);
  const handleSelectPattern = reactExports.useCallback(
    (pattern) => {
      setSelectedPattern(pattern);
      localStorage.setItem("laughPattern", pattern);
      console.log(`✅ [LaughPresetSelector] Pattern selected: ${pattern}`);
      onSelect?.(pattern);
    },
    [onSelect]
  );
  const handlePreview = reactExports.useCallback(
    async (pattern) => {
      if (isPreviewing) {
        console.log("⚠️ [LaughPresetSelector] Already previewing");
        return;
      }
      try {
        setIsPreviewing(pattern);
        const presetId = `${pattern}_medium`;
        console.log(`🎵 [LaughPresetSelector] Previewing: ${presetId}`);
        await playPreset(presetId);
        setTimeout(() => {
          setIsPreviewing(null);
        }, 1e3);
      } catch (error) {
        console.error(`❌ [LaughPresetSelector] Preview failed:`, error);
        setIsPreviewing(null);
      }
    },
    [isPreviewing, playPreset]
  );
  if (presetsLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white rounded-lg shadow-md p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: "md" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "プリセット一覧を読み込み中..." })
    ] }) });
  }
  if (isDownloading) {
    const progress = presets.length > 0 ? downloadProgress / presets.length * 100 : 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white rounded-lg shadow-md p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: "lg", className: "mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "笑い声プリセットをダウンロード中..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600 mb-4", children: [
        downloadProgress,
        " / ",
        presets.length,
        " 個完了"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-200 rounded-full h-3 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "bg-blue-500 h-full transition-all duration-300 ease-out",
          style: { width: `${progress}%` }
        }
      ) })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold text-gray-900 mb-2", children: "笑い声を選択してください 🎵" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600 mb-6", children: "あなたの笑いを表現する声を選びましょう。プレビューボタンで試聴できます。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4", children: Object.entries(PATTERN_ICONS).map(([pattern, icon]) => {
      const isSelected = selectedPattern === pattern;
      const isPreviewingThis = isPreviewing === pattern;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `
                relative border-2 rounded-lg p-4 cursor-pointer transition-all
                ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"}
              `,
          onClick: () => handleSelectPattern(pattern),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-5xl", children: icon }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center font-medium text-gray-900 mb-3", children: PATTERN_LABELS[pattern] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: isPreviewingThis ? "primary" : "secondary",
                size: "sm",
                className: "w-full",
                onClick: (e2) => {
                  e2.stopPropagation();
                  handlePreview(pattern);
                },
                disabled: !isDownloaded || !!isPreviewing,
                children: isPreviewingThis ? "再生中..." : "試聴"
              }
            ),
            isSelected && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full", children: "選択中" })
          ]
        },
        pattern
      );
    }) }),
    isDownloaded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 bg-green-50 border border-green-200 rounded-lg p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-green-800 text-center", children: "✅ すべてのプリセットがダウンロード済みです" }) })
  ] });
};
const LobbyView = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = reactExports.useState("");
  const [showUserNameModal, setShowUserNameModal] = reactExports.useState(false);
  const [rooms] = reactExports.useState([
    {
      id: "theather-a",
      name: "🎭️シアターA👏",
      participants: 0,
      maxParticipants: 10
    },
    {
      id: "theather-b",
      name: "🎭️シアターB👏",
      participants: 0,
      maxParticipants: 10
    },
    {
      id: "theater-c",
      name: "🎭️シアターC👏",
      participants: 0,
      maxParticipants: 10
    }
  ]);
  reactExports.useEffect(() => {
    const savedUserName = localStorage.getItem("userName");
    if (savedUserName) {
      setUserName(savedUserName);
    } else {
      setShowUserNameModal(true);
    }
  }, []);
  const handleUserNameSet = (name) => {
    setUserName(name);
    localStorage.setItem("userName", name);
    setShowUserNameModal(false);
  };
  const handleJoinRoom = (roomId) => {
    if (!userName) {
      setShowUserNameModal(true);
      return;
    }
    navigate(`/room/${roomId}`);
  };
  const handleChangeUserName = () => {
    setShowUserNameModal(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto px-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-2", children: "LoLup Lives Go" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg text-gray-600 mb-4", children: "リアルタイム感情共有プラットフォーム" }),
      userName && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-600", children: "ようこそ、" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-gray-900", children: userName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "secondary",
            size: "sm",
            onClick: handleChangeUserName,
            children: "変更"
          }
        )
      ] })
    ] }),
    userName && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-4xl mx-auto mb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LaughPresetSelector, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold text-gray-900 mb-2", children: "参加可能なルーム" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 mb-2", children: "参加したいルームを選択してください" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-blue-800", children: "💡 最初に入った人が配信者、2人目以降が視聴者になります。配信者の映像を見ながらリアクションを送信できます！" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        RoomList,
        {
          rooms,
          onJoinRoom: handleJoinRoom,
          disabled: !userName
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UserNameModal,
      {
        isOpen: showUserNameModal,
        onSubmit: handleUserNameSet,
        onClose: () => !userName && setShowUserNameModal(false),
        initialValue: userName
      }
    )
  ] }) });
};
class WebSocketClient {
  ws = null;
  config;
  handlers = {};
  connectionState = "disconnected";
  reconnectAttempts = 0;
  reconnectTimer = null;
  heartbeatTimer = null;
  connectionTimer = null;
  isManualClose = false;
  constructor(config2) {
    this.config = {
      url: config2.url,
      userId: config2.userId,
      reconnectInterval: config2.reconnectInterval ?? 5e3,
      maxReconnectAttempts: config2.maxReconnectAttempts ?? 5,
      heartbeatInterval: config2.heartbeatInterval ?? 3e4,
      connectionTimeout: config2.connectionTimeout ?? 1e4
    };
  }
  // イベントハンドラーを設定
  setEventHandlers(handlers) {
    this.handlers = handlers;
  }
  // 接続状態を取得
  getConnectionState() {
    return this.connectionState;
  }
  // WebSocket接続を開始
  async connect() {
    if (this.connectionState === "connecting" || this.connectionState === "connected") {
      return;
    }
    this.isManualClose = false;
    this.setConnectionState("connecting");
    try {
      await this.establishConnection();
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.handleConnectionError();
    }
  }
  // WebSocket接続を切断
  disconnect() {
    this.isManualClose = true;
    this.cleanup();
    if (this.ws) {
      this.ws.close(1e3, "Manual disconnect");
    }
    this.setConnectionState("disconnected");
  }
  // メッセージを送信
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected. Cannot send message:", message);
      return false;
    }
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      if (message.type?.startsWith("ion:")) {
        const payload = message.payload;
        console.log("🚀 [WebSocket] Sending Ion message:", message.type);
        console.log("📦 [WebSocket] Full message structure:", JSON.stringify(messageWithTimestamp, null, 2));
        if (payload?.offer?.sdp) {
          console.log("🔍 [WebSocket] Payload check:", {
            hasOffer: !!payload.offer,
            sdpLength: payload.offer.sdp.length,
            sdpContainsIceUfrag: payload.offer.sdp.includes("a=ice-ufrag"),
            sdpType: payload.offer.type,
            config: payload.config,
            sid: payload.sid,
            uid: payload.uid
          });
        }
      }
      this.ws.send(JSON.stringify(messageWithTimestamp));
      return true;
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      return false;
    }
  }
  // バイナリデータを送信
  sendBinary(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected. Cannot send binary data");
      return false;
    }
    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      console.error("Failed to send binary WebSocket message:", error);
      return false;
    }
  }
  // 実際の接続処理
  async establishConnection() {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.url);
        if (this.config.userId) {
          url.searchParams.set("userId", this.config.userId);
        }
        console.log(`🔗 WebSocket connecting to: ${url.toString()}`);
        console.log("🏗️ Creating WebSocket instance...");
        console.log("🌐 navigator.userAgent:", navigator.userAgent);
        console.log("⚙️ WebSocket constructor available:", typeof WebSocket);
        this.ws = new WebSocket(url.toString());
        console.log("✅ WebSocket instance created, readyState:", this.ws.readyState);
        console.log("🔍 WebSocket URL:", this.ws.url);
        console.log("🔍 WebSocket protocol:", this.ws.protocol);
        this.connectionTimer = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error("Connection timeout"));
          }
        }, this.config.connectionTimeout);
        this.ws.onopen = () => {
          console.log("WebSocket onopen fired!");
          this.clearConnectionTimer();
          this.onWebSocketOpen();
          resolve();
        };
        this.ws.onclose = (event) => {
          this.clearConnectionTimer();
          this.onWebSocketClose(event);
          if (this.connectionState !== "connected") {
            reject(new Error(`WebSocket closed with code: ${event.code}`));
          }
        };
        this.ws.onerror = (error) => {
          console.log("WebSocket onerror fired, readyState:", this.ws?.readyState);
          console.log("WebSocket URL was:", this.ws?.url);
          console.log("Error details:", error);
          this.clearConnectionTimer();
          this.onWebSocketError(error);
        };
        this.ws.onmessage = (event) => {
          this.onWebSocketMessage(event);
        };
      } catch (error) {
        this.clearConnectionTimer();
        reject(error);
      }
    });
  }
  // WebSocket開放イベント
  onWebSocketOpen() {
    console.log("WebSocket connected successfully");
    console.log("WebSocket readyState:", this.ws?.readyState);
    console.log("WebSocket protocol:", this.ws?.protocol);
    console.log("Config heartbeatInterval:", this.config.heartbeatInterval);
    this.setConnectionState("connected");
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.handlers.onOpen?.();
    console.log("WebSocket onOpen handler completed");
  }
  // WebSocket切断イベント
  onWebSocketClose(event) {
    console.log("🔌 WebSocket disconnected:", event.code, event.reason);
    console.log("📊 Close event details:", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      type: event.type
    });
    this.cleanup();
    this.handlers.onClose?.(event);
    if (!this.isManualClose && event.code !== 1e3) {
      this.attemptReconnect();
    } else {
      this.setConnectionState("disconnected");
    }
  }
  // WebSocketエラーイベント
  onWebSocketError(error) {
    console.error("WebSocket error:", error);
    this.handlers.onError?.(error);
  }
  // WebSocketメッセージ受信イベント
  onWebSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const isEmotionMessage = message.type === "emotion" || message.type === "emotion.broadcast";
      if (!isEmotionMessage) {
        console.log("🔄 Raw WebSocket message received:", event.data);
        console.log("📥 Parsed message:", message.type, message);
      }
      if (message.type === "heartbeat") {
        return;
      }
      this.handlers.onMessage?.(message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }
  // 再接続処理
  attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.setConnectionState("failed");
      return;
    }
    this.setConnectionState("reconnecting");
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.establishConnection();
      } catch (error) {
        console.error("Reconnection attempt failed:", error);
        this.attemptReconnect();
      }
    }, delay);
  }
  // 接続エラー処理
  handleConnectionError() {
    if (!this.isManualClose) {
      this.attemptReconnect();
    }
  }
  // ハートビート開始
  startHeartbeat() {
    if (this.config.heartbeatInterval <= 0) {
      console.log("Heartbeat disabled");
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      console.log("Sending heartbeat...");
      this.send({ type: "heartbeat", timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }
  // 接続状態を設定
  setConnectionState(state) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.handlers.onConnectionStateChange?.(state);
    }
  }
  // タイマーとリソースをクリーンアップ
  cleanup() {
    this.clearConnectionTimer();
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
  }
  clearConnectionTimer() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  clearHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
function isIonMessage(msg) {
  return msg && typeof msg === "object" && "type" in msg && "payload" in msg && typeof msg.type === "string" && msg.type.startsWith("ion:");
}
function isIonAnswerMessage(msg) {
  return msg.type === "ion:answer";
}
function isIonOfferMessage(msg) {
  return msg.type === "ion:offer";
}
function isIonTrickleMessage(msg) {
  return msg.type === "ion:trickle";
}
function isIonErrorMessage(msg) {
  return msg.type === "ion:error";
}
class MessageHandler {
  callbacks = {};
  // コールバックを設定
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  // 個別のコールバックを設定
  onRoomJoined(callback) {
    this.callbacks.onRoomJoined = callback;
  }
  onRoomLeft(callback) {
    this.callbacks.onRoomLeft = callback;
  }
  onPeerJoined(callback) {
    this.callbacks.onPeerJoined = callback;
  }
  onPeerLeft(callback) {
    this.callbacks.onPeerLeft = callback;
  }
  onWebRTCSignaling(callback) {
    this.callbacks.onWebRTCSignaling = callback;
  }
  onEmotionBroadcast(callback) {
    this.callbacks.onEmotionBroadcast = callback;
  }
  onEmotionProcessed(callback) {
    this.callbacks.onEmotionProcessed = callback;
  }
  onBroadcastTimestamp(callback) {
    this.callbacks.onBroadcastTimestamp = callback;
  }
  onEmotionWithTimestamp(callback) {
    this.callbacks.onEmotionWithTimestamp = callback;
  }
  onError(callback) {
    this.callbacks.onError = callback;
  }
  onUnknownMessage(callback) {
    this.callbacks.onUnknownMessage = callback;
  }
  // メッセージを処理
  handleMessage(message) {
    try {
      if (isIonMessage(message)) {
        console.log("📨 [ION] Received Ion message:", message.type);
        this.callbacks.onIonMessage?.(message);
        return;
      }
      if (message.type !== "emotion.broadcast") {
        console.log("📨 Received message:", message.type, message);
        console.log("🔍 [DEBUG] Message type check:", {
          type: message.type,
          typeOf: typeof message.type,
          isRoomJoined: message.type === "room-joined",
          isJoined: message.type === "joined",
          hasOnRoomJoined: !!this.callbacks.onRoomJoined
        });
      }
      switch (message.type) {
        case "room-joined":
          console.log("🎯 Handling room-joined message");
          this.callbacks.onRoomJoined?.(message);
          break;
        case "room-left":
          this.callbacks.onRoomLeft?.(message);
          break;
        case "peer-joined":
          this.callbacks.onPeerJoined?.(message);
          break;
        case "peer-left":
          this.callbacks.onPeerLeft?.(message);
          break;
        case "offer":
        case "answer":
        case "ice-candidate":
        case "webrtc-offer":
        case "webrtc-answer":
          this.callbacks.onWebRTCSignaling?.(message);
          break;
        case "joined":
          console.log("✅ Successfully joined room:", message);
          console.log("🎯 Handling joined message, calling onRoomJoined callback");
          this.callbacks.onRoomJoined?.(message);
          console.log("🎯 onRoomJoined callback completed");
          break;
        case "emotion.broadcast":
          this.callbacks.onEmotionBroadcast?.(message);
          break;
        case "emotion.processed":
          console.log("✅ Emotion data processed:", message);
          this.callbacks.onEmotionProcessed?.(message);
          break;
        case "broadcast-timestamp":
          console.log("📡 Received broadcast timestamp:", message);
          this.callbacks.onBroadcastTimestamp?.(message);
          break;
        case "emotion-with-timestamp":
          console.log("🎭 Received emotion with timestamp:", message);
          this.callbacks.onEmotionWithTimestamp?.(message);
          break;
        case "laugh:trigger":
          console.log("🎵 Received laugh trigger:", message);
          this.callbacks.onLaughTrigger?.(message);
          break;
        case "error":
          this.callbacks.onError?.(message);
          break;
        default:
          console.warn("Unknown message type:", message.type);
          this.callbacks.onUnknownMessage?.(message);
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error, message);
    }
  }
  // メッセージファクトリー関数
  // ルーム参加メッセージを作成
  static createJoinRoomMessage(room, username) {
    return {
      type: "join",
      room,
      username,
      timestamp: Date.now()
    };
  }
  // ルーム退出メッセージを作成
  static createLeaveRoomMessage(room) {
    return {
      type: "leave",
      room,
      timestamp: Date.now()
    };
  }
  // WebRTC Offerメッセージを作成
  static createOfferMessage(from, to2, offer) {
    return {
      type: "offer",
      from,
      to: to2,
      data: offer,
      timestamp: Date.now()
    };
  }
  // WebRTC Answerメッセージを作成
  static createAnswerMessage(from, to2, answer) {
    return {
      type: "answer",
      from,
      to: to2,
      data: answer,
      timestamp: Date.now()
    };
  }
  // ICE候補メッセージを作成
  static createIceCandidateMessage(from, to2, candidate) {
    return {
      type: "ice-candidate",
      from,
      to: to2,
      data: candidate,
      timestamp: Date.now()
    };
  }
  // メッセージバリデーション
  static validateMessage(message) {
    if (!message || typeof message !== "object") {
      return false;
    }
    if (typeof message.type !== "string") {
      return false;
    }
    if (typeof message.timestamp !== "number") {
      return false;
    }
    return true;
  }
  // WebRTCシグナリングメッセージの検証
  static validateWebRTCMessage(message) {
    if (!["offer", "answer", "ice-candidate"].includes(message.type)) {
      return false;
    }
    const webrtcMessage = message;
    if (typeof webrtcMessage.from !== "string" || typeof webrtcMessage.to !== "string") {
      return false;
    }
    if (!webrtcMessage.data) {
      return false;
    }
    return true;
  }
  // エラーメッセージかどうかの判定
  static isErrorMessage(message) {
    return message.type === "error" && typeof message.error === "object" && typeof message.error.code === "string" && typeof message.error.message === "string";
  }
}
const useSignaling = (options = {}) => {
  const { autoConnect = false, onBroadcastTimestamp, onEmotionWithTimestamp, onLaughTrigger, onRoomJoined, onIonMessage, enableWebRTC = false } = options;
  const { state: webrtcState, actions: webrtcActions } = useWebRTC();
  const [connectionState, setConnectionState] = reactExports.useState("disconnected");
  const [error, setError] = reactExports.useState(null);
  const [currentRoomId, setCurrentRoomId] = reactExports.useState(null);
  const [currentUsername, setCurrentUsername] = reactExports.useState(null);
  const [receivedEmotions, setReceivedEmotions] = reactExports.useState(/* @__PURE__ */ new Map());
  reactExports.useEffect(() => {
    console.log("📊 React connectionState updated to:", connectionState);
  }, [connectionState]);
  const wsClientRef = reactExports.useRef(null);
  const messageHandlerRef = reactExports.useRef(null);
  const handleEmotionBroadcast = reactExports.useCallback((message) => {
    try {
      const emotionData = message.data;
      const userId = emotionData.userId || message.from;
      const timestamp = emotionData.timestamp || Date.now();
      const intensity = emotionData.intensity || 0;
      const confidence = emotionData.confidence || 0;
      const velocity = emotionData.velocity || 0;
      const features = emotionData.features || {};
      const newEmotion = {
        userId,
        timestamp,
        intensity: Math.abs(intensity),
        // 負の値の場合は絶対値を取る
        laughLevel: Math.abs(intensity) > 70 ? "high" : Math.abs(intensity) > 40 ? "medium" : "low",
        confidence,
        velocity,
        features
      };
      setReceivedEmotions((prev) => {
        const newMap = new Map(prev);
        const userEmotions = newMap.get(userId) || [];
        const updatedEmotions = [...userEmotions, newEmotion].slice(-50);
        newMap.set(userId, updatedEmotions);
        return newMap;
      });
    } catch (error2) {
      console.error("Failed to handle emotion broadcast:", error2);
    }
  }, []);
  const handleEmotionProcessed = reactExports.useCallback((message) => {
    console.log("✅ Emotion processing confirmed:", message.data.message);
  }, []);
  const handlePeerJoined = reactExports.useCallback(async (message) => {
    if (!enableWebRTC) {
      console.log("⏭️ Skipping WebRTC connection - enableWebRTC is false");
      return;
    }
    try {
      console.log("👥 [WebRTC] Peer joined:", message.peerId, message.username);
      console.log("👥 [WebRTC] Local stream available:", !!webrtcState.localStream);
      const connection = await webrtcActions.createPeerConnection(message.peerId, message.username);
      console.log("✅ [WebRTC] Peer connection created");
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 [WebRTC] Sending ICE candidate to peer ${message.peerId}`);
          const candidateMessage = MessageHandler.createIceCandidateMessage(
            currentUsername || "anonymous",
            message.peerId,
            event.candidate.toJSON()
          );
          sendSignalingMessage(candidateMessage);
        }
      };
      const dataChannel = connection.createDataChannel("emotions", {
        ordered: false
        // リアルタイム性を重視
      });
      console.log("✅ [WebRTC] Data channel created:", dataChannel.label);
      webrtcActions.addPeer(message.peerId, message.username, connection);
      console.log("✅ [WebRTC] Peer added to state");
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      console.log("✅ [WebRTC] Offer created and local description set");
      const offerMessage = MessageHandler.createOfferMessage(
        currentUsername || "anonymous",
        message.peerId,
        offer
      );
      const sendSuccess = sendSignalingMessage(offerMessage);
      console.log("📤 [WebRTC] Offer message sent:", sendSuccess);
    } catch (error2) {
      console.error("❌ [WebRTC] Failed to handle peer joined:", error2);
      setError("ピア接続の作成に失敗しました");
    }
  }, [webrtcActions, currentUsername, enableWebRTC, webrtcState.localStream]);
  const handlePeerLeft = reactExports.useCallback((message) => {
    console.log("Peer left:", message.peerId);
    webrtcActions.removePeer(message.peerId);
  }, [webrtcActions]);
  const handleWebRTCSignaling = reactExports.useCallback(async (message) => {
    try {
      console.log("🔗 Received WebRTC signaling:", message.type, "from:", message.from);
      if ((message.type === "webrtc-offer" || message.type === "offer") && message.from === "backend") {
        console.log("🔗 Creating new peer connection for backend");
        const connection2 = await webrtcActions.createPeerConnection("backend", "Backend Server");
        connection2.ondatachannel = (event) => {
          const dataChannel = event.channel;
          console.log("📥 Data channel received from backend:", dataChannel.label);
          webrtcActions.setupDataChannel?.(dataChannel, "backend");
        };
        webrtcActions.addPeer("backend", "Backend Server", connection2);
        const offerData = message.data?.offer || message.data;
        await connection2.setRemoteDescription(offerData);
        const answer = await connection2.createAnswer();
        await connection2.setLocalDescription(answer);
        const answerMessage = {
          type: "webrtc-answer",
          from: currentUsername || "anonymous",
          to: "backend",
          room: currentRoomId ?? void 0,
          data: {
            answer,
            peerId: "backend"
          },
          timestamp: Date.now()
        };
        sendSignalingMessage(answerMessage);
        console.log("✅ Sent answer to backend");
        return;
      }
      const peer = webrtcState.peers.get(message.from);
      if (!peer) {
        console.warn("Received signaling for unknown peer:", message.from);
        return;
      }
      const { connection } = peer;
      switch (message.type) {
        case "offer":
        case "webrtc-offer":
          console.log("📥 [WebRTC] Received offer from:", message.from);
          connection.onicecandidate = (event) => {
            if (event.candidate) {
              console.log(`🧊 [WebRTC] Sending ICE candidate to peer ${message.from}`);
              const candidateMessage = MessageHandler.createIceCandidateMessage(
                currentUsername || "anonymous",
                message.from,
                event.candidate.toJSON()
              );
              sendSignalingMessage(candidateMessage);
            }
          };
          const offerData = message.data?.offer || message.data;
          await connection.setRemoteDescription(offerData);
          console.log("✅ [WebRTC] Remote description set (offer)");
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          console.log("✅ [WebRTC] Answer created and local description set");
          const answerMessage = MessageHandler.createAnswerMessage(
            currentUsername || "anonymous",
            message.from,
            answer
          );
          const answerSent = sendSignalingMessage(answerMessage);
          console.log("📤 [WebRTC] Answer sent:", answerSent);
          break;
        case "answer":
        case "webrtc-answer":
          console.log("📥 [WebRTC] Received answer from:", message.from);
          const answerData = message.data?.answer || message.data;
          await connection.setRemoteDescription(answerData);
          console.log("✅ [WebRTC] Remote description set (answer)");
          break;
        case "ice-candidate":
          console.log("📥 [WebRTC] Received ICE candidate from:", message.from);
          const candidateData = message.data?.candidate || message.data;
          const candidate = new RTCIceCandidate(candidateData);
          await connection.addIceCandidate(candidate);
          console.log("✅ [WebRTC] ICE candidate added");
          break;
      }
    } catch (error2) {
      console.error("Failed to handle WebRTC signaling:", error2);
      setError("WebRTCシグナリングの処理に失敗しました");
    }
  }, [webrtcState.peers, currentUsername, currentRoomId, webrtcActions]);
  const connect = reactExports.useCallback(async () => {
    try {
      console.log("📡 connect() called - attempting WebSocket connection...");
      console.log("🔍 wsClientRef.current:", wsClientRef.current);
      console.log("🔍 Current connectionState:", connectionState);
      if (!wsClientRef.current) {
        throw new Error("WebSocket client not initialized");
      }
      const currentState = wsClientRef.current.getConnectionState();
      console.log("🔍 WebSocket client state before connect:", currentState);
      setError(null);
      console.log("🚀 Calling wsClientRef.current.connect()...");
      await wsClientRef.current.connect();
      const newState = wsClientRef.current.getConnectionState();
      console.log("✅ wsClientRef.current.connect() completed successfully");
      console.log("🔍 WebSocket client state after connect:", newState);
    } catch (error2) {
      console.error("❌ Failed to connect to signaling server:", error2);
      setError("シグナリングサーバーへの接続に失敗しました");
      throw error2;
    }
  }, [connectionState]);
  const disconnect = reactExports.useCallback(() => {
    console.log("🔌 disconnect() called");
    if (wsClientRef.current) {
      console.log("🔍 WebSocket state before disconnect:", wsClientRef.current.getConnectionState());
      wsClientRef.current.disconnect();
    }
    webrtcActions.cleanup();
    setCurrentRoomId(null);
    setCurrentUsername(null);
  }, [webrtcActions]);
  const joinRoom = reactExports.useCallback(async (roomId, username) => {
    try {
      console.log("🏠 joinRoom開始:", { roomId, username, connectionState, wsClient: !!wsClientRef.current });
      if (!wsClientRef.current) {
        throw new Error("WebSocket client not initialized");
      }
      const wsState = wsClientRef.current.getConnectionState();
      console.log("🔍 WebSocket状態:", wsState);
      if (wsState !== "connected") {
        throw new Error(`WebSocket not connected, state: ${wsState}`);
      }
      await webrtcActions.initializeWebRTC();
      console.log("📤 ルーム参加メッセージを作成中...");
      const joinMessage = MessageHandler.createJoinRoomMessage(roomId, username);
      console.log("📤 送信メッセージ:", joinMessage);
      const success = sendSignalingMessage(joinMessage);
      console.log("📤 メッセージ送信結果:", success);
      if (!success) {
        throw new Error("Failed to send join room message");
      }
      setCurrentRoomId(roomId);
      setCurrentUsername(username);
      setError(null);
      if (enableWebRTC) {
        console.log("🔗 バックエンドとのWebRTC接続を開始...");
        const startPeerMessage = {
          type: "start-peer-connection",
          data: {
            remoteUserId: "backend"
            // バックエンドとの接続
          },
          timestamp: Date.now()
        };
        const peerSuccess = sendSignalingMessage(startPeerMessage);
        console.log("🔗 WebRTC接続開始メッセージ送信結果:", peerSuccess);
      } else {
        console.log("🔗 WebRTC disabled (broadcast/viewer mode)");
      }
    } catch (error2) {
      console.error("❌ Failed to join room:", error2);
      setError(`ルーム参加に失敗しました: ${error2 instanceof Error ? error2.message : "Unknown error"}`);
      throw error2;
    }
  }, [connectionState, webrtcActions]);
  const leaveRoom = reactExports.useCallback((roomId) => {
    if (wsClientRef.current && currentRoomId === roomId) {
      const leaveMessage = MessageHandler.createLeaveRoomMessage(roomId);
      sendSignalingMessage(leaveMessage);
      webrtcActions.cleanup();
      setCurrentRoomId(null);
      setCurrentUsername(null);
    }
  }, [currentRoomId, webrtcActions]);
  const sendSignalingMessage = reactExports.useCallback((message) => {
    if (!wsClientRef.current) {
      console.warn("WebSocket client not initialized");
      return false;
    }
    return wsClientRef.current.send(message);
  }, []);
  const sendEmotionData = reactExports.useCallback((landmarks, _userId, confidence = 0.9, normalizedLandmarks) => {
    if (!wsClientRef.current || !currentRoomId) {
      console.warn("Cannot send emotion data: WebSocket not connected or not in room");
      return false;
    }
    const landmarksToSend = normalizedLandmarks && normalizedLandmarks.length > 0 ? normalizedLandmarks : landmarks;
    if (!landmarksToSend || landmarksToSend.length === 0) {
      console.warn("No landmarks to send");
      return false;
    }
    const emotionMessage = {
      type: "emotion",
      room: currentRoomId ?? void 0,
      data: {
        landmarks: flattenLandmarks(landmarksToSend),
        confidence,
        type: "normalized-mediapipe",
        // 正規化済みを示すフラグ
        isNormalized: !!normalizedLandmarks
        // 正規化されているかどうかの明示的なフラグ
      },
      timestamp: Date.now()
    };
    return sendSignalingMessage(emotionMessage);
  }, [currentRoomId]);
  const flattenLandmarks = reactExports.useCallback((landmarks) => {
    const flattened = [];
    landmarks.forEach((landmark) => {
      flattened.push(landmark.x || 0, landmark.y || 0, landmark.z || 0);
    });
    return flattened;
  }, []);
  const getWebSocketState = reactExports.useCallback(() => {
    return wsClientRef.current?.getConnectionState() || null;
  }, []);
  const sendBroadcastTimestamp = reactExports.useCallback((message) => {
    const wsState = wsClientRef.current?.getConnectionState();
    if (!wsClientRef.current || wsState !== "connected") {
      console.warn("Cannot send broadcast timestamp: WebSocket not connected", { wsState, connectionState });
      return false;
    }
    const success = wsClientRef.current.send(message);
    if (success) {
      console.log("📡 Sent broadcast timestamp:", message.data.frameId.slice(0, 8));
    }
    return success;
  }, [connectionState]);
  const sendEmotionWithTimestamp = reactExports.useCallback((message) => {
    const wsState = wsClientRef.current?.getConnectionState();
    if (!wsClientRef.current || wsState !== "connected") {
      console.warn("Cannot send emotion with timestamp: WebSocket not connected", { wsState, connectionState });
      return false;
    }
    const success = wsClientRef.current.send(message);
    if (success) {
      console.log("🎭 Sent emotion with timestamp:", message.data.frameId.slice(0, 8));
    }
    return success;
  }, [connectionState]);
  const initiateWebRTCConnection = reactExports.useCallback(async (peerId, peerUsername) => {
    if (!enableWebRTC) {
      console.log("⏭️ Skipping manual WebRTC connection - enableWebRTC is false");
      return;
    }
    console.log("🔗 [Manual] Initiating WebRTC connection to peer:", peerId, peerUsername);
    const fakePeerJoinedMessage = {
      type: "peer-joined",
      peerId,
      username: peerUsername,
      timestamp: Date.now()
    };
    await handlePeerJoined(fakePeerJoinedMessage);
  }, [enableWebRTC, handlePeerJoined]);
  reactExports.useEffect(() => {
    if (wsClientRef.current) {
      console.log("WebSocket client already exists, skipping initialization");
      return;
    }
    const userId = localStorage.getItem("userName") || "Anonymous";
    console.log("Creating WebSocket with userId:", userId);
    wsClientRef.current = new WebSocketClient({
      url: config.signalingUrl,
      userId,
      reconnectInterval: 5e3,
      maxReconnectAttempts: 1,
      heartbeatInterval: 0
    });
    messageHandlerRef.current = new MessageHandler();
    wsClientRef.current.setEventHandlers({
      onOpen: () => {
        console.log("Signaling connected");
        setError(null);
      },
      onClose: () => {
        console.log("Signaling disconnected");
      },
      onError: (error2) => {
        console.error("Signaling error:", error2);
        setError("シグナリングサーバーとの接続でエラーが発生しました");
      },
      onMessage: (message) => {
        messageHandlerRef.current?.handleMessage(message);
      },
      onConnectionStateChange: (state) => {
        console.log("🔄 Connection state changed to:", state);
        setConnectionState(state);
      }
    });
    console.log("🔧 [DEBUG] Setting up message handler callbacks:", {
      hasOnRoomJoined: !!onRoomJoined,
      hasOnBroadcastTimestamp: !!onBroadcastTimestamp,
      hasOnEmotionWithTimestamp: !!onEmotionWithTimestamp,
      hasOnIonMessage: !!onIonMessage,
      hasHandlePeerJoined: !!handlePeerJoined
    });
    messageHandlerRef.current.setCallbacks({
      onPeerJoined: handlePeerJoined,
      onPeerLeft: handlePeerLeft,
      onWebRTCSignaling: handleWebRTCSignaling,
      onEmotionBroadcast: handleEmotionBroadcast,
      onEmotionProcessed: handleEmotionProcessed,
      onBroadcastTimestamp,
      onEmotionWithTimestamp,
      onLaughTrigger,
      onIonMessage,
      onRoomJoined,
      onError: (errorMessage) => {
        setError(errorMessage.error.message);
      }
    });
    console.log("✅ [DEBUG] Message handler callbacks set");
    if (autoConnect) {
      connect();
    }
    return () => {
      wsClientRef.current?.disconnect();
    };
  }, [autoConnect]);
  reactExports.useEffect(() => {
    console.log("🔄 [DEBUG] Updating callbacks (prop change detected):", {
      hasOnRoomJoined: !!onRoomJoined,
      hasOnBroadcastTimestamp: !!onBroadcastTimestamp,
      hasOnEmotionWithTimestamp: !!onEmotionWithTimestamp,
      hasOnIonMessage: !!onIonMessage,
      hasMessageHandler: !!messageHandlerRef.current
    });
    if (messageHandlerRef.current) {
      messageHandlerRef.current.setCallbacks({
        onPeerJoined: handlePeerJoined,
        onPeerLeft: handlePeerLeft,
        onWebRTCSignaling: handleWebRTCSignaling,
        onEmotionBroadcast: handleEmotionBroadcast,
        onEmotionProcessed: handleEmotionProcessed,
        onBroadcastTimestamp,
        onEmotionWithTimestamp,
        onLaughTrigger,
        onIonMessage,
        onRoomJoined,
        onError: (errorMessage) => {
          setError(errorMessage.error.message);
        }
      });
      console.log("✅ [DEBUG] Callbacks updated via useEffect");
    }
  }, [onBroadcastTimestamp, onEmotionWithTimestamp, onLaughTrigger, onRoomJoined, onIonMessage]);
  return {
    connectionState,
    isConnected: connectionState === "connected",
    error,
    receivedEmotions,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendSignalingMessage,
    sendEmotionData,
    sendBroadcastTimestamp,
    sendEmotionWithTimestamp,
    getWebSocketState,
    initiateWebRTCConnection
  };
};
var t = "undefined" != typeof self ? self : {};
function e() {
  throw Error("Invalid UTF8");
}
function n(t2, e2) {
  return e2 = String.fromCharCode.apply(null, e2), null == t2 ? e2 : t2 + e2;
}
let r, i;
const s = "undefined" != typeof TextDecoder;
let o;
const a = "undefined" != typeof TextEncoder;
function c(t2) {
  if (a) t2 = (o ||= new TextEncoder()).encode(t2);
  else {
    let n2 = 0;
    const r2 = new Uint8Array(3 * t2.length);
    for (let i2 = 0; i2 < t2.length; i2++) {
      var e2 = t2.charCodeAt(i2);
      if (e2 < 128) r2[n2++] = e2;
      else {
        if (e2 < 2048) r2[n2++] = e2 >> 6 | 192;
        else {
          if (e2 >= 55296 && e2 <= 57343) {
            if (e2 <= 56319 && i2 < t2.length) {
              const s2 = t2.charCodeAt(++i2);
              if (s2 >= 56320 && s2 <= 57343) {
                e2 = 1024 * (e2 - 55296) + s2 - 56320 + 65536, r2[n2++] = e2 >> 18 | 240, r2[n2++] = e2 >> 12 & 63 | 128, r2[n2++] = e2 >> 6 & 63 | 128, r2[n2++] = 63 & e2 | 128;
                continue;
              }
              i2--;
            }
            e2 = 65533;
          }
          r2[n2++] = e2 >> 12 | 224, r2[n2++] = e2 >> 6 & 63 | 128;
        }
        r2[n2++] = 63 & e2 | 128;
      }
    }
    t2 = n2 === r2.length ? r2 : r2.subarray(0, n2);
  }
  return t2;
}
var h, u;
t: {
  for (var l = ["CLOSURE_FLAGS"], d = t, f = 0; f < l.length; f++) if (null == (d = d[l[f]])) {
    u = null;
    break t;
  }
  u = d;
}
var p, g = u && u[610401301];
h = null != g && g;
const m = t.navigator;
function y(t2) {
  return !!h && (!!p && p.brands.some((({ brand: e2 }) => e2 && -1 != e2.indexOf(t2))));
}
function _(e2) {
  var n2;
  return (n2 = t.navigator) && (n2 = n2.userAgent) || (n2 = ""), -1 != n2.indexOf(e2);
}
function v() {
  return !!h && (!!p && p.brands.length > 0);
}
function E() {
  return v() ? y("Chromium") : (_("Chrome") || _("CriOS")) && !(!v() && _("Edge")) || _("Silk");
}
function w(t2) {
  return w[" "](t2), t2;
}
p = m && m.userAgentData || null, w[" "] = function() {
};
var T = !v() && (_("Trident") || _("MSIE"));
!_("Android") || E(), E(), _("Safari") && (E() || !v() && _("Coast") || !v() && _("Opera") || !v() && _("Edge") || (v() ? y("Microsoft Edge") : _("Edg/")) || v() && y("Opera"));
var A = {}, b = null;
function k(t2) {
  const e2 = t2.length;
  let n2 = 3 * e2 / 4;
  n2 % 3 ? n2 = Math.floor(n2) : -1 != "=.".indexOf(t2[e2 - 1]) && (n2 = -1 != "=.".indexOf(t2[e2 - 2]) ? n2 - 2 : n2 - 1);
  const r2 = new Uint8Array(n2);
  let i2 = 0;
  return (function(t3, e3) {
    function n3(e4) {
      for (; r3 < t3.length; ) {
        const e5 = t3.charAt(r3++), n4 = b[e5];
        if (null != n4) return n4;
        if (!/^[\s\xa0]*$/.test(e5)) throw Error("Unknown base64 encoding at char: " + e5);
      }
      return e4;
    }
    S();
    let r3 = 0;
    for (; ; ) {
      const t4 = n3(-1), r4 = n3(0), i3 = n3(64), s2 = n3(64);
      if (64 === s2 && -1 === t4) break;
      e3(t4 << 2 | r4 >> 4), 64 != i3 && (e3(r4 << 4 & 240 | i3 >> 2), 64 != s2 && e3(i3 << 6 & 192 | s2));
    }
  })(t2, (function(t3) {
    r2[i2++] = t3;
  })), i2 !== n2 ? r2.subarray(0, i2) : r2;
}
function S() {
  if (!b) {
    b = {};
    var t2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""), e2 = ["+/=", "+/", "-_=", "-_.", "-_"];
    for (let n2 = 0; n2 < 5; n2++) {
      const r2 = t2.concat(e2[n2].split(""));
      A[n2] = r2;
      for (let t3 = 0; t3 < r2.length; t3++) {
        const e3 = r2[t3];
        void 0 === b[e3] && (b[e3] = t3);
      }
    }
  }
}
var x = "undefined" != typeof Uint8Array, L = !T && "function" == typeof btoa;
function R(t2) {
  if (!L) {
    var e2;
    void 0 === e2 && (e2 = 0), S(), e2 = A[e2];
    var n2 = Array(Math.floor(t2.length / 3)), r2 = e2[64] || "";
    let c2 = 0, h2 = 0;
    for (; c2 < t2.length - 2; c2 += 3) {
      var i2 = t2[c2], s2 = t2[c2 + 1], o2 = t2[c2 + 2], a2 = e2[i2 >> 2];
      i2 = e2[(3 & i2) << 4 | s2 >> 4], s2 = e2[(15 & s2) << 2 | o2 >> 6], o2 = e2[63 & o2], n2[h2++] = a2 + i2 + s2 + o2;
    }
    switch (a2 = 0, o2 = r2, t2.length - c2) {
      case 2:
        o2 = e2[(15 & (a2 = t2[c2 + 1])) << 2] || r2;
      case 1:
        t2 = t2[c2], n2[h2] = e2[t2 >> 2] + e2[(3 & t2) << 4 | a2 >> 4] + o2 + r2;
    }
    return n2.join("");
  }
  for (e2 = "", n2 = 0, r2 = t2.length - 10240; n2 < r2; ) e2 += String.fromCharCode.apply(null, t2.subarray(n2, n2 += 10240));
  return e2 += String.fromCharCode.apply(null, n2 ? t2.subarray(n2) : t2), btoa(e2);
}
const F = /[-_.]/g, I = { "-": "+", _: "/", ".": "=" };
function M(t2) {
  return I[t2] || "";
}
function P(t2) {
  if (!L) return k(t2);
  F.test(t2) && (t2 = t2.replace(F, M)), t2 = atob(t2);
  const e2 = new Uint8Array(t2.length);
  for (let n2 = 0; n2 < t2.length; n2++) e2[n2] = t2.charCodeAt(n2);
  return e2;
}
function C(t2) {
  return x && null != t2 && t2 instanceof Uint8Array;
}
var O = {};
function U() {
  return B ||= new N(null, O);
}
function D(t2) {
  j(O);
  var e2 = t2.g;
  return null == (e2 = null == e2 || C(e2) ? e2 : "string" == typeof e2 ? P(e2) : null) ? e2 : t2.g = e2;
}
var N = class {
  h() {
    return new Uint8Array(D(this) || 0);
  }
  constructor(t2, e2) {
    if (j(e2), this.g = t2, null != t2 && 0 === t2.length) throw Error("ByteString should be constructed with non-empty values");
  }
};
let B, G;
function j(t2) {
  if (t2 !== O) throw Error("illegal external caller");
}
function V(t2, e2) {
  t2.__closure__error__context__984382 || (t2.__closure__error__context__984382 = {}), t2.__closure__error__context__984382.severity = e2;
}
function X(t2) {
  return V(t2 = Error(t2), "warning"), t2;
}
function H(e2) {
  if (null != e2) {
    var n2 = G ??= {}, r2 = n2[e2] || 0;
    r2 >= 5 || (n2[e2] = r2 + 1, V(e2 = Error(), "incident"), (function(e3) {
      t.setTimeout((() => {
        throw e3;
      }), 0);
    })(e2));
  }
}
var W = "function" == typeof Symbol && "symbol" == typeof Symbol();
function z(t2, e2, n2 = false) {
  return "function" == typeof Symbol && "symbol" == typeof Symbol() ? n2 && Symbol.for && t2 ? Symbol.for(t2) : null != t2 ? Symbol(t2) : Symbol() : e2;
}
var K = z("jas", void 0, true), Y = z(void 0, "0di"), $ = z(void 0, "1oa"), q = z(void 0, Symbol()), J = z(void 0, "0actk"), Z = z(void 0, "8utk");
const Q = W ? K : "Ea", tt = { Ea: { value: 0, configurable: true, writable: true, enumerable: false } }, et = Object.defineProperties;
function nt(t2, e2) {
  W || Q in t2 || et(t2, tt), t2[Q] |= e2;
}
function rt(t2, e2) {
  W || Q in t2 || et(t2, tt), t2[Q] = e2;
}
function it(t2) {
  return nt(t2, 34), t2;
}
function st(t2, e2) {
  rt(e2, -15615 & (0 | t2));
}
function ot(t2, e2) {
  rt(e2, -15581 & (34 | t2));
}
function at() {
  return "function" == typeof BigInt;
}
function ct(t2) {
  return Array.prototype.slice.call(t2);
}
var ht, ut = {};
function lt(t2) {
  return null !== t2 && "object" == typeof t2 && !Array.isArray(t2) && t2.constructor === Object;
}
function dt(t2, e2) {
  if (null != t2) {
    if ("string" == typeof t2) t2 = t2 ? new N(t2, O) : U();
    else if (t2.constructor !== N) if (C(t2)) t2 = t2.length ? new N(new Uint8Array(t2), O) : U();
    else {
      if (!e2) throw Error();
      t2 = void 0;
    }
  }
  return t2;
}
const ft = [];
function pt(t2) {
  if (2 & t2) throw Error();
}
rt(ft, 55), ht = Object.freeze(ft);
class gt {
  constructor(t2, e2, n2) {
    this.g = t2, this.h = e2, this.l = n2;
  }
  next() {
    const t2 = this.g.next();
    return t2.done || (t2.value = this.h.call(this.l, t2.value)), t2;
  }
  [Symbol.iterator]() {
    return this;
  }
}
function mt(t2) {
  return q ? t2[q] : void 0;
}
var yt = Object.freeze({});
function _t(t2) {
  return t2.Na = true, t2;
}
var vt = _t(((t2) => "number" == typeof t2)), Et = _t(((t2) => "string" == typeof t2)), wt = _t(((t2) => "boolean" == typeof t2)), Tt = "function" == typeof t.BigInt && "bigint" == typeof t.BigInt(0);
function At(t2) {
  var e2 = t2;
  if (Et(e2)) {
    if (!/^\s*(?:-?[1-9]\d*|0)?\s*$/.test(e2)) throw Error(String(e2));
  } else if (vt(e2) && !Number.isSafeInteger(e2)) throw Error(String(e2));
  return Tt ? BigInt(t2) : t2 = wt(t2) ? t2 ? "1" : "0" : Et(t2) ? t2.trim() || "0" : String(t2);
}
var bt = _t(((t2) => Tt ? t2 >= St && t2 <= Lt : "-" === t2[0] ? Rt(t2, kt) : Rt(t2, xt)));
const kt = Number.MIN_SAFE_INTEGER.toString(), St = Tt ? BigInt(Number.MIN_SAFE_INTEGER) : void 0, xt = Number.MAX_SAFE_INTEGER.toString(), Lt = Tt ? BigInt(Number.MAX_SAFE_INTEGER) : void 0;
function Rt(t2, e2) {
  if (t2.length > e2.length) return false;
  if (t2.length < e2.length || t2 === e2) return true;
  for (let n2 = 0; n2 < t2.length; n2++) {
    const r2 = t2[n2], i2 = e2[n2];
    if (r2 > i2) return false;
    if (r2 < i2) return true;
  }
}
const Ft = "function" == typeof Uint8Array.prototype.slice;
let It, Mt = 0, Pt = 0;
function Ct(t2) {
  const e2 = t2 >>> 0;
  Mt = e2, Pt = (t2 - e2) / 4294967296 >>> 0;
}
function Ot(t2) {
  if (t2 < 0) {
    Ct(-t2);
    const [e2, n2] = Xt(Mt, Pt);
    Mt = e2 >>> 0, Pt = n2 >>> 0;
  } else Ct(t2);
}
function Ut(t2) {
  const e2 = It ||= new DataView(new ArrayBuffer(8));
  e2.setFloat32(0, +t2, true), Pt = 0, Mt = e2.getUint32(0, true);
}
function Dt(t2, e2) {
  const n2 = 4294967296 * e2 + (t2 >>> 0);
  return Number.isSafeInteger(n2) ? n2 : Bt(t2, e2);
}
function Nt(t2, e2) {
  const n2 = 2147483648 & e2;
  return n2 && (e2 = ~e2 >>> 0, 0 == (t2 = 1 + ~t2 >>> 0) && (e2 = e2 + 1 >>> 0)), "number" == typeof (t2 = Dt(t2, e2)) ? n2 ? -t2 : t2 : n2 ? "-" + t2 : t2;
}
function Bt(t2, e2) {
  if (t2 >>>= 0, (e2 >>>= 0) <= 2097151) var n2 = "" + (4294967296 * e2 + t2);
  else at() ? n2 = "" + (BigInt(e2) << BigInt(32) | BigInt(t2)) : (t2 = (16777215 & t2) + 6777216 * (n2 = 16777215 & (t2 >>> 24 | e2 << 8)) + 6710656 * (e2 = e2 >> 16 & 65535), n2 += 8147497 * e2, e2 *= 2, t2 >= 1e7 && (n2 += t2 / 1e7 >>> 0, t2 %= 1e7), n2 >= 1e7 && (e2 += n2 / 1e7 >>> 0, n2 %= 1e7), n2 = e2 + Gt(n2) + Gt(t2));
  return n2;
}
function Gt(t2) {
  return t2 = String(t2), "0000000".slice(t2.length) + t2;
}
function jt() {
  var t2 = Mt, e2 = Pt;
  if (2147483648 & e2) if (at()) t2 = "" + (BigInt(0 | e2) << BigInt(32) | BigInt(t2 >>> 0));
  else {
    const [n2, r2] = Xt(t2, e2);
    t2 = "-" + Bt(n2, r2);
  }
  else t2 = Bt(t2, e2);
  return t2;
}
function Vt(t2) {
  if (t2.length < 16) Ot(Number(t2));
  else if (at()) t2 = BigInt(t2), Mt = Number(t2 & BigInt(4294967295)) >>> 0, Pt = Number(t2 >> BigInt(32) & BigInt(4294967295));
  else {
    const e2 = +("-" === t2[0]);
    Pt = Mt = 0;
    const n2 = t2.length;
    for (let r2 = e2, i2 = (n2 - e2) % 6 + e2; i2 <= n2; r2 = i2, i2 += 6) {
      const e3 = Number(t2.slice(r2, i2));
      Pt *= 1e6, Mt = 1e6 * Mt + e3, Mt >= 4294967296 && (Pt += Math.trunc(Mt / 4294967296), Pt >>>= 0, Mt >>>= 0);
    }
    if (e2) {
      const [t3, e3] = Xt(Mt, Pt);
      Mt = t3, Pt = e3;
    }
  }
}
function Xt(t2, e2) {
  return e2 = ~e2, t2 ? t2 = 1 + ~t2 : e2 += 1, [t2, e2];
}
const Ht = "function" == typeof BigInt ? BigInt.asIntN : void 0, Wt = "function" == typeof BigInt ? BigInt.asUintN : void 0, zt = Number.isSafeInteger, Kt = Number.isFinite, Yt = Math.trunc, $t = At(0);
function qt(t2) {
  return null == t2 || "number" == typeof t2 ? t2 : "NaN" === t2 || "Infinity" === t2 || "-Infinity" === t2 ? Number(t2) : void 0;
}
function Jt(t2) {
  return null == t2 || "boolean" == typeof t2 ? t2 : "number" == typeof t2 ? !!t2 : void 0;
}
const Zt = /^-?([1-9][0-9]*|0)(\.[0-9]+)?$/;
function Qt(t2) {
  switch (typeof t2) {
    case "bigint":
      return true;
    case "number":
      return Kt(t2);
    case "string":
      return Zt.test(t2);
    default:
      return false;
  }
}
function te(t2) {
  if (null == t2) return t2;
  if ("string" == typeof t2 && t2) t2 = +t2;
  else if ("number" != typeof t2) return;
  return Kt(t2) ? 0 | t2 : void 0;
}
function ee(t2) {
  if (null == t2) return t2;
  if ("string" == typeof t2 && t2) t2 = +t2;
  else if ("number" != typeof t2) return;
  return Kt(t2) ? t2 >>> 0 : void 0;
}
function ne(t2) {
  if ("-" === t2[0]) return false;
  const e2 = t2.length;
  return e2 < 20 || 20 === e2 && Number(t2.substring(0, 6)) < 184467;
}
function re(t2) {
  const e2 = t2.length;
  return "-" === t2[0] ? e2 < 20 || 20 === e2 && Number(t2.substring(0, 7)) > -922337 : e2 < 19 || 19 === e2 && Number(t2.substring(0, 6)) < 922337;
}
function ie(t2) {
  return re(t2) ? t2 : (Vt(t2), jt());
}
function se(t2) {
  return t2 = Yt(t2), zt(t2) || (Ot(t2), t2 = Nt(Mt, Pt)), t2;
}
function oe(t2) {
  var e2 = Yt(Number(t2));
  return zt(e2) ? String(e2) : (-1 !== (e2 = t2.indexOf(".")) && (t2 = t2.substring(0, e2)), ie(t2));
}
function ae(t2) {
  var e2 = Yt(Number(t2));
  return zt(e2) ? At(e2) : (-1 !== (e2 = t2.indexOf(".")) && (t2 = t2.substring(0, e2)), at() ? At(Ht(64, BigInt(t2))) : At(ie(t2)));
}
function ce(t2) {
  if (zt(t2)) t2 = At(se(t2));
  else {
    if (t2 = Yt(t2), zt(t2)) t2 = String(t2);
    else {
      const e2 = String(t2);
      re(e2) ? t2 = e2 : (Ot(t2), t2 = jt());
    }
    t2 = At(t2);
  }
  return t2;
}
function he(t2) {
  return null == t2 ? t2 : "bigint" == typeof t2 ? (bt(t2) ? t2 = Number(t2) : (t2 = Ht(64, t2), t2 = bt(t2) ? Number(t2) : String(t2)), t2) : Qt(t2) ? "number" == typeof t2 ? se(t2) : oe(t2) : void 0;
}
function ue(t2) {
  if (null == t2) return t2;
  var e2 = typeof t2;
  if ("bigint" === e2) return String(Wt(64, t2));
  if (Qt(t2)) {
    if ("string" === e2) return e2 = Yt(Number(t2)), zt(e2) && e2 >= 0 ? t2 = String(e2) : (-1 !== (e2 = t2.indexOf(".")) && (t2 = t2.substring(0, e2)), ne(t2) || (Vt(t2), t2 = Bt(Mt, Pt))), t2;
    if ("number" === e2) return (t2 = Yt(t2)) >= 0 && zt(t2) ? t2 : (function(t3) {
      if (t3 < 0) {
        Ot(t3);
        var e3 = Bt(Mt, Pt);
        return t3 = Number(e3), zt(t3) ? t3 : e3;
      }
      return ne(e3 = String(t3)) ? e3 : (Ot(t3), Dt(Mt, Pt));
    })(t2);
  }
}
function le(t2) {
  if ("string" != typeof t2) throw Error();
  return t2;
}
function de(t2) {
  if (null != t2 && "string" != typeof t2) throw Error();
  return t2;
}
function fe(t2) {
  return null == t2 || "string" == typeof t2 ? t2 : void 0;
}
function pe(t2, e2, n2, r2) {
  if (null != t2 && "object" == typeof t2 && t2.W === ut) return t2;
  if (!Array.isArray(t2)) return n2 ? 2 & r2 ? ((t2 = e2[Y]) || (it((t2 = new e2()).u), t2 = e2[Y] = t2), e2 = t2) : e2 = new e2() : e2 = void 0, e2;
  let i2 = n2 = 0 | t2[Q];
  return 0 === i2 && (i2 |= 32 & r2), i2 |= 2 & r2, i2 !== n2 && rt(t2, i2), new e2(t2);
}
function ge(t2, e2, n2) {
  if (e2) t: {
    if (!Qt(e2 = t2)) throw X("int64");
    switch (typeof e2) {
      case "string":
        e2 = ae(e2);
        break t;
      case "bigint":
        e2 = At(Ht(64, e2));
        break t;
      default:
        e2 = ce(e2);
    }
  }
  else t2 = typeof (e2 = t2), e2 = null == e2 ? e2 : "bigint" === t2 ? At(Ht(64, e2)) : Qt(e2) ? "string" === t2 ? ae(e2) : ce(e2) : void 0;
  return null == (t2 = e2) ? n2 ? $t : void 0 : t2;
}
function me(t2) {
  return t2;
}
const ye = {};
let _e = (function() {
  try {
    return w(new class extends Map {
      constructor() {
        super();
      }
    }()), false;
  } catch {
    return true;
  }
})();
class ve {
  constructor() {
    this.g = /* @__PURE__ */ new Map();
  }
  get(t2) {
    return this.g.get(t2);
  }
  set(t2, e2) {
    return this.g.set(t2, e2), this.size = this.g.size, this;
  }
  delete(t2) {
    return t2 = this.g.delete(t2), this.size = this.g.size, t2;
  }
  clear() {
    this.g.clear(), this.size = this.g.size;
  }
  has(t2) {
    return this.g.has(t2);
  }
  entries() {
    return this.g.entries();
  }
  keys() {
    return this.g.keys();
  }
  values() {
    return this.g.values();
  }
  forEach(t2, e2) {
    return this.g.forEach(t2, e2);
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}
const Ee = _e ? (Object.setPrototypeOf(ve.prototype, Map.prototype), Object.defineProperties(ve.prototype, { size: { value: 0, configurable: true, enumerable: true, writable: true } }), ve) : class extends Map {
  constructor() {
    super();
  }
};
function we(t2) {
  return t2;
}
function Te(t2) {
  if (2 & t2.M) throw Error("Cannot mutate an immutable Map");
}
var Ae = class extends Ee {
  constructor(t2, e2, n2 = we, r2 = we) {
    super();
    let i2 = 0 | t2[Q];
    i2 |= 64, rt(t2, i2), this.M = i2, this.I = e2, this.S = n2, this.X = this.I ? be : r2;
    for (let s2 = 0; s2 < t2.length; s2++) {
      const o2 = t2[s2], a2 = n2(o2[0], false, true);
      let c2 = o2[1];
      e2 ? void 0 === c2 && (c2 = null) : c2 = r2(o2[1], false, true, void 0, void 0, i2), super.set(a2, c2);
    }
  }
  La() {
    var t2 = Ce;
    if (0 !== this.size) return Array.from(super.entries(), ((e2) => (e2[0] = t2(e2[0]), e2[1] = t2(e2[1]), e2)));
  }
  da(t2 = ke) {
    const e2 = [], n2 = super.entries();
    for (var r2; !(r2 = n2.next()).done; ) (r2 = r2.value)[0] = t2(r2[0]), r2[1] = t2(r2[1]), e2.push(r2);
    return e2;
  }
  clear() {
    Te(this), super.clear();
  }
  delete(t2) {
    return Te(this), super.delete(this.S(t2, true, false));
  }
  entries() {
    if (this.I) {
      var t2 = super.keys();
      t2 = new gt(t2, Se, this);
    } else t2 = super.entries();
    return t2;
  }
  values() {
    if (this.I) {
      var t2 = super.keys();
      t2 = new gt(t2, Ae.prototype.get, this);
    } else t2 = super.values();
    return t2;
  }
  forEach(t2, e2) {
    this.I ? super.forEach(((n2, r2, i2) => {
      t2.call(e2, i2.get(r2), r2, i2);
    })) : super.forEach(t2, e2);
  }
  set(t2, e2) {
    return Te(this), null == (t2 = this.S(t2, true, false)) ? this : null == e2 ? (super.delete(t2), this) : super.set(t2, this.X(e2, true, true, this.I, false, this.M));
  }
  Ja(t2) {
    const e2 = this.S(t2[0], false, true);
    t2 = t2[1], t2 = this.I ? void 0 === t2 ? null : t2 : this.X(t2, false, true, void 0, false, this.M), super.set(e2, t2);
  }
  has(t2) {
    return super.has(this.S(t2, false, false));
  }
  get(t2) {
    t2 = this.S(t2, false, false);
    const e2 = super.get(t2);
    if (void 0 !== e2) {
      var n2 = this.I;
      return n2 ? ((n2 = this.X(e2, false, true, n2, this.pa, this.M)) !== e2 && super.set(t2, n2), n2) : e2;
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
};
function be(t2, e2, n2, r2, i2, s2) {
  return t2 = pe(t2, r2, n2, s2), i2 && (t2 = je(t2)), t2;
}
function ke(t2) {
  return t2;
}
function Se(t2) {
  return [t2, this.get(t2)];
}
let xe, Le, Re, Fe;
function Ie() {
  return xe ||= new Ae(it([]), void 0, void 0, void 0, ye);
}
function Me(t2, e2, n2, r2, i2) {
  if (null != t2) {
    if (Array.isArray(t2)) {
      const s2 = 0 | t2[Q];
      return 0 === t2.length && 1 & s2 ? void 0 : i2 && 2 & s2 ? t2 : Pe(t2, e2, n2, void 0 !== r2, i2);
    }
    return e2(t2, r2);
  }
}
function Pe(t2, e2, n2, r2, i2) {
  const s2 = r2 || n2 ? 0 | t2[Q] : 0, o2 = r2 ? !!(32 & s2) : void 0;
  let a2 = 0;
  const c2 = (r2 = ct(t2)).length;
  for (let t3 = 0; t3 < c2; t3++) {
    var h2 = r2[t3];
    if (t3 === c2 - 1 && lt(h2)) {
      var u2 = e2, l = n2, d = o2, f = i2;
      let t4;
      for (let e3 in h2) {
        const n3 = Me(h2[e3], u2, l, d, f);
        null != n3 && ((t4 ??= {})[e3] = n3);
      }
      h2 = t4;
    } else h2 = Me(r2[t3], e2, n2, o2, i2);
    r2[t3] = h2, null != h2 && (a2 = t3 + 1);
  }
  return a2 < c2 && (r2.length = a2), n2 && ((t2 = mt(t2)) && (r2[q] = ct(t2)), n2(s2, r2)), r2;
}
function Ce(t2) {
  return Me(t2, Oe, void 0, void 0, false);
}
function Oe(t2) {
  switch (typeof t2) {
    case "number":
      return Number.isFinite(t2) ? t2 : "" + t2;
    case "bigint":
      return bt(t2) ? Number(t2) : "" + t2;
    case "boolean":
      return t2 ? 1 : 0;
    case "object":
      if (C(t2)) return C(t2) && H(Z), R(t2);
      if (t2.W === ut) return Ue(t2);
      if (t2 instanceof N) {
        const e2 = t2.g;
        return null == e2 ? "" : "string" == typeof e2 ? e2 : t2.g = R(e2);
      }
      return t2 instanceof Ae ? t2.La() : void 0;
  }
  return t2;
}
function Ue(t2) {
  var e2 = t2.u;
  t2 = Pe(e2, Oe, void 0, void 0, false);
  var n2 = 0 | e2[Q];
  if ((e2 = t2.length) && !(512 & n2)) {
    var r2 = t2[e2 - 1], i2 = false;
    lt(r2) ? (e2--, i2 = true) : r2 = void 0;
    var s2 = e2 - (n2 = 512 & n2 ? 0 : -1), o2 = (Le ?? me)(s2, n2, t2, r2);
    if (r2 && (t2[e2] = void 0), s2 < o2 && r2) {
      for (var a2 in s2 = true, r2) {
        const c2 = +a2;
        c2 <= o2 ? (t2[i2 = c2 + n2] = r2[a2], e2 = Math.max(i2 + 1, e2), i2 = false, delete r2[a2]) : s2 = false;
      }
      s2 && (r2 = void 0);
    }
    for (s2 = e2 - 1; e2 > 0; s2 = e2 - 1) if (null == (a2 = t2[s2])) e2--, i2 = true;
    else {
      if (!((s2 -= n2) >= o2)) break;
      (r2 ??= {})[s2] = a2, e2--, i2 = true;
    }
    i2 && (t2.length = e2), r2 && t2.push(r2);
  }
  return t2;
}
function De(t2, e2, n2) {
  return t2 = Ne(t2, e2[0], e2[1], n2 ? 1 : 2), e2 !== Re && n2 && nt(t2, 8192), t2;
}
function Ne(t2, e2, n2, r2) {
  if (null == t2) {
    var i2 = 96;
    n2 ? (t2 = [n2], i2 |= 512) : t2 = [], e2 && (i2 = -16760833 & i2 | (1023 & e2) << 14);
  } else {
    if (!Array.isArray(t2)) throw Error("narr");
    if (8192 & (i2 = 0 | t2[Q]) || !(64 & i2) || 2 & i2 || H(J), 1024 & i2) throw Error("farr");
    if (64 & i2) return t2;
    if (1 === r2 || 2 === r2 || (i2 |= 64), n2 && (i2 |= 512, n2 !== t2[0])) throw Error("mid");
    t: {
      var s2 = (n2 = t2).length;
      if (s2) {
        var o2 = s2 - 1;
        if (lt(r2 = n2[o2])) {
          if ((o2 -= e2 = 512 & (i2 |= 256) ? 0 : -1) >= 1024) throw Error("pvtlmt");
          for (var a2 in r2) (s2 = +a2) < o2 && (n2[s2 + e2] = r2[a2], delete r2[a2]);
          i2 = -16760833 & i2 | (1023 & o2) << 14;
          break t;
        }
      }
      if (e2) {
        if ((a2 = Math.max(e2, s2 - (512 & i2 ? 0 : -1))) > 1024) throw Error("spvt");
        i2 = -16760833 & i2 | (1023 & a2) << 14;
      }
    }
  }
  return rt(t2, i2), t2;
}
function Be(t2, e2, n2 = ot) {
  if (null != t2) {
    if (x && t2 instanceof Uint8Array) return e2 ? t2 : new Uint8Array(t2);
    if (Array.isArray(t2)) {
      var r2 = 0 | t2[Q];
      return 2 & r2 ? t2 : (e2 &&= 0 === r2 || !!(32 & r2) && !(64 & r2 || !(16 & r2)), e2 ? (rt(t2, 34 | r2), 4 & r2 && Object.freeze(t2), t2) : Pe(t2, Be, 4 & r2 ? ot : n2, true, true));
    }
    return t2.W === ut ? t2 = 2 & (r2 = 0 | (n2 = t2.u)[Q]) ? t2 : new t2.constructor(Ge(n2, r2, true)) : t2 instanceof Ae && !(2 & t2.M) && (n2 = it(t2.da(Be)), t2 = new Ae(n2, t2.I, t2.S, t2.X)), t2;
  }
}
function Ge(t2, e2, n2) {
  const r2 = n2 || 2 & e2 ? ot : st, i2 = !!(32 & e2);
  return t2 = (function(t3, e3, n3) {
    const r3 = ct(t3);
    var i3 = r3.length;
    const s2 = 256 & e3 ? r3[i3 - 1] : void 0;
    for (i3 += s2 ? -1 : 0, e3 = 512 & e3 ? 1 : 0; e3 < i3; e3++) r3[e3] = n3(r3[e3]);
    if (s2) {
      e3 = r3[e3] = {};
      for (const t4 in s2) e3[t4] = n3(s2[t4]);
    }
    return (t3 = mt(t3)) && (r3[q] = ct(t3)), r3;
  })(t2, e2, ((t3) => Be(t3, i2, r2))), nt(t2, 32 | (n2 ? 2 : 0)), t2;
}
function je(t2) {
  const e2 = t2.u, n2 = 0 | e2[Q];
  return 2 & n2 ? new t2.constructor(Ge(e2, n2, false)) : t2;
}
function Ve(t2, e2) {
  return Xe(t2 = t2.u, 0 | t2[Q], e2);
}
function Xe(t2, e2, n2) {
  if (-1 === n2) return null;
  const r2 = n2 + (512 & e2 ? 0 : -1), i2 = t2.length - 1;
  return r2 >= i2 && 256 & e2 ? t2[i2][n2] : r2 <= i2 ? t2[r2] : void 0;
}
function He(t2, e2, n2) {
  const r2 = t2.u;
  let i2 = 0 | r2[Q];
  return pt(i2), We(r2, i2, e2, n2), t2;
}
function We(t2, e2, n2, r2) {
  const i2 = 512 & e2 ? 0 : -1, s2 = n2 + i2;
  var o2 = t2.length - 1;
  return s2 >= o2 && 256 & e2 ? (t2[o2][n2] = r2, e2) : s2 <= o2 ? (t2[s2] = r2, e2) : (void 0 !== r2 && (n2 >= (o2 = e2 >> 14 & 1023 || 536870912) ? null != r2 && (t2[o2 + i2] = { [n2]: r2 }, rt(t2, e2 |= 256)) : t2[s2] = r2), e2);
}
function ze(t2, e2) {
  let n2 = 0 | (t2 = t2.u)[Q];
  const r2 = Xe(t2, n2, e2), i2 = qt(r2);
  return null != i2 && i2 !== r2 && We(t2, n2, e2, i2), i2;
}
function Ke(t2) {
  let e2 = 0 | (t2 = t2.u)[Q];
  const n2 = Xe(t2, e2, 1), r2 = dt(n2, true);
  return null != r2 && r2 !== n2 && We(t2, e2, 1, r2), r2;
}
function Ye() {
  return void 0 === yt ? 2 : 4;
}
function $e(t2, e2, n2, r2, i2) {
  const s2 = t2.u, o2 = 2 & (t2 = 0 | s2[Q]) ? 1 : r2;
  i2 = !!i2;
  let a2 = 0 | (r2 = qe(s2, t2, e2))[Q];
  if (!(4 & a2)) {
    4 & a2 && (r2 = ct(r2), a2 = pn(a2, t2), t2 = We(s2, t2, e2, r2));
    let i3 = 0, o3 = 0;
    for (; i3 < r2.length; i3++) {
      const t3 = n2(r2[i3]);
      null != t3 && (r2[o3++] = t3);
    }
    o3 < i3 && (r2.length = o3), a2 = Je(a2, t2), n2 = -2049 & (20 | a2), a2 = n2 &= -4097, rt(r2, a2), 2 & a2 && Object.freeze(r2);
  }
  return 1 === o2 || 4 === o2 && 32 & a2 ? Ze(a2) || (i2 = a2, a2 |= 2, a2 !== i2 && rt(r2, a2), Object.freeze(r2)) : (2 === o2 && Ze(a2) && (r2 = ct(r2), a2 = pn(a2, t2), a2 = gn(a2, t2, i2), rt(r2, a2), t2 = We(s2, t2, e2, r2)), Ze(a2) || (e2 = a2, a2 = gn(a2, t2, i2), a2 !== e2 && rt(r2, a2))), r2;
}
function qe(t2, e2, n2) {
  return t2 = Xe(t2, e2, n2), Array.isArray(t2) ? t2 : ht;
}
function Je(t2, e2) {
  return 0 === t2 && (t2 = pn(t2, e2)), 1 | t2;
}
function Ze(t2) {
  return !!(2 & t2) && !!(4 & t2) || !!(1024 & t2);
}
function Qe(t2) {
  t2 = ct(t2);
  for (let e2 = 0; e2 < t2.length; e2++) {
    const n2 = t2[e2] = ct(t2[e2]);
    Array.isArray(n2[1]) && (n2[1] = it(n2[1]));
  }
  return t2;
}
function tn(t2, e2, n2, r2) {
  let i2 = 0 | (t2 = t2.u)[Q];
  pt(i2), We(t2, i2, e2, ("0" === r2 ? 0 === Number(n2) : n2 === r2) ? void 0 : n2);
}
function en(t2, e2, n2, r2) {
  pt(e2);
  let i2 = qe(t2, e2, n2);
  const s2 = i2 !== ht;
  if (64 & e2 || !(8192 & e2) || !s2) {
    const o2 = s2 ? 0 | i2[Q] : 0;
    let a2 = o2;
    (!s2 || 2 & a2 || Ze(a2) || 4 & a2 && !(32 & a2)) && (i2 = ct(i2), a2 = pn(a2, e2), e2 = We(t2, e2, n2, i2)), a2 = -13 & Je(a2, e2), a2 = gn(r2 ? -17 & a2 : 16 | a2, e2, true), a2 !== o2 && rt(i2, a2);
  }
  return i2;
}
function nn(t2, e2) {
  var n2 = Ts;
  return on(rn(t2 = t2.u), t2, 0 | t2[Q], n2) === e2 ? e2 : -1;
}
function rn(t2) {
  if (W) return t2[$] ?? (t2[$] = /* @__PURE__ */ new Map());
  if ($ in t2) return t2[$];
  const e2 = /* @__PURE__ */ new Map();
  return Object.defineProperty(t2, $, { value: e2 }), e2;
}
function sn(t2, e2, n2, r2) {
  const i2 = rn(t2), s2 = on(i2, t2, e2, n2);
  return s2 !== r2 && (s2 && (e2 = We(t2, e2, s2)), i2.set(n2, r2)), e2;
}
function on(t2, e2, n2, r2) {
  let i2 = t2.get(r2);
  if (null != i2) return i2;
  i2 = 0;
  for (let t3 = 0; t3 < r2.length; t3++) {
    const s2 = r2[t3];
    null != Xe(e2, n2, s2) && (0 !== i2 && (n2 = We(e2, n2, i2)), i2 = s2);
  }
  return t2.set(r2, i2), i2;
}
function an(t2, e2, n2) {
  let r2 = 0 | t2[Q];
  const i2 = Xe(t2, r2, n2);
  let s2;
  if (null != i2 && i2.W === ut) return (e2 = je(i2)) !== i2 && We(t2, r2, n2, e2), e2.u;
  if (Array.isArray(i2)) {
    const t3 = 0 | i2[Q];
    s2 = 2 & t3 ? De(Ge(i2, t3, false), e2, true) : 64 & t3 ? i2 : De(s2, e2, true);
  } else s2 = De(void 0, e2, true);
  return s2 !== i2 && We(t2, r2, n2, s2), s2;
}
function cn(t2, e2, n2) {
  let r2 = 0 | (t2 = t2.u)[Q];
  const i2 = Xe(t2, r2, n2);
  return (e2 = pe(i2, e2, false, r2)) !== i2 && null != e2 && We(t2, r2, n2, e2), e2;
}
function hn(t2, e2, n2) {
  if (null == (e2 = cn(t2, e2, n2))) return e2;
  let r2 = 0 | (t2 = t2.u)[Q];
  if (!(2 & r2)) {
    const i2 = je(e2);
    i2 !== e2 && We(t2, r2, n2, e2 = i2);
  }
  return e2;
}
function un(t2, e2, n2, r2, i2, s2, o2) {
  t2 = t2.u;
  var a2 = !!(2 & e2);
  const c2 = a2 ? 1 : i2;
  s2 = !!s2, o2 &&= !a2;
  var h2 = 0 | (i2 = qe(t2, e2, r2))[Q];
  if (!(a2 = !!(4 & h2))) {
    var u2 = i2, l = e2;
    const t3 = !!(2 & (h2 = Je(h2, e2)));
    t3 && (l |= 2);
    let r3 = !t3, s3 = true, o3 = 0, a3 = 0;
    for (; o3 < u2.length; o3++) {
      const e3 = pe(u2[o3], n2, false, l);
      if (e3 instanceof n2) {
        if (!t3) {
          const t4 = !!(2 & (0 | e3.u[Q]));
          r3 &&= !t4, s3 &&= t4;
        }
        u2[a3++] = e3;
      }
    }
    a3 < o3 && (u2.length = a3), h2 |= 4, h2 = s3 ? 16 | h2 : -17 & h2, rt(u2, h2 = r3 ? 8 | h2 : -9 & h2), t3 && Object.freeze(u2);
  }
  if (o2 && !(8 & h2 || !i2.length && (1 === c2 || 4 === c2 && 32 & h2))) {
    for (Ze(h2) && (i2 = ct(i2), h2 = pn(h2, e2), e2 = We(t2, e2, r2, i2)), n2 = i2, o2 = h2, u2 = 0; u2 < n2.length; u2++) (h2 = n2[u2]) !== (l = je(h2)) && (n2[u2] = l);
    o2 |= 8, rt(n2, o2 = n2.length ? -17 & o2 : 16 | o2), h2 = o2;
  }
  return 1 === c2 || 4 === c2 && 32 & h2 ? Ze(h2) || (e2 = h2, (h2 |= !i2.length || 16 & h2 && (!a2 || 32 & h2) ? 2 : 1024) !== e2 && rt(i2, h2), Object.freeze(i2)) : (2 === c2 && Ze(h2) && (rt(i2 = ct(i2), h2 = gn(h2 = pn(h2, e2), e2, s2)), e2 = We(t2, e2, r2, i2)), Ze(h2) || (r2 = h2, (h2 = gn(h2, e2, s2)) !== r2 && rt(i2, h2))), i2;
}
function ln(t2, e2, n2) {
  const r2 = 0 | t2.u[Q];
  return un(t2, r2, e2, n2, Ye(), false, !(2 & r2));
}
function dn(t2, e2, n2, r2) {
  return null == r2 && (r2 = void 0), He(t2, n2, r2);
}
function fn(t2, e2, n2, r2) {
  null == r2 && (r2 = void 0);
  t: {
    let i2 = 0 | (t2 = t2.u)[Q];
    if (pt(i2), null == r2) {
      const r3 = rn(t2);
      if (on(r3, t2, i2, n2) !== e2) break t;
      r3.set(n2, 0);
    } else i2 = sn(t2, i2, n2, e2);
    We(t2, i2, e2, r2);
  }
}
function pn(t2, e2) {
  return -1025 & (t2 = 32 | (2 & e2 ? 2 | t2 : -3 & t2));
}
function gn(t2, e2, n2) {
  return 32 & e2 && n2 || (t2 &= -33), t2;
}
function mn(t2, e2, n2) {
  pt(0 | t2.u[Q]), $e(t2, e2, fe, 2, true).push(le(n2));
}
function yn(t2, e2, n2, r2) {
  const i2 = 0 | t2.u[Q];
  pt(i2), t2 = un(t2, i2, n2, e2, 2, true), r2 = null != r2 ? r2 : new n2(), t2.push(r2), t2[Q] = 2 & (0 | r2.u[Q]) ? -9 & t2[Q] : -17 & t2[Q];
}
function _n(t2, e2) {
  return te(Ve(t2, e2));
}
function vn(t2, e2) {
  return fe(Ve(t2, e2));
}
function En(t2, e2) {
  return ze(t2, e2) ?? 0;
}
function wn(t2, e2, n2) {
  if (null != n2 && "boolean" != typeof n2) throw t2 = typeof n2, Error(`Expected boolean but got ${"object" != t2 ? t2 : n2 ? Array.isArray(n2) ? "array" : t2 : "null"}: ${n2}`);
  He(t2, e2, n2);
}
function Tn(t2, e2, n2) {
  if (null != n2) {
    if ("number" != typeof n2) throw X("int32");
    if (!Kt(n2)) throw X("int32");
    n2 |= 0;
  }
  He(t2, e2, n2);
}
function An(t2, e2, n2) {
  if (null != n2 && "number" != typeof n2) throw Error(`Value of float/double field must be a number, found ${typeof n2}: ${n2}`);
  He(t2, e2, n2);
}
function bn(t2, e2, n2) {
  {
    const o2 = t2.u;
    let a2 = 0 | o2[Q];
    if (pt(a2), null == n2) We(o2, a2, e2);
    else {
      var r2 = t2 = 0 | n2[Q], i2 = Ze(t2), s2 = i2 || Object.isFrozen(n2);
      for (i2 || (t2 = 0), s2 || (n2 = ct(n2), r2 = 0, t2 = gn(t2 = pn(t2, a2), a2, true), s2 = false), t2 |= 21, i2 = 0; i2 < n2.length; i2++) {
        const e3 = n2[i2], o3 = le(e3);
        Object.is(e3, o3) || (s2 && (n2 = ct(n2), r2 = 0, t2 = gn(t2 = pn(t2, a2), a2, true), s2 = false), n2[i2] = o3);
      }
      t2 !== r2 && (s2 && (n2 = ct(n2), t2 = gn(t2 = pn(t2, a2), a2, true)), rt(n2, t2)), We(o2, a2, e2, n2);
    }
  }
}
function kn(t2, e2) {
  return Error(`Invalid wire type: ${t2} (at position ${e2})`);
}
function Sn() {
  return Error("Failed to read varint, encoding is invalid.");
}
function xn(t2, e2) {
  return Error(`Tried to read past the end of the data ${e2} > ${t2}`);
}
function Ln(t2) {
  if ("string" == typeof t2) return { buffer: P(t2), O: false };
  if (Array.isArray(t2)) return { buffer: new Uint8Array(t2), O: false };
  if (t2.constructor === Uint8Array) return { buffer: t2, O: false };
  if (t2.constructor === ArrayBuffer) return { buffer: new Uint8Array(t2), O: false };
  if (t2.constructor === N) return { buffer: D(t2) || new Uint8Array(0), O: true };
  if (t2 instanceof Uint8Array) return { buffer: new Uint8Array(t2.buffer, t2.byteOffset, t2.byteLength), O: false };
  throw Error("Type not convertible to a Uint8Array, expected a Uint8Array, an ArrayBuffer, a base64 encoded string, a ByteString or an Array of numbers");
}
function Rn(t2, e2) {
  let n2, r2 = 0, i2 = 0, s2 = 0;
  const o2 = t2.h;
  let a2 = t2.g;
  do {
    n2 = o2[a2++], r2 |= (127 & n2) << s2, s2 += 7;
  } while (s2 < 32 && 128 & n2);
  for (s2 > 32 && (i2 |= (127 & n2) >> 4), s2 = 3; s2 < 32 && 128 & n2; s2 += 7) n2 = o2[a2++], i2 |= (127 & n2) << s2;
  if (Dn(t2, a2), n2 < 128) return e2(r2 >>> 0, i2 >>> 0);
  throw Sn();
}
function Fn(t2) {
  let e2 = 0, n2 = t2.g;
  const r2 = n2 + 10, i2 = t2.h;
  for (; n2 < r2; ) {
    const r3 = i2[n2++];
    if (e2 |= r3, 0 == (128 & r3)) return Dn(t2, n2), !!(127 & e2);
  }
  throw Sn();
}
function In(t2) {
  const e2 = t2.h;
  let n2 = t2.g, r2 = e2[n2++], i2 = 127 & r2;
  if (128 & r2 && (r2 = e2[n2++], i2 |= (127 & r2) << 7, 128 & r2 && (r2 = e2[n2++], i2 |= (127 & r2) << 14, 128 & r2 && (r2 = e2[n2++], i2 |= (127 & r2) << 21, 128 & r2 && (r2 = e2[n2++], i2 |= r2 << 28, 128 & r2 && 128 & e2[n2++] && 128 & e2[n2++] && 128 & e2[n2++] && 128 & e2[n2++] && 128 & e2[n2++]))))) throw Sn();
  return Dn(t2, n2), i2;
}
function Mn(t2) {
  return In(t2) >>> 0;
}
function Pn(t2) {
  var e2 = t2.h;
  const n2 = t2.g, r2 = e2[n2], i2 = e2[n2 + 1], s2 = e2[n2 + 2];
  return e2 = e2[n2 + 3], Dn(t2, t2.g + 4), (r2 << 0 | i2 << 8 | s2 << 16 | e2 << 24) >>> 0;
}
function Cn(t2) {
  var e2 = Pn(t2);
  t2 = 2 * (e2 >> 31) + 1;
  const n2 = e2 >>> 23 & 255;
  return e2 &= 8388607, 255 == n2 ? e2 ? NaN : t2 * (1 / 0) : 0 == n2 ? 1401298464324817e-60 * t2 * e2 : t2 * Math.pow(2, n2 - 150) * (e2 + 8388608);
}
function On(t2) {
  return In(t2);
}
function Un(t2, e2, { aa: n2 = false } = {}) {
  t2.aa = n2, e2 && (e2 = Ln(e2), t2.h = e2.buffer, t2.m = e2.O, t2.j = 0, t2.l = t2.h.length, t2.g = t2.j);
}
function Dn(t2, e2) {
  if (t2.g = e2, e2 > t2.l) throw xn(t2.l, e2);
}
function Nn(t2, e2) {
  if (e2 < 0) throw Error(`Tried to read a negative byte length: ${e2}`);
  const n2 = t2.g, r2 = n2 + e2;
  if (r2 > t2.l) throw xn(e2, t2.l - n2);
  return t2.g = r2, n2;
}
function Bn(t2, e2) {
  if (0 == e2) return U();
  var n2 = Nn(t2, e2);
  return t2.aa && t2.m ? n2 = t2.h.subarray(n2, n2 + e2) : (t2 = t2.h, n2 = n2 === (e2 = n2 + e2) ? new Uint8Array(0) : Ft ? t2.slice(n2, e2) : new Uint8Array(t2.subarray(n2, e2))), 0 == n2.length ? U() : new N(n2, O);
}
Ae.prototype.toJSON = void 0;
var Gn = [];
function jn(t2) {
  var e2 = t2.g;
  if (e2.g == e2.l) return false;
  t2.l = t2.g.g;
  var n2 = Mn(t2.g);
  if (e2 = n2 >>> 3, !((n2 &= 7) >= 0 && n2 <= 5)) throw kn(n2, t2.l);
  if (e2 < 1) throw Error(`Invalid field number: ${e2} (at position ${t2.l})`);
  return t2.m = e2, t2.h = n2, true;
}
function Vn(t2) {
  switch (t2.h) {
    case 0:
      0 != t2.h ? Vn(t2) : Fn(t2.g);
      break;
    case 1:
      Dn(t2 = t2.g, t2.g + 8);
      break;
    case 2:
      if (2 != t2.h) Vn(t2);
      else {
        var e2 = Mn(t2.g);
        Dn(t2 = t2.g, t2.g + e2);
      }
      break;
    case 5:
      Dn(t2 = t2.g, t2.g + 4);
      break;
    case 3:
      for (e2 = t2.m; ; ) {
        if (!jn(t2)) throw Error("Unmatched start-group tag: stream EOF");
        if (4 == t2.h) {
          if (t2.m != e2) throw Error("Unmatched end-group tag");
          break;
        }
        Vn(t2);
      }
      break;
    default:
      throw kn(t2.h, t2.l);
  }
}
function Xn(t2, e2, n2) {
  const r2 = t2.g.l, i2 = Mn(t2.g), s2 = t2.g.g + i2;
  let o2 = s2 - r2;
  if (o2 <= 0 && (t2.g.l = s2, n2(e2, t2, void 0, void 0, void 0), o2 = s2 - t2.g.g), o2) throw Error(`Message parsing ended unexpectedly. Expected to read ${i2} bytes, instead read ${i2 - o2} bytes, either the data ended unexpectedly or the message misreported its own length`);
  return t2.g.g = s2, t2.g.l = r2, e2;
}
function Hn(t2) {
  var o2 = Mn(t2.g), a2 = Nn(t2 = t2.g, o2);
  if (t2 = t2.h, s) {
    var c2, h2 = t2;
    (c2 = i) || (c2 = i = new TextDecoder("utf-8", { fatal: true })), o2 = a2 + o2, h2 = 0 === a2 && o2 === h2.length ? h2 : h2.subarray(a2, o2);
    try {
      var u2 = c2.decode(h2);
    } catch (t3) {
      if (void 0 === r) {
        try {
          c2.decode(new Uint8Array([128]));
        } catch (t4) {
        }
        try {
          c2.decode(new Uint8Array([97])), r = true;
        } catch (t4) {
          r = false;
        }
      }
      throw !r && (i = void 0), t3;
    }
  } else {
    o2 = (u2 = a2) + o2, a2 = [];
    let r2, i2 = null;
    for (; u2 < o2; ) {
      var l = t2[u2++];
      l < 128 ? a2.push(l) : l < 224 ? u2 >= o2 ? e() : (r2 = t2[u2++], l < 194 || 128 != (192 & r2) ? (u2--, e()) : a2.push((31 & l) << 6 | 63 & r2)) : l < 240 ? u2 >= o2 - 1 ? e() : (r2 = t2[u2++], 128 != (192 & r2) || 224 === l && r2 < 160 || 237 === l && r2 >= 160 || 128 != (192 & (c2 = t2[u2++])) ? (u2--, e()) : a2.push((15 & l) << 12 | (63 & r2) << 6 | 63 & c2)) : l <= 244 ? u2 >= o2 - 2 ? e() : (r2 = t2[u2++], 128 != (192 & r2) || r2 - 144 + (l << 28) >> 30 != 0 || 128 != (192 & (c2 = t2[u2++])) || 128 != (192 & (h2 = t2[u2++])) ? (u2--, e()) : (l = (7 & l) << 18 | (63 & r2) << 12 | (63 & c2) << 6 | 63 & h2, l -= 65536, a2.push(55296 + (l >> 10 & 1023), 56320 + (1023 & l)))) : e(), a2.length >= 8192 && (i2 = n(i2, a2), a2.length = 0);
    }
    u2 = n(i2, a2);
  }
  return u2;
}
function Wn(t2) {
  const e2 = Mn(t2.g);
  return Bn(t2.g, e2);
}
function zn(t2, e2, n2) {
  var r2 = Mn(t2.g);
  for (r2 = t2.g.g + r2; t2.g.g < r2; ) n2.push(e2(t2.g));
}
var Kn = [];
function Yn(t2, e2, n2) {
  e2.g ? e2.m(t2, e2.g, e2.h, n2) : e2.m(t2, e2.h, n2);
}
var $n = class {
  constructor(t2, e2) {
    this.u = Ne(t2, e2);
  }
  toJSON() {
    try {
      var t2 = Ue(this);
    } finally {
      Le = void 0;
    }
    return t2;
  }
  l() {
    var t2 = _o;
    return t2.g ? t2.l(this, t2.g, t2.h) : t2.l(this, t2.h, t2.defaultValue);
  }
  clone() {
    const t2 = this.u;
    return new this.constructor(Ge(t2, 0 | t2[Q], false));
  }
  O() {
    return !!(2 & (0 | this.u[Q]));
  }
};
function qn(t2) {
  return t2 ? /^\d+$/.test(t2) ? (Vt(t2), new Jn(Mt, Pt)) : null : Zn ||= new Jn(0, 0);
}
$n.prototype.W = ut, $n.prototype.toString = function() {
  return this.u.toString();
};
var Jn = class {
  constructor(t2, e2) {
    this.h = t2 >>> 0, this.g = e2 >>> 0;
  }
};
let Zn;
function Qn(t2) {
  return t2 ? /^-?\d+$/.test(t2) ? (Vt(t2), new tr(Mt, Pt)) : null : er ||= new tr(0, 0);
}
var tr = class {
  constructor(t2, e2) {
    this.h = t2 >>> 0, this.g = e2 >>> 0;
  }
};
let er;
function nr(t2, e2, n2) {
  for (; n2 > 0 || e2 > 127; ) t2.g.push(127 & e2 | 128), e2 = (e2 >>> 7 | n2 << 25) >>> 0, n2 >>>= 7;
  t2.g.push(e2);
}
function rr(t2, e2) {
  for (; e2 > 127; ) t2.g.push(127 & e2 | 128), e2 >>>= 7;
  t2.g.push(e2);
}
function ir(t2, e2) {
  if (e2 >= 0) rr(t2, e2);
  else {
    for (let n2 = 0; n2 < 9; n2++) t2.g.push(127 & e2 | 128), e2 >>= 7;
    t2.g.push(1);
  }
}
function sr(t2, e2) {
  t2.g.push(e2 >>> 0 & 255), t2.g.push(e2 >>> 8 & 255), t2.g.push(e2 >>> 16 & 255), t2.g.push(e2 >>> 24 & 255);
}
function or(t2, e2) {
  0 !== e2.length && (t2.l.push(e2), t2.h += e2.length);
}
function ar(t2, e2, n2) {
  rr(t2.g, 8 * e2 + n2);
}
function cr(t2, e2) {
  return ar(t2, e2, 2), e2 = t2.g.end(), or(t2, e2), e2.push(t2.h), e2;
}
function hr(t2, e2) {
  var n2 = e2.pop();
  for (n2 = t2.h + t2.g.length() - n2; n2 > 127; ) e2.push(127 & n2 | 128), n2 >>>= 7, t2.h++;
  e2.push(n2), t2.h++;
}
function ur(t2, e2, n2) {
  ar(t2, e2, 2), rr(t2.g, n2.length), or(t2, t2.g.end()), or(t2, n2);
}
function lr(t2, e2, n2, r2) {
  null != n2 && (e2 = cr(t2, e2), r2(n2, t2), hr(t2, e2));
}
function dr() {
  const t2 = class {
    constructor() {
      throw Error();
    }
  };
  return Object.setPrototypeOf(t2, t2.prototype), t2;
}
var fr = dr(), pr = dr(), gr = dr(), mr = dr(), yr = dr(), _r = dr(), vr = dr(), Er = dr(), wr = dr(), Tr = class {
  constructor(t2, e2, n2) {
    this.g = t2, this.h = e2, t2 = fr, this.l = !!t2 && n2 === t2 || false;
  }
};
function Ar(t2, e2) {
  return new Tr(t2, e2, fr);
}
function br(t2, e2, n2, r2, i2) {
  lr(t2, n2, Or(e2, r2), i2);
}
const kr = Ar((function(t2, e2, n2, r2, i2) {
  return 2 === t2.h && (Xn(t2, an(e2, r2, n2), i2), true);
}), br), Sr = Ar((function(t2, e2, n2, r2, i2) {
  return 2 === t2.h && (Xn(t2, an(e2, r2, n2), i2), true);
}), br);
var xr = Symbol(), Lr = Symbol(), Rr = Symbol(), Fr = Symbol();
let Ir, Mr;
function Pr(t2, e2, n2, r2) {
  var i2 = r2[t2];
  if (i2) return i2;
  (i2 = {}).Ma = r2, i2.T = (function(t3) {
    switch (typeof t3) {
      case "boolean":
        return Re ||= [0, void 0, true];
      case "number":
        return t3 > 0 ? void 0 : 0 === t3 ? Fe ||= [0, void 0] : [-t3, void 0];
      case "string":
        return [0, t3];
      case "object":
        return t3;
    }
  })(r2[0]);
  var s2 = r2[1];
  let o2 = 1;
  s2 && s2.constructor === Object && (i2.ga = s2, "function" == typeof (s2 = r2[++o2]) && (i2.la = true, Ir ??= s2, Mr ??= r2[o2 + 1], s2 = r2[o2 += 2]));
  const a2 = {};
  for (; s2 && Array.isArray(s2) && s2.length && "number" == typeof s2[0] && s2[0] > 0; ) {
    for (var c2 = 0; c2 < s2.length; c2++) a2[s2[c2]] = s2;
    s2 = r2[++o2];
  }
  for (c2 = 1; void 0 !== s2; ) {
    let t3;
    "number" == typeof s2 && (c2 += s2, s2 = r2[++o2]);
    var h2 = void 0;
    if (s2 instanceof Tr ? t3 = s2 : (t3 = kr, o2--), t3?.l) {
      s2 = r2[++o2], h2 = r2;
      var u2 = o2;
      "function" == typeof s2 && (s2 = s2(), h2[u2] = s2), h2 = s2;
    }
    for (u2 = c2 + 1, "number" == typeof (s2 = r2[++o2]) && s2 < 0 && (u2 -= s2, s2 = r2[++o2]); c2 < u2; c2++) {
      const r3 = a2[c2];
      h2 ? n2(i2, c2, t3, h2, r3) : e2(i2, c2, t3, r3);
    }
  }
  return r2[t2] = i2;
}
function Cr(t2) {
  return Array.isArray(t2) ? t2[0] instanceof Tr ? t2 : [Sr, t2] : [t2, void 0];
}
function Or(t2, e2) {
  return t2 instanceof $n ? t2.u : Array.isArray(t2) ? De(t2, e2, false) : void 0;
}
function Ur(t2, e2, n2, r2) {
  const i2 = n2.g;
  t2[e2] = r2 ? (t3, e3, n3) => i2(t3, e3, n3, r2) : i2;
}
function Dr(t2, e2, n2, r2, i2) {
  const s2 = n2.g;
  let o2, a2;
  t2[e2] = (t3, e3, n3) => s2(t3, e3, n3, a2 ||= Pr(Lr, Ur, Dr, r2).T, o2 ||= Nr(r2), i2);
}
function Nr(t2) {
  let e2 = t2[Rr];
  if (null != e2) return e2;
  const n2 = Pr(Lr, Ur, Dr, t2);
  return e2 = n2.la ? (t3, e3) => Ir(t3, e3, n2) : (t3, e3) => {
    const r2 = 0 | t3[Q];
    for (; jn(e3) && 4 != e3.h; ) {
      var i2 = e3.m, s2 = n2[i2];
      if (null == s2) {
        var o2 = n2.ga;
        o2 && (o2 = o2[i2]) && (null != (o2 = Br(o2)) && (s2 = n2[i2] = o2));
      }
      null != s2 && s2(e3, t3, i2) || (i2 = (s2 = e3).l, Vn(s2), s2.fa ? s2 = void 0 : (o2 = s2.g.g - i2, s2.g.g = i2, s2 = Bn(s2.g, o2)), i2 = t3, s2 && ((o2 = i2[q]) ? o2.push(s2) : i2[q] = [s2]));
    }
    return 8192 & r2 && it(t3), true;
  }, t2[Rr] = e2;
}
function Br(t2) {
  const e2 = (t2 = Cr(t2))[0].g;
  if (t2 = t2[1]) {
    const n2 = Nr(t2), r2 = Pr(Lr, Ur, Dr, t2).T;
    return (t3, i2, s2) => e2(t3, i2, s2, r2, n2);
  }
  return e2;
}
function Gr(t2, e2, n2) {
  t2[e2] = n2.h;
}
function jr(t2, e2, n2, r2) {
  let i2, s2;
  const o2 = n2.h;
  t2[e2] = (t3, e3, n3) => o2(t3, e3, n3, s2 ||= Pr(xr, Gr, jr, r2).T, i2 ||= Vr(r2));
}
function Vr(t2) {
  let e2 = t2[Fr];
  if (!e2) {
    const n2 = Pr(xr, Gr, jr, t2);
    e2 = (t3, e3) => Xr(t3, e3, n2), t2[Fr] = e2;
  }
  return e2;
}
function Xr(t2, e2, n2) {
  !(function(t3, e3, n3) {
    const r2 = 512 & e3 ? 0 : -1, i2 = t3.length, s2 = i2 + ((e3 = 64 & e3 ? 256 & e3 : !!i2 && lt(t3[i2 - 1])) ? -1 : 0);
    for (let e4 = 0; e4 < s2; e4++) n3(e4 - r2, t3[e4]);
    if (e3) {
      t3 = t3[i2 - 1];
      for (const e4 in t3) !isNaN(e4) && n3(+e4, t3[e4]);
    }
  })(t2, 0 | t2[Q] | (n2.T[1] ? 512 : 0), ((t3, r2) => {
    if (null != r2) {
      var i2 = (function(t4, e3) {
        var n3 = t4[e3];
        if (n3) return n3;
        if ((n3 = t4.ga) && (n3 = n3[e3])) {
          var r3 = (n3 = Cr(n3))[0].h;
          if (n3 = n3[1]) {
            const e4 = Vr(n3), i3 = Pr(xr, Gr, jr, n3).T;
            n3 = t4.la ? Mr(i3, e4) : (t5, n4, s2) => r3(t5, n4, s2, i3, e4);
          } else n3 = r3;
          return t4[e3] = n3;
        }
      })(n2, t3);
      i2 && i2(e2, r2, t3);
    }
  })), (t2 = mt(t2)) && (function(t3, e3) {
    or(t3, t3.g.end());
    for (let n3 = 0; n3 < e3.length; n3++) or(t3, D(e3[n3]) || new Uint8Array(0));
  })(e2, t2);
}
function Hr(t2, e2) {
  if (Array.isArray(e2)) {
    var n2 = 0 | e2[Q];
    if (4 & n2) return e2;
    for (var r2 = 0, i2 = 0; r2 < e2.length; r2++) {
      const n3 = t2(e2[r2]);
      null != n3 && (e2[i2++] = n3);
    }
    return i2 < r2 && (e2.length = i2), rt(e2, -6145 & (5 | n2)), 2 & n2 && Object.freeze(e2), e2;
  }
}
function Wr(t2, e2, n2) {
  return new Tr(t2, e2, n2);
}
function zr(t2, e2, n2) {
  return new Tr(t2, e2, n2);
}
function Kr(t2, e2, n2) {
  We(t2, 0 | t2[Q], e2, n2);
}
var Yr = Ar((function(t2, e2, n2, r2, i2) {
  return 2 === t2.h && (t2 = Xn(t2, De([void 0, void 0], r2, true), i2), pt(r2 = 0 | e2[Q]), (i2 = Xe(e2, r2, n2)) instanceof Ae ? 0 != (2 & i2.M) ? ((i2 = i2.da()).push(t2), We(e2, r2, n2, i2)) : i2.Ja(t2) : Array.isArray(i2) ? (2 & (0 | i2[Q]) && We(e2, r2, n2, i2 = Qe(i2)), i2.push(t2)) : We(e2, r2, n2, [t2]), true);
}), (function(t2, e2, n2, r2, i2) {
  if (e2 instanceof Ae) e2.forEach(((e3, s2) => {
    lr(t2, n2, De([s2, e3], r2, false), i2);
  }));
  else if (Array.isArray(e2)) for (let s2 = 0; s2 < e2.length; s2++) {
    const o2 = e2[s2];
    Array.isArray(o2) && lr(t2, n2, De(o2, r2, false), i2);
  }
}));
function $r(t2, e2, n2) {
  if (e2 = (function(t3) {
    if (null == t3) return t3;
    const e3 = typeof t3;
    if ("bigint" === e3) return String(Ht(64, t3));
    if (Qt(t3)) {
      if ("string" === e3) return oe(t3);
      if ("number" === e3) return se(t3);
    }
  })(e2), null != e2) {
    if ("string" == typeof e2) Qn(e2);
    if (null != e2) switch (ar(t2, n2, 0), typeof e2) {
      case "number":
        t2 = t2.g, Ot(e2), nr(t2, Mt, Pt);
        break;
      case "bigint":
        n2 = BigInt.asUintN(64, e2), n2 = new tr(Number(n2 & BigInt(4294967295)), Number(n2 >> BigInt(32))), nr(t2.g, n2.h, n2.g);
        break;
      default:
        n2 = Qn(e2), nr(t2.g, n2.h, n2.g);
    }
  }
}
function qr(t2, e2, n2) {
  null != (e2 = te(e2)) && null != e2 && (ar(t2, n2, 0), ir(t2.g, e2));
}
function Jr(t2, e2, n2) {
  null != (e2 = Jt(e2)) && (ar(t2, n2, 0), t2.g.g.push(e2 ? 1 : 0));
}
function Zr(t2, e2, n2) {
  null != (e2 = fe(e2)) && ur(t2, n2, c(e2));
}
function Qr(t2, e2, n2, r2, i2) {
  lr(t2, n2, Or(e2, r2), i2);
}
function ti(t2, e2, n2) {
  null == e2 || "string" == typeof e2 || e2 instanceof N || (C(e2) ? C(e2) && H(Z) : e2 = void 0), null != e2 && ur(t2, n2, Ln(e2).buffer);
}
function ei(t2, e2, n2) {
  return (5 === t2.h || 2 === t2.h) && (e2 = en(e2, 0 | e2[Q], n2, false), 2 == t2.h ? zn(t2, Cn, e2) : e2.push(Cn(t2.g)), true);
}
var ni = Wr((function(t2, e2, n2) {
  if (1 !== t2.h) return false;
  var r2 = t2.g;
  t2 = Pn(r2);
  const i2 = Pn(r2);
  r2 = 2 * (i2 >> 31) + 1;
  const s2 = i2 >>> 20 & 2047;
  return t2 = 4294967296 * (1048575 & i2) + t2, Kr(e2, n2, 2047 == s2 ? t2 ? NaN : r2 * (1 / 0) : 0 == s2 ? 5e-324 * r2 * t2 : r2 * Math.pow(2, s2 - 1075) * (t2 + 4503599627370496)), true;
}), (function(t2, e2, n2) {
  null != (e2 = qt(e2)) && (ar(t2, n2, 1), t2 = t2.g, (n2 = It ||= new DataView(new ArrayBuffer(8))).setFloat64(0, +e2, true), Mt = n2.getUint32(0, true), Pt = n2.getUint32(4, true), sr(t2, Mt), sr(t2, Pt));
}), dr()), ri = Wr((function(t2, e2, n2) {
  return 5 === t2.h && (Kr(e2, n2, Cn(t2.g)), true);
}), (function(t2, e2, n2) {
  null != (e2 = qt(e2)) && (ar(t2, n2, 5), t2 = t2.g, Ut(e2), sr(t2, Mt));
}), vr), ii = zr(ei, (function(t2, e2, n2) {
  if (null != (e2 = Hr(qt, e2))) for (let o2 = 0; o2 < e2.length; o2++) {
    var r2 = t2, i2 = n2, s2 = e2[o2];
    null != s2 && (ar(r2, i2, 5), r2 = r2.g, Ut(s2), sr(r2, Mt));
  }
}), vr), si = zr(ei, (function(t2, e2, n2) {
  if (null != (e2 = Hr(qt, e2)) && e2.length) {
    ar(t2, n2, 2), rr(t2.g, 4 * e2.length);
    for (let r2 = 0; r2 < e2.length; r2++) n2 = t2.g, Ut(e2[r2]), sr(n2, Mt);
  }
}), vr), oi = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, Rn(t2.g, Nt)), true);
}), $r, _r), ai = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, 0 === (t2 = Rn(t2.g, Nt)) ? void 0 : t2), true);
}), $r, _r), ci = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, Rn(t2.g, Dt)), true);
}), (function(t2, e2, n2) {
  if (null != (e2 = ue(e2))) {
    if ("string" == typeof e2) qn(e2);
    if (null != e2) switch (ar(t2, n2, 0), typeof e2) {
      case "number":
        t2 = t2.g, Ot(e2), nr(t2, Mt, Pt);
        break;
      case "bigint":
        n2 = BigInt.asUintN(64, e2), n2 = new Jn(Number(n2 & BigInt(4294967295)), Number(n2 >> BigInt(32))), nr(t2.g, n2.h, n2.g);
        break;
      default:
        n2 = qn(e2), nr(t2.g, n2.h, n2.g);
    }
  }
}), dr()), hi = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, In(t2.g)), true);
}), qr, mr), ui = zr((function(t2, e2, n2) {
  return (0 === t2.h || 2 === t2.h) && (e2 = en(e2, 0 | e2[Q], n2, false), 2 == t2.h ? zn(t2, In, e2) : e2.push(In(t2.g)), true);
}), (function(t2, e2, n2) {
  if (null != (e2 = Hr(te, e2)) && e2.length) {
    n2 = cr(t2, n2);
    for (let n3 = 0; n3 < e2.length; n3++) ir(t2.g, e2[n3]);
    hr(t2, n2);
  }
}), mr), li = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, 0 === (t2 = In(t2.g)) ? void 0 : t2), true);
}), qr, mr), di = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, Fn(t2.g)), true);
}), Jr, pr), fi = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, false === (t2 = Fn(t2.g)) ? void 0 : t2), true);
}), Jr, pr), pi = zr((function(t2, e2, n2) {
  return 2 === t2.h && (t2 = Hn(t2), en(e2, 0 | e2[Q], n2, false).push(t2), true);
}), (function(t2, e2, n2) {
  if (null != (e2 = Hr(fe, e2))) for (let o2 = 0; o2 < e2.length; o2++) {
    var r2 = t2, i2 = n2, s2 = e2[o2];
    null != s2 && ur(r2, i2, c(s2));
  }
}), gr), gi = Wr((function(t2, e2, n2) {
  return 2 === t2.h && (Kr(e2, n2, "" === (t2 = Hn(t2)) ? void 0 : t2), true);
}), Zr, gr), mi = Wr((function(t2, e2, n2) {
  return 2 === t2.h && (Kr(e2, n2, Hn(t2)), true);
}), Zr, gr), yi = (function(t2, e2, n2 = fr) {
  return new Tr(t2, e2, n2);
})((function(t2, e2, n2, r2, i2) {
  return 2 === t2.h && (r2 = De(void 0, r2, true), en(e2, 0 | e2[Q], n2, true).push(r2), Xn(t2, r2, i2), true);
}), (function(t2, e2, n2, r2, i2) {
  if (Array.isArray(e2)) for (let s2 = 0; s2 < e2.length; s2++) Qr(t2, e2[s2], n2, r2, i2);
})), _i = Ar((function(t2, e2, n2, r2, i2, s2) {
  return 2 === t2.h && (sn(e2, 0 | e2[Q], s2, n2), Xn(t2, e2 = an(e2, r2, n2), i2), true);
}), Qr), vi = Wr((function(t2, e2, n2) {
  return 2 === t2.h && (Kr(e2, n2, Wn(t2)), true);
}), ti, Er), Ei = zr((function(t2, e2, n2) {
  return (0 === t2.h || 2 === t2.h) && (e2 = en(e2, 0 | e2[Q], n2, false), 2 == t2.h ? zn(t2, Mn, e2) : e2.push(Mn(t2.g)), true);
}), (function(t2, e2, n2) {
  if (null != (e2 = Hr(ee, e2))) for (let o2 = 0; o2 < e2.length; o2++) {
    var r2 = t2, i2 = n2, s2 = e2[o2];
    null != s2 && (ar(r2, i2, 0), rr(r2.g, s2));
  }
}), yr), wi = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, 0 === (t2 = Mn(t2.g)) ? void 0 : t2), true);
}), (function(t2, e2, n2) {
  null != (e2 = ee(e2)) && null != e2 && (ar(t2, n2, 0), rr(t2.g, e2));
}), yr), Ti = Wr((function(t2, e2, n2) {
  return 0 === t2.h && (Kr(e2, n2, In(t2.g)), true);
}), (function(t2, e2, n2) {
  null != (e2 = te(e2)) && (e2 = parseInt(e2, 10), ar(t2, n2, 0), ir(t2.g, e2));
}), wr);
class Ai {
  constructor(t2, e2) {
    this.h = t2, this.g = e2, this.l = hn, this.m = dn, this.defaultValue = void 0;
  }
  register() {
    w(this);
  }
}
function bi(t2, e2) {
  return new Ai(t2, e2);
}
function ki(t2, e2) {
  return (n2, r2) => {
    if (Kn.length) {
      const t3 = Kn.pop();
      t3.o(r2), Un(t3.g, n2, r2), n2 = t3;
    } else n2 = new class {
      constructor(t3, e3) {
        if (Gn.length) {
          const n3 = Gn.pop();
          Un(n3, t3, e3), t3 = n3;
        } else t3 = new class {
          constructor(t4, e4) {
            this.h = null, this.m = false, this.g = this.l = this.j = 0, Un(this, t4, e4);
          }
          clear() {
            this.h = null, this.m = false, this.g = this.l = this.j = 0, this.aa = false;
          }
        }(t3, e3);
        this.g = t3, this.l = this.g.g, this.h = this.m = -1, this.o(e3);
      }
      o({ fa: t3 = false } = {}) {
        this.fa = t3;
      }
    }(n2, r2);
    try {
      const r3 = new t2(), s2 = r3.u;
      Nr(e2)(s2, n2);
      var i2 = r3;
    } finally {
      n2.g.clear(), n2.m = -1, n2.h = -1, Kn.length < 100 && Kn.push(n2);
    }
    return i2;
  };
}
function Si(t2) {
  return function() {
    const e2 = new class {
      constructor() {
        this.l = [], this.h = 0, this.g = new class {
          constructor() {
            this.g = [];
          }
          length() {
            return this.g.length;
          }
          end() {
            const t3 = this.g;
            return this.g = [], t3;
          }
        }();
      }
    }();
    Xr(this.u, e2, Pr(xr, Gr, jr, t2)), or(e2, e2.g.end());
    const n2 = new Uint8Array(e2.h), r2 = e2.l, i2 = r2.length;
    let s2 = 0;
    for (let t3 = 0; t3 < i2; t3++) {
      const e3 = r2[t3];
      n2.set(e3, s2), s2 += e3.length;
    }
    return e2.l = [n2], n2;
  };
}
var xi = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Li = [0, gi, Wr((function(t2, e2, n2) {
  return 2 === t2.h && (Kr(e2, n2, (t2 = Wn(t2)) === U() ? void 0 : t2), true);
}), (function(t2, e2, n2) {
  if (null != e2) {
    if (e2 instanceof $n) {
      const r2 = e2.Oa;
      return void (r2 && (e2 = r2(e2), null != e2 && ur(t2, n2, Ln(e2).buffer)));
    }
    if (Array.isArray(e2)) return;
  }
  ti(t2, e2, n2);
}), Er)];
let Ri, Fi = globalThis.trustedTypes;
function Ii(t2) {
  void 0 === Ri && (Ri = (function() {
    let t3 = null;
    if (!Fi) return t3;
    try {
      const e3 = (t4) => t4;
      t3 = Fi.createPolicy("goog#html", { createHTML: e3, createScript: e3, createScriptURL: e3 });
    } catch (t4) {
    }
    return t3;
  })());
  var e2 = Ri;
  return new class {
    constructor(t3) {
      this.g = t3;
    }
    toString() {
      return this.g + "";
    }
  }(e2 ? e2.createScriptURL(t2) : t2);
}
function Mi(t2, ...e2) {
  if (0 === e2.length) return Ii(t2[0]);
  let n2 = t2[0];
  for (let r2 = 0; r2 < e2.length; r2++) n2 += encodeURIComponent(e2[r2]) + t2[r2 + 1];
  return Ii(n2);
}
var Pi = [0, hi, Ti, di, -1, ui, Ti, -1], Ci = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Oi = [0, di, mi, di, Ti, -1, zr((function(t2, e2, n2) {
  return (0 === t2.h || 2 === t2.h) && (e2 = en(e2, 0 | e2[Q], n2, false), 2 == t2.h ? zn(t2, On, e2) : e2.push(In(t2.g)), true);
}), (function(t2, e2, n2) {
  if (null != (e2 = Hr(te, e2)) && e2.length) {
    n2 = cr(t2, n2);
    for (let n3 = 0; n3 < e2.length; n3++) ir(t2.g, e2[n3]);
    hr(t2, n2);
  }
}), wr), mi, -1, [0, di, -1], Ti, di, -1], Ui = [0, mi, -2], Di = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Ni = [0], Bi = [0, hi, di, 1, di, -3], Gi = class extends $n {
  constructor(t2) {
    super(t2, 2);
  }
}, ji = {};
ji[336783863] = [0, mi, di, -1, hi, [0, [1, 2, 3, 4, 5, 6, 7, 8, 9], _i, Ni, _i, Oi, _i, Ui, _i, Bi, _i, Pi, _i, [0, mi, -2], _i, [0, mi, Ti], _i, [0, Ti, mi, -1], _i, [0, Ti, -1]], [0, mi], di, [0, [1, 3], [2, 4], _i, [0, ui], -1, _i, [0, pi], -1, yi, [0, mi, -1]], mi];
var Vi = [0, ai, -1, fi, -3, ai, ui, gi, li, ai, -1, fi, li, fi, -2, gi];
function Xi(t2, e2) {
  tn(t2, 2, de(e2), "");
}
function Hi(t2, e2) {
  mn(t2, 3, e2);
}
function Wi(t2, e2) {
  mn(t2, 4, e2);
}
var zi = class extends $n {
  constructor(t2) {
    super(t2, 500);
  }
  o(t2) {
    return dn(this, 0, 7, t2);
  }
}, Ki = [-1, {}], Yi = [0, mi, 1, Ki], $i = [0, mi, pi, Ki];
function qi(t2, e2) {
  yn(t2, 1, zi, e2);
}
function Ji(t2, e2) {
  mn(t2, 10, e2);
}
function Zi(t2, e2) {
  mn(t2, 15, e2);
}
var Qi = class extends $n {
  constructor(t2) {
    super(t2, 500);
  }
  o(t2) {
    return dn(this, 0, 1001, t2);
  }
}, ts = [-500, yi, [-500, gi, -1, pi, -3, [-2, ji, di], yi, Li, li, -1, Yi, $i, yi, [0, gi, fi], gi, Vi, li, pi, 987, pi], 4, yi, [-500, mi, -1, [-1, {}], 998, mi], yi, [-500, mi, pi, -1, [-2, {}, di], 997, pi, -1], li, yi, [-500, mi, pi, Ki, 998, pi], pi, li, Yi, $i, yi, [0, gi, -1, Ki], pi, -2, Vi, gi, -1, fi, [0, fi, wi], 978, Ki, yi, Li];
Qi.prototype.g = Si(ts);
var es = ki(Qi, ts), ns = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, rs = class extends $n {
  constructor(t2) {
    super(t2);
  }
  g() {
    return ln(this, ns, 1);
  }
}, is = [0, yi, [0, hi, ri, mi, -1]], ss = ki(rs, is), os = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, as = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, cs = class extends $n {
  constructor(t2) {
    super(t2);
  }
  h() {
    return hn(this, os, 2);
  }
  g() {
    return ln(this, as, 5);
  }
}, hs = ki(class extends $n {
  constructor(t2) {
    super(t2);
  }
}, [0, pi, ui, si, [0, Ti, [0, hi, -3], [0, ri, -3], [0, hi, -1, [0, yi, [0, hi, -2]]], yi, [0, ri, -1, mi, ri]], mi, -1, oi, yi, [0, hi, ri], pi, oi]), us = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, ls = ki(class extends $n {
  constructor(t2) {
    super(t2);
  }
}, [0, yi, [0, ri, -4]]), ds = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, fs = ki(class extends $n {
  constructor(t2) {
    super(t2);
  }
}, [0, yi, [0, ri, -4]]), ps = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, gs = [0, hi, -1, si, Ti], ms = class extends $n {
  constructor(t2) {
    super(t2);
  }
};
ms.prototype.g = Si([0, ri, -4, oi]);
var ys = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, _s = ki(class extends $n {
  constructor(t2) {
    super(t2);
  }
}, [0, yi, [0, 1, hi, mi, is], oi]), vs = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Es = class extends $n {
  constructor(t2) {
    super(t2);
  }
  ma() {
    const t2 = Ke(this);
    return null == t2 ? U() : t2;
  }
}, ws = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Ts = [1, 2], As = ki(class extends $n {
  constructor(t2) {
    super(t2);
  }
}, [0, yi, [0, Ts, _i, [0, si], _i, [0, vi], hi, mi], oi]), bs = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, ks = [0, mi, hi, ri, pi, -1], Ss = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, xs = [0, di, -1], Ls = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Rs = [1, 2, 3, 4, 5], Fs = class extends $n {
  constructor(t2) {
    super(t2);
  }
  g() {
    return null != Ke(this);
  }
  h() {
    return null != vn(this, 2);
  }
}, Is = class extends $n {
  constructor(t2) {
    super(t2);
  }
  g() {
    return Jt(Ve(this, 2)) ?? false;
  }
}, Ms = [0, vi, mi, [0, hi, oi, -1], [0, ci, oi]], Ps = [0, Ms, di, [0, Rs, _i, Bi, _i, Oi, _i, Pi, _i, Ni, _i, Ui], Ti], Cs = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Os = [0, Ps, ri, -1, hi], Us = bi(502141897, Cs);
ji[502141897] = Os;
var Ds = ki(class extends $n {
  constructor(t2) {
    super(t2);
  }
}, [0, [0, Ti, -1, ii, Ei], gs]), Ns = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Bs = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Gs = [0, Ps, ri, [0, Ps], di], js = [0, Ps, Os, Gs, ri, [0, [0, Ms]]], Vs = bi(508968150, Bs);
ji[508968150] = js, ji[508968149] = Gs;
var Xs = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Hs = bi(513916220, Xs);
ji[513916220] = [0, Ps, js, hi];
var Ws = class extends $n {
  constructor(t2) {
    super(t2);
  }
  h() {
    return hn(this, bs, 2);
  }
  g() {
    He(this, 2);
  }
}, zs = [0, Ps, ks];
ji[478825465] = zs;
var Ks = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Ys = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, $s = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, qs = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Js = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Zs = [0, Ps, [0, Ps], zs, -1], Qs = [0, Ps, ri, hi], to = [0, Ps, ri], eo = [0, Ps, Qs, to, ri], no = bi(479097054, Js);
ji[479097054] = [0, Ps, eo, Zs], ji[463370452] = Zs, ji[464864288] = Qs;
var ro = bi(462713202, qs);
ji[462713202] = eo, ji[474472470] = to;
var io = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, so = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, oo = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, ao = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, co = [0, Ps, ri, -1, hi], ho = [0, Ps, ri, di];
ao.prototype.g = Si([0, Ps, to, [0, Ps], Os, Gs, co, ho]);
var uo = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, lo = bi(456383383, uo);
ji[456383383] = [0, Ps, ks];
var fo = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, po = bi(476348187, fo);
ji[476348187] = [0, Ps, xs];
var go = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, mo = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, yo = [0, Ti, -1], _o = bi(458105876, class extends $n {
  constructor(t2) {
    super(t2);
  }
  g() {
    var t2 = this.u;
    const e2 = 0 | t2[Q], n2 = 2 & e2;
    return t2 = (function(t3, e3, n3) {
      var r2 = mo;
      const i2 = 2 & e3;
      let s2 = false;
      if (null == n3) {
        if (i2) return Ie();
        n3 = [];
      } else if (n3.constructor === Ae) {
        if (0 == (2 & n3.M) || i2) return n3;
        n3 = n3.da();
      } else Array.isArray(n3) ? s2 = !!(2 & (0 | n3[Q])) : n3 = [];
      if (i2) {
        if (!n3.length) return Ie();
        s2 || (s2 = true, it(n3));
      } else s2 && (s2 = false, n3 = Qe(n3));
      return s2 || (64 & (0 | n3[Q]) ? n3[Q] &= -33 : 32 & e3 && nt(n3, 32)), We(t3, e3, 2, r2 = new Ae(n3, r2, ge, void 0)), r2;
    })(t2, e2, Xe(t2, e2, 2)), !n2 && mo && (t2.pa = true), t2;
  }
});
ji[458105876] = [0, yo, Yr, [true, oi, [0, mi, -1, pi]]];
var vo = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Eo = bi(458105758, vo);
ji[458105758] = [0, Ps, mi, yo];
var wo = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, To = bi(443442058, wo);
ji[443442058] = [0, Ps, mi, hi, ri, pi, -1, di, ri], ji[514774813] = co;
var Ao = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, bo = bi(516587230, Ao);
function ko(t2, e2) {
  return e2 = e2 ? e2.clone() : new bs(), void 0 !== t2.displayNamesLocale ? He(e2, 1, de(t2.displayNamesLocale)) : void 0 === t2.displayNamesLocale && He(e2, 1), void 0 !== t2.maxResults ? Tn(e2, 2, t2.maxResults) : "maxResults" in t2 && He(e2, 2), void 0 !== t2.scoreThreshold ? An(e2, 3, t2.scoreThreshold) : "scoreThreshold" in t2 && He(e2, 3), void 0 !== t2.categoryAllowlist ? bn(e2, 4, t2.categoryAllowlist) : "categoryAllowlist" in t2 && He(e2, 4), void 0 !== t2.categoryDenylist ? bn(e2, 5, t2.categoryDenylist) : "categoryDenylist" in t2 && He(e2, 5), e2;
}
function So(t2, e2 = -1, n2 = "") {
  return { categories: t2.map(((t3) => ({ index: _n(t3, 1) ?? 0 ?? -1, score: En(t3, 2) ?? 0, categoryName: vn(t3, 3) ?? "" ?? "", displayName: vn(t3, 4) ?? "" ?? "" }))), headIndex: e2, headName: n2 };
}
function xo(t2) {
  var e2 = $e(t2, 3, qt, Ye()), n2 = $e(t2, 2, te, Ye()), r2 = $e(t2, 1, fe, Ye()), i2 = $e(t2, 9, fe, Ye());
  const s2 = { categories: [], keypoints: [] };
  for (let t3 = 0; t3 < e2.length; t3++) s2.categories.push({ score: e2[t3], index: n2[t3] ?? -1, categoryName: r2[t3] ?? "", displayName: i2[t3] ?? "" });
  if ((e2 = hn(t2, cs, 4)?.h()) && (s2.boundingBox = { originX: _n(e2, 1) ?? 0, originY: _n(e2, 2) ?? 0, width: _n(e2, 3) ?? 0, height: _n(e2, 4) ?? 0, angle: 0 }), hn(t2, cs, 4)?.g().length) for (const e3 of hn(t2, cs, 4).g()) s2.keypoints.push({ x: ze(e3, 1) ?? 0, y: ze(e3, 2) ?? 0, score: ze(e3, 4) ?? 0, label: vn(e3, 3) ?? "" });
  return s2;
}
function Lo(t2) {
  const e2 = [];
  for (const n2 of ln(t2, ds, 1)) e2.push({ x: En(n2, 1) ?? 0, y: En(n2, 2) ?? 0, z: En(n2, 3) ?? 0, visibility: En(n2, 4) ?? 0 });
  return e2;
}
function Ro(t2) {
  const e2 = [];
  for (const n2 of ln(t2, us, 1)) e2.push({ x: En(n2, 1) ?? 0, y: En(n2, 2) ?? 0, z: En(n2, 3) ?? 0, visibility: En(n2, 4) ?? 0 });
  return e2;
}
function Fo(t2) {
  return Array.from(t2, ((t3) => t3 > 127 ? t3 - 256 : t3));
}
function Io(t2, e2) {
  if (t2.length !== e2.length) throw Error(`Cannot compute cosine similarity between embeddings of different sizes (${t2.length} vs. ${e2.length}).`);
  let n2 = 0, r2 = 0, i2 = 0;
  for (let s2 = 0; s2 < t2.length; s2++) n2 += t2[s2] * e2[s2], r2 += t2[s2] * t2[s2], i2 += e2[s2] * e2[s2];
  if (r2 <= 0 || i2 <= 0) throw Error("Cannot compute cosine similarity on embedding with 0 norm.");
  return n2 / Math.sqrt(r2 * i2);
}
let Mo;
ji[516587230] = [0, Ps, co, ho, ri], ji[518928384] = ho;
const Po = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
async function Co() {
  if (void 0 === Mo) try {
    await WebAssembly.instantiate(Po), Mo = true;
  } catch {
    Mo = false;
  }
  return Mo;
}
async function Oo(t2, e2 = Mi``) {
  const n2 = await Co() ? "wasm_internal" : "wasm_nosimd_internal";
  return { wasmLoaderPath: `${e2}/${t2}_${n2}.js`, wasmBinaryPath: `${e2}/${t2}_${n2}.wasm` };
}
var Uo = class {
};
function Do() {
  var t2 = navigator;
  return "undefined" != typeof OffscreenCanvas && (!(function(t3 = navigator) {
    return (t3 = t3.userAgent).includes("Safari") && !t3.includes("Chrome");
  })(t2) || !!((t2 = t2.userAgent.match(/Version\/([\d]+).*Safari/)) && t2.length >= 1 && Number(t2[1]) >= 17));
}
async function No(t2) {
  if ("function" != typeof importScripts) {
    const e2 = document.createElement("script");
    return e2.src = t2.toString(), e2.crossOrigin = "anonymous", new Promise(((t3, n2) => {
      e2.addEventListener("load", (() => {
        t3();
      }), false), e2.addEventListener("error", ((t4) => {
        n2(t4);
      }), false), document.body.appendChild(e2);
    }));
  }
  importScripts(t2.toString());
}
function Bo(t2) {
  return void 0 !== t2.videoWidth ? [t2.videoWidth, t2.videoHeight] : void 0 !== t2.naturalWidth ? [t2.naturalWidth, t2.naturalHeight] : void 0 !== t2.displayWidth ? [t2.displayWidth, t2.displayHeight] : [t2.width, t2.height];
}
function Go(t2, e2, n2) {
  t2.m || console.error("No wasm multistream support detected: ensure dependency inclusion of :gl_graph_runner_internal_multi_input target"), n2(e2 = t2.i.stringToNewUTF8(e2)), t2.i._free(e2);
}
function jo(t2, e2, n2) {
  if (!t2.i.canvas) throw Error("No OpenGL canvas configured.");
  if (n2 ? t2.i._bindTextureToStream(n2) : t2.i._bindTextureToCanvas(), !(n2 = t2.i.canvas.getContext("webgl2") || t2.i.canvas.getContext("webgl"))) throw Error("Failed to obtain WebGL context from the provided canvas. `getContext()` should only be invoked with `webgl` or `webgl2`.");
  t2.i.gpuOriginForWebTexturesIsBottomLeft && n2.pixelStorei(n2.UNPACK_FLIP_Y_WEBGL, true), n2.texImage2D(n2.TEXTURE_2D, 0, n2.RGBA, n2.RGBA, n2.UNSIGNED_BYTE, e2), t2.i.gpuOriginForWebTexturesIsBottomLeft && n2.pixelStorei(n2.UNPACK_FLIP_Y_WEBGL, false);
  const [r2, i2] = Bo(e2);
  return !t2.l || r2 === t2.i.canvas.width && i2 === t2.i.canvas.height || (t2.i.canvas.width = r2, t2.i.canvas.height = i2), [r2, i2];
}
function Vo(t2, e2, n2) {
  t2.m || console.error("No wasm multistream support detected: ensure dependency inclusion of :gl_graph_runner_internal_multi_input target");
  const r2 = new Uint32Array(e2.length);
  for (let n3 = 0; n3 < e2.length; n3++) r2[n3] = t2.i.stringToNewUTF8(e2[n3]);
  e2 = t2.i._malloc(4 * r2.length), t2.i.HEAPU32.set(r2, e2 >> 2), n2(e2);
  for (const e3 of r2) t2.i._free(e3);
  t2.i._free(e2);
}
function Xo(t2, e2, n2) {
  t2.i.simpleListeners = t2.i.simpleListeners || {}, t2.i.simpleListeners[e2] = n2;
}
function Ho(t2, e2, n2) {
  let r2 = [];
  t2.i.simpleListeners = t2.i.simpleListeners || {}, t2.i.simpleListeners[e2] = (t3, e3, i2) => {
    e3 ? (n2(r2, i2), r2 = []) : r2.push(t3);
  };
}
Uo.forVisionTasks = function(t2) {
  return Oo("vision", t2);
}, Uo.forTextTasks = function(t2) {
  return Oo("text", t2);
}, Uo.forGenAiExperimentalTasks = function(t2) {
  return Oo("genai_experimental", t2);
}, Uo.forGenAiTasks = function(t2) {
  return Oo("genai", t2);
}, Uo.forAudioTasks = function(t2) {
  return Oo("audio", t2);
}, Uo.isSimdSupported = function() {
  return Co();
};
async function Wo(t2, e2, n2, r2) {
  return t2 = await (async (t3, e3, n3, r3, i2) => {
    if (e3 && await No(e3), !self.ModuleFactory) throw Error("ModuleFactory not set.");
    if (n3 && (await No(n3), !self.ModuleFactory)) throw Error("ModuleFactory not set.");
    return self.Module && i2 && ((e3 = self.Module).locateFile = i2.locateFile, i2.mainScriptUrlOrBlob && (e3.mainScriptUrlOrBlob = i2.mainScriptUrlOrBlob)), i2 = await self.ModuleFactory(self.Module || i2), self.ModuleFactory = self.Module = void 0, new t3(i2, r3);
  })(t2, n2.wasmLoaderPath, n2.assetLoaderPath, e2, { locateFile: (t3) => t3.endsWith(".wasm") ? n2.wasmBinaryPath.toString() : n2.assetBinaryPath && t3.endsWith(".data") ? n2.assetBinaryPath.toString() : t3 }), await t2.o(r2), t2;
}
function zo(t2, e2) {
  const n2 = hn(t2.baseOptions, Fs, 1) || new Fs();
  "string" == typeof e2 ? (He(n2, 2, de(e2)), He(n2, 1)) : e2 instanceof Uint8Array && (He(n2, 1, dt(e2, false)), He(n2, 2)), dn(t2.baseOptions, 0, 1, n2);
}
function Ko(t2) {
  try {
    const e2 = t2.G.length;
    if (1 === e2) throw Error(t2.G[0].message);
    if (e2 > 1) throw Error("Encountered multiple errors: " + t2.G.map(((t3) => t3.message)).join(", "));
  } finally {
    t2.G = [];
  }
}
function Yo(t2, e2) {
  t2.B = Math.max(t2.B, e2);
}
function $o(t2, e2) {
  t2.A = new zi(), Xi(t2.A, "PassThroughCalculator"), Hi(t2.A, "free_memory"), Wi(t2.A, "free_memory_unused_out"), Ji(e2, "free_memory"), qi(e2, t2.A);
}
function qo(t2, e2) {
  Hi(t2.A, e2), Wi(t2.A, e2 + "_unused_out");
}
function Jo(t2) {
  t2.g.addBoolToStream(true, "free_memory", t2.B);
}
var Zo = class {
  constructor(t2) {
    this.g = t2, this.G = [], this.B = 0, this.g.setAutoRenderToScreen(false);
  }
  l(t2, e2 = true) {
    if (e2) {
      const e3 = t2.baseOptions || {};
      if (t2.baseOptions?.modelAssetBuffer && t2.baseOptions?.modelAssetPath) throw Error("Cannot set both baseOptions.modelAssetPath and baseOptions.modelAssetBuffer");
      if (!(hn(this.baseOptions, Fs, 1)?.g() || hn(this.baseOptions, Fs, 1)?.h() || t2.baseOptions?.modelAssetBuffer || t2.baseOptions?.modelAssetPath)) throw Error("Either baseOptions.modelAssetPath or baseOptions.modelAssetBuffer must be set");
      if ((function(t3, e4) {
        let n2 = hn(t3.baseOptions, Ls, 3);
        if (!n2) {
          var r2 = n2 = new Ls(), i2 = new Di();
          fn(r2, 4, Rs, i2);
        }
        "delegate" in e4 && ("GPU" === e4.delegate ? (e4 = n2, r2 = new Ci(), fn(e4, 2, Rs, r2)) : (e4 = n2, r2 = new Di(), fn(e4, 4, Rs, r2))), dn(t3.baseOptions, 0, 3, n2);
      })(this, e3), e3.modelAssetPath) return fetch(e3.modelAssetPath.toString()).then(((t3) => {
        if (t3.ok) return t3.arrayBuffer();
        throw Error(`Failed to fetch model: ${e3.modelAssetPath} (${t3.status})`);
      })).then(((t3) => {
        try {
          this.g.i.FS_unlink("/model.dat");
        } catch {
        }
        this.g.i.FS_createDataFile("/", "model.dat", new Uint8Array(t3), true, false, false), zo(this, "/model.dat"), this.m(), this.J();
      }));
      if (e3.modelAssetBuffer instanceof Uint8Array) zo(this, e3.modelAssetBuffer);
      else if (e3.modelAssetBuffer) return (async function(t3) {
        const e4 = [];
        for (var n2 = 0; ; ) {
          const { done: r2, value: i2 } = await t3.read();
          if (r2) break;
          e4.push(i2), n2 += i2.length;
        }
        if (0 === e4.length) return new Uint8Array(0);
        if (1 === e4.length) return e4[0];
        t3 = new Uint8Array(n2), n2 = 0;
        for (const r2 of e4) t3.set(r2, n2), n2 += r2.length;
        return t3;
      })(e3.modelAssetBuffer).then(((t3) => {
        zo(this, t3), this.m(), this.J();
      }));
    }
    return this.m(), this.J(), Promise.resolve();
  }
  J() {
  }
  ca() {
    let t2;
    if (this.g.ca(((e2) => {
      t2 = es(e2);
    })), !t2) throw Error("Failed to retrieve CalculatorGraphConfig");
    return t2;
  }
  setGraph(t2, e2) {
    this.g.attachErrorListener(((t3, e3) => {
      this.G.push(Error(e3));
    })), this.g.Ha(), this.g.setGraph(t2, e2), this.A = void 0, Ko(this);
  }
  finishProcessing() {
    this.g.finishProcessing(), Ko(this);
  }
  close() {
    this.A = void 0, this.g.closeGraph();
  }
};
function Qo(t2, e2) {
  if (!t2) throw Error(`Unable to obtain required WebGL resource: ${e2}`);
  return t2;
}
Zo.prototype.close = Zo.prototype.close;
class ta {
  constructor(t2, e2, n2, r2) {
    this.g = t2, this.h = e2, this.m = n2, this.l = r2;
  }
  bind() {
    this.g.bindVertexArray(this.h);
  }
  close() {
    this.g.deleteVertexArray(this.h), this.g.deleteBuffer(this.m), this.g.deleteBuffer(this.l);
  }
}
function ea(t2, e2, n2) {
  const r2 = t2.g;
  if (n2 = Qo(r2.createShader(n2), "Failed to create WebGL shader"), r2.shaderSource(n2, e2), r2.compileShader(n2), !r2.getShaderParameter(n2, r2.COMPILE_STATUS)) throw Error(`Could not compile WebGL shader: ${r2.getShaderInfoLog(n2)}`);
  return r2.attachShader(t2.h, n2), n2;
}
function na(t2, e2) {
  const n2 = t2.g, r2 = Qo(n2.createVertexArray(), "Failed to create vertex array");
  n2.bindVertexArray(r2);
  const i2 = Qo(n2.createBuffer(), "Failed to create buffer");
  n2.bindBuffer(n2.ARRAY_BUFFER, i2), n2.enableVertexAttribArray(t2.P), n2.vertexAttribPointer(t2.P, 2, n2.FLOAT, false, 0, 0), n2.bufferData(n2.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), n2.STATIC_DRAW);
  const s2 = Qo(n2.createBuffer(), "Failed to create buffer");
  return n2.bindBuffer(n2.ARRAY_BUFFER, s2), n2.enableVertexAttribArray(t2.J), n2.vertexAttribPointer(t2.J, 2, n2.FLOAT, false, 0, 0), n2.bufferData(n2.ARRAY_BUFFER, new Float32Array(e2 ? [0, 1, 0, 0, 1, 0, 1, 1] : [0, 0, 0, 1, 1, 1, 1, 0]), n2.STATIC_DRAW), n2.bindBuffer(n2.ARRAY_BUFFER, null), n2.bindVertexArray(null), new ta(n2, r2, i2, s2);
}
function ra(t2, e2) {
  if (t2.g) {
    if (e2 !== t2.g) throw Error("Cannot change GL context once initialized");
  } else t2.g = e2;
}
function ia(t2, e2, n2, r2) {
  return ra(t2, e2), t2.h || (t2.m(), t2.C()), n2 ? (t2.s || (t2.s = na(t2, true)), n2 = t2.s) : (t2.v || (t2.v = na(t2, false)), n2 = t2.v), e2.useProgram(t2.h), n2.bind(), t2.l(), t2 = r2(), n2.g.bindVertexArray(null), t2;
}
function sa(t2, e2, n2) {
  return ra(t2, e2), t2 = Qo(e2.createTexture(), "Failed to create texture"), e2.bindTexture(e2.TEXTURE_2D, t2), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_WRAP_S, e2.CLAMP_TO_EDGE), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_WRAP_T, e2.CLAMP_TO_EDGE), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_MIN_FILTER, n2 ?? e2.LINEAR), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_MAG_FILTER, n2 ?? e2.LINEAR), e2.bindTexture(e2.TEXTURE_2D, null), t2;
}
function oa(t2, e2, n2) {
  ra(t2, e2), t2.A || (t2.A = Qo(e2.createFramebuffer(), "Failed to create framebuffe.")), e2.bindFramebuffer(e2.FRAMEBUFFER, t2.A), e2.framebufferTexture2D(e2.FRAMEBUFFER, e2.COLOR_ATTACHMENT0, e2.TEXTURE_2D, n2, 0);
}
function aa(t2) {
  t2.g?.bindFramebuffer(t2.g.FRAMEBUFFER, null);
}
var ca = class {
  G() {
    return "\n  precision mediump float;\n  varying vec2 vTex;\n  uniform sampler2D inputTexture;\n  void main() {\n    gl_FragColor = texture2D(inputTexture, vTex);\n  }\n ";
  }
  m() {
    const t2 = this.g;
    if (this.h = Qo(t2.createProgram(), "Failed to create WebGL program"), this.Z = ea(this, "\n  attribute vec2 aVertex;\n  attribute vec2 aTex;\n  varying vec2 vTex;\n  void main(void) {\n    gl_Position = vec4(aVertex, 0.0, 1.0);\n    vTex = aTex;\n  }", t2.VERTEX_SHADER), this.Y = ea(this, this.G(), t2.FRAGMENT_SHADER), t2.linkProgram(this.h), !t2.getProgramParameter(this.h, t2.LINK_STATUS)) throw Error(`Error during program linking: ${t2.getProgramInfoLog(this.h)}`);
    this.P = t2.getAttribLocation(this.h, "aVertex"), this.J = t2.getAttribLocation(this.h, "aTex");
  }
  C() {
  }
  l() {
  }
  close() {
    if (this.h) {
      const t2 = this.g;
      t2.deleteProgram(this.h), t2.deleteShader(this.Z), t2.deleteShader(this.Y);
    }
    this.A && this.g.deleteFramebuffer(this.A), this.v && this.v.close(), this.s && this.s.close();
  }
};
function la(t2, e2) {
  switch (e2) {
    case 0:
      return t2.g.find(((t3) => t3 instanceof Uint8Array));
    case 1:
      return t2.g.find(((t3) => t3 instanceof Float32Array));
    case 2:
      return t2.g.find(((t3) => "undefined" != typeof WebGLTexture && t3 instanceof WebGLTexture));
    default:
      throw Error(`Type is not supported: ${e2}`);
  }
}
function da(t2) {
  var e2 = la(t2, 1);
  if (!e2) {
    if (e2 = la(t2, 0)) e2 = new Float32Array(e2).map(((t3) => t3 / 255));
    else {
      e2 = new Float32Array(t2.width * t2.height);
      const r2 = pa(t2);
      var n2 = ma(t2);
      if (oa(n2, r2, fa(t2)), "iPad Simulator;iPhone Simulator;iPod Simulator;iPad;iPhone;iPod".split(";").includes(navigator.platform) || navigator.userAgent.includes("Mac") && "document" in self && "ontouchend" in self.document) {
        n2 = new Float32Array(t2.width * t2.height * 4), r2.readPixels(0, 0, t2.width, t2.height, r2.RGBA, r2.FLOAT, n2);
        for (let t3 = 0, r3 = 0; t3 < e2.length; ++t3, r3 += 4) e2[t3] = n2[r3];
      } else r2.readPixels(0, 0, t2.width, t2.height, r2.RED, r2.FLOAT, e2);
    }
    t2.g.push(e2);
  }
  return e2;
}
function fa(t2) {
  let e2 = la(t2, 2);
  if (!e2) {
    const n2 = pa(t2);
    e2 = ya(t2);
    const r2 = da(t2), i2 = ga(t2);
    n2.texImage2D(n2.TEXTURE_2D, 0, i2, t2.width, t2.height, 0, n2.RED, n2.FLOAT, r2), _a(t2);
  }
  return e2;
}
function pa(t2) {
  if (!t2.canvas) throw Error("Conversion to different image formats require that a canvas is passed when initializing the image.");
  return t2.h || (t2.h = Qo(t2.canvas.getContext("webgl2"), "You cannot use a canvas that is already bound to a different type of rendering context.")), t2.h;
}
function ga(t2) {
  if (t2 = pa(t2), !va) if (t2.getExtension("EXT_color_buffer_float") && t2.getExtension("OES_texture_float_linear") && t2.getExtension("EXT_float_blend")) va = t2.R32F;
  else {
    if (!t2.getExtension("EXT_color_buffer_half_float")) throw Error("GPU does not fully support 4-channel float32 or float16 formats");
    va = t2.R16F;
  }
  return va;
}
function ma(t2) {
  return t2.l || (t2.l = new ca()), t2.l;
}
function ya(t2) {
  const e2 = pa(t2);
  e2.viewport(0, 0, t2.width, t2.height), e2.activeTexture(e2.TEXTURE0);
  let n2 = la(t2, 2);
  return n2 || (n2 = sa(ma(t2), e2, t2.m ? e2.LINEAR : e2.NEAREST), t2.g.push(n2), t2.j = true), e2.bindTexture(e2.TEXTURE_2D, n2), n2;
}
function _a(t2) {
  t2.h.bindTexture(t2.h.TEXTURE_2D, null);
}
var va, Ea = class {
  constructor(t2, e2, n2, r2, i2, s2, o2) {
    this.g = t2, this.m = e2, this.j = n2, this.canvas = r2, this.l = i2, this.width = s2, this.height = o2, this.j && (0 === --wa && console.error("You seem to be creating MPMask instances without invoking .close(). This leaks resources."));
  }
  Da() {
    return !!la(this, 0);
  }
  ja() {
    return !!la(this, 1);
  }
  R() {
    return !!la(this, 2);
  }
  ia() {
    return (e2 = la(t2 = this, 0)) || (e2 = da(t2), e2 = new Uint8Array(e2.map(((t3) => 255 * t3))), t2.g.push(e2)), e2;
    var t2, e2;
  }
  ha() {
    return da(this);
  }
  N() {
    return fa(this);
  }
  clone() {
    const t2 = [];
    for (const e2 of this.g) {
      let n2;
      if (e2 instanceof Uint8Array) n2 = new Uint8Array(e2);
      else if (e2 instanceof Float32Array) n2 = new Float32Array(e2);
      else {
        if (!(e2 instanceof WebGLTexture)) throw Error(`Type is not supported: ${e2}`);
        {
          const t3 = pa(this), e3 = ma(this);
          t3.activeTexture(t3.TEXTURE1), n2 = sa(e3, t3, this.m ? t3.LINEAR : t3.NEAREST), t3.bindTexture(t3.TEXTURE_2D, n2);
          const r2 = ga(this);
          t3.texImage2D(t3.TEXTURE_2D, 0, r2, this.width, this.height, 0, t3.RED, t3.FLOAT, null), t3.bindTexture(t3.TEXTURE_2D, null), oa(e3, t3, n2), ia(e3, t3, false, (() => {
            ya(this), t3.clearColor(0, 0, 0, 0), t3.clear(t3.COLOR_BUFFER_BIT), t3.drawArrays(t3.TRIANGLE_FAN, 0, 4), _a(this);
          })), aa(e3), _a(this);
        }
      }
      t2.push(n2);
    }
    return new Ea(t2, this.m, this.R(), this.canvas, this.l, this.width, this.height);
  }
  close() {
    this.j && pa(this).deleteTexture(la(this, 2)), wa = -1;
  }
};
Ea.prototype.close = Ea.prototype.close, Ea.prototype.clone = Ea.prototype.clone, Ea.prototype.getAsWebGLTexture = Ea.prototype.N, Ea.prototype.getAsFloat32Array = Ea.prototype.ha, Ea.prototype.getAsUint8Array = Ea.prototype.ia, Ea.prototype.hasWebGLTexture = Ea.prototype.R, Ea.prototype.hasFloat32Array = Ea.prototype.ja, Ea.prototype.hasUint8Array = Ea.prototype.Da;
var wa = 250;
function Ma(t2, e2) {
  switch (e2) {
    case 0:
      return t2.g.find(((t3) => t3 instanceof ImageData));
    case 1:
      return t2.g.find(((t3) => "undefined" != typeof ImageBitmap && t3 instanceof ImageBitmap));
    case 2:
      return t2.g.find(((t3) => "undefined" != typeof WebGLTexture && t3 instanceof WebGLTexture));
    default:
      throw Error(`Type is not supported: ${e2}`);
  }
}
function Pa(t2) {
  var e2 = Ma(t2, 0);
  if (!e2) {
    e2 = Oa(t2);
    const n2 = Ua(t2), r2 = new Uint8Array(t2.width * t2.height * 4);
    oa(n2, e2, Ca(t2)), e2.readPixels(0, 0, t2.width, t2.height, e2.RGBA, e2.UNSIGNED_BYTE, r2), aa(n2), e2 = new ImageData(new Uint8ClampedArray(r2.buffer), t2.width, t2.height), t2.g.push(e2);
  }
  return e2;
}
function Ca(t2) {
  let e2 = Ma(t2, 2);
  if (!e2) {
    const n2 = Oa(t2);
    e2 = Da(t2);
    const r2 = Ma(t2, 1) || Pa(t2);
    n2.texImage2D(n2.TEXTURE_2D, 0, n2.RGBA, n2.RGBA, n2.UNSIGNED_BYTE, r2), Na(t2);
  }
  return e2;
}
function Oa(t2) {
  if (!t2.canvas) throw Error("Conversion to different image formats require that a canvas is passed when initializing the image.");
  return t2.h || (t2.h = Qo(t2.canvas.getContext("webgl2"), "You cannot use a canvas that is already bound to a different type of rendering context.")), t2.h;
}
function Ua(t2) {
  return t2.l || (t2.l = new ca()), t2.l;
}
function Da(t2) {
  const e2 = Oa(t2);
  e2.viewport(0, 0, t2.width, t2.height), e2.activeTexture(e2.TEXTURE0);
  let n2 = Ma(t2, 2);
  return n2 || (n2 = sa(Ua(t2), e2), t2.g.push(n2), t2.m = true), e2.bindTexture(e2.TEXTURE_2D, n2), n2;
}
function Na(t2) {
  t2.h.bindTexture(t2.h.TEXTURE_2D, null);
}
function Ba(t2) {
  const e2 = Oa(t2);
  return ia(Ua(t2), e2, true, (() => (function(t3, e3) {
    const n2 = t3.canvas;
    if (n2.width === t3.width && n2.height === t3.height) return e3();
    const r2 = n2.width, i2 = n2.height;
    return n2.width = t3.width, n2.height = t3.height, t3 = e3(), n2.width = r2, n2.height = i2, t3;
  })(t2, (() => {
    if (e2.bindFramebuffer(e2.FRAMEBUFFER, null), e2.clearColor(0, 0, 0, 0), e2.clear(e2.COLOR_BUFFER_BIT), e2.drawArrays(e2.TRIANGLE_FAN, 0, 4), !(t2.canvas instanceof OffscreenCanvas)) throw Error("Conversion to ImageBitmap requires that the MediaPipe Tasks is initialized with an OffscreenCanvas");
    return t2.canvas.transferToImageBitmap();
  }))));
}
var Ga = class {
  constructor(t2, e2, n2, r2, i2, s2, o2) {
    this.g = t2, this.j = e2, this.m = n2, this.canvas = r2, this.l = i2, this.width = s2, this.height = o2, (this.j || this.m) && (0 === --ja && console.error("You seem to be creating MPImage instances without invoking .close(). This leaks resources."));
  }
  Ca() {
    return !!Ma(this, 0);
  }
  ka() {
    return !!Ma(this, 1);
  }
  R() {
    return !!Ma(this, 2);
  }
  Aa() {
    return Pa(this);
  }
  za() {
    var t2 = Ma(this, 1);
    return t2 || (Ca(this), Da(this), t2 = Ba(this), Na(this), this.g.push(t2), this.j = true), t2;
  }
  N() {
    return Ca(this);
  }
  clone() {
    const t2 = [];
    for (const e2 of this.g) {
      let n2;
      if (e2 instanceof ImageData) n2 = new ImageData(e2.data, this.width, this.height);
      else if (e2 instanceof WebGLTexture) {
        const t3 = Oa(this), e3 = Ua(this);
        t3.activeTexture(t3.TEXTURE1), n2 = sa(e3, t3), t3.bindTexture(t3.TEXTURE_2D, n2), t3.texImage2D(t3.TEXTURE_2D, 0, t3.RGBA, this.width, this.height, 0, t3.RGBA, t3.UNSIGNED_BYTE, null), t3.bindTexture(t3.TEXTURE_2D, null), oa(e3, t3, n2), ia(e3, t3, false, (() => {
          Da(this), t3.clearColor(0, 0, 0, 0), t3.clear(t3.COLOR_BUFFER_BIT), t3.drawArrays(t3.TRIANGLE_FAN, 0, 4), Na(this);
        })), aa(e3), Na(this);
      } else {
        if (!(e2 instanceof ImageBitmap)) throw Error(`Type is not supported: ${e2}`);
        Ca(this), Da(this), n2 = Ba(this), Na(this);
      }
      t2.push(n2);
    }
    return new Ga(t2, this.ka(), this.R(), this.canvas, this.l, this.width, this.height);
  }
  close() {
    this.j && Ma(this, 1).close(), this.m && Oa(this).deleteTexture(Ma(this, 2)), ja = -1;
  }
};
Ga.prototype.close = Ga.prototype.close, Ga.prototype.clone = Ga.prototype.clone, Ga.prototype.getAsWebGLTexture = Ga.prototype.N, Ga.prototype.getAsImageBitmap = Ga.prototype.za, Ga.prototype.getAsImageData = Ga.prototype.Aa, Ga.prototype.hasWebGLTexture = Ga.prototype.R, Ga.prototype.hasImageBitmap = Ga.prototype.ka, Ga.prototype.hasImageData = Ga.prototype.Ca;
var ja = 250;
function Va(...t2) {
  return t2.map((([t3, e2]) => ({ start: t3, end: e2 })));
}
const Xa = /* @__PURE__ */ (function(t2) {
  return class extends t2 {
    Ha() {
      this.i._registerModelResourcesGraphService();
    }
  };
})((Ha = class {
  constructor(t2, e2) {
    this.l = true, this.i = t2, this.g = null, this.h = 0, this.m = "function" == typeof this.i._addIntToInputStream, void 0 !== e2 ? this.i.canvas = e2 : Do() ? this.i.canvas = new OffscreenCanvas(1, 1) : (console.warn("OffscreenCanvas not supported and GraphRunner constructor glCanvas parameter is undefined. Creating backup canvas."), this.i.canvas = document.createElement("canvas"));
  }
  async initializeGraph(t2) {
    const e2 = await (await fetch(t2)).arrayBuffer();
    t2 = !(t2.endsWith(".pbtxt") || t2.endsWith(".textproto")), this.setGraph(new Uint8Array(e2), t2);
  }
  setGraphFromString(t2) {
    this.setGraph(new TextEncoder().encode(t2), false);
  }
  setGraph(t2, e2) {
    const n2 = t2.length, r2 = this.i._malloc(n2);
    this.i.HEAPU8.set(t2, r2), e2 ? this.i._changeBinaryGraph(n2, r2) : this.i._changeTextGraph(n2, r2), this.i._free(r2);
  }
  configureAudio(t2, e2, n2, r2, i2) {
    this.i._configureAudio || console.warn('Attempting to use configureAudio without support for input audio. Is build dep ":gl_graph_runner_audio" missing?'), Go(this, r2 || "input_audio", ((r3) => {
      Go(this, i2 = i2 || "audio_header", ((i3) => {
        this.i._configureAudio(r3, i3, t2, e2 ?? 0, n2);
      }));
    }));
  }
  setAutoResizeCanvas(t2) {
    this.l = t2;
  }
  setAutoRenderToScreen(t2) {
    this.i._setAutoRenderToScreen(t2);
  }
  setGpuBufferVerticalFlip(t2) {
    this.i.gpuOriginForWebTexturesIsBottomLeft = t2;
  }
  ca(t2) {
    Xo(this, "__graph_config__", ((e2) => {
      t2(e2);
    })), Go(this, "__graph_config__", ((t3) => {
      this.i._getGraphConfig(t3, void 0);
    })), delete this.i.simpleListeners.__graph_config__;
  }
  attachErrorListener(t2) {
    this.i.errorListener = t2;
  }
  attachEmptyPacketListener(t2, e2) {
    this.i.emptyPacketListeners = this.i.emptyPacketListeners || {}, this.i.emptyPacketListeners[t2] = e2;
  }
  addAudioToStream(t2, e2, n2) {
    this.addAudioToStreamWithShape(t2, 0, 0, e2, n2);
  }
  addAudioToStreamWithShape(t2, e2, n2, r2, i2) {
    const s2 = 4 * t2.length;
    this.h !== s2 && (this.g && this.i._free(this.g), this.g = this.i._malloc(s2), this.h = s2), this.i.HEAPF32.set(t2, this.g / 4), Go(this, r2, ((t3) => {
      this.i._addAudioToInputStream(this.g, e2, n2, t3, i2);
    }));
  }
  addGpuBufferToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const [r2, i2] = jo(this, t2, e3);
      this.i._addBoundTextureToStream(e3, r2, i2, n2);
    }));
  }
  addBoolToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      this.i._addBoolToInputStream(t2, e3, n2);
    }));
  }
  addDoubleToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      this.i._addDoubleToInputStream(t2, e3, n2);
    }));
  }
  addFloatToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      this.i._addFloatToInputStream(t2, e3, n2);
    }));
  }
  addIntToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      this.i._addIntToInputStream(t2, e3, n2);
    }));
  }
  addUintToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      this.i._addUintToInputStream(t2, e3, n2);
    }));
  }
  addStringToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      Go(this, t2, ((t3) => {
        this.i._addStringToInputStream(t3, e3, n2);
      }));
    }));
  }
  addStringRecordToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      Vo(this, Object.keys(t2), ((r2) => {
        Vo(this, Object.values(t2), ((i2) => {
          this.i._addFlatHashMapToInputStream(r2, i2, Object.keys(t2).length, e3, n2);
        }));
      }));
    }));
  }
  addProtoToStream(t2, e2, n2, r2) {
    Go(this, n2, ((n3) => {
      Go(this, e2, ((e3) => {
        const i2 = this.i._malloc(t2.length);
        this.i.HEAPU8.set(t2, i2), this.i._addProtoToInputStream(i2, t2.length, e3, n3, r2), this.i._free(i2);
      }));
    }));
  }
  addEmptyPacketToStream(t2, e2) {
    Go(this, t2, ((t3) => {
      this.i._addEmptyPacketToInputStream(t3, e2);
    }));
  }
  addBoolVectorToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const r2 = this.i._allocateBoolVector(t2.length);
      if (!r2) throw Error("Unable to allocate new bool vector on heap.");
      for (const e4 of t2) this.i._addBoolVectorEntry(r2, e4);
      this.i._addBoolVectorToInputStream(r2, e3, n2);
    }));
  }
  addDoubleVectorToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const r2 = this.i._allocateDoubleVector(t2.length);
      if (!r2) throw Error("Unable to allocate new double vector on heap.");
      for (const e4 of t2) this.i._addDoubleVectorEntry(r2, e4);
      this.i._addDoubleVectorToInputStream(r2, e3, n2);
    }));
  }
  addFloatVectorToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const r2 = this.i._allocateFloatVector(t2.length);
      if (!r2) throw Error("Unable to allocate new float vector on heap.");
      for (const e4 of t2) this.i._addFloatVectorEntry(r2, e4);
      this.i._addFloatVectorToInputStream(r2, e3, n2);
    }));
  }
  addIntVectorToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const r2 = this.i._allocateIntVector(t2.length);
      if (!r2) throw Error("Unable to allocate new int vector on heap.");
      for (const e4 of t2) this.i._addIntVectorEntry(r2, e4);
      this.i._addIntVectorToInputStream(r2, e3, n2);
    }));
  }
  addUintVectorToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const r2 = this.i._allocateUintVector(t2.length);
      if (!r2) throw Error("Unable to allocate new unsigned int vector on heap.");
      for (const e4 of t2) this.i._addUintVectorEntry(r2, e4);
      this.i._addUintVectorToInputStream(r2, e3, n2);
    }));
  }
  addStringVectorToStream(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const r2 = this.i._allocateStringVector(t2.length);
      if (!r2) throw Error("Unable to allocate new string vector on heap.");
      for (const e4 of t2) Go(this, e4, ((t3) => {
        this.i._addStringVectorEntry(r2, t3);
      }));
      this.i._addStringVectorToInputStream(r2, e3, n2);
    }));
  }
  addBoolToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      this.i._addBoolToInputSidePacket(t2, e3);
    }));
  }
  addDoubleToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      this.i._addDoubleToInputSidePacket(t2, e3);
    }));
  }
  addFloatToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      this.i._addFloatToInputSidePacket(t2, e3);
    }));
  }
  addIntToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      this.i._addIntToInputSidePacket(t2, e3);
    }));
  }
  addUintToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      this.i._addUintToInputSidePacket(t2, e3);
    }));
  }
  addStringToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      Go(this, t2, ((t3) => {
        this.i._addStringToInputSidePacket(t3, e3);
      }));
    }));
  }
  addProtoToInputSidePacket(t2, e2, n2) {
    Go(this, n2, ((n3) => {
      Go(this, e2, ((e3) => {
        const r2 = this.i._malloc(t2.length);
        this.i.HEAPU8.set(t2, r2), this.i._addProtoToInputSidePacket(r2, t2.length, e3, n3), this.i._free(r2);
      }));
    }));
  }
  addBoolVectorToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      const n2 = this.i._allocateBoolVector(t2.length);
      if (!n2) throw Error("Unable to allocate new bool vector on heap.");
      for (const e4 of t2) this.i._addBoolVectorEntry(n2, e4);
      this.i._addBoolVectorToInputSidePacket(n2, e3);
    }));
  }
  addDoubleVectorToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      const n2 = this.i._allocateDoubleVector(t2.length);
      if (!n2) throw Error("Unable to allocate new double vector on heap.");
      for (const e4 of t2) this.i._addDoubleVectorEntry(n2, e4);
      this.i._addDoubleVectorToInputSidePacket(n2, e3);
    }));
  }
  addFloatVectorToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      const n2 = this.i._allocateFloatVector(t2.length);
      if (!n2) throw Error("Unable to allocate new float vector on heap.");
      for (const e4 of t2) this.i._addFloatVectorEntry(n2, e4);
      this.i._addFloatVectorToInputSidePacket(n2, e3);
    }));
  }
  addIntVectorToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      const n2 = this.i._allocateIntVector(t2.length);
      if (!n2) throw Error("Unable to allocate new int vector on heap.");
      for (const e4 of t2) this.i._addIntVectorEntry(n2, e4);
      this.i._addIntVectorToInputSidePacket(n2, e3);
    }));
  }
  addUintVectorToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      const n2 = this.i._allocateUintVector(t2.length);
      if (!n2) throw Error("Unable to allocate new unsigned int vector on heap.");
      for (const e4 of t2) this.i._addUintVectorEntry(n2, e4);
      this.i._addUintVectorToInputSidePacket(n2, e3);
    }));
  }
  addStringVectorToInputSidePacket(t2, e2) {
    Go(this, e2, ((e3) => {
      const n2 = this.i._allocateStringVector(t2.length);
      if (!n2) throw Error("Unable to allocate new string vector on heap.");
      for (const e4 of t2) Go(this, e4, ((t3) => {
        this.i._addStringVectorEntry(n2, t3);
      }));
      this.i._addStringVectorToInputSidePacket(n2, e3);
    }));
  }
  attachBoolListener(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachBoolListener(t3);
    }));
  }
  attachBoolVectorListener(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachBoolVectorListener(t3);
    }));
  }
  attachIntListener(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachIntListener(t3);
    }));
  }
  attachIntVectorListener(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachIntVectorListener(t3);
    }));
  }
  attachUintListener(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachUintListener(t3);
    }));
  }
  attachUintVectorListener(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachUintVectorListener(t3);
    }));
  }
  attachDoubleListener(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachDoubleListener(t3);
    }));
  }
  attachDoubleVectorListener(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachDoubleVectorListener(t3);
    }));
  }
  attachFloatListener(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachFloatListener(t3);
    }));
  }
  attachFloatVectorListener(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachFloatVectorListener(t3);
    }));
  }
  attachStringListener(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachStringListener(t3);
    }));
  }
  attachStringVectorListener(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachStringVectorListener(t3);
    }));
  }
  attachProtoListener(t2, e2, n2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachProtoListener(t3, n2 || false);
    }));
  }
  attachProtoVectorListener(t2, e2, n2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.i._attachProtoVectorListener(t3, n2 || false);
    }));
  }
  attachAudioListener(t2, e2, n2) {
    this.i._attachAudioListener || console.warn('Attempting to use attachAudioListener without support for output audio. Is build dep ":gl_graph_runner_audio_out" missing?'), Xo(this, t2, ((t3, n3) => {
      t3 = new Float32Array(t3.buffer, t3.byteOffset, t3.length / 4), e2(t3, n3);
    })), Go(this, t2, ((t3) => {
      this.i._attachAudioListener(t3, n2 || false);
    }));
  }
  finishProcessing() {
    this.i._waitUntilIdle();
  }
  closeGraph() {
    this.i._closeGraph(), this.i.simpleListeners = void 0, this.i.emptyPacketListeners = void 0;
  }
}, class extends Ha {
  get ea() {
    return this.i;
  }
  oa(t2, e2, n2) {
    Go(this, e2, ((e3) => {
      const [r2, i2] = jo(this, t2, e3);
      this.ea._addBoundTextureAsImageToStream(e3, r2, i2, n2);
    }));
  }
  V(t2, e2) {
    Xo(this, t2, e2), Go(this, t2, ((t3) => {
      this.ea._attachImageListener(t3);
    }));
  }
  ba(t2, e2) {
    Ho(this, t2, e2), Go(this, t2, ((t3) => {
      this.ea._attachImageVectorListener(t3);
    }));
  }
}));
var Ha, Wa = class extends Xa {
};
async function za(t2, e2, n2) {
  return (async function(t3, e3, n3, r2) {
    return Wo(t3, e3, n3, r2);
  })(t2, n2.canvas ?? (Do() ? void 0 : document.createElement("canvas")), e2, n2);
}
function Ka(t2, e2, n2, r2) {
  if (t2.U) {
    const s2 = new ms();
    if (n2?.regionOfInterest) {
      if (!t2.na) throw Error("This task doesn't support region-of-interest.");
      var i2 = n2.regionOfInterest;
      if (i2.left >= i2.right || i2.top >= i2.bottom) throw Error("Expected RectF with left < right and top < bottom.");
      if (i2.left < 0 || i2.top < 0 || i2.right > 1 || i2.bottom > 1) throw Error("Expected RectF values to be in [0,1].");
      An(s2, 1, (i2.left + i2.right) / 2), An(s2, 2, (i2.top + i2.bottom) / 2), An(s2, 4, i2.right - i2.left), An(s2, 3, i2.bottom - i2.top);
    } else An(s2, 1, 0.5), An(s2, 2, 0.5), An(s2, 4, 1), An(s2, 3, 1);
    if (n2?.rotationDegrees) {
      if (n2?.rotationDegrees % 90 != 0) throw Error("Expected rotation to be a multiple of 90°.");
      if (An(s2, 5, -Math.PI * n2.rotationDegrees / 180), n2?.rotationDegrees % 180 != 0) {
        const [t3, r3] = Bo(e2);
        n2 = En(s2, 3) * r3 / t3, i2 = En(s2, 4) * t3 / r3, An(s2, 4, n2), An(s2, 3, i2);
      }
    }
    t2.g.addProtoToStream(s2.g(), "mediapipe.NormalizedRect", t2.U, r2);
  }
  t2.g.oa(e2, t2.Z, r2 ?? performance.now()), t2.finishProcessing();
}
function Ya(t2, e2, n2) {
  if (t2.baseOptions?.g()) throw Error("Task is not initialized with image mode. 'runningMode' must be set to 'IMAGE'.");
  Ka(t2, e2, n2, t2.B + 1);
}
function $a(t2, e2, n2, r2) {
  if (!t2.baseOptions?.g()) throw Error("Task is not initialized with video mode. 'runningMode' must be set to 'VIDEO'.");
  Ka(t2, e2, n2, r2);
}
function qa(t2, e2, n2, r2) {
  var i2 = e2.data;
  const s2 = e2.width, o2 = s2 * (e2 = e2.height);
  if ((i2 instanceof Uint8Array || i2 instanceof Float32Array) && i2.length !== o2) throw Error("Unsupported channel count: " + i2.length / o2);
  return t2 = new Ea([i2], n2, false, t2.g.i.canvas, t2.P, s2, e2), r2 ? t2.clone() : t2;
}
var Ja = class extends Zo {
  constructor(t2, e2, n2, r2) {
    super(t2), this.g = t2, this.Z = e2, this.U = n2, this.na = r2, this.P = new ca();
  }
  l(t2, e2 = true) {
    if ("runningMode" in t2 && wn(this.baseOptions, 2, !!t2.runningMode && "IMAGE" !== t2.runningMode), void 0 !== t2.canvas && this.g.i.canvas !== t2.canvas) throw Error("You must create a new task to reset the canvas.");
    return super.l(t2, e2);
  }
  close() {
    this.P.close(), super.close();
  }
};
Ja.prototype.close = Ja.prototype.close;
var Za = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect_in", false), this.j = { detections: [] }, dn(t2 = this.h = new Cs(), 0, 1, e2 = new Is()), An(this.h, 2, 0.5), An(this.h, 3, 0.3);
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return "minDetectionConfidence" in t2 && An(this.h, 2, t2.minDetectionConfidence ?? 0.5), "minSuppressionThreshold" in t2 && An(this.h, 3, t2.minSuppressionThreshold ?? 0.3), this.l(t2);
  }
  D(t2, e2) {
    return this.j = { detections: [] }, Ya(this, t2, e2), this.j;
  }
  F(t2, e2, n2) {
    return this.j = { detections: [] }, $a(this, t2, n2, e2), this.j;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect_in"), Zi(t2, "detections");
    const e2 = new Gi();
    Yn(e2, Us, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.face_detector.FaceDetectorGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect_in"), Wi(n2, "DETECTIONS:detections"), n2.o(e2), qi(t2, n2), this.g.attachProtoVectorListener("detections", ((t3, e3) => {
      for (const e4 of t3) t3 = hs(e4), this.j.detections.push(xo(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("detections", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
Za.prototype.detectForVideo = Za.prototype.F, Za.prototype.detect = Za.prototype.D, Za.prototype.setOptions = Za.prototype.o, Za.createFromModelPath = async function(t2, e2) {
  return za(Za, t2, { baseOptions: { modelAssetPath: e2 } });
}, Za.createFromModelBuffer = function(t2, e2) {
  return za(Za, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, Za.createFromOptions = function(t2, e2) {
  return za(Za, t2, e2);
};
var Qa = Va([61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291], [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291], [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308], [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312], [312, 311], [311, 310], [310, 415], [415, 308]), tc = Va([263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381], [381, 382], [382, 362], [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362]), ec = Va([276, 283], [283, 282], [282, 295], [295, 285], [300, 293], [293, 334], [334, 296], [296, 336]), nc = Va([474, 475], [475, 476], [476, 477], [477, 474]), rc = Va([33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133], [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157], [157, 173], [173, 133]), ic = Va([46, 53], [53, 52], [52, 65], [65, 55], [70, 63], [63, 105], [105, 66], [66, 107]), sc = Va([469, 470], [470, 471], [471, 472], [472, 469]), oc = Va([10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]), ac = [...Qa, ...tc, ...ec, ...rc, ...ic, ...oc], cc = Va([127, 34], [34, 139], [139, 127], [11, 0], [0, 37], [37, 11], [232, 231], [231, 120], [120, 232], [72, 37], [37, 39], [39, 72], [128, 121], [121, 47], [47, 128], [232, 121], [121, 128], [128, 232], [104, 69], [69, 67], [67, 104], [175, 171], [171, 148], [148, 175], [118, 50], [50, 101], [101, 118], [73, 39], [39, 40], [40, 73], [9, 151], [151, 108], [108, 9], [48, 115], [115, 131], [131, 48], [194, 204], [204, 211], [211, 194], [74, 40], [40, 185], [185, 74], [80, 42], [42, 183], [183, 80], [40, 92], [92, 186], [186, 40], [230, 229], [229, 118], [118, 230], [202, 212], [212, 214], [214, 202], [83, 18], [18, 17], [17, 83], [76, 61], [61, 146], [146, 76], [160, 29], [29, 30], [30, 160], [56, 157], [157, 173], [173, 56], [106, 204], [204, 194], [194, 106], [135, 214], [214, 192], [192, 135], [203, 165], [165, 98], [98, 203], [21, 71], [71, 68], [68, 21], [51, 45], [45, 4], [4, 51], [144, 24], [24, 23], [23, 144], [77, 146], [146, 91], [91, 77], [205, 50], [50, 187], [187, 205], [201, 200], [200, 18], [18, 201], [91, 106], [106, 182], [182, 91], [90, 91], [91, 181], [181, 90], [85, 84], [84, 17], [17, 85], [206, 203], [203, 36], [36, 206], [148, 171], [171, 140], [140, 148], [92, 40], [40, 39], [39, 92], [193, 189], [189, 244], [244, 193], [159, 158], [158, 28], [28, 159], [247, 246], [246, 161], [161, 247], [236, 3], [3, 196], [196, 236], [54, 68], [68, 104], [104, 54], [193, 168], [168, 8], [8, 193], [117, 228], [228, 31], [31, 117], [189, 193], [193, 55], [55, 189], [98, 97], [97, 99], [99, 98], [126, 47], [47, 100], [100, 126], [166, 79], [79, 218], [218, 166], [155, 154], [154, 26], [26, 155], [209, 49], [49, 131], [131, 209], [135, 136], [136, 150], [150, 135], [47, 126], [126, 217], [217, 47], [223, 52], [52, 53], [53, 223], [45, 51], [51, 134], [134, 45], [211, 170], [170, 140], [140, 211], [67, 69], [69, 108], [108, 67], [43, 106], [106, 91], [91, 43], [230, 119], [119, 120], [120, 230], [226, 130], [130, 247], [247, 226], [63, 53], [53, 52], [52, 63], [238, 20], [20, 242], [242, 238], [46, 70], [70, 156], [156, 46], [78, 62], [62, 96], [96, 78], [46, 53], [53, 63], [63, 46], [143, 34], [34, 227], [227, 143], [123, 117], [117, 111], [111, 123], [44, 125], [125, 19], [19, 44], [236, 134], [134, 51], [51, 236], [216, 206], [206, 205], [205, 216], [154, 153], [153, 22], [22, 154], [39, 37], [37, 167], [167, 39], [200, 201], [201, 208], [208, 200], [36, 142], [142, 100], [100, 36], [57, 212], [212, 202], [202, 57], [20, 60], [60, 99], [99, 20], [28, 158], [158, 157], [157, 28], [35, 226], [226, 113], [113, 35], [160, 159], [159, 27], [27, 160], [204, 202], [202, 210], [210, 204], [113, 225], [225, 46], [46, 113], [43, 202], [202, 204], [204, 43], [62, 76], [76, 77], [77, 62], [137, 123], [123, 116], [116, 137], [41, 38], [38, 72], [72, 41], [203, 129], [129, 142], [142, 203], [64, 98], [98, 240], [240, 64], [49, 102], [102, 64], [64, 49], [41, 73], [73, 74], [74, 41], [212, 216], [216, 207], [207, 212], [42, 74], [74, 184], [184, 42], [169, 170], [170, 211], [211, 169], [170, 149], [149, 176], [176, 170], [105, 66], [66, 69], [69, 105], [122, 6], [6, 168], [168, 122], [123, 147], [147, 187], [187, 123], [96, 77], [77, 90], [90, 96], [65, 55], [55, 107], [107, 65], [89, 90], [90, 180], [180, 89], [101, 100], [100, 120], [120, 101], [63, 105], [105, 104], [104, 63], [93, 137], [137, 227], [227, 93], [15, 86], [86, 85], [85, 15], [129, 102], [102, 49], [49, 129], [14, 87], [87, 86], [86, 14], [55, 8], [8, 9], [9, 55], [100, 47], [47, 121], [121, 100], [145, 23], [23, 22], [22, 145], [88, 89], [89, 179], [179, 88], [6, 122], [122, 196], [196, 6], [88, 95], [95, 96], [96, 88], [138, 172], [172, 136], [136, 138], [215, 58], [58, 172], [172, 215], [115, 48], [48, 219], [219, 115], [42, 80], [80, 81], [81, 42], [195, 3], [3, 51], [51, 195], [43, 146], [146, 61], [61, 43], [171, 175], [175, 199], [199, 171], [81, 82], [82, 38], [38, 81], [53, 46], [46, 225], [225, 53], [144, 163], [163, 110], [110, 144], [52, 65], [65, 66], [66, 52], [229, 228], [228, 117], [117, 229], [34, 127], [127, 234], [234, 34], [107, 108], [108, 69], [69, 107], [109, 108], [108, 151], [151, 109], [48, 64], [64, 235], [235, 48], [62, 78], [78, 191], [191, 62], [129, 209], [209, 126], [126, 129], [111, 35], [35, 143], [143, 111], [117, 123], [123, 50], [50, 117], [222, 65], [65, 52], [52, 222], [19, 125], [125, 141], [141, 19], [221, 55], [55, 65], [65, 221], [3, 195], [195, 197], [197, 3], [25, 7], [7, 33], [33, 25], [220, 237], [237, 44], [44, 220], [70, 71], [71, 139], [139, 70], [122, 193], [193, 245], [245, 122], [247, 130], [130, 33], [33, 247], [71, 21], [21, 162], [162, 71], [170, 169], [169, 150], [150, 170], [188, 174], [174, 196], [196, 188], [216, 186], [186, 92], [92, 216], [2, 97], [97, 167], [167, 2], [141, 125], [125, 241], [241, 141], [164, 167], [167, 37], [37, 164], [72, 38], [38, 12], [12, 72], [38, 82], [82, 13], [13, 38], [63, 68], [68, 71], [71, 63], [226, 35], [35, 111], [111, 226], [101, 50], [50, 205], [205, 101], [206, 92], [92, 165], [165, 206], [209, 198], [198, 217], [217, 209], [165, 167], [167, 97], [97, 165], [220, 115], [115, 218], [218, 220], [133, 112], [112, 243], [243, 133], [239, 238], [238, 241], [241, 239], [214, 135], [135, 169], [169, 214], [190, 173], [173, 133], [133, 190], [171, 208], [208, 32], [32, 171], [125, 44], [44, 237], [237, 125], [86, 87], [87, 178], [178, 86], [85, 86], [86, 179], [179, 85], [84, 85], [85, 180], [180, 84], [83, 84], [84, 181], [181, 83], [201, 83], [83, 182], [182, 201], [137, 93], [93, 132], [132, 137], [76, 62], [62, 183], [183, 76], [61, 76], [76, 184], [184, 61], [57, 61], [61, 185], [185, 57], [212, 57], [57, 186], [186, 212], [214, 207], [207, 187], [187, 214], [34, 143], [143, 156], [156, 34], [79, 239], [239, 237], [237, 79], [123, 137], [137, 177], [177, 123], [44, 1], [1, 4], [4, 44], [201, 194], [194, 32], [32, 201], [64, 102], [102, 129], [129, 64], [213, 215], [215, 138], [138, 213], [59, 166], [166, 219], [219, 59], [242, 99], [99, 97], [97, 242], [2, 94], [94, 141], [141, 2], [75, 59], [59, 235], [235, 75], [24, 110], [110, 228], [228, 24], [25, 130], [130, 226], [226, 25], [23, 24], [24, 229], [229, 23], [22, 23], [23, 230], [230, 22], [26, 22], [22, 231], [231, 26], [112, 26], [26, 232], [232, 112], [189, 190], [190, 243], [243, 189], [221, 56], [56, 190], [190, 221], [28, 56], [56, 221], [221, 28], [27, 28], [28, 222], [222, 27], [29, 27], [27, 223], [223, 29], [30, 29], [29, 224], [224, 30], [247, 30], [30, 225], [225, 247], [238, 79], [79, 20], [20, 238], [166, 59], [59, 75], [75, 166], [60, 75], [75, 240], [240, 60], [147, 177], [177, 215], [215, 147], [20, 79], [79, 166], [166, 20], [187, 147], [147, 213], [213, 187], [112, 233], [233, 244], [244, 112], [233, 128], [128, 245], [245, 233], [128, 114], [114, 188], [188, 128], [114, 217], [217, 174], [174, 114], [131, 115], [115, 220], [220, 131], [217, 198], [198, 236], [236, 217], [198, 131], [131, 134], [134, 198], [177, 132], [132, 58], [58, 177], [143, 35], [35, 124], [124, 143], [110, 163], [163, 7], [7, 110], [228, 110], [110, 25], [25, 228], [356, 389], [389, 368], [368, 356], [11, 302], [302, 267], [267, 11], [452, 350], [350, 349], [349, 452], [302, 303], [303, 269], [269, 302], [357, 343], [343, 277], [277, 357], [452, 453], [453, 357], [357, 452], [333, 332], [332, 297], [297, 333], [175, 152], [152, 377], [377, 175], [347, 348], [348, 330], [330, 347], [303, 304], [304, 270], [270, 303], [9, 336], [336, 337], [337, 9], [278, 279], [279, 360], [360, 278], [418, 262], [262, 431], [431, 418], [304, 408], [408, 409], [409, 304], [310, 415], [415, 407], [407, 310], [270, 409], [409, 410], [410, 270], [450, 348], [348, 347], [347, 450], [422, 430], [430, 434], [434, 422], [313, 314], [314, 17], [17, 313], [306, 307], [307, 375], [375, 306], [387, 388], [388, 260], [260, 387], [286, 414], [414, 398], [398, 286], [335, 406], [406, 418], [418, 335], [364, 367], [367, 416], [416, 364], [423, 358], [358, 327], [327, 423], [251, 284], [284, 298], [298, 251], [281, 5], [5, 4], [4, 281], [373, 374], [374, 253], [253, 373], [307, 320], [320, 321], [321, 307], [425, 427], [427, 411], [411, 425], [421, 313], [313, 18], [18, 421], [321, 405], [405, 406], [406, 321], [320, 404], [404, 405], [405, 320], [315, 16], [16, 17], [17, 315], [426, 425], [425, 266], [266, 426], [377, 400], [400, 369], [369, 377], [322, 391], [391, 269], [269, 322], [417, 465], [465, 464], [464, 417], [386, 257], [257, 258], [258, 386], [466, 260], [260, 388], [388, 466], [456, 399], [399, 419], [419, 456], [284, 332], [332, 333], [333, 284], [417, 285], [285, 8], [8, 417], [346, 340], [340, 261], [261, 346], [413, 441], [441, 285], [285, 413], [327, 460], [460, 328], [328, 327], [355, 371], [371, 329], [329, 355], [392, 439], [439, 438], [438, 392], [382, 341], [341, 256], [256, 382], [429, 420], [420, 360], [360, 429], [364, 394], [394, 379], [379, 364], [277, 343], [343, 437], [437, 277], [443, 444], [444, 283], [283, 443], [275, 440], [440, 363], [363, 275], [431, 262], [262, 369], [369, 431], [297, 338], [338, 337], [337, 297], [273, 375], [375, 321], [321, 273], [450, 451], [451, 349], [349, 450], [446, 342], [342, 467], [467, 446], [293, 334], [334, 282], [282, 293], [458, 461], [461, 462], [462, 458], [276, 353], [353, 383], [383, 276], [308, 324], [324, 325], [325, 308], [276, 300], [300, 293], [293, 276], [372, 345], [345, 447], [447, 372], [352, 345], [345, 340], [340, 352], [274, 1], [1, 19], [19, 274], [456, 248], [248, 281], [281, 456], [436, 427], [427, 425], [425, 436], [381, 256], [256, 252], [252, 381], [269, 391], [391, 393], [393, 269], [200, 199], [199, 428], [428, 200], [266, 330], [330, 329], [329, 266], [287, 273], [273, 422], [422, 287], [250, 462], [462, 328], [328, 250], [258, 286], [286, 384], [384, 258], [265, 353], [353, 342], [342, 265], [387, 259], [259, 257], [257, 387], [424, 431], [431, 430], [430, 424], [342, 353], [353, 276], [276, 342], [273, 335], [335, 424], [424, 273], [292, 325], [325, 307], [307, 292], [366, 447], [447, 345], [345, 366], [271, 303], [303, 302], [302, 271], [423, 266], [266, 371], [371, 423], [294, 455], [455, 460], [460, 294], [279, 278], [278, 294], [294, 279], [271, 272], [272, 304], [304, 271], [432, 434], [434, 427], [427, 432], [272, 407], [407, 408], [408, 272], [394, 430], [430, 431], [431, 394], [395, 369], [369, 400], [400, 395], [334, 333], [333, 299], [299, 334], [351, 417], [417, 168], [168, 351], [352, 280], [280, 411], [411, 352], [325, 319], [319, 320], [320, 325], [295, 296], [296, 336], [336, 295], [319, 403], [403, 404], [404, 319], [330, 348], [348, 349], [349, 330], [293, 298], [298, 333], [333, 293], [323, 454], [454, 447], [447, 323], [15, 16], [16, 315], [315, 15], [358, 429], [429, 279], [279, 358], [14, 15], [15, 316], [316, 14], [285, 336], [336, 9], [9, 285], [329, 349], [349, 350], [350, 329], [374, 380], [380, 252], [252, 374], [318, 402], [402, 403], [403, 318], [6, 197], [197, 419], [419, 6], [318, 319], [319, 325], [325, 318], [367, 364], [364, 365], [365, 367], [435, 367], [367, 397], [397, 435], [344, 438], [438, 439], [439, 344], [272, 271], [271, 311], [311, 272], [195, 5], [5, 281], [281, 195], [273, 287], [287, 291], [291, 273], [396, 428], [428, 199], [199, 396], [311, 271], [271, 268], [268, 311], [283, 444], [444, 445], [445, 283], [373, 254], [254, 339], [339, 373], [282, 334], [334, 296], [296, 282], [449, 347], [347, 346], [346, 449], [264, 447], [447, 454], [454, 264], [336, 296], [296, 299], [299, 336], [338, 10], [10, 151], [151, 338], [278, 439], [439, 455], [455, 278], [292, 407], [407, 415], [415, 292], [358, 371], [371, 355], [355, 358], [340, 345], [345, 372], [372, 340], [346, 347], [347, 280], [280, 346], [442, 443], [443, 282], [282, 442], [19, 94], [94, 370], [370, 19], [441, 442], [442, 295], [295, 441], [248, 419], [419, 197], [197, 248], [263, 255], [255, 359], [359, 263], [440, 275], [275, 274], [274, 440], [300, 383], [383, 368], [368, 300], [351, 412], [412, 465], [465, 351], [263, 467], [467, 466], [466, 263], [301, 368], [368, 389], [389, 301], [395, 378], [378, 379], [379, 395], [412, 351], [351, 419], [419, 412], [436, 426], [426, 322], [322, 436], [2, 164], [164, 393], [393, 2], [370, 462], [462, 461], [461, 370], [164, 0], [0, 267], [267, 164], [302, 11], [11, 12], [12, 302], [268, 12], [12, 13], [13, 268], [293, 300], [300, 301], [301, 293], [446, 261], [261, 340], [340, 446], [330, 266], [266, 425], [425, 330], [426, 423], [423, 391], [391, 426], [429, 355], [355, 437], [437, 429], [391, 327], [327, 326], [326, 391], [440, 457], [457, 438], [438, 440], [341, 382], [382, 362], [362, 341], [459, 457], [457, 461], [461, 459], [434, 430], [430, 394], [394, 434], [414, 463], [463, 362], [362, 414], [396, 369], [369, 262], [262, 396], [354, 461], [461, 457], [457, 354], [316, 403], [403, 402], [402, 316], [315, 404], [404, 403], [403, 315], [314, 405], [405, 404], [404, 314], [313, 406], [406, 405], [405, 313], [421, 418], [418, 406], [406, 421], [366, 401], [401, 361], [361, 366], [306, 408], [408, 407], [407, 306], [291, 409], [409, 408], [408, 291], [287, 410], [410, 409], [409, 287], [432, 436], [436, 410], [410, 432], [434, 416], [416, 411], [411, 434], [264, 368], [368, 383], [383, 264], [309, 438], [438, 457], [457, 309], [352, 376], [376, 401], [401, 352], [274, 275], [275, 4], [4, 274], [421, 428], [428, 262], [262, 421], [294, 327], [327, 358], [358, 294], [433, 416], [416, 367], [367, 433], [289, 455], [455, 439], [439, 289], [462, 370], [370, 326], [326, 462], [2, 326], [326, 370], [370, 2], [305, 460], [460, 455], [455, 305], [254, 449], [449, 448], [448, 254], [255, 261], [261, 446], [446, 255], [253, 450], [450, 449], [449, 253], [252, 451], [451, 450], [450, 252], [256, 452], [452, 451], [451, 256], [341, 453], [453, 452], [452, 341], [413, 464], [464, 463], [463, 413], [441, 413], [413, 414], [414, 441], [258, 442], [442, 441], [441, 258], [257, 443], [443, 442], [442, 257], [259, 444], [444, 443], [443, 259], [260, 445], [445, 444], [444, 260], [467, 342], [342, 445], [445, 467], [459, 458], [458, 250], [250, 459], [289, 392], [392, 290], [290, 289], [290, 328], [328, 460], [460, 290], [376, 433], [433, 435], [435, 376], [250, 290], [290, 392], [392, 250], [411, 416], [416, 433], [433, 411], [341, 463], [463, 464], [464, 341], [453, 464], [464, 465], [465, 453], [357, 465], [465, 412], [412, 357], [343, 412], [412, 399], [399, 343], [360, 363], [363, 440], [440, 360], [437, 399], [399, 456], [456, 437], [420, 456], [456, 363], [363, 420], [401, 435], [435, 288], [288, 401], [372, 383], [383, 353], [353, 372], [339, 255], [255, 249], [249, 339], [448, 261], [261, 255], [255, 448], [133, 243], [243, 190], [190, 133], [133, 155], [155, 112], [112, 133], [33, 246], [246, 247], [247, 33], [33, 130], [130, 25], [25, 33], [398, 384], [384, 286], [286, 398], [362, 398], [398, 414], [414, 362], [362, 463], [463, 341], [341, 362], [263, 359], [359, 467], [467, 263], [263, 249], [249, 255], [255, 263], [466, 467], [467, 260], [260, 466], [75, 60], [60, 166], [166, 75], [238, 239], [239, 79], [79, 238], [162, 127], [127, 139], [139, 162], [72, 11], [11, 37], [37, 72], [121, 232], [232, 120], [120, 121], [73, 72], [72, 39], [39, 73], [114, 128], [128, 47], [47, 114], [233, 232], [232, 128], [128, 233], [103, 104], [104, 67], [67, 103], [152, 175], [175, 148], [148, 152], [119, 118], [118, 101], [101, 119], [74, 73], [73, 40], [40, 74], [107, 9], [9, 108], [108, 107], [49, 48], [48, 131], [131, 49], [32, 194], [194, 211], [211, 32], [184, 74], [74, 185], [185, 184], [191, 80], [80, 183], [183, 191], [185, 40], [40, 186], [186, 185], [119, 230], [230, 118], [118, 119], [210, 202], [202, 214], [214, 210], [84, 83], [83, 17], [17, 84], [77, 76], [76, 146], [146, 77], [161, 160], [160, 30], [30, 161], [190, 56], [56, 173], [173, 190], [182, 106], [106, 194], [194, 182], [138, 135], [135, 192], [192, 138], [129, 203], [203, 98], [98, 129], [54, 21], [21, 68], [68, 54], [5, 51], [51, 4], [4, 5], [145, 144], [144, 23], [23, 145], [90, 77], [77, 91], [91, 90], [207, 205], [205, 187], [187, 207], [83, 201], [201, 18], [18, 83], [181, 91], [91, 182], [182, 181], [180, 90], [90, 181], [181, 180], [16, 85], [85, 17], [17, 16], [205, 206], [206, 36], [36, 205], [176, 148], [148, 140], [140, 176], [165, 92], [92, 39], [39, 165], [245, 193], [193, 244], [244, 245], [27, 159], [159, 28], [28, 27], [30, 247], [247, 161], [161, 30], [174, 236], [236, 196], [196, 174], [103, 54], [54, 104], [104, 103], [55, 193], [193, 8], [8, 55], [111, 117], [117, 31], [31, 111], [221, 189], [189, 55], [55, 221], [240, 98], [98, 99], [99, 240], [142, 126], [126, 100], [100, 142], [219, 166], [166, 218], [218, 219], [112, 155], [155, 26], [26, 112], [198, 209], [209, 131], [131, 198], [169, 135], [135, 150], [150, 169], [114, 47], [47, 217], [217, 114], [224, 223], [223, 53], [53, 224], [220, 45], [45, 134], [134, 220], [32, 211], [211, 140], [140, 32], [109, 67], [67, 108], [108, 109], [146, 43], [43, 91], [91, 146], [231, 230], [230, 120], [120, 231], [113, 226], [226, 247], [247, 113], [105, 63], [63, 52], [52, 105], [241, 238], [238, 242], [242, 241], [124, 46], [46, 156], [156, 124], [95, 78], [78, 96], [96, 95], [70, 46], [46, 63], [63, 70], [116, 143], [143, 227], [227, 116], [116, 123], [123, 111], [111, 116], [1, 44], [44, 19], [19, 1], [3, 236], [236, 51], [51, 3], [207, 216], [216, 205], [205, 207], [26, 154], [154, 22], [22, 26], [165, 39], [39, 167], [167, 165], [199, 200], [200, 208], [208, 199], [101, 36], [36, 100], [100, 101], [43, 57], [57, 202], [202, 43], [242, 20], [20, 99], [99, 242], [56, 28], [28, 157], [157, 56], [124, 35], [35, 113], [113, 124], [29, 160], [160, 27], [27, 29], [211, 204], [204, 210], [210, 211], [124, 113], [113, 46], [46, 124], [106, 43], [43, 204], [204, 106], [96, 62], [62, 77], [77, 96], [227, 137], [137, 116], [116, 227], [73, 41], [41, 72], [72, 73], [36, 203], [203, 142], [142, 36], [235, 64], [64, 240], [240, 235], [48, 49], [49, 64], [64, 48], [42, 41], [41, 74], [74, 42], [214, 212], [212, 207], [207, 214], [183, 42], [42, 184], [184, 183], [210, 169], [169, 211], [211, 210], [140, 170], [170, 176], [176, 140], [104, 105], [105, 69], [69, 104], [193, 122], [122, 168], [168, 193], [50, 123], [123, 187], [187, 50], [89, 96], [96, 90], [90, 89], [66, 65], [65, 107], [107, 66], [179, 89], [89, 180], [180, 179], [119, 101], [101, 120], [120, 119], [68, 63], [63, 104], [104, 68], [234, 93], [93, 227], [227, 234], [16, 15], [15, 85], [85, 16], [209, 129], [129, 49], [49, 209], [15, 14], [14, 86], [86, 15], [107, 55], [55, 9], [9, 107], [120, 100], [100, 121], [121, 120], [153, 145], [145, 22], [22, 153], [178, 88], [88, 179], [179, 178], [197, 6], [6, 196], [196, 197], [89, 88], [88, 96], [96, 89], [135, 138], [138, 136], [136, 135], [138, 215], [215, 172], [172, 138], [218, 115], [115, 219], [219, 218], [41, 42], [42, 81], [81, 41], [5, 195], [195, 51], [51, 5], [57, 43], [43, 61], [61, 57], [208, 171], [171, 199], [199, 208], [41, 81], [81, 38], [38, 41], [224, 53], [53, 225], [225, 224], [24, 144], [144, 110], [110, 24], [105, 52], [52, 66], [66, 105], [118, 229], [229, 117], [117, 118], [227, 34], [34, 234], [234, 227], [66, 107], [107, 69], [69, 66], [10, 109], [109, 151], [151, 10], [219, 48], [48, 235], [235, 219], [183, 62], [62, 191], [191, 183], [142, 129], [129, 126], [126, 142], [116, 111], [111, 143], [143, 116], [118, 117], [117, 50], [50, 118], [223, 222], [222, 52], [52, 223], [94, 19], [19, 141], [141, 94], [222, 221], [221, 65], [65, 222], [196, 3], [3, 197], [197, 196], [45, 220], [220, 44], [44, 45], [156, 70], [70, 139], [139, 156], [188, 122], [122, 245], [245, 188], [139, 71], [71, 162], [162, 139], [149, 170], [170, 150], [150, 149], [122, 188], [188, 196], [196, 122], [206, 216], [216, 92], [92, 206], [164, 2], [2, 167], [167, 164], [242, 141], [141, 241], [241, 242], [0, 164], [164, 37], [37, 0], [11, 72], [72, 12], [12, 11], [12, 38], [38, 13], [13, 12], [70, 63], [63, 71], [71, 70], [31, 226], [226, 111], [111, 31], [36, 101], [101, 205], [205, 36], [203, 206], [206, 165], [165, 203], [126, 209], [209, 217], [217, 126], [98, 165], [165, 97], [97, 98], [237, 220], [220, 218], [218, 237], [237, 239], [239, 241], [241, 237], [210, 214], [214, 169], [169, 210], [140, 171], [171, 32], [32, 140], [241, 125], [125, 237], [237, 241], [179, 86], [86, 178], [178, 179], [180, 85], [85, 179], [179, 180], [181, 84], [84, 180], [180, 181], [182, 83], [83, 181], [181, 182], [194, 201], [201, 182], [182, 194], [177, 137], [137, 132], [132, 177], [184, 76], [76, 183], [183, 184], [185, 61], [61, 184], [184, 185], [186, 57], [57, 185], [185, 186], [216, 212], [212, 186], [186, 216], [192, 214], [214, 187], [187, 192], [139, 34], [34, 156], [156, 139], [218, 79], [79, 237], [237, 218], [147, 123], [123, 177], [177, 147], [45, 44], [44, 4], [4, 45], [208, 201], [201, 32], [32, 208], [98, 64], [64, 129], [129, 98], [192, 213], [213, 138], [138, 192], [235, 59], [59, 219], [219, 235], [141, 242], [242, 97], [97, 141], [97, 2], [2, 141], [141, 97], [240, 75], [75, 235], [235, 240], [229, 24], [24, 228], [228, 229], [31, 25], [25, 226], [226, 31], [230, 23], [23, 229], [229, 230], [231, 22], [22, 230], [230, 231], [232, 26], [26, 231], [231, 232], [233, 112], [112, 232], [232, 233], [244, 189], [189, 243], [243, 244], [189, 221], [221, 190], [190, 189], [222, 28], [28, 221], [221, 222], [223, 27], [27, 222], [222, 223], [224, 29], [29, 223], [223, 224], [225, 30], [30, 224], [224, 225], [113, 247], [247, 225], [225, 113], [99, 60], [60, 240], [240, 99], [213, 147], [147, 215], [215, 213], [60, 20], [20, 166], [166, 60], [192, 187], [187, 213], [213, 192], [243, 112], [112, 244], [244, 243], [244, 233], [233, 245], [245, 244], [245, 128], [128, 188], [188, 245], [188, 114], [114, 174], [174, 188], [134, 131], [131, 220], [220, 134], [174, 217], [217, 236], [236, 174], [236, 198], [198, 134], [134, 236], [215, 177], [177, 58], [58, 215], [156, 143], [143, 124], [124, 156], [25, 110], [110, 7], [7, 25], [31, 228], [228, 25], [25, 31], [264, 356], [356, 368], [368, 264], [0, 11], [11, 267], [267, 0], [451, 452], [452, 349], [349, 451], [267, 302], [302, 269], [269, 267], [350, 357], [357, 277], [277, 350], [350, 452], [452, 357], [357, 350], [299, 333], [333, 297], [297, 299], [396, 175], [175, 377], [377, 396], [280, 347], [347, 330], [330, 280], [269, 303], [303, 270], [270, 269], [151, 9], [9, 337], [337, 151], [344, 278], [278, 360], [360, 344], [424, 418], [418, 431], [431, 424], [270, 304], [304, 409], [409, 270], [272, 310], [310, 407], [407, 272], [322, 270], [270, 410], [410, 322], [449, 450], [450, 347], [347, 449], [432, 422], [422, 434], [434, 432], [18, 313], [313, 17], [17, 18], [291, 306], [306, 375], [375, 291], [259, 387], [387, 260], [260, 259], [424, 335], [335, 418], [418, 424], [434, 364], [364, 416], [416, 434], [391, 423], [423, 327], [327, 391], [301, 251], [251, 298], [298, 301], [275, 281], [281, 4], [4, 275], [254, 373], [373, 253], [253, 254], [375, 307], [307, 321], [321, 375], [280, 425], [425, 411], [411, 280], [200, 421], [421, 18], [18, 200], [335, 321], [321, 406], [406, 335], [321, 320], [320, 405], [405, 321], [314, 315], [315, 17], [17, 314], [423, 426], [426, 266], [266, 423], [396, 377], [377, 369], [369, 396], [270, 322], [322, 269], [269, 270], [413, 417], [417, 464], [464, 413], [385, 386], [386, 258], [258, 385], [248, 456], [456, 419], [419, 248], [298, 284], [284, 333], [333, 298], [168, 417], [417, 8], [8, 168], [448, 346], [346, 261], [261, 448], [417, 413], [413, 285], [285, 417], [326, 327], [327, 328], [328, 326], [277, 355], [355, 329], [329, 277], [309, 392], [392, 438], [438, 309], [381, 382], [382, 256], [256, 381], [279, 429], [429, 360], [360, 279], [365, 364], [364, 379], [379, 365], [355, 277], [277, 437], [437, 355], [282, 443], [443, 283], [283, 282], [281, 275], [275, 363], [363, 281], [395, 431], [431, 369], [369, 395], [299, 297], [297, 337], [337, 299], [335, 273], [273, 321], [321, 335], [348, 450], [450, 349], [349, 348], [359, 446], [446, 467], [467, 359], [283, 293], [293, 282], [282, 283], [250, 458], [458, 462], [462, 250], [300, 276], [276, 383], [383, 300], [292, 308], [308, 325], [325, 292], [283, 276], [276, 293], [293, 283], [264, 372], [372, 447], [447, 264], [346, 352], [352, 340], [340, 346], [354, 274], [274, 19], [19, 354], [363, 456], [456, 281], [281, 363], [426, 436], [436, 425], [425, 426], [380, 381], [381, 252], [252, 380], [267, 269], [269, 393], [393, 267], [421, 200], [200, 428], [428, 421], [371, 266], [266, 329], [329, 371], [432, 287], [287, 422], [422, 432], [290, 250], [250, 328], [328, 290], [385, 258], [258, 384], [384, 385], [446, 265], [265, 342], [342, 446], [386, 387], [387, 257], [257, 386], [422, 424], [424, 430], [430, 422], [445, 342], [342, 276], [276, 445], [422, 273], [273, 424], [424, 422], [306, 292], [292, 307], [307, 306], [352, 366], [366, 345], [345, 352], [268, 271], [271, 302], [302, 268], [358, 423], [423, 371], [371, 358], [327, 294], [294, 460], [460, 327], [331, 279], [279, 294], [294, 331], [303, 271], [271, 304], [304, 303], [436, 432], [432, 427], [427, 436], [304, 272], [272, 408], [408, 304], [395, 394], [394, 431], [431, 395], [378, 395], [395, 400], [400, 378], [296, 334], [334, 299], [299, 296], [6, 351], [351, 168], [168, 6], [376, 352], [352, 411], [411, 376], [307, 325], [325, 320], [320, 307], [285, 295], [295, 336], [336, 285], [320, 319], [319, 404], [404, 320], [329, 330], [330, 349], [349, 329], [334, 293], [293, 333], [333, 334], [366, 323], [323, 447], [447, 366], [316, 15], [15, 315], [315, 316], [331, 358], [358, 279], [279, 331], [317, 14], [14, 316], [316, 317], [8, 285], [285, 9], [9, 8], [277, 329], [329, 350], [350, 277], [253, 374], [374, 252], [252, 253], [319, 318], [318, 403], [403, 319], [351, 6], [6, 419], [419, 351], [324, 318], [318, 325], [325, 324], [397, 367], [367, 365], [365, 397], [288, 435], [435, 397], [397, 288], [278, 344], [344, 439], [439, 278], [310, 272], [272, 311], [311, 310], [248, 195], [195, 281], [281, 248], [375, 273], [273, 291], [291, 375], [175, 396], [396, 199], [199, 175], [312, 311], [311, 268], [268, 312], [276, 283], [283, 445], [445, 276], [390, 373], [373, 339], [339, 390], [295, 282], [282, 296], [296, 295], [448, 449], [449, 346], [346, 448], [356, 264], [264, 454], [454, 356], [337, 336], [336, 299], [299, 337], [337, 338], [338, 151], [151, 337], [294, 278], [278, 455], [455, 294], [308, 292], [292, 415], [415, 308], [429, 358], [358, 355], [355, 429], [265, 340], [340, 372], [372, 265], [352, 346], [346, 280], [280, 352], [295, 442], [442, 282], [282, 295], [354, 19], [19, 370], [370, 354], [285, 441], [441, 295], [295, 285], [195, 248], [248, 197], [197, 195], [457, 440], [440, 274], [274, 457], [301, 300], [300, 368], [368, 301], [417, 351], [351, 465], [465, 417], [251, 301], [301, 389], [389, 251], [394, 395], [395, 379], [379, 394], [399, 412], [412, 419], [419, 399], [410, 436], [436, 322], [322, 410], [326, 2], [2, 393], [393, 326], [354, 370], [370, 461], [461, 354], [393, 164], [164, 267], [267, 393], [268, 302], [302, 12], [12, 268], [312, 268], [268, 13], [13, 312], [298, 293], [293, 301], [301, 298], [265, 446], [446, 340], [340, 265], [280, 330], [330, 425], [425, 280], [322, 426], [426, 391], [391, 322], [420, 429], [429, 437], [437, 420], [393, 391], [391, 326], [326, 393], [344, 440], [440, 438], [438, 344], [458, 459], [459, 461], [461, 458], [364, 434], [434, 394], [394, 364], [428, 396], [396, 262], [262, 428], [274, 354], [354, 457], [457, 274], [317, 316], [316, 402], [402, 317], [316, 315], [315, 403], [403, 316], [315, 314], [314, 404], [404, 315], [314, 313], [313, 405], [405, 314], [313, 421], [421, 406], [406, 313], [323, 366], [366, 361], [361, 323], [292, 306], [306, 407], [407, 292], [306, 291], [291, 408], [408, 306], [291, 287], [287, 409], [409, 291], [287, 432], [432, 410], [410, 287], [427, 434], [434, 411], [411, 427], [372, 264], [264, 383], [383, 372], [459, 309], [309, 457], [457, 459], [366, 352], [352, 401], [401, 366], [1, 274], [274, 4], [4, 1], [418, 421], [421, 262], [262, 418], [331, 294], [294, 358], [358, 331], [435, 433], [433, 367], [367, 435], [392, 289], [289, 439], [439, 392], [328, 462], [462, 326], [326, 328], [94, 2], [2, 370], [370, 94], [289, 305], [305, 455], [455, 289], [339, 254], [254, 448], [448, 339], [359, 255], [255, 446], [446, 359], [254, 253], [253, 449], [449, 254], [253, 252], [252, 450], [450, 253], [252, 256], [256, 451], [451, 252], [256, 341], [341, 452], [452, 256], [414, 413], [413, 463], [463, 414], [286, 441], [441, 414], [414, 286], [286, 258], [258, 441], [441, 286], [258, 257], [257, 442], [442, 258], [257, 259], [259, 443], [443, 257], [259, 260], [260, 444], [444, 259], [260, 467], [467, 445], [445, 260], [309, 459], [459, 250], [250, 309], [305, 289], [289, 290], [290, 305], [305, 290], [290, 460], [460, 305], [401, 376], [376, 435], [435, 401], [309, 250], [250, 392], [392, 309], [376, 411], [411, 433], [433, 376], [453, 341], [341, 464], [464, 453], [357, 453], [453, 465], [465, 357], [343, 357], [357, 412], [412, 343], [437, 343], [343, 399], [399, 437], [344, 360], [360, 440], [440, 344], [420, 437], [437, 456], [456, 420], [360, 420], [420, 363], [363, 360], [361, 401], [401, 288], [288, 361], [265, 372], [372, 353], [353, 265], [390, 339], [339, 249], [249, 390], [339, 448], [448, 255], [255, 339]);
function hc(t2) {
  t2.j = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
}
var uc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", false), this.j = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] }, this.outputFacialTransformationMatrixes = this.outputFaceBlendshapes = false, dn(t2 = this.h = new Bs(), 0, 1, e2 = new Is()), this.v = new Ns(), dn(this.h, 0, 3, this.v), this.s = new Cs(), dn(this.h, 0, 2, this.s), Tn(this.s, 4, 1), An(this.s, 2, 0.5), An(this.v, 2, 0.5), An(this.h, 4, 0.5);
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return "numFaces" in t2 && Tn(this.s, 4, t2.numFaces ?? 1), "minFaceDetectionConfidence" in t2 && An(this.s, 2, t2.minFaceDetectionConfidence ?? 0.5), "minTrackingConfidence" in t2 && An(this.h, 4, t2.minTrackingConfidence ?? 0.5), "minFacePresenceConfidence" in t2 && An(this.v, 2, t2.minFacePresenceConfidence ?? 0.5), "outputFaceBlendshapes" in t2 && (this.outputFaceBlendshapes = !!t2.outputFaceBlendshapes), "outputFacialTransformationMatrixes" in t2 && (this.outputFacialTransformationMatrixes = !!t2.outputFacialTransformationMatrixes), this.l(t2);
  }
  D(t2, e2) {
    return hc(this), Ya(this, t2, e2), this.j;
  }
  F(t2, e2, n2) {
    return hc(this), $a(this, t2, n2, e2), this.j;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect"), Zi(t2, "face_landmarks");
    const e2 = new Gi();
    Yn(e2, Vs, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.face_landmarker.FaceLandmarkerGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "NORM_LANDMARKS:face_landmarks"), n2.o(e2), qi(t2, n2), this.g.attachProtoVectorListener("face_landmarks", ((t3, e3) => {
      for (const e4 of t3) t3 = fs(e4), this.j.faceLandmarks.push(Lo(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("face_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.outputFaceBlendshapes && (Zi(t2, "blendshapes"), Wi(n2, "BLENDSHAPES:blendshapes"), this.g.attachProtoVectorListener("blendshapes", ((t3, e3) => {
      if (this.outputFaceBlendshapes) for (const e4 of t3) t3 = ss(e4), this.j.faceBlendshapes.push(So(t3.g() ?? []));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("blendshapes", ((t3) => {
      Yo(this, t3);
    }))), this.outputFacialTransformationMatrixes && (Zi(t2, "face_geometry"), Wi(n2, "FACE_GEOMETRY:face_geometry"), this.g.attachProtoVectorListener("face_geometry", ((t3, e3) => {
      if (this.outputFacialTransformationMatrixes) for (const e4 of t3) (t3 = hn(Ds(e4), ps, 2)) && this.j.facialTransformationMatrixes.push({ rows: _n(t3, 1) ?? 0 ?? 0, columns: _n(t3, 2) ?? 0 ?? 0, data: $e(t3, 3, qt, Ye()).slice() ?? [] });
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("face_geometry", ((t3) => {
      Yo(this, t3);
    }))), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
uc.prototype.detectForVideo = uc.prototype.F, uc.prototype.detect = uc.prototype.D, uc.prototype.setOptions = uc.prototype.o, uc.createFromModelPath = function(t2, e2) {
  return za(uc, t2, { baseOptions: { modelAssetPath: e2 } });
}, uc.createFromModelBuffer = function(t2, e2) {
  return za(uc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, uc.createFromOptions = function(t2, e2) {
  return za(uc, t2, e2);
}, uc.FACE_LANDMARKS_LIPS = Qa, uc.FACE_LANDMARKS_LEFT_EYE = tc, uc.FACE_LANDMARKS_LEFT_EYEBROW = ec, uc.FACE_LANDMARKS_LEFT_IRIS = nc, uc.FACE_LANDMARKS_RIGHT_EYE = rc, uc.FACE_LANDMARKS_RIGHT_EYEBROW = ic, uc.FACE_LANDMARKS_RIGHT_IRIS = sc, uc.FACE_LANDMARKS_FACE_OVAL = oc, uc.FACE_LANDMARKS_CONTOURS = ac, uc.FACE_LANDMARKS_TESSELATION = cc;
var lc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", true), dn(t2 = this.j = new Xs(), 0, 1, e2 = new Is());
  }
  get baseOptions() {
    return hn(this.j, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.j, 0, 1, t2);
  }
  o(t2) {
    return super.l(t2);
  }
  Ka(t2, e2, n2) {
    const r2 = "function" != typeof e2 ? e2 : {};
    if (this.h = "function" == typeof e2 ? e2 : n2, Ya(this, t2, r2 ?? {}), !this.h) return this.s;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect"), Zi(t2, "stylized_image");
    const e2 = new Gi();
    Yn(e2, Hs, this.j);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.face_stylizer.FaceStylizerGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "STYLIZED_IMAGE:stylized_image"), n2.o(e2), qi(t2, n2), this.g.V("stylized_image", ((t3, e3) => {
      var n3 = !this.h, r2 = t3.data, i2 = t3.width;
      const s2 = i2 * (t3 = t3.height);
      if (r2 instanceof Uint8Array) if (r2.length === 3 * s2) {
        const e4 = new Uint8ClampedArray(4 * s2);
        for (let t4 = 0; t4 < s2; ++t4) e4[4 * t4] = r2[3 * t4], e4[4 * t4 + 1] = r2[3 * t4 + 1], e4[4 * t4 + 2] = r2[3 * t4 + 2], e4[4 * t4 + 3] = 255;
        r2 = new ImageData(e4, i2, t3);
      } else {
        if (r2.length !== 4 * s2) throw Error("Unsupported channel count: " + r2.length / s2);
        r2 = new ImageData(new Uint8ClampedArray(r2.buffer, r2.byteOffset, r2.length), i2, t3);
      }
      else if (!(r2 instanceof WebGLTexture)) throw Error(`Unsupported format: ${r2.constructor.name}`);
      i2 = new Ga([r2], false, false, this.g.i.canvas, this.P, i2, t3), this.s = n3 = n3 ? i2.clone() : i2, this.h && this.h(n3), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("stylized_image", ((t3) => {
      this.s = null, this.h && this.h(null), Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
lc.prototype.stylize = lc.prototype.Ka, lc.prototype.setOptions = lc.prototype.o, lc.createFromModelPath = function(t2, e2) {
  return za(lc, t2, { baseOptions: { modelAssetPath: e2 } });
}, lc.createFromModelBuffer = function(t2, e2) {
  return za(lc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, lc.createFromOptions = function(t2, e2) {
  return za(lc, t2, e2);
};
var dc = Va([0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]);
function fc(t2) {
  t2.gestures = [], t2.landmarks = [], t2.worldLandmarks = [], t2.handedness = [];
}
function pc(t2) {
  return 0 === t2.gestures.length ? { gestures: [], landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] } : { gestures: t2.gestures, landmarks: t2.landmarks, worldLandmarks: t2.worldLandmarks, handedness: t2.handedness, handednesses: t2.handedness };
}
function gc(t2, e2 = true) {
  const n2 = [];
  for (const i2 of t2) {
    var r2 = ss(i2);
    t2 = [];
    for (const n3 of r2.g()) r2 = e2 && null != _n(n3, 1) ? _n(n3, 1) ?? 0 : -1, t2.push({ score: En(n3, 2) ?? 0, index: r2, categoryName: vn(n3, 3) ?? "" ?? "", displayName: vn(n3, 4) ?? "" ?? "" });
    n2.push(t2);
  }
  return n2;
}
var mc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", false), this.gestures = [], this.landmarks = [], this.worldLandmarks = [], this.handedness = [], dn(t2 = this.j = new Js(), 0, 1, e2 = new Is()), this.s = new qs(), dn(this.j, 0, 2, this.s), this.C = new $s(), dn(this.s, 0, 3, this.C), this.v = new Ys(), dn(this.s, 0, 2, this.v), this.h = new Ks(), dn(this.j, 0, 3, this.h), An(this.v, 2, 0.5), An(this.s, 4, 0.5), An(this.C, 2, 0.5);
  }
  get baseOptions() {
    return hn(this.j, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.j, 0, 1, t2);
  }
  o(t2) {
    if (Tn(this.v, 3, t2.numHands ?? 1), "minHandDetectionConfidence" in t2 && An(this.v, 2, t2.minHandDetectionConfidence ?? 0.5), "minTrackingConfidence" in t2 && An(this.s, 4, t2.minTrackingConfidence ?? 0.5), "minHandPresenceConfidence" in t2 && An(this.C, 2, t2.minHandPresenceConfidence ?? 0.5), t2.cannedGesturesClassifierOptions) {
      var e2 = new Ws(), n2 = e2, r2 = ko(t2.cannedGesturesClassifierOptions, hn(this.h, Ws, 3)?.h());
      dn(n2, 0, 2, r2), dn(this.h, 0, 3, e2);
    } else void 0 === t2.cannedGesturesClassifierOptions && hn(this.h, Ws, 3)?.g();
    return t2.customGesturesClassifierOptions ? (dn(n2 = e2 = new Ws(), 0, 2, r2 = ko(t2.customGesturesClassifierOptions, hn(this.h, Ws, 4)?.h())), dn(this.h, 0, 4, e2)) : void 0 === t2.customGesturesClassifierOptions && hn(this.h, Ws, 4)?.g(), this.l(t2);
  }
  Fa(t2, e2) {
    return fc(this), Ya(this, t2, e2), pc(this);
  }
  Ga(t2, e2, n2) {
    return fc(this), $a(this, t2, n2, e2), pc(this);
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect"), Zi(t2, "hand_gestures"), Zi(t2, "hand_landmarks"), Zi(t2, "world_hand_landmarks"), Zi(t2, "handedness");
    const e2 = new Gi();
    Yn(e2, no, this.j);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.gesture_recognizer.GestureRecognizerGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "HAND_GESTURES:hand_gestures"), Wi(n2, "LANDMARKS:hand_landmarks"), Wi(n2, "WORLD_LANDMARKS:world_hand_landmarks"), Wi(n2, "HANDEDNESS:handedness"), n2.o(e2), qi(t2, n2), this.g.attachProtoVectorListener("hand_landmarks", ((t3, e3) => {
      for (const e4 of t3) {
        t3 = fs(e4);
        const n3 = [];
        for (const e5 of ln(t3, ds, 1)) n3.push({ x: En(e5, 1) ?? 0, y: En(e5, 2) ?? 0, z: En(e5, 3) ?? 0, visibility: En(e5, 4) ?? 0 });
        this.landmarks.push(n3);
      }
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("hand_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoVectorListener("world_hand_landmarks", ((t3, e3) => {
      for (const e4 of t3) {
        t3 = ls(e4);
        const n3 = [];
        for (const e5 of ln(t3, us, 1)) n3.push({ x: En(e5, 1) ?? 0, y: En(e5, 2) ?? 0, z: En(e5, 3) ?? 0, visibility: En(e5, 4) ?? 0 });
        this.worldLandmarks.push(n3);
      }
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("world_hand_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoVectorListener("hand_gestures", ((t3, e3) => {
      this.gestures.push(...gc(t3, false)), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("hand_gestures", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoVectorListener("handedness", ((t3, e3) => {
      this.handedness.push(...gc(t3)), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("handedness", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
function yc(t2) {
  return { landmarks: t2.landmarks, worldLandmarks: t2.worldLandmarks, handednesses: t2.handedness, handedness: t2.handedness };
}
mc.prototype.recognizeForVideo = mc.prototype.Ga, mc.prototype.recognize = mc.prototype.Fa, mc.prototype.setOptions = mc.prototype.o, mc.createFromModelPath = function(t2, e2) {
  return za(mc, t2, { baseOptions: { modelAssetPath: e2 } });
}, mc.createFromModelBuffer = function(t2, e2) {
  return za(mc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, mc.createFromOptions = function(t2, e2) {
  return za(mc, t2, e2);
}, mc.HAND_CONNECTIONS = dc;
var _c = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", false), this.landmarks = [], this.worldLandmarks = [], this.handedness = [], dn(t2 = this.h = new qs(), 0, 1, e2 = new Is()), this.s = new $s(), dn(this.h, 0, 3, this.s), this.j = new Ys(), dn(this.h, 0, 2, this.j), Tn(this.j, 3, 1), An(this.j, 2, 0.5), An(this.s, 2, 0.5), An(this.h, 4, 0.5);
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return "numHands" in t2 && Tn(this.j, 3, t2.numHands ?? 1), "minHandDetectionConfidence" in t2 && An(this.j, 2, t2.minHandDetectionConfidence ?? 0.5), "minTrackingConfidence" in t2 && An(this.h, 4, t2.minTrackingConfidence ?? 0.5), "minHandPresenceConfidence" in t2 && An(this.s, 2, t2.minHandPresenceConfidence ?? 0.5), this.l(t2);
  }
  D(t2, e2) {
    return this.landmarks = [], this.worldLandmarks = [], this.handedness = [], Ya(this, t2, e2), yc(this);
  }
  F(t2, e2, n2) {
    return this.landmarks = [], this.worldLandmarks = [], this.handedness = [], $a(this, t2, n2, e2), yc(this);
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect"), Zi(t2, "hand_landmarks"), Zi(t2, "world_hand_landmarks"), Zi(t2, "handedness");
    const e2 = new Gi();
    Yn(e2, ro, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.hand_landmarker.HandLandmarkerGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "LANDMARKS:hand_landmarks"), Wi(n2, "WORLD_LANDMARKS:world_hand_landmarks"), Wi(n2, "HANDEDNESS:handedness"), n2.o(e2), qi(t2, n2), this.g.attachProtoVectorListener("hand_landmarks", ((t3, e3) => {
      for (const e4 of t3) t3 = fs(e4), this.landmarks.push(Lo(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("hand_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoVectorListener("world_hand_landmarks", ((t3, e3) => {
      for (const e4 of t3) t3 = ls(e4), this.worldLandmarks.push(Ro(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("world_hand_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoVectorListener("handedness", ((t3, e3) => {
      var n3 = this.handedness, r2 = n3.push;
      const i2 = [];
      for (const e4 of t3) {
        t3 = ss(e4);
        const n4 = [];
        for (const e5 of t3.g()) n4.push({ score: En(e5, 2) ?? 0, index: _n(e5, 1) ?? 0 ?? -1, categoryName: vn(e5, 3) ?? "" ?? "", displayName: vn(e5, 4) ?? "" ?? "" });
        i2.push(n4);
      }
      r2.call(n3, ...i2), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("handedness", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
_c.prototype.detectForVideo = _c.prototype.F, _c.prototype.detect = _c.prototype.D, _c.prototype.setOptions = _c.prototype.o, _c.createFromModelPath = function(t2, e2) {
  return za(_c, t2, { baseOptions: { modelAssetPath: e2 } });
}, _c.createFromModelBuffer = function(t2, e2) {
  return za(_c, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, _c.createFromOptions = function(t2, e2) {
  return za(_c, t2, e2);
}, _c.HAND_CONNECTIONS = dc;
var vc = Va([0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]);
function Ec(t2) {
  t2.h = { faceLandmarks: [], faceBlendshapes: [], poseLandmarks: [], poseWorldLandmarks: [], poseSegmentationMasks: [], leftHandLandmarks: [], leftHandWorldLandmarks: [], rightHandLandmarks: [], rightHandWorldLandmarks: [] };
}
function wc(t2) {
  try {
    if (!t2.C) return t2.h;
    t2.C(t2.h);
  } finally {
    Jo(t2);
  }
}
function Tc(t2, e2) {
  t2 = fs(t2), e2.push(Lo(t2));
}
var Ac = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "input_frames_image", null, false), this.h = { faceLandmarks: [], faceBlendshapes: [], poseLandmarks: [], poseWorldLandmarks: [], poseSegmentationMasks: [], leftHandLandmarks: [], leftHandWorldLandmarks: [], rightHandLandmarks: [], rightHandWorldLandmarks: [] }, this.outputPoseSegmentationMasks = this.outputFaceBlendshapes = false, dn(t2 = this.j = new ao(), 0, 1, e2 = new Is()), this.K = new $s(), dn(this.j, 0, 2, this.K), this.Y = new io(), dn(this.j, 0, 3, this.Y), this.s = new Cs(), dn(this.j, 0, 4, this.s), this.H = new Ns(), dn(this.j, 0, 5, this.H), this.v = new so(), dn(this.j, 0, 6, this.v), this.L = new oo(), dn(this.j, 0, 7, this.L), An(this.s, 2, 0.5), An(this.s, 3, 0.3), An(this.H, 2, 0.5), An(this.v, 2, 0.5), An(this.v, 3, 0.3), An(this.L, 2, 0.5), An(this.K, 2, 0.5);
  }
  get baseOptions() {
    return hn(this.j, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.j, 0, 1, t2);
  }
  o(t2) {
    return "minFaceDetectionConfidence" in t2 && An(this.s, 2, t2.minFaceDetectionConfidence ?? 0.5), "minFaceSuppressionThreshold" in t2 && An(this.s, 3, t2.minFaceSuppressionThreshold ?? 0.3), "minFacePresenceConfidence" in t2 && An(this.H, 2, t2.minFacePresenceConfidence ?? 0.5), "outputFaceBlendshapes" in t2 && (this.outputFaceBlendshapes = !!t2.outputFaceBlendshapes), "minPoseDetectionConfidence" in t2 && An(this.v, 2, t2.minPoseDetectionConfidence ?? 0.5), "minPoseSuppressionThreshold" in t2 && An(this.v, 3, t2.minPoseSuppressionThreshold ?? 0.3), "minPosePresenceConfidence" in t2 && An(this.L, 2, t2.minPosePresenceConfidence ?? 0.5), "outputPoseSegmentationMasks" in t2 && (this.outputPoseSegmentationMasks = !!t2.outputPoseSegmentationMasks), "minHandLandmarksConfidence" in t2 && An(this.K, 2, t2.minHandLandmarksConfidence ?? 0.5), this.l(t2);
  }
  D(t2, e2, n2) {
    const r2 = "function" != typeof e2 ? e2 : {};
    return this.C = "function" == typeof e2 ? e2 : n2, Ec(this), Ya(this, t2, r2), wc(this);
  }
  F(t2, e2, n2, r2) {
    const i2 = "function" != typeof n2 ? n2 : {};
    return this.C = "function" == typeof n2 ? n2 : r2, Ec(this), $a(this, t2, i2, e2), wc(this);
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "input_frames_image"), Zi(t2, "pose_landmarks"), Zi(t2, "pose_world_landmarks"), Zi(t2, "face_landmarks"), Zi(t2, "left_hand_landmarks"), Zi(t2, "left_hand_world_landmarks"), Zi(t2, "right_hand_landmarks"), Zi(t2, "right_hand_world_landmarks");
    const e2 = new Gi(), n2 = new xi();
    tn(n2, 1, de("type.googleapis.com/mediapipe.tasks.vision.holistic_landmarker.proto.HolisticLandmarkerGraphOptions"), ""), (function(t3, e3) {
      if (null != e3) if (Array.isArray(e3)) He(t3, 2, Pe(e3, Oe, void 0, void 0, false));
      else {
        if (!("string" == typeof e3 || e3 instanceof N || C(e3))) throw Error("invalid value in Any.value field: " + e3 + " expected a ByteString, a base64 encoded string, a Uint8Array or a jspb array");
        tn(t3, 2, dt(e3, false), U());
      }
    })(n2, this.j.g());
    const r2 = new zi();
    Xi(r2, "mediapipe.tasks.vision.holistic_landmarker.HolisticLandmarkerGraph"), yn(r2, 8, xi, n2), Hi(r2, "IMAGE:input_frames_image"), Wi(r2, "POSE_LANDMARKS:pose_landmarks"), Wi(r2, "POSE_WORLD_LANDMARKS:pose_world_landmarks"), Wi(r2, "FACE_LANDMARKS:face_landmarks"), Wi(r2, "LEFT_HAND_LANDMARKS:left_hand_landmarks"), Wi(r2, "LEFT_HAND_WORLD_LANDMARKS:left_hand_world_landmarks"), Wi(r2, "RIGHT_HAND_LANDMARKS:right_hand_landmarks"), Wi(r2, "RIGHT_HAND_WORLD_LANDMARKS:right_hand_world_landmarks"), r2.o(e2), qi(t2, r2), $o(this, t2), this.g.attachProtoListener("pose_landmarks", ((t3, e3) => {
      Tc(t3, this.h.poseLandmarks), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("pose_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoListener("pose_world_landmarks", ((t3, e3) => {
      var n3 = this.h.poseWorldLandmarks;
      t3 = ls(t3), n3.push(Ro(t3)), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("pose_world_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.outputPoseSegmentationMasks && (Wi(r2, "POSE_SEGMENTATION_MASK:pose_segmentation_mask"), qo(this, "pose_segmentation_mask"), this.g.V("pose_segmentation_mask", ((t3, e3) => {
      this.h.poseSegmentationMasks = [qa(this, t3, true, !this.C)], Yo(this, e3);
    })), this.g.attachEmptyPacketListener("pose_segmentation_mask", ((t3) => {
      this.h.poseSegmentationMasks = [], Yo(this, t3);
    }))), this.g.attachProtoListener("face_landmarks", ((t3, e3) => {
      Tc(t3, this.h.faceLandmarks), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("face_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.outputFaceBlendshapes && (Zi(t2, "extra_blendshapes"), Wi(r2, "FACE_BLENDSHAPES:extra_blendshapes"), this.g.attachProtoListener("extra_blendshapes", ((t3, e3) => {
      var n3 = this.h.faceBlendshapes;
      this.outputFaceBlendshapes && (t3 = ss(t3), n3.push(So(t3.g() ?? []))), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("extra_blendshapes", ((t3) => {
      Yo(this, t3);
    }))), this.g.attachProtoListener("left_hand_landmarks", ((t3, e3) => {
      Tc(t3, this.h.leftHandLandmarks), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("left_hand_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoListener("left_hand_world_landmarks", ((t3, e3) => {
      var n3 = this.h.leftHandWorldLandmarks;
      t3 = ls(t3), n3.push(Ro(t3)), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("left_hand_world_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoListener("right_hand_landmarks", ((t3, e3) => {
      Tc(t3, this.h.rightHandLandmarks), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("right_hand_landmarks", ((t3) => {
      Yo(this, t3);
    })), this.g.attachProtoListener("right_hand_world_landmarks", ((t3, e3) => {
      var n3 = this.h.rightHandWorldLandmarks;
      t3 = ls(t3), n3.push(Ro(t3)), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("right_hand_world_landmarks", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
Ac.prototype.detectForVideo = Ac.prototype.F, Ac.prototype.detect = Ac.prototype.D, Ac.prototype.setOptions = Ac.prototype.o, Ac.createFromModelPath = function(t2, e2) {
  return za(Ac, t2, { baseOptions: { modelAssetPath: e2 } });
}, Ac.createFromModelBuffer = function(t2, e2) {
  return za(Ac, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, Ac.createFromOptions = function(t2, e2) {
  return za(Ac, t2, e2);
}, Ac.HAND_CONNECTIONS = dc, Ac.POSE_CONNECTIONS = vc, Ac.FACE_LANDMARKS_LIPS = Qa, Ac.FACE_LANDMARKS_LEFT_EYE = tc, Ac.FACE_LANDMARKS_LEFT_EYEBROW = ec, Ac.FACE_LANDMARKS_LEFT_IRIS = nc, Ac.FACE_LANDMARKS_RIGHT_EYE = rc, Ac.FACE_LANDMARKS_RIGHT_EYEBROW = ic, Ac.FACE_LANDMARKS_RIGHT_IRIS = sc, Ac.FACE_LANDMARKS_FACE_OVAL = oc, Ac.FACE_LANDMARKS_CONTOURS = ac, Ac.FACE_LANDMARKS_TESSELATION = cc;
var bc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "input_image", "norm_rect", true), this.j = { classifications: [] }, dn(t2 = this.h = new uo(), 0, 1, e2 = new Is());
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return dn(this.h, 0, 2, ko(t2, hn(this.h, bs, 2))), this.l(t2);
  }
  qa(t2, e2) {
    return this.j = { classifications: [] }, Ya(this, t2, e2), this.j;
  }
  ra(t2, e2, n2) {
    return this.j = { classifications: [] }, $a(this, t2, n2, e2), this.j;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "input_image"), Ji(t2, "norm_rect"), Zi(t2, "classifications");
    const e2 = new Gi();
    Yn(e2, lo, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.image_classifier.ImageClassifierGraph"), Hi(n2, "IMAGE:input_image"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "CLASSIFICATIONS:classifications"), n2.o(e2), qi(t2, n2), this.g.attachProtoListener("classifications", ((t3, e3) => {
      this.j = (function(t4) {
        const e4 = { classifications: ln(t4, ys, 1).map(((t5) => So(hn(t5, rs, 4)?.g() ?? [], _n(t5, 2) ?? 0, vn(t5, 3) ?? ""))) };
        return null != he(Ve(t4, 2)) && (e4.timestampMs = he(Ve(t4, 2)) ?? 0), e4;
      })(_s(t3)), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("classifications", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
bc.prototype.classifyForVideo = bc.prototype.ra, bc.prototype.classify = bc.prototype.qa, bc.prototype.setOptions = bc.prototype.o, bc.createFromModelPath = function(t2, e2) {
  return za(bc, t2, { baseOptions: { modelAssetPath: e2 } });
}, bc.createFromModelBuffer = function(t2, e2) {
  return za(bc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, bc.createFromOptions = function(t2, e2) {
  return za(bc, t2, e2);
};
var kc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", true), this.h = new fo(), this.embeddings = { embeddings: [] }, dn(t2 = this.h, 0, 1, e2 = new Is());
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    var e2 = this.h, n2 = hn(this.h, Ss, 2);
    return n2 = n2 ? n2.clone() : new Ss(), void 0 !== t2.l2Normalize ? wn(n2, 1, t2.l2Normalize) : "l2Normalize" in t2 && He(n2, 1), void 0 !== t2.quantize ? wn(n2, 2, t2.quantize) : "quantize" in t2 && He(n2, 2), dn(e2, 0, 2, n2), this.l(t2);
  }
  xa(t2, e2) {
    return Ya(this, t2, e2), this.embeddings;
  }
  ya(t2, e2, n2) {
    return $a(this, t2, n2, e2), this.embeddings;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect"), Zi(t2, "embeddings_out");
    const e2 = new Gi();
    Yn(e2, po, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.image_embedder.ImageEmbedderGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "EMBEDDINGS:embeddings_out"), n2.o(e2), qi(t2, n2), this.g.attachProtoListener("embeddings_out", ((t3, e3) => {
      t3 = As(t3), this.embeddings = (function(t4) {
        return { embeddings: ln(t4, ws, 1).map(((t5) => {
          const e4 = { headIndex: _n(t5, 3) ?? 0 ?? -1, headName: vn(t5, 4) ?? "" ?? "" };
          if (void 0 !== cn(t5, vs, nn(t5, 1))) t5 = $e(t5 = hn(t5, vs, nn(t5, 1)), 1, qt, Ye()), e4.floatEmbedding = t5.slice();
          else {
            const n3 = new Uint8Array(0);
            e4.quantizedEmbedding = hn(t5, Es, nn(t5, 2))?.ma()?.h() ?? n3;
          }
          return e4;
        })), timestampMs: he(Ve(t4, 2)) ?? 0 };
      })(t3), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("embeddings_out", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
kc.cosineSimilarity = function(t2, e2) {
  if (t2.floatEmbedding && e2.floatEmbedding) t2 = Io(t2.floatEmbedding, e2.floatEmbedding);
  else {
    if (!t2.quantizedEmbedding || !e2.quantizedEmbedding) throw Error("Cannot compute cosine similarity between quantized and float embeddings.");
    t2 = Io(Fo(t2.quantizedEmbedding), Fo(e2.quantizedEmbedding));
  }
  return t2;
}, kc.prototype.embedForVideo = kc.prototype.ya, kc.prototype.embed = kc.prototype.xa, kc.prototype.setOptions = kc.prototype.o, kc.createFromModelPath = function(t2, e2) {
  return za(kc, t2, { baseOptions: { modelAssetPath: e2 } });
}, kc.createFromModelBuffer = function(t2, e2) {
  return za(kc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, kc.createFromOptions = function(t2, e2) {
  return za(kc, t2, e2);
};
var Sc = class {
  constructor(t2, e2, n2) {
    this.confidenceMasks = t2, this.categoryMask = e2, this.qualityScores = n2;
  }
  close() {
    this.confidenceMasks?.forEach(((t2) => {
      t2.close();
    })), this.categoryMask?.close();
  }
};
function xc(t2) {
  t2.categoryMask = void 0, t2.confidenceMasks = void 0, t2.qualityScores = void 0;
}
function Lc(t2) {
  try {
    const e2 = new Sc(t2.confidenceMasks, t2.categoryMask, t2.qualityScores);
    if (!t2.j) return e2;
    t2.j(e2);
  } finally {
    Jo(t2);
  }
}
Sc.prototype.close = Sc.prototype.close;
var Rc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", false), this.s = [], this.outputCategoryMask = false, this.outputConfidenceMasks = true, this.h = new vo(), this.v = new go(), dn(this.h, 0, 3, this.v), dn(t2 = this.h, 0, 1, e2 = new Is());
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return void 0 !== t2.displayNamesLocale ? He(this.h, 2, de(t2.displayNamesLocale)) : "displayNamesLocale" in t2 && He(this.h, 2), "outputCategoryMask" in t2 && (this.outputCategoryMask = t2.outputCategoryMask ?? false), "outputConfidenceMasks" in t2 && (this.outputConfidenceMasks = t2.outputConfidenceMasks ?? true), super.l(t2);
  }
  J() {
    !(function(t2) {
      const e2 = ln(t2.ca(), zi, 1).filter(((t3) => (vn(t3, 1) ?? "").includes("mediapipe.tasks.TensorsToSegmentationCalculator")));
      if (t2.s = [], e2.length > 1) throw Error("The graph has more than one mediapipe.tasks.TensorsToSegmentationCalculator.");
      1 === e2.length && (hn(e2[0], Gi, 7)?.l()?.g() ?? /* @__PURE__ */ new Map()).forEach(((e3, n2) => {
        t2.s[Number(n2)] = vn(e3, 1) ?? "";
      }));
    })(this);
  }
  segment(t2, e2, n2) {
    const r2 = "function" != typeof e2 ? e2 : {};
    return this.j = "function" == typeof e2 ? e2 : n2, xc(this), Ya(this, t2, r2), Lc(this);
  }
  Ia(t2, e2, n2, r2) {
    const i2 = "function" != typeof n2 ? n2 : {};
    return this.j = "function" == typeof n2 ? n2 : r2, xc(this), $a(this, t2, i2, e2), Lc(this);
  }
  Ba() {
    return this.s;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect");
    const e2 = new Gi();
    Yn(e2, Eo, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.image_segmenter.ImageSegmenterGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), n2.o(e2), qi(t2, n2), $o(this, t2), this.outputConfidenceMasks && (Zi(t2, "confidence_masks"), Wi(n2, "CONFIDENCE_MASKS:confidence_masks"), qo(this, "confidence_masks"), this.g.ba("confidence_masks", ((t3, e3) => {
      this.confidenceMasks = t3.map(((t4) => qa(this, t4, true, !this.j))), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("confidence_masks", ((t3) => {
      this.confidenceMasks = [], Yo(this, t3);
    }))), this.outputCategoryMask && (Zi(t2, "category_mask"), Wi(n2, "CATEGORY_MASK:category_mask"), qo(this, "category_mask"), this.g.V("category_mask", ((t3, e3) => {
      this.categoryMask = qa(this, t3, false, !this.j), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("category_mask", ((t3) => {
      this.categoryMask = void 0, Yo(this, t3);
    }))), Zi(t2, "quality_scores"), Wi(n2, "QUALITY_SCORES:quality_scores"), this.g.attachFloatVectorListener("quality_scores", ((t3, e3) => {
      this.qualityScores = t3, Yo(this, e3);
    })), this.g.attachEmptyPacketListener("quality_scores", ((t3) => {
      this.categoryMask = void 0, Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
Rc.prototype.getLabels = Rc.prototype.Ba, Rc.prototype.segmentForVideo = Rc.prototype.Ia, Rc.prototype.segment = Rc.prototype.segment, Rc.prototype.setOptions = Rc.prototype.o, Rc.createFromModelPath = function(t2, e2) {
  return za(Rc, t2, { baseOptions: { modelAssetPath: e2 } });
}, Rc.createFromModelBuffer = function(t2, e2) {
  return za(Rc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, Rc.createFromOptions = function(t2, e2) {
  return za(Rc, t2, e2);
};
var Fc = class {
  constructor(t2, e2, n2) {
    this.confidenceMasks = t2, this.categoryMask = e2, this.qualityScores = n2;
  }
  close() {
    this.confidenceMasks?.forEach(((t2) => {
      t2.close();
    })), this.categoryMask?.close();
  }
};
Fc.prototype.close = Fc.prototype.close;
var Ic = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Mc = [0, hi, -2], Pc = [0, ni, -3, di, ni, -1], Cc = [0, Pc], Oc = [0, Pc, hi, -1], Uc = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Dc = [0, ni, -1, di], Nc = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Bc = class extends $n {
  constructor(t2) {
    super(t2);
  }
}, Gc = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15], jc = class extends $n {
  constructor(t2) {
    super(t2);
  }
};
jc.prototype.g = Si([0, yi, [0, Gc, _i, Pc, _i, [0, Pc, Mc], _i, Cc, _i, [0, Cc, Mc], _i, Dc, _i, [0, ni, -3, di, Ti], _i, [0, ni, -3, di], _i, [0, mi, ni, -2, di, hi, di, -1, 2, ni, Mc], _i, Oc, _i, [0, Oc, Mc], ni, Mc, mi, _i, [0, ni, -3, di, Mc, -1], _i, [0, yi, Dc]], mi, [0, mi, hi, -1, di]]);
var Vc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect_in", false), this.outputCategoryMask = false, this.outputConfidenceMasks = true, this.h = new vo(), this.s = new go(), dn(this.h, 0, 3, this.s), dn(t2 = this.h, 0, 1, e2 = new Is());
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return "outputCategoryMask" in t2 && (this.outputCategoryMask = t2.outputCategoryMask ?? false), "outputConfidenceMasks" in t2 && (this.outputConfidenceMasks = t2.outputConfidenceMasks ?? true), super.l(t2);
  }
  segment(t2, e2, n2, r2) {
    const i2 = "function" != typeof n2 ? n2 : {};
    this.j = "function" == typeof n2 ? n2 : r2, this.qualityScores = this.categoryMask = this.confidenceMasks = void 0, n2 = this.B + 1, r2 = new jc();
    const s2 = new Bc();
    var o2 = new Ic();
    if (Tn(o2, 1, 255), dn(s2, 0, 12, o2), e2.keypoint && e2.scribble) throw Error("Cannot provide both keypoint and scribble.");
    if (e2.keypoint) {
      var a2 = new Uc();
      wn(a2, 3, true), An(a2, 1, e2.keypoint.x), An(a2, 2, e2.keypoint.y), fn(s2, 5, Gc, a2);
    } else {
      if (!e2.scribble) throw Error("Must provide either a keypoint or a scribble.");
      for (a2 of (o2 = new Nc(), e2.scribble)) wn(e2 = new Uc(), 3, true), An(e2, 1, a2.x), An(e2, 2, a2.y), yn(o2, 1, Uc, e2);
      fn(s2, 15, Gc, o2);
    }
    yn(r2, 1, Bc, s2), this.g.addProtoToStream(r2.g(), "drishti.RenderData", "roi_in", n2), Ya(this, t2, i2);
    t: {
      try {
        const t3 = new Fc(this.confidenceMasks, this.categoryMask, this.qualityScores);
        if (!this.j) {
          var c2 = t3;
          break t;
        }
        this.j(t3);
      } finally {
        Jo(this);
      }
      c2 = void 0;
    }
    return c2;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "roi_in"), Ji(t2, "norm_rect_in");
    const e2 = new Gi();
    Yn(e2, Eo, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.interactive_segmenter.InteractiveSegmenterGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "ROI:roi_in"), Hi(n2, "NORM_RECT:norm_rect_in"), n2.o(e2), qi(t2, n2), $o(this, t2), this.outputConfidenceMasks && (Zi(t2, "confidence_masks"), Wi(n2, "CONFIDENCE_MASKS:confidence_masks"), qo(this, "confidence_masks"), this.g.ba("confidence_masks", ((t3, e3) => {
      this.confidenceMasks = t3.map(((t4) => qa(this, t4, true, !this.j))), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("confidence_masks", ((t3) => {
      this.confidenceMasks = [], Yo(this, t3);
    }))), this.outputCategoryMask && (Zi(t2, "category_mask"), Wi(n2, "CATEGORY_MASK:category_mask"), qo(this, "category_mask"), this.g.V("category_mask", ((t3, e3) => {
      this.categoryMask = qa(this, t3, false, !this.j), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("category_mask", ((t3) => {
      this.categoryMask = void 0, Yo(this, t3);
    }))), Zi(t2, "quality_scores"), Wi(n2, "QUALITY_SCORES:quality_scores"), this.g.attachFloatVectorListener("quality_scores", ((t3, e3) => {
      this.qualityScores = t3, Yo(this, e3);
    })), this.g.attachEmptyPacketListener("quality_scores", ((t3) => {
      this.categoryMask = void 0, Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
Vc.prototype.segment = Vc.prototype.segment, Vc.prototype.setOptions = Vc.prototype.o, Vc.createFromModelPath = function(t2, e2) {
  return za(Vc, t2, { baseOptions: { modelAssetPath: e2 } });
}, Vc.createFromModelBuffer = function(t2, e2) {
  return za(Vc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, Vc.createFromOptions = function(t2, e2) {
  return za(Vc, t2, e2);
};
var Xc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "input_frame_gpu", "norm_rect", false), this.j = { detections: [] }, dn(t2 = this.h = new wo(), 0, 1, e2 = new Is());
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return void 0 !== t2.displayNamesLocale ? He(this.h, 2, de(t2.displayNamesLocale)) : "displayNamesLocale" in t2 && He(this.h, 2), void 0 !== t2.maxResults ? Tn(this.h, 3, t2.maxResults) : "maxResults" in t2 && He(this.h, 3), void 0 !== t2.scoreThreshold ? An(this.h, 4, t2.scoreThreshold) : "scoreThreshold" in t2 && He(this.h, 4), void 0 !== t2.categoryAllowlist ? bn(this.h, 5, t2.categoryAllowlist) : "categoryAllowlist" in t2 && He(this.h, 5), void 0 !== t2.categoryDenylist ? bn(this.h, 6, t2.categoryDenylist) : "categoryDenylist" in t2 && He(this.h, 6), this.l(t2);
  }
  D(t2, e2) {
    return this.j = { detections: [] }, Ya(this, t2, e2), this.j;
  }
  F(t2, e2, n2) {
    return this.j = { detections: [] }, $a(this, t2, n2, e2), this.j;
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "input_frame_gpu"), Ji(t2, "norm_rect"), Zi(t2, "detections");
    const e2 = new Gi();
    Yn(e2, To, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.ObjectDetectorGraph"), Hi(n2, "IMAGE:input_frame_gpu"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "DETECTIONS:detections"), n2.o(e2), qi(t2, n2), this.g.attachProtoVectorListener("detections", ((t3, e3) => {
      for (const e4 of t3) t3 = hs(e4), this.j.detections.push(xo(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("detections", ((t3) => {
      Yo(this, t3);
    })), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
Xc.prototype.detectForVideo = Xc.prototype.F, Xc.prototype.detect = Xc.prototype.D, Xc.prototype.setOptions = Xc.prototype.o, Xc.createFromModelPath = async function(t2, e2) {
  return za(Xc, t2, { baseOptions: { modelAssetPath: e2 } });
}, Xc.createFromModelBuffer = function(t2, e2) {
  return za(Xc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, Xc.createFromOptions = function(t2, e2) {
  return za(Xc, t2, e2);
};
var Hc = class {
  constructor(t2, e2, n2) {
    this.landmarks = t2, this.worldLandmarks = e2, this.segmentationMasks = n2;
  }
  close() {
    this.segmentationMasks?.forEach(((t2) => {
      t2.close();
    }));
  }
};
function Wc(t2) {
  t2.landmarks = [], t2.worldLandmarks = [], t2.segmentationMasks = void 0;
}
function zc(t2) {
  try {
    const e2 = new Hc(t2.landmarks, t2.worldLandmarks, t2.segmentationMasks);
    if (!t2.s) return e2;
    t2.s(e2);
  } finally {
    Jo(t2);
  }
}
Hc.prototype.close = Hc.prototype.close;
var Kc = class extends Ja {
  constructor(t2, e2) {
    super(new Wa(t2, e2), "image_in", "norm_rect", false), this.landmarks = [], this.worldLandmarks = [], this.outputSegmentationMasks = false, dn(t2 = this.h = new Ao(), 0, 1, e2 = new Is()), this.v = new oo(), dn(this.h, 0, 3, this.v), this.j = new so(), dn(this.h, 0, 2, this.j), Tn(this.j, 4, 1), An(this.j, 2, 0.5), An(this.v, 2, 0.5), An(this.h, 4, 0.5);
  }
  get baseOptions() {
    return hn(this.h, Is, 1);
  }
  set baseOptions(t2) {
    dn(this.h, 0, 1, t2);
  }
  o(t2) {
    return "numPoses" in t2 && Tn(this.j, 4, t2.numPoses ?? 1), "minPoseDetectionConfidence" in t2 && An(this.j, 2, t2.minPoseDetectionConfidence ?? 0.5), "minTrackingConfidence" in t2 && An(this.h, 4, t2.minTrackingConfidence ?? 0.5), "minPosePresenceConfidence" in t2 && An(this.v, 2, t2.minPosePresenceConfidence ?? 0.5), "outputSegmentationMasks" in t2 && (this.outputSegmentationMasks = t2.outputSegmentationMasks ?? false), this.l(t2);
  }
  D(t2, e2, n2) {
    const r2 = "function" != typeof e2 ? e2 : {};
    return this.s = "function" == typeof e2 ? e2 : n2, Wc(this), Ya(this, t2, r2), zc(this);
  }
  F(t2, e2, n2, r2) {
    const i2 = "function" != typeof n2 ? n2 : {};
    return this.s = "function" == typeof n2 ? n2 : r2, Wc(this), $a(this, t2, i2, e2), zc(this);
  }
  m() {
    var t2 = new Qi();
    Ji(t2, "image_in"), Ji(t2, "norm_rect"), Zi(t2, "normalized_landmarks"), Zi(t2, "world_landmarks"), Zi(t2, "segmentation_masks");
    const e2 = new Gi();
    Yn(e2, bo, this.h);
    const n2 = new zi();
    Xi(n2, "mediapipe.tasks.vision.pose_landmarker.PoseLandmarkerGraph"), Hi(n2, "IMAGE:image_in"), Hi(n2, "NORM_RECT:norm_rect"), Wi(n2, "NORM_LANDMARKS:normalized_landmarks"), Wi(n2, "WORLD_LANDMARKS:world_landmarks"), n2.o(e2), qi(t2, n2), $o(this, t2), this.g.attachProtoVectorListener("normalized_landmarks", ((t3, e3) => {
      this.landmarks = [];
      for (const e4 of t3) t3 = fs(e4), this.landmarks.push(Lo(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("normalized_landmarks", ((t3) => {
      this.landmarks = [], Yo(this, t3);
    })), this.g.attachProtoVectorListener("world_landmarks", ((t3, e3) => {
      this.worldLandmarks = [];
      for (const e4 of t3) t3 = ls(e4), this.worldLandmarks.push(Ro(t3));
      Yo(this, e3);
    })), this.g.attachEmptyPacketListener("world_landmarks", ((t3) => {
      this.worldLandmarks = [], Yo(this, t3);
    })), this.outputSegmentationMasks && (Wi(n2, "SEGMENTATION_MASK:segmentation_masks"), qo(this, "segmentation_masks"), this.g.ba("segmentation_masks", ((t3, e3) => {
      this.segmentationMasks = t3.map(((t4) => qa(this, t4, true, !this.s))), Yo(this, e3);
    })), this.g.attachEmptyPacketListener("segmentation_masks", ((t3) => {
      this.segmentationMasks = [], Yo(this, t3);
    }))), t2 = t2.g(), this.setGraph(new Uint8Array(t2), true);
  }
};
Kc.prototype.detectForVideo = Kc.prototype.F, Kc.prototype.detect = Kc.prototype.D, Kc.prototype.setOptions = Kc.prototype.o, Kc.createFromModelPath = function(t2, e2) {
  return za(Kc, t2, { baseOptions: { modelAssetPath: e2 } });
}, Kc.createFromModelBuffer = function(t2, e2) {
  return za(Kc, t2, { baseOptions: { modelAssetBuffer: e2 } });
}, Kc.createFromOptions = function(t2, e2) {
  return za(Kc, t2, e2);
}, Kc.POSE_CONNECTIONS = vc;
class LandmarkCompressor {
  previousLandmarks = null;
  previousDeltas = null;
  /**
   * ランドマークデータをdelta-delta圧縮してバイナリ化
   */
  compress(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }
    if (!this.previousLandmarks) {
      this.previousLandmarks = [...landmarks];
      return this.encodeFullLandmarks(landmarks);
    }
    const deltas = this.calculateDeltas(landmarks, this.previousLandmarks);
    let deltaDelta;
    if (!this.previousDeltas) {
      deltaDelta = deltas;
    } else {
      deltaDelta = deltas.map((delta, i2) => delta - (this.previousDeltas[i2] || 0));
    }
    this.previousLandmarks = [...landmarks];
    this.previousDeltas = deltas;
    return this.encodeDeltaDelta(deltaDelta);
  }
  /**
   * ランドマーク間のDelta（差分）を計算
   */
  calculateDeltas(current, previous) {
    const deltas = [];
    for (let i2 = 0; i2 < Math.min(current.length, previous.length); i2++) {
      deltas.push(
        current[i2].x - previous[i2].x,
        // X差分
        current[i2].y - previous[i2].y,
        // Y差分
        (current[i2].z || 0) - (previous[i2].z || 0)
        // Z差分
      );
    }
    return deltas;
  }
  /**
   * 初回送信用：全ランドマークをバイナリエンコード
   */
  encodeFullLandmarks(landmarks) {
    const buffer = new ArrayBuffer(1 + landmarks.length * 12);
    const view = new DataView(buffer);
    view.setUint8(0, 0);
    let offset = 1;
    for (const landmark of landmarks) {
      view.setFloat32(offset, landmark.x, true);
      view.setFloat32(offset + 4, landmark.y, true);
      view.setFloat32(offset + 8, landmark.z || 0, true);
      offset += 12;
    }
    return new Uint8Array(buffer);
  }
  /**
   * Delta-Deltaデータをバイナリエンコード
   */
  encodeDeltaDelta(deltaDelta) {
    const quantizedData = this.quantizeDeltaDelta(deltaDelta);
    const buffer = new ArrayBuffer(1 + 2 + quantizedData.length * 2);
    const view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setUint16(1, quantizedData.length, true);
    let offset = 3;
    for (const value of quantizedData) {
      view.setInt16(offset, value, true);
      offset += 2;
    }
    return new Uint8Array(buffer);
  }
  /**
   * Delta-Deltaデータを量子化（精度を落として圧縮）
   */
  quantizeDeltaDelta(deltaDelta) {
    const scale = 1e4;
    return deltaDelta.map((value) => Math.round(value * scale));
  }
  /**
   * 圧縮状態をリセット（新しいセッション開始時）
   */
  reset() {
    this.previousLandmarks = null;
    this.previousDeltas = null;
  }
  /**
   * 圧縮効果の統計情報
   */
  getCompressionStats() {
    if (!this.previousLandmarks) {
      return { isInitialized: false, compressionRatio: 0 };
    }
    const fullSize = this.previousLandmarks.length * 12;
    const compressedSize = this.previousDeltas ? this.previousDeltas.length * 2 : fullSize;
    return {
      isInitialized: true,
      compressionRatio: compressedSize / fullSize
    };
  }
}
function normalizeRotationMatrix(matrix) {
  const normalized = [[], [], []];
  for (let col = 0; col < 3; col++) {
    const vector = [matrix[0][col], matrix[1][col], matrix[2][col]];
    const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
    if (length > 1e-5) {
      normalized[0][col] = vector[0] / length;
      normalized[1][col] = vector[1] / length;
      normalized[2][col] = vector[2] / length;
    } else {
      normalized[0][col] = col === 0 ? 1 : 0;
      normalized[1][col] = col === 1 ? 1 : 0;
      normalized[2][col] = col === 2 ? 1 : 0;
    }
  }
  return normalized;
}
function extractRotationMatrix(transformMatrix) {
  if (transformMatrix instanceof Float32Array || Array.isArray(transformMatrix) && transformMatrix.length === 16) {
    if (transformMatrix.length !== 16) {
      throw new Error(`Expected 16 elements for 4x4 matrix, got ${transformMatrix.length}`);
    }
    const matrix4x4 = [];
    const flatMatrix = transformMatrix;
    for (let i2 = 0; i2 < 4; i2++) {
      matrix4x4[i2] = [];
      for (let j2 = 0; j2 < 4; j2++) {
        matrix4x4[i2][j2] = flatMatrix[i2 * 4 + j2];
      }
    }
    const rotation = [
      [matrix4x4[0][0], matrix4x4[0][1], matrix4x4[0][2]],
      [matrix4x4[1][0], matrix4x4[1][1], matrix4x4[1][2]],
      [matrix4x4[2][0], matrix4x4[2][1], matrix4x4[2][2]]
    ];
    return normalizeRotationMatrix(rotation);
  }
  if (Array.isArray(transformMatrix) && Array.isArray(transformMatrix[0])) {
    const matrix2D = transformMatrix;
    const rotation = [
      [matrix2D[0][0], matrix2D[0][1], matrix2D[0][2]],
      [matrix2D[1][0], matrix2D[1][1], matrix2D[1][2]],
      [matrix2D[2][0], matrix2D[2][1], matrix2D[2][2]]
    ];
    return normalizeRotationMatrix(rotation);
  }
  throw new Error(`Unsupported matrix format: ${typeof transformMatrix}, length: ${Array.isArray(transformMatrix) ? transformMatrix.length : "N/A"}`);
}
function matrixToEulerAnglesMediaPipe(rotationMatrix) {
  const R2 = rotationMatrix;
  const sinPitch = Math.max(-1, Math.min(1, -R2[1][2]));
  const pitch = Math.asin(sinPitch) * (180 / Math.PI);
  let yaw;
  let roll;
  if (Math.abs(R2[1][2]) < 0.99999) {
    yaw = Math.atan2(R2[0][2], R2[2][2]) * (180 / Math.PI);
    roll = Math.atan2(R2[1][0], R2[1][1]) * (180 / Math.PI);
  } else {
    yaw = Math.atan2(-R2[0][1], R2[0][0]) * (180 / Math.PI);
    roll = 0;
  }
  return { yaw, pitch, roll };
}
function invertMatrix3x3(matrix) {
  const det = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
  if (Math.abs(det) < 1e-10) {
    throw new Error("Matrix is not invertible");
  }
  const invDet = 1 / det;
  return [
    [
      (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * invDet,
      (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invDet,
      (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invDet
    ],
    [
      (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invDet,
      (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invDet,
      (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * invDet
    ],
    [
      (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * invDet,
      (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * invDet,
      (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * invDet
    ]
  ];
}
function applyRotationToPoints(points, rotationMatrix) {
  return points.map((point) => {
    const x2 = rotationMatrix[0][0] * point.x + rotationMatrix[0][1] * point.y + rotationMatrix[0][2] * point.z;
    const y2 = rotationMatrix[1][0] * point.x + rotationMatrix[1][1] * point.y + rotationMatrix[1][2] * point.z;
    const z2 = rotationMatrix[2][0] * point.x + rotationMatrix[2][1] * point.y + rotationMatrix[2][2] * point.z;
    return { x: x2, y: y2, z: z2 };
  });
}
class FaceNormalizer {
  params;
  lastPoseLogTime = 0;
  constructor(params) {
    this.params = {
      targetSize: 500,
      preserveAspectRatio: true,
      centerToOrigin: true,
      rotateToFront: true,
      ...params
    };
  }
  /**
   * 3Dバウンディングボックスを計算
   */
  calculateBoundingBox(landmarks) {
    if (landmarks.length === 0) {
      throw new Error("No landmarks provided");
    }
    const xs2 = landmarks.map((p2) => p2.x);
    const ys2 = landmarks.map((p2) => p2.y);
    const zs2 = landmarks.map((p2) => p2.z);
    const min = {
      x: Math.min(...xs2),
      y: Math.min(...ys2),
      z: Math.min(...zs2)
    };
    const max = {
      x: Math.max(...xs2),
      y: Math.max(...ys2),
      z: Math.max(...zs2)
    };
    const width = max.x - min.x;
    const height = max.y - min.y;
    const depth = max.z - min.z;
    const center = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2
    };
    return { min, max, width, height, depth, center };
  }
  /**
   * 座標を原点中心に移動
   */
  centerToOrigin(landmarks) {
    const bbox = this.calculateBoundingBox(landmarks);
    const translation = bbox.center;
    const centeredPoints = landmarks.map((point) => ({
      x: point.x - translation.x,
      y: point.y - translation.y,
      z: point.z - translation.z
    }));
    return { points: centeredPoints, translation };
  }
  /**
   * 顔正中線の長さを計算（ランドマークベース）
   */
  calculateFaceMidlineLength(landmarks) {
    const topIndices = [109, 10, 338];
    const bottomIndices = [148, 152, 377];
    const topCenter = this.calculateCenterPoint(landmarks, topIndices);
    const bottomCenter = this.calculateCenterPoint(landmarks, bottomIndices);
    const dx = topCenter.x - bottomCenter.x;
    const dy = topCenter.y - bottomCenter.y;
    const dz = topCenter.z - bottomCenter.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  /**
   * 指定されたインデックスのランドマークの中心座標を計算
   */
  calculateCenterPoint(landmarks, indices) {
    const validPoints = indices.filter((i2) => i2 < landmarks.length).map((i2) => landmarks[i2]);
    if (validPoints.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    const sum = validPoints.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
        z: acc.z + point.z
      }),
      { x: 0, y: 0, z: 0 }
    );
    return {
      x: sum.x / validPoints.length,
      y: sum.y / validPoints.length,
      z: sum.z / validPoints.length
    };
  }
  /**
   * スケールを正規化（ランドマークベース：顔正中線を500pxに）
   */
  normalizeScale(landmarks, bbox) {
    const targetSize = this.params.targetSize;
    let scale;
    if (this.params.preserveAspectRatio) {
      const midlineLength = this.calculateFaceMidlineLength(landmarks);
      scale = midlineLength > 0 ? targetSize / midlineLength : 1;
    } else {
      const maxDimension = Math.max(bbox.width, bbox.height, bbox.depth);
      scale = maxDimension > 0 ? targetSize / maxDimension : 1;
    }
    const scaledPoints = landmarks.map((point) => ({
      x: point.x * scale,
      y: point.y * scale,
      z: point.z * scale
    }));
    return {
      points: scaledPoints,
      scaleFactor: { x: scale, y: scale, z: scale }
    };
  }
  /**
   * 正面向きに回転補正
   */
  rotateToFront(landmarks, transformMatrix) {
    if (!transformMatrix || !this.params.rotateToFront) {
      console.log("⚠️ No transformation matrix available, using landmark-based pose estimation");
      const estimatedPose = this.estimatePoseFromLandmarks(landmarks);
      return {
        points: landmarks,
        // 変換行列がないので回転補正はスキップ
        rotation: estimatedPose
      };
    }
    try {
      const matrixData = transformMatrix.data || transformMatrix;
      const rotationMatrix = extractRotationMatrix(matrixData);
      const headPose = matrixToEulerAnglesMediaPipe(rotationMatrix);
      const coordinateAdjustedMatrix = [
        [rotationMatrix[0][0], -rotationMatrix[0][1], rotationMatrix[0][2]],
        [-rotationMatrix[1][0], rotationMatrix[1][1], -rotationMatrix[1][2]],
        [rotationMatrix[2][0], -rotationMatrix[2][1], rotationMatrix[2][2]]
      ];
      const inverseRotation = invertMatrix3x3(coordinateAdjustedMatrix);
      const rotatedPoints = applyRotationToPoints(landmarks, inverseRotation);
      return {
        points: rotatedPoints,
        rotation: headPose
      };
    } catch (error) {
      console.warn("Failed to apply rotation correction:", error);
      return {
        points: landmarks,
        rotation: { yaw: 0, pitch: 0, roll: 0 }
      };
    }
  }
  /**
   * メイン正規化メソッド
   */
  normalize(landmarks, transformMatrix) {
    if (landmarks.length === 0) {
      throw new Error("No landmarks provided for normalization");
    }
    const original = [...landmarks];
    let processedPoints = [...landmarks];
    let rotation = { yaw: 0, pitch: 0, roll: 0 };
    if (this.params.rotateToFront && transformMatrix) {
      const rotated = this.rotateToFront(processedPoints, transformMatrix);
      processedPoints = rotated.points;
      rotation = rotated.rotation;
    }
    let translation = { x: 0, y: 0, z: 0 };
    if (this.params.centerToOrigin) {
      const centered = this.centerToOrigin(processedPoints);
      processedPoints = centered.points;
      translation = centered.translation;
    }
    const boundingBox = this.calculateBoundingBox(processedPoints);
    const scaled = this.normalizeScale(processedPoints, boundingBox);
    processedPoints = scaled.points;
    const scaleFactor = scaled.scaleFactor;
    return {
      original,
      normalized: processedPoints,
      boundingBox: this.calculateBoundingBox(processedPoints),
      scaleFactor,
      rotation,
      translation
    };
  }
  /**
   * 正規化パラメータを更新
   */
  updateParams(params) {
    this.params = { ...this.params, ...params };
  }
  /**
   * ランドマークから簡易的な頭部姿勢を推定
   */
  estimatePoseFromLandmarks(landmarks) {
    if (landmarks.length < 468) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }
    try {
      const noseTip = landmarks[1];
      const leftEyeCorner = landmarks[33];
      const rightEyeCorner = landmarks[263];
      const leftMouth = landmarks[61];
      const rightMouth = landmarks[291];
      const eyeCenterX = (leftEyeCorner.x + rightEyeCorner.x) / 2;
      const yaw = Math.atan2(noseTip.x - eyeCenterX, 100) * (180 / Math.PI);
      const mouthCenterY = (leftMouth.y + rightMouth.y) / 2;
      const pitch = Math.atan2(noseTip.y - mouthCenterY, 50) * (180 / Math.PI);
      const roll = Math.atan2(rightEyeCorner.y - leftEyeCorner.y, rightEyeCorner.x - leftEyeCorner.x) * (180 / Math.PI);
      const now = Date.now();
      if (!this.lastPoseLogTime || now - this.lastPoseLogTime > 5e3) {
        console.log("📐 Landmark-based pose estimation:", { yaw, pitch, roll });
        this.lastPoseLogTime = now;
      }
      return { yaw, pitch, roll };
    } catch (error) {
      console.warn("Failed to estimate pose from landmarks:", error);
      return { yaw: 0, pitch: 0, roll: 0 };
    }
  }
  /**
   * 現在のパラメータを取得
   */
  getParams() {
    return { ...this.params };
  }
}
const useMediaPipe = (_options = {}) => {
  const [state, setState] = reactExports.useState({
    isInitialized: false,
    isProcessing: false,
    error: null,
    landmarks: null,
    normalizedLandmarks: null,
    normalizationData: null,
    compressionStats: {
      isInitialized: false,
      compressionRatio: 0
    }
  });
  const faceLandmarkerRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const compressorRef = reactExports.useRef(new LandmarkCompressor());
  const faceNormalizerRef = reactExports.useRef(new FaceNormalizer());
  const sendTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        setState((prev) => ({ ...prev, error: null }));
        const vision = await Uo.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const faceLandmarker = await uc.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.45,
          // 精度を下げて高速化
          minTrackingConfidence: 0.45,
          // トラッキング精度も調整
          outputFaceBlendshapes: false,
          // 不要な出力を無効化（感情検出はバックエンドで行う）
          outputFacialTransformationMatrixes: true
          // MediaPipe公式仕様に従った設定
        });
        faceLandmarkerRef.current = faceLandmarker;
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          error: null
        }));
        console.log("MediaPipe FaceLandmarker initialized successfully");
      } catch (error) {
        console.error("Failed to initialize MediaPipe:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "MediaPipe初期化エラー",
          isInitialized: false
        }));
      }
    };
    initializeMediaPipe();
    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);
  const processVideoFrame = (video) => {
    if (!faceLandmarkerRef.current || !state.isInitialized || !video || video.videoWidth === 0) {
      return;
    }
    try {
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
      let landmarks = null;
      let normalizedLandmarks = null;
      let normalizationData = null;
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const rawLandmarks = results.faceLandmarks[0].map((landmark) => ({
          x: landmark.x * video.videoWidth,
          y: landmark.y * video.videoHeight,
          z: landmark.z * video.videoWidth
        }));
        let transformMatrix = null;
        if (!window.mediaPipePropsLogged) {
          console.log("🔍 Available MediaPipe result properties:", Object.keys(results));
          window.mediaPipePropsLogged = true;
        }
        const possibleMatrixProps = [
          "facialTransformationMatrixes"
          // MediaPipe公式の正しいプロパティ名
        ];
        for (const prop of possibleMatrixProps) {
          if (results[prop] && results[prop].length > 0) {
            transformMatrix = results[prop][0];
            break;
          }
        }
        try {
          normalizationData = faceNormalizerRef.current.normalize(rawLandmarks, transformMatrix);
          normalizedLandmarks = normalizationData.normalized;
          landmarks = rawLandmarks.map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z
          }));
        } catch (error) {
          console.error("❌ Normalization failed:", error);
          landmarks = rawLandmarks.map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z
          }));
        }
        setState((prev) => ({
          ...prev,
          landmarks,
          normalizedLandmarks,
          normalizationData,
          compressionStats: compressorRef.current.getCompressionStats()
        }));
      } else {
        setState((prev) => ({
          ...prev,
          landmarks: null,
          normalizedLandmarks: null,
          normalizationData: null,
          compressionStats: compressorRef.current.getCompressionStats()
        }));
      }
    } catch (error) {
      console.error("Error processing video frame:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "映像処理エラー"
      }));
    }
  };
  const resetCompression = reactExports.useCallback(() => {
    compressorRef.current.reset();
    setState((prev) => ({
      ...prev,
      compressionStats: {
        isInitialized: false,
        compressionRatio: 0
      }
    }));
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current);
      }
    };
  }, []);
  return {
    ...state,
    processVideoFrame,
    resetCompression,
    canvasRef
  };
};
const IntensityChart = ({
  emotionData,
  userId,
  width = 400,
  height = 200
}) => {
  const canvasRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    for (let i2 = 0; i2 <= 4; i2++) {
      const y2 = (height - 40) * (1 - i2 / 4) + 20;
      ctx.beginPath();
      ctx.moveTo(40, y2);
      ctx.lineTo(width - 20, y2);
      ctx.stroke();
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText((i2 * 20).toString(), 35, y2 + 5);
    }
    if (emotionData.length === 0) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("感情データを待機中...", width / 2, height / 2);
      return;
    }
    const filteredData = emotionData.slice(-300);
    if (filteredData.length < 2) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("データ蓄積中...", width / 2, height / 2);
      return;
    }
    console.log("length of filtered data: ", filteredData.length);
    console.log("length of emotion data : ", emotionData);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    filteredData.forEach((data, index) => {
      const x2 = 40 + index / (filteredData.length - 1) * (width - 60);
      const y2 = 20 + (1 - Math.min(data.intensity, 100) / 100) * (height - 40);
      if (index === 0) {
        ctx.moveTo(x2, y2);
      } else {
        ctx.lineTo(x2, y2);
      }
    });
    ctx.strokeStyle = "#3b82f6";
    ctx.stroke();
    filteredData.forEach((data, index) => {
      const x2 = 40 + index / (filteredData.length - 1) * (width - 60);
      const y2 = 20 + (1 - Math.min(data.intensity, 100) / 100) * (height - 40);
      ctx.fillStyle = getIntensityColor(data.intensity);
      ctx.beginPath();
      ctx.arc(x2, y2, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
    const latestData = filteredData[filteredData.length - 1];
    if (latestData) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        `${userId}: ${Math.round(latestData.intensity)}/100`,
        50,
        30
      );
      ctx.fillStyle = getLaughLevelColor(latestData.laughLevel);
      ctx.font = "12px sans-serif";
      ctx.fillText(
        latestData.laughLevel.toUpperCase(),
        50,
        50
      );
    }
  }, [emotionData, userId, width, height]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-medium text-white mb-2", children: [
      userId,
      " の感情強度 (リアルタイム)"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "canvas",
      {
        ref: canvasRef,
        width,
        height,
        className: "border border-gray-600 rounded"
      }
    ),
    emotionData.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-xs text-gray-400", children: [
      "データ数: ",
      emotionData.length,
      "件 | 最新: ",
      new Date(emotionData[emotionData.length - 1]?.timestamp).toLocaleTimeString()
    ] })
  ] });
};
function getIntensityColor(intensity) {
  if (intensity > 70) return "#10b981";
  if (intensity > 40) return "#f59e0b";
  return "#6b7280";
}
function getLaughLevelColor(laughLevel) {
  switch (laughLevel) {
    case "high":
      return "#10b981";
    // green-500
    case "medium":
      return "#f59e0b";
    // yellow-500
    case "low":
      return "#6b7280";
    // gray-500
    default:
      return "#6b7280";
  }
}
const LandmarkPoints = ({ landmarks }) => {
  const pointsRef = reactExports.useRef(null);
  const geometryRef = reactExports.useRef(null);
  React.useEffect(() => {
    if (geometryRef.current && landmarks.normalized) {
      const positions2 = new Float32Array(
        landmarks.normalized.flatMap((p2) => [p2.x, p2.y, p2.z])
      );
      const positionAttribute = geometryRef.current.getAttribute("position");
      if (positionAttribute) {
        positionAttribute.set(positions2);
        positionAttribute.needsUpdate = true;
      }
      geometryRef.current.computeBoundingSphere();
    }
  }, [landmarks]);
  const positions = React.useMemo(() => {
    return new Float32Array(
      landmarks.normalized.flatMap((p2) => [p2.x, p2.y, p2.z])
    );
  }, [landmarks.normalized]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("points", { ref: pointsRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("bufferGeometry", { ref: geometryRef, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "bufferAttribute",
      {
        attach: "attributes-position",
        args: [positions, 3],
        count: landmarks.normalized.length,
        usage: DynamicDrawUsage
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("pointsMaterial", { size: 5, color: "#00ff88", sizeAttenuation: false })
  ] });
};
const BoundingBox = ({ landmarks }) => {
  const { min, max } = landmarks.boundingBox;
  const width = max.x - min.x;
  const height = max.y - min.y;
  const depth = max.z - min.z;
  const centerX = (min.x + max.x) / 2;
  const centerY = (min.y + max.y) / 2;
  const centerZ = (min.z + max.z) / 2;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("lineSegments", { position: [centerX, centerY, centerZ], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("edgesGeometry", { args: [new BoxGeometry(width, height, depth)] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("lineBasicMaterial", { color: "#ffff00" })
  ] });
};
const Axes = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("line", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("bufferGeometry", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "bufferAttribute",
        {
          attach: "attributes-position",
          args: [new Float32Array([-300, 0, 0, 300, 0, 0]), 3],
          count: 2
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("lineBasicMaterial", { color: "#ff0000" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("line", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("bufferGeometry", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "bufferAttribute",
        {
          attach: "attributes-position",
          args: [new Float32Array([0, -300, 0, 0, 300, 0]), 3],
          count: 2
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("lineBasicMaterial", { color: "#00ff00" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("line", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("bufferGeometry", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "bufferAttribute",
        {
          attach: "attributes-position",
          args: [new Float32Array([0, 0, -300, 0, 0, 300]), 3],
          count: 2
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("lineBasicMaterial", { color: "#0000ff" })
    ] })
  ] });
};
const NormalizedLandmarksViewer = ({
  normalizedData,
  width = 600,
  height = 600
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-900 rounded-lg p-4", style: { width, height }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-white mb-2", children: "正規化後ランドマーク（3D）" }),
    normalizedData && normalizedData.normalized && normalizedData.normalized.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-gray-700 rounded", style: { width: "100%", height: height - 60 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Canvas, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PerspectiveCamera, { makeDefault: true, position: [0, 0, 800] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ambientLight", { intensity: 0.5 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pointLight", { position: [10, 10, 10] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Axes, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Grid,
        {
          args: [1e3, 1e3],
          cellSize: 50,
          cellThickness: 0.5,
          cellColor: "#444444",
          sectionSize: 100,
          sectionThickness: 1,
          sectionColor: "#666666",
          fadeDistance: 2e3,
          fadeStrength: 1,
          position: [0, -250, 0],
          rotation: [Math.PI / 2, 0, 0]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(LandmarkPoints, { landmarks: normalizedData }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(BoundingBox, { landmarks: normalizedData }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        OrbitControls,
        {
          enableDamping: true,
          dampingFactor: 0.05,
          rotateSpeed: 0.5,
          target: [0, 0, 0]
        }
      )
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "flex items-center justify-center border border-gray-700 rounded",
        style: { width: "100%", height: height - 60 },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500", children: "正規化データを待機中..." })
      }
    )
  ] });
};
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c2) {
    const r2 = Math.random() * 16 | 0;
    const v2 = c2 === "x" ? r2 : r2 & 3 | 8;
    return v2.toString(16);
  });
}
class BroadcastTimestampSync {
  roomId;
  userId;
  sequenceNumber = 0;
  syncInterval = null;
  sendMessageFn;
  constructor(roomId, userId, sendMessageFn) {
    this.roomId = roomId;
    this.userId = userId;
    this.sendMessageFn = sendMessageFn;
  }
  /**
   * Send frame timestamp to viewers
   * Call this for every video frame being broadcast
   */
  sendFrameTimestamp(videoFrameTimestamp) {
    const frameId = generateUUID();
    const message = {
      type: "broadcast-timestamp",
      room: this.roomId,
      from: this.userId,
      data: {
        frameId,
        broadcastTimestamp: videoFrameTimestamp || Date.now(),
        sequenceNumber: this.sequenceNumber++
      },
      timestamp: Date.now()
    };
    this.sendMessageFn(message);
    console.log(`[Broadcaster] Sent timestamp: frameId=${frameId.slice(0, 8)}, seq=${this.sequenceNumber - 1}`);
    return frameId;
  }
  /**
   * Start periodic timestamp sync at specified Hz
   * Default: 20Hz (50ms interval)
   */
  startPeriodicSync(intervalMs = 50) {
    console.log(`[Broadcaster] Starting periodic timestamp sync at ${1e3 / intervalMs}Hz`);
    this.syncInterval = setInterval(() => {
      this.sendFrameTimestamp();
    }, intervalMs);
  }
  /**
   * Stop periodic timestamp sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("[Broadcaster] Stopped periodic timestamp sync");
    }
  }
  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopPeriodicSync();
  }
}
class ReactionReceiver {
  latencyStats = {
    samples: [],
    violations: 0,
    total: 0
  };
  reactionCallback;
  /**
   * Set callback for received reactions
   */
  setReactionCallback(callback) {
    this.reactionCallback = callback;
  }
  /**
   * Handle incoming reaction with metrics
   */
  handleReactionWithMetrics(message) {
    console.log("[ReactionReceiver] Received reaction message:", {
      type: message.type,
      from: message.from,
      hasMetrics: !!message.metrics,
      data: message.data
    });
    const metrics = message.metrics;
    const data = message.data;
    if (!metrics) {
      console.warn("[ReactionReceiver] ❌ Received reaction without metrics - backend may not be calculating them");
      return;
    }
    console.log("[ReactionReceiver] ✅ Processing reaction with metrics:", metrics);
    this.latencyStats.total++;
    this.latencyStats.samples.push(metrics.broadcastToReceivedMs);
    if (!metrics.withinConstraint) {
      this.latencyStats.violations++;
    }
    if (this.reactionCallback) {
      this.reactionCallback({ data, metrics });
    }
    this.displayReaction(data, metrics);
    if (!metrics.withinConstraint) {
      console.warn(
        `[Broadcaster] ⚠️ LATENCY VIOLATION: ${metrics.broadcastToReceivedMs}ms > 500ms for user ${data.userId}`
      );
    }
  }
  displayReaction(data, metrics) {
    const qualityEmoji = metrics.withinConstraint ? "✅" : "❌";
    const qualityClass = metrics.withinConstraint ? "good-latency" : "bad-latency";
    console.log(
      `[Broadcaster] ${qualityEmoji} Reaction from ${data.userId}: intensity=${data.intensity}, latency=${metrics.broadcastToReceivedMs}ms [${qualityClass}]`
    );
  }
  /**
   * Get latency statistics
   */
  getLatencyStatistics() {
    if (this.latencyStats.samples.length === 0) {
      return null;
    }
    const sorted = [...this.latencyStats.samples].sort((a2, b2) => a2 - b2);
    return {
      mean: this.latencyStats.samples.reduce((a2, b2) => a2 + b2, 0) / this.latencyStats.samples.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      violations: this.latencyStats.violations,
      total: this.latencyStats.total,
      violationRate: this.latencyStats.violations / this.latencyStats.total
    };
  }
  /**
   * Reset statistics
   */
  resetStatistics() {
    this.latencyStats = {
      samples: [],
      violations: 0,
      total: 0
    };
  }
}
class ViewerReactionSender {
  roomId;
  userId;
  broadcasterUserId;
  latestBroadcastTimestamp = null;
  latestFrameId = null;
  sendMessageFn;
  constructor(roomId, userId, broadcasterUserId, sendMessageFn) {
    this.roomId = roomId;
    this.userId = userId;
    this.broadcasterUserId = broadcasterUserId;
    this.sendMessageFn = sendMessageFn;
  }
  /**
   * Handle incoming broadcast timestamp
   */
  handleBroadcastTimestamp(message) {
    const now = Date.now();
    const latency = now - message.data.broadcastTimestamp;
    this.latestBroadcastTimestamp = message.data.broadcastTimestamp;
    this.latestFrameId = message.data.frameId;
    console.log(
      `[Viewer] Received broadcast timestamp: frameId=${this.latestFrameId.slice(0, 8)}, latency=${latency}ms (sent at ${message.data.broadcastTimestamp}, received at ${now})`
    );
    if (latency > 100) {
      console.warn(`[Viewer] ⚠️ High timestamp latency: ${latency}ms`);
    }
  }
  /**
   * Send reaction with broadcast timestamp
   */
  sendReactionWithTimestamp(intensity, confidence) {
    if (!this.latestBroadcastTimestamp || !this.latestFrameId) {
      console.warn("[Viewer] No broadcast timestamp available yet");
      return false;
    }
    const message = {
      type: "emotion-with-timestamp",
      room: this.roomId,
      from: this.userId,
      to: this.broadcasterUserId,
      data: {
        userId: this.userId,
        intensity,
        confidence,
        broadcastTimestamp: this.latestBroadcastTimestamp,
        reactionSentTime: Date.now(),
        frameId: this.latestFrameId
      },
      timestamp: Date.now()
    };
    console.log("[Viewer] Attempting to send reaction:", {
      type: message.type,
      room: message.room,
      from: message.from,
      to: message.to,
      intensity,
      confidence,
      frameId: this.latestFrameId.slice(0, 8)
    });
    const success = this.sendMessageFn(message);
    if (success) {
      console.log(
        `[Viewer] ✅ Sent reaction: intensity=${intensity}, frameId=${this.latestFrameId.slice(0, 8)}`
      );
    } else {
      console.error("[Viewer] ❌ Failed to send reaction");
    }
    return success;
  }
  /**
   * Get current broadcast timestamp info
   */
  getCurrentTimestampInfo() {
    if (!this.latestBroadcastTimestamp || !this.latestFrameId) {
      return null;
    }
    return {
      broadcastTimestamp: this.latestBroadcastTimestamp,
      frameId: this.latestFrameId
    };
  }
}
const byteToHex = [];
for (let i2 = 0; i2 < 256; ++i2) {
  byteToHex.push((i2 + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
    getRandomValues = crypto.getRandomValues.bind(crypto);
  }
  return getRandomValues(rnds8);
}
const randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
const native = { randomUUID };
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
class IonSessionManager {
  config;
  sendMessage;
  // WebRTC peer connections
  publishPC = null;
  subscribePC = null;
  // Media streams
  localStream = null;
  remoteStreams = /* @__PURE__ */ new Map();
  // Event handlers
  onRemoteTrack;
  onConnectionStateChange;
  onError;
  // ICE candidate queues (for candidates received before remote description)
  // Separate queues for publish and subscribe PCs
  pendingPublishCandidates = [];
  pendingSubscribeCandidates = [];
  constructor(config2, sendMessage) {
    this.config = config2;
    this.sendMessage = sendMessage;
    console.log("🔧 [ION] IonSessionManager constructed for room:", config2.roomId, "user:", config2.userId);
  }
  /**
   * Initialize peer connection and join Ion-SFU room
   */
  async join(localStream) {
    console.groupCollapsed("🎬 [ION] JOIN PROCESS - Room:", this.config.roomId);
    console.log("Role - noPublish:", this.config.noPublish, "noSubscribe:", this.config.noSubscribe);
    console.log("Local stream tracks:", localStream.getTracks().map((t2) => t2.kind));
    this.localStream = localStream;
    console.log("📝 Step 0: Cleaning up existing peer connections...");
    if (this.publishPC) {
      console.log("  - Closing existing publish PC");
      this.publishPC.close();
      this.publishPC = null;
    }
    if (this.subscribePC) {
      console.log("  - Closing existing subscribe PC");
      this.subscribePC.close();
      this.subscribePC = null;
    }
    this.pendingPublishCandidates = [];
    this.pendingSubscribeCandidates = [];
    console.log("✅ Step 0 complete");
    console.log("📝 Step 1: Creating peer connection...");
    this.publishPC = this.createPeerConnection("publish");
    console.log("✅ Step 1 complete");
    console.log("📝 Step 2: Adding tracks/transceivers...");
    if (this.config.noPublish) {
      console.log("  - Adding recvonly audio transceiver (viewer mode)");
      this.publishPC.addTransceiver("audio", { direction: "recvonly" });
      console.log("  - Adding recvonly video transceiver (viewer mode)");
      this.publishPC.addTransceiver("video", { direction: "recvonly" });
    } else {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];
      if (audioTrack) {
        console.log("  - Adding audio track (broadcaster mode)");
        this.publishPC.addTrack(audioTrack, localStream);
      }
      if (videoTrack) {
        console.log("  - Adding video track (broadcaster mode)");
        this.publishPC.addTrack(videoTrack, localStream);
      }
    }
    console.log("✅ Step 2 complete");
    console.log("📝 Step 3: Creating offer...");
    const offer = await this.publishPC.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    console.log("✅ Step 3 complete - Offer SDP length:", offer.sdp?.length || 0);
    console.log("📝 Step 4: Setting local description...");
    await this.publishPC.setLocalDescription(offer);
    console.log("✅ Step 4 complete");
    console.log("🔧 ICE gathering state after setLocalDescription:", this.publishPC.iceGatheringState);
    await this.waitForIceGathering(this.publishPC);
    const sdp = this.publishPC.localDescription.sdp;
    const hasIceUfrag = sdp.includes("a=ice-ufrag");
    console.log("🔍 [ION] Final SDP Check - Has ice-ufrag:", hasIceUfrag, "SDP length:", sdp.length, "ICE state:", this.publishPC.iceGatheringState);
    console.groupCollapsed("🔍 [ION] Final SDP Check (details)");
    console.log("Type:", this.publishPC.localDescription.type);
    console.log("SDP length:", sdp.length);
    console.log("Has ice-ufrag:", hasIceUfrag);
    console.log("ICE gathering state:", this.publishPC.iceGatheringState);
    console.log("SDP preview:", sdp.substring(0, 300) + "...");
    console.groupEnd();
    if (!hasIceUfrag) {
      console.error("❌ [ION] SDP does not contain ice-ufrag! Cannot proceed.");
      throw new Error("SDP missing ice-ufrag after ICE gathering");
    }
    const joinPayload = {
      sid: this.config.roomId,
      uid: this.config.userId,
      offer: {
        sdp: this.publishPC.localDescription.sdp,
        type: this.publishPC.localDescription.type
        // Guaranteed string "offer"
      },
      config: {
        noPublish: this.config.noPublish,
        noSubscribe: this.config.noSubscribe
      }
    };
    console.log("📤 [ION] Sending join with offer.type:", typeof this.publishPC.localDescription.type, this.publishPC.localDescription.type);
    const messageToSend = {
      type: "ion:join",
      requestId: v4(),
      payload: joinPayload
    };
    console.log("📤 [ION] Message payload check:", {
      hasOffer: !!messageToSend.payload.offer,
      hasSdp: !!messageToSend.payload.offer?.sdp,
      sdpLength: messageToSend.payload.offer?.sdp?.length || 0,
      sdpType: messageToSend.payload.offer?.type,
      sdpContainsIceUfrag: messageToSend.payload.offer?.sdp?.includes("a=ice-ufrag") || false,
      config: messageToSend.payload.config
    });
    this.sendMessage(messageToSend);
    console.groupEnd();
  }
  /**
   * Handle incoming Ion messages
   */
  handleMessage(message) {
    console.log(`📨 [ION] ⬇️ Received message: ${message.type}`);
    if (isIonAnswerMessage(message)) {
      this.handleAnswer(message.payload);
    } else if (isIonOfferMessage(message)) {
      this.handleOffer(message.payload);
    } else if (isIonTrickleMessage(message)) {
      this.handleTrickle(message.payload);
    } else if (isIonErrorMessage(message)) {
      this.handleError(message.payload);
    } else {
      console.warn("⚠️ [ION] No handler matched for message type:", message.type);
    }
  }
  /**
   * Handle answer from Ion-SFU
   */
  async handleAnswer(payload) {
    console.groupCollapsed("📥 [ION] HANDLE ANSWER - Publish PC");
    console.log("Answer SDP length:", payload.desc.sdp?.length || 0);
    console.log("Answer type:", payload.desc.type);
    if (!this.publishPC) {
      console.error("❌ No publish peer connection");
      console.groupEnd();
      return;
    }
    const state = this.publishPC.signalingState;
    console.log("📝 Current signaling state:", state);
    if (state !== "have-local-offer") {
      console.warn(`⚠️ Cannot set remote answer in state: ${state}. Expected 'have-local-offer'. Ignoring.`);
      console.groupEnd();
      return;
    }
    try {
      console.log("📝 Setting remote description on publish PC...");
      await this.publishPC.setRemoteDescription(
        new RTCSessionDescription(payload.desc)
      );
      console.log("✅ Remote description set");
      console.log("📝 Processing pending publish ICE candidates...");
      await this.processPendingIceCandidates("publish");
      console.log("✅ Pending publish ICE candidates processed");
      console.log("🎉 [ION] Answer handled successfully");
      console.groupEnd();
    } catch (error) {
      console.error("❌ [ION] Failed to set remote description:", error);
      console.groupEnd();
      this.onError?.(error);
    }
  }
  /**
   * Handle offer from Ion-SFU (for receiving remote streams)
   */
  async handleOffer(payload) {
    console.groupCollapsed("📥 [ION] HANDLE OFFER - Creating Subscribe PC");
    console.log("Payload SDP length:", payload.desc.sdp?.length || 0);
    console.log("Payload type:", payload.desc.type);
    if (this.subscribePC) {
      const state = this.subscribePC.signalingState;
      console.log("ℹ️ Closing existing subscribe PC (state:", state, ") to avoid m-line order conflicts");
      this.subscribePC.close();
      this.subscribePC = null;
      this.pendingSubscribeCandidates = [];
    }
    console.log("📝 Step 1: Creating subscribe peer connection...");
    this.subscribePC = this.createPeerConnection("subscribe");
    console.log("✅ Step 1 complete");
    try {
      console.log("📝 Step 2: Setting remote description... (signalingState:", this.subscribePC.signalingState, ")");
      await this.subscribePC.setRemoteDescription(
        new RTCSessionDescription(payload.desc)
      );
      console.log("✅ Step 2 complete");
      console.log("📝 Step 2.5: Processing pending subscribe ICE candidates...");
      await this.processPendingIceCandidates("subscribe");
      console.log("✅ Step 2.5 complete - Pending subscribe ICE candidates processed");
      console.log("📝 Step 3: Creating answer...");
      const answer = await this.subscribePC.createAnswer();
      console.log("✅ Step 3 complete - Answer SDP length:", answer.sdp?.length || 0);
      console.log("📝 Step 4: Setting local description...");
      await this.subscribePC.setLocalDescription(answer);
      console.log("✅ Step 4 complete");
      console.log("📝 Step 5: Waiting for ICE gathering...");
      await this.waitForIceGathering(this.subscribePC);
      console.log("✅ Step 5 complete - ICE gathering finished");
      console.log("📝 Step 6: Sending answer to server...");
      console.log("Answer type:", typeof this.subscribePC.localDescription.type, this.subscribePC.localDescription.type);
      this.sendMessage({
        type: "ion:answer",
        payload: {
          desc: {
            sdp: this.subscribePC.localDescription.sdp,
            type: this.subscribePC.localDescription.type
            // Guaranteed string "answer"
          }
        }
      });
      console.log("✅ Step 6 complete - Answer sent successfully");
      console.log("🎉 [ION] Subscribe PC setup completed!");
      console.groupEnd();
    } catch (error) {
      console.error("❌ [ION] Failed to handle offer:", error);
      console.groupEnd();
      this.onError?.(error);
    }
  }
  /**
   * Handle ICE candidate from Ion-SFU
   */
  async handleTrickle(payload) {
    const pcType = payload.target === 0 ? "publish" : "subscribe";
    const pc2 = payload.target === 0 ? this.publishPC : this.subscribePC;
    const pendingQueue = payload.target === 0 ? this.pendingPublishCandidates : this.pendingSubscribeCandidates;
    if (!pc2) {
      pendingQueue.push(payload.candidate);
      console.log(`🧊 [ION] Queued ICE candidate for ${pcType} (PC not created yet, queue size: ${pendingQueue.length})`);
      return;
    }
    try {
      if (!pc2.remoteDescription) {
        pendingQueue.push(payload.candidate);
        console.log(`🧊 [ION] Queued ICE candidate for ${pcType} (no remote description yet, queue size: ${pendingQueue.length})`);
        return;
      }
      await pc2.addIceCandidate(new RTCIceCandidate(payload.candidate));
      console.log(`🧊 [ION] ICE candidate added to ${pcType} PC`);
    } catch (error) {
      console.error(`❌ [ION] Failed to add ICE candidate to ${pcType} PC:`, error);
    }
  }
  /**
   * Process queued ICE candidates after remote description is set
   */
  async processPendingIceCandidates(type) {
    const pc2 = type === "publish" ? this.publishPC : this.subscribePC;
    const pendingQueue = type === "publish" ? this.pendingPublishCandidates : this.pendingSubscribeCandidates;
    if (pendingQueue.length === 0) return;
    console.log(`🧊 [ION] Processing ${pendingQueue.length} pending ${type} ICE candidates`);
    if (!pc2) {
      console.error(`❌ [ION] Cannot process pending candidates: ${type} PC is null`);
      return;
    }
    for (const candidate of pendingQueue) {
      try {
        await pc2.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ [ION] Added pending ICE candidate to ${type} PC`);
      } catch (error) {
        console.error(`❌ [ION] Failed to add pending ${type} ICE candidate:`, error);
      }
    }
    if (type === "publish") {
      this.pendingPublishCandidates = [];
    } else {
      this.pendingSubscribeCandidates = [];
    }
    console.log(`✅ [ION] Finished processing ${type} ICE candidates`);
  }
  /**
   * Wait for ICE gathering to complete
   */
  waitForIceGathering(pc2) {
    console.groupCollapsed("⏰ [ION] Waiting for ICE gathering");
    console.log("Current state:", pc2.iceGatheringState);
    return new Promise((resolve) => {
      if (pc2.iceGatheringState === "complete") {
        console.log("✅ Already complete");
        console.groupEnd();
        resolve();
        return;
      }
      let timeoutId;
      const checkState = () => {
        console.log("State changed to:", pc2.iceGatheringState);
        if (pc2.iceGatheringState === "complete") {
          console.log("✅ ICE gathering complete!");
          console.groupEnd();
          pc2.removeEventListener("icegatheringstatechange", checkState);
          clearTimeout(timeoutId);
          resolve();
        }
      };
      pc2.addEventListener("icegatheringstatechange", checkState);
      console.log("Event listener added, waiting max 10 seconds...");
      timeoutId = setTimeout(() => {
        console.warn("⚠️ TIMEOUT after 10 seconds! Final state:", pc2.iceGatheringState);
        console.groupEnd();
        pc2.removeEventListener("icegatheringstatechange", checkState);
        resolve();
      }, 1e4);
    });
  }
  /**
   * Handle error from Ion-SFU
   */
  handleError(payload) {
    console.error("❌ [ION] Error:", payload.code, payload.details);
    this.onError?.(new Error(`${payload.code}: ${payload.details}`));
  }
  /**
   * Create WebRTC peer connection
   */
  createPeerConnection(type) {
    console.groupCollapsed(`🔧 [ION] Creating ${type} peer connection`);
    console.log("ICE servers:", config.iceServers);
    const pc2 = new RTCPeerConnection({
      iceServers: config.iceServers
    });
    console.log("✅ RTCPeerConnection created");
    console.log("Initial ICE gathering state:", pc2.iceGatheringState);
    console.log("Initial ICE connection state:", pc2.iceConnectionState);
    console.groupEnd();
    pc2.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 [ION] ⬆️ Sending ICE candidate (${type}):`, event.candidate.candidate.substring(0, 50) + "...");
        this.sendMessage({
          type: "ion:trickle",
          payload: {
            target: type === "publish" ? 0 : 1,
            candidate: event.candidate.toJSON()
          }
        });
      } else {
        console.log(`✅ [ION] ICE gathering finished for ${type}`);
      }
    };
    pc2.onconnectionstatechange = () => {
      const stateEmoji = {
        "new": "🆕",
        "connecting": "🔄",
        "connected": "✅",
        "disconnected": "⚠️",
        "failed": "❌",
        "closed": "🚪"
      }[pc2.connectionState] || "❓";
      console.log(`${stateEmoji} [ION] Connection state (${type}): ${pc2.connectionState}`);
      if (type === "subscribe" && pc2.connectionState === "connected") {
        console.log("🎉 [ION] ✅✅✅ SUBSCRIBE PC CONNECTED - Ready to receive media! ✅✅✅");
      }
      this.onConnectionStateChange?.(pc2.connectionState);
    };
    if (type === "subscribe") {
      pc2.ontrack = (event) => {
        console.groupCollapsed("📺 [ION] 🎉 REMOTE TRACK RECEIVED");
        console.log("Track kind:", event.track.kind);
        console.log("Track ID:", event.track.id);
        console.log("Track readyState:", event.track.readyState);
        console.log("Track enabled:", event.track.enabled);
        console.log("Track muted:", event.track.muted);
        console.log("Number of streams:", event.streams.length);
        const stream = event.streams[0];
        if (stream) {
          console.log("Stream ID:", stream.id);
          console.log("Stream active:", stream.active);
          console.log("Video tracks in stream:", stream.getVideoTracks().length);
          console.log("Audio tracks in stream:", stream.getAudioTracks().length);
          this.remoteStreams.set(stream.id, stream);
          this.onRemoteTrack?.(stream, event);
          console.log("✅ Remote stream stored and callback invoked");
        } else {
          console.warn("⚠️ No stream in track event!");
        }
        console.groupEnd();
      };
    }
    return pc2;
  }
  /**
   * Leave the Ion-SFU room
   */
  leave() {
    console.log("🚪 [ION] Leaving room");
    this.publishPC?.close();
    this.subscribePC?.close();
    this.publishPC = null;
    this.subscribePC = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.remoteStreams.clear();
  }
  /**
   * Set event handlers
   */
  setEventHandlers(handlers) {
    this.onRemoteTrack = handlers.onRemoteTrack;
    this.onConnectionStateChange = handlers.onConnectionStateChange;
    this.onError = handlers.onError;
  }
  /**
   * Get local stream
   */
  getLocalStream() {
    return this.localStream;
  }
  /**
   * Get all remote streams
   */
  getRemoteStreams() {
    return Array.from(this.remoteStreams.values());
  }
  /**
   * Get connection state
   */
  getConnectionState() {
    return this.publishPC?.connectionState || null;
  }
}
function useIonSession(options) {
  const [localStream, setLocalStream] = reactExports.useState(null);
  const [remoteStreams, setRemoteStreams] = reactExports.useState([]);
  const [connectionState, setConnectionState] = reactExports.useState("new");
  const [error, setError] = reactExports.useState(null);
  const [isJoined, setIsJoined] = reactExports.useState(false);
  const sessionRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (options.noPublish === void 0 || options.noSubscribe === void 0) {
      console.log("🔧 [useIonSession] Waiting for role determination (noPublish/noSubscribe undefined)");
      return;
    }
    console.log("🔧 [useIonSession] Initializing session manager", {
      noPublish: options.noPublish,
      noSubscribe: options.noSubscribe
    });
    const session = new IonSessionManager(
      {
        roomId: options.roomId,
        userId: options.userId,
        noPublish: options.noPublish,
        noSubscribe: options.noSubscribe
      },
      options.sendIonMessage
    );
    session.setEventHandlers({
      onRemoteTrack: () => {
        console.log("📺 [useIonSession] New remote stream received");
        setRemoteStreams(session.getRemoteStreams());
      },
      onConnectionStateChange: (state) => {
        console.log("🔌 [useIonSession] Connection state changed:", state);
        setConnectionState(state);
      },
      onError: (err) => {
        console.error("❌ [useIonSession] Error:", err);
        setError(err);
      }
    });
    sessionRef.current = session;
    return () => {
      console.log("🧹 [useIonSession] Cleaning up session");
      session.leave();
    };
  }, [options.roomId, options.userId, options.noPublish, options.noSubscribe]);
  const join = reactExports.useCallback(async (stream) => {
    try {
      console.log("🚀 [useIonSession] Starting join process");
      setError(null);
      let mediaStream = stream;
      if (!mediaStream) {
        console.log("📹 [useIonSession] Getting user media");
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 },
          audio: true
        });
      }
      setLocalStream(mediaStream);
      if (sessionRef.current) {
        console.log("📤 [useIonSession] Sending join request to Ion-SFU");
        await sessionRef.current.join(mediaStream);
        setIsJoined(true);
        console.log("✅ [useIonSession] Join process completed");
      } else {
        console.warn("⚠️ [useIonSession] Session not initialized yet, cannot join");
        throw new Error("IonSession not initialized - will retry");
      }
    } catch (err) {
      const error2 = err;
      setError(error2);
      console.error("❌ [useIonSession] Failed to join:", error2);
      throw error2;
    }
  }, []);
  const leave = reactExports.useCallback(() => {
    console.log("🚪 [useIonSession] Leaving room");
    if (sessionRef.current) {
      sessionRef.current.leave();
      setLocalStream(null);
      setRemoteStreams([]);
      setIsJoined(false);
      setConnectionState("closed");
    }
  }, []);
  reactExports.useEffect(() => {
    if (options.autoJoin && !isJoined) {
      console.log("🤖 [useIonSession] Auto-joining");
      join();
    }
  }, [options.autoJoin, isJoined, join]);
  const handleMessage = reactExports.useCallback((message) => {
    if (sessionRef.current) {
      sessionRef.current.handleMessage(message);
    }
  }, []);
  return {
    localStream,
    remoteStreams,
    connectionState,
    error,
    isJoined,
    join,
    leave,
    handleMessage
    // Export this so parent can route Ion messages
  };
}
class AuthService {
  static TOKEN_KEY = "authToken";
  static USER_ID_KEY = "userId";
  /**
   * Login to backend and get JWT token
   */
  static async login(username) {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log("[DEBUG][CHECK] Backend response:", {
        hasToken: !!data.token,
        tokenLength: data.token?.length,
        userId: data.userId,
        tokenFull: data.token
      });
      const cleanToken = data.token.replace(/[^\x00-\x7F]/g, "");
      const hasNonAscii = cleanToken !== data.token;
      if (hasNonAscii) {
        console.warn("[DEBUG][CHECK] ⚠️ Token contained non-ASCII characters - cleaned:", {
          original: data.token,
          cleaned: cleanToken
        });
      }
      localStorage.setItem(this.TOKEN_KEY, cleanToken);
      localStorage.setItem(this.USER_ID_KEY, data.userId);
      console.log("[DEBUG][CHECK] Token stored to localStorage");
      return data;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get stored authentication token
   */
  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  /**
   * Get stored user ID
   */
  static getUserId() {
    return localStorage.getItem(this.USER_ID_KEY);
  }
  /**
   * Check if user is authenticated
   */
  static isAuthenticated() {
    return !!this.getToken();
  }
  /**
   * Clear authentication data
   */
  static clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    console.log("✅ [Auth] Authentication cleared");
  }
  /**
   * Ensure user is authenticated
   * If not, login with the provided username
   */
  static async ensureAuthenticated(userName) {
    let token = this.getToken();
    console.log("[DEBUG][CHECK] ensureAuthenticated - existing token:", token ? "EXISTS" : "NONE");
    if (!token) {
      console.log("[DEBUG][CHECK] No token found, calling login()...");
      const { token: newToken } = await this.login(userName);
      token = newToken;
    } else {
      console.log("[DEBUG][CHECK] Using existing token from localStorage");
    }
    return token;
  }
}
const SessionView = () => {
  const { roomId } = useParams();
  const [isJoining, setIsJoining] = reactExports.useState(false);
  const [joinError, setJoinError] = reactExports.useState(null);
  const localVideoRef = reactExports.useRef(null);
  const remoteVideoRef = reactExports.useRef(null);
  const viewerCameraRef = reactExports.useRef(null);
  const animationFrameRef = reactExports.useRef(void 0);
  const initializedRoomRef = reactExports.useRef(null);
  const cancelledRef = reactExports.useRef(false);
  const [isBroadcaster, setIsBroadcaster] = reactExports.useState(void 0);
  const [hasTimestamp, setHasTimestamp] = reactExports.useState(false);
  const [receivedReactions, setReceivedReactions] = reactExports.useState([]);
  const [broadcasterUserId, setBroadcasterUserId] = reactExports.useState("broadcaster");
  const [isAuthenticated, setIsAuthenticated] = reactExports.useState(false);
  const [needsPlayButton, setNeedsPlayButton] = reactExports.useState(false);
  const timestampSyncRef = reactExports.useRef(null);
  const reactionReceiverRef = reactExports.useRef(null);
  const viewerReactionSenderRef = reactExports.useRef(null);
  const [localStream, setLocalStream] = reactExports.useState(null);
  const userName = localStorage.getItem("userName") || "Anonymous";
  const selectedLaughPattern = localStorage.getItem("laughPattern") || "male1";
  const [ownLaughMuted, setOwnLaughMuted] = reactExports.useState(false);
  const [othersLaughMuted, setOthersLaughMuted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    console.log("[SessionView] 🔄 isBroadcaster state changed:", isBroadcaster);
  }, [isBroadcaster]);
  const handleBroadcastTimestamp = reactExports.useCallback((message) => {
    if (viewerReactionSenderRef.current) {
      viewerReactionSenderRef.current.handleBroadcastTimestamp(message);
      setHasTimestamp(true);
    }
  }, []);
  const handleEmotionWithTimestamp = reactExports.useCallback((message) => {
    console.log("[SessionView] Received emotion with timestamp:", message);
    if (reactionReceiverRef.current) {
      reactionReceiverRef.current.handleReactionWithMetrics(message);
    }
  }, []);
  const ionSessionHandlerRef = reactExports.useRef(null);
  const handleIonMessage = reactExports.useCallback((message) => {
    console.log("📨 [SessionView] Received Ion message:", message.type);
    if (ionSessionHandlerRef.current) {
      ionSessionHandlerRef.current(message);
    }
  }, []);
  const userLaughPatternsRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const availablePatterns = ["male1", "male2", "male3", "female1", "female2", "female3"];
  const userPreviousIntensitiesRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const {
    connectionState,
    isConnected,
    error: signalingError,
    receivedEmotions,
    connect,
    joinRoom,
    leaveRoom,
    sendEmotionData,
    sendBroadcastTimestamp,
    sendEmotionWithTimestamp,
    sendSignalingMessage,
    getWebSocketState
  } = useSignaling({
    enableWebRTC: false,
    // WebRTC now handled by Ion-SFU
    onBroadcastTimestamp: handleBroadcastTimestamp,
    onEmotionWithTimestamp: handleEmotionWithTimestamp,
    onIonMessage: handleIonMessage,
    onRoomJoined: reactExports.useCallback((message) => {
      console.log("[SessionView] 🎯 Room joined message received:", message);
      const isBroadcasterRole = message.data?.isBroadcaster ?? false;
      const role = message.data?.role;
      const participantNumber = message.data?.participantNumber;
      const participantCount = message.data?.participantCount;
      const userId = message.data?.userId || message.userId;
      const receivedBroadcasterUserId = message.data?.broadcasterUserId;
      console.log("[SessionView] 📊 Role determination from backend:", {
        isBroadcaster: isBroadcasterRole,
        role,
        participantNumber,
        participantCount,
        userId,
        broadcasterUserId: receivedBroadcasterUserId,
        messageFrom: message.from
      });
      console.log(`[SessionView] 🎬 Setting isBroadcaster to: ${isBroadcasterRole}`);
      setIsBroadcaster(isBroadcasterRole);
      if (!isBroadcasterRole && receivedBroadcasterUserId) {
        console.log(`[SessionView] 📡 Setting broadcasterUserId to: ${receivedBroadcasterUserId}`);
        setBroadcasterUserId(receivedBroadcasterUserId);
      }
    }, [])
  });
  const ownLaughPlayer = useLaughPlayer({
    selectedPattern: selectedLaughPattern,
    onLaughTriggered: reactExports.useCallback((presetId, level) => {
      console.log(`🎵 [SessionView] Own laugh triggered: ${presetId} (${level})`);
    }, [])
  });
  const othersLaughPlayer = useLaughPlayer({
    selectedPattern: selectedLaughPattern,
    // Pattern doesn't matter for others, presetId will be provided
    onLaughTriggered: void 0
    // Others' player doesn't trigger automatically
  });
  reactExports.useEffect(() => {
    ownLaughPlayer.setMuted(ownLaughMuted);
  }, [ownLaughMuted, ownLaughPlayer]);
  reactExports.useEffect(() => {
    othersLaughPlayer.setMuted(othersLaughMuted);
  }, [othersLaughMuted, othersLaughPlayer]);
  reactExports.useEffect(() => {
    receivedEmotions.forEach((emotions, userId) => {
      if (userId === userName) {
        return;
      }
      if (emotions.length === 0) {
        return;
      }
      const latestEmotion = emotions[emotions.length - 1];
      const currentIntensity = latestEmotion.intensity;
      const previousIntensity = userPreviousIntensitiesRef.current.get(userId) || 0;
      const delta = currentIntensity - previousIntensity;
      userPreviousIntensitiesRef.current.set(userId, currentIntensity);
      if (delta < 10) {
        return;
      }
      let level = null;
      if (currentIntensity < 20) {
        level = null;
      } else if (currentIntensity < 40) {
        level = "small";
      } else if (currentIntensity < 70) {
        level = "medium";
      } else {
        level = "large";
      }
      if (level === null) {
        return;
      }
      if (!userLaughPatternsRef.current.has(userId)) {
        const usedPatterns = Array.from(userLaughPatternsRef.current.values());
        const availableForSelection = availablePatterns.filter((p2) => !usedPatterns.includes(p2));
        const selectFrom = availableForSelection.length > 0 ? availableForSelection : availablePatterns;
        const randomPattern = selectFrom[Math.floor(Math.random() * selectFrom.length)];
        userLaughPatternsRef.current.set(userId, randomPattern);
        console.log(`[SessionView] 🎲 Assigned pattern "${randomPattern}" to user ${userId}`);
      }
      const assignedPattern = userLaughPatternsRef.current.get(userId);
      const presetId = `${assignedPattern}_${level}`;
      console.log(`[SessionView] 🎵 Triggering laugh for user ${userId}: ${presetId} (Δ=${delta.toFixed(1)}, intensity=${currentIntensity})`);
      othersLaughPlayer.playPreset(presetId).catch((error) => {
        console.error(`[SessionView] ❌ Failed to play laugh for user ${userId}:`, error);
      });
    });
  }, [receivedEmotions, userName, othersLaughPlayer]);
  const {
    isInitialized: isMediaPipeReady,
    landmarks,
    normalizedLandmarks,
    normalizationData,
    processVideoFrame,
    error: mediaPipeError
  } = useMediaPipe({});
  const lastSendTimeRef = reactExports.useRef(0);
  const lastReactionSendTimeRef = reactExports.useRef(0);
  const handleLandmarkData = reactExports.useCallback((landmarks2) => {
    const now = Date.now();
    const sendInterval = 33;
    const reactionSendInterval = 100;
    if (now - lastSendTimeRef.current < sendInterval) {
      return;
    }
    if (!isBroadcaster && isConnected && landmarks2.length > 0) {
      const success = sendEmotionData(normalizedLandmarks || landmarks2, userName, 0.9);
      if (success) {
        lastSendTimeRef.current = now;
      }
      if (viewerReactionSenderRef.current && hasTimestamp) {
        if (now - lastReactionSendTimeRef.current >= reactionSendInterval) {
          let intensity = 50;
          let confidence = 0.9;
          const myEmotions = receivedEmotions.get(userName);
          if (myEmotions && myEmotions.length > 0) {
            const latestEmotion = myEmotions[myEmotions.length - 1];
            intensity = latestEmotion.intensity;
            confidence = latestEmotion.confidence;
          }
          const reactionSuccess = viewerReactionSenderRef.current.sendReactionWithTimestamp(intensity, confidence);
          if (reactionSuccess) {
            lastReactionSendTimeRef.current = now;
          }
          ownLaughPlayer.processIntensity(intensity);
        }
      }
    }
  }, [isConnected, sendEmotionData, normalizedLandmarks, normalizationData, isBroadcaster, hasTimestamp, userName, ownLaughPlayer]);
  reactExports.useEffect(() => {
    let lastProcessTime = 0;
    const targetFPS = 30;
    const frameInterval = 1e3 / targetFPS;
    const processEmotion = () => {
      const now = performance.now();
      if (now - lastProcessTime >= frameInterval) {
        const videoElement = isBroadcaster ? localVideoRef.current : viewerCameraRef.current;
        if (videoElement && isMediaPipeReady && videoElement.readyState >= 2) {
          try {
            processVideoFrame(videoElement);
            if (landmarks && landmarks.length > 0) {
              handleLandmarkData(landmarks);
            }
          } catch (error) {
            console.error("MediaPipe processing error:", error);
          }
        }
        lastProcessTime = now;
      }
      animationFrameRef.current = requestAnimationFrame(processEmotion);
    };
    if (isMediaPipeReady && localStream) {
      processEmotion();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMediaPipeReady, localStream, landmarks, processVideoFrame, handleLandmarkData, isBroadcaster]);
  reactExports.useEffect(() => {
    console.log("[SessionView] Video setup check:", {
      hasVideoRef: !!localVideoRef.current,
      hasLocalStream: !!localStream,
      isBroadcaster,
      streamTracks: localStream?.getTracks().length || 0
    });
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((error) => {
        console.log("Video autoplay failed, user interaction may be required:", error);
      });
      console.log("✅ Local video stream set and playing", {
        videoWidth: localVideoRef.current.videoWidth,
        videoHeight: localVideoRef.current.videoHeight,
        readyState: localVideoRef.current.readyState
      });
    }
  }, [localStream, isBroadcaster]);
  reactExports.useEffect(() => {
    if (!isBroadcaster && viewerCameraRef.current && localStream) {
      viewerCameraRef.current.srcObject = localStream;
      viewerCameraRef.current.play().catch((error) => {
        console.log("Viewer camera autoplay failed:", error);
      });
      console.log("✅ Viewer camera stream set for MediaPipe processing");
    }
  }, [isBroadcaster, localStream]);
  reactExports.useEffect(() => {
    console.log("[DEBUG][CHECK] useEffect triggered, roomId:", roomId);
    if (!roomId) {
      console.log("[DEBUG][CHECK] No roomId, skipping");
      return;
    }
    if (initializedRoomRef.current === roomId && !cancelledRef.current) {
      console.log("[DEBUG][CHECK] Already initialized for this room, skipping");
      return;
    }
    console.log("[DEBUG][CHECK] Starting initialization...");
    cancelledRef.current = false;
    initializedRoomRef.current = roomId;
    const initializeAll = async () => {
      setIsJoining(true);
      setJoinError(null);
      try {
        console.log("[DEBUG][CHECK] Calling ensureAuthenticated...");
        await AuthService.ensureAuthenticated(userName);
        if (cancelledRef.current) return;
        setIsAuthenticated(true);
        if (connectionState === "disconnected") {
          await connect();
          if (cancelledRef.current) return;
        }
        const connectionSuccess = await waitForConnection(15e3);
        if (cancelledRef.current) return;
        if (!connectionSuccess) {
          throw new Error("WebSocket接続のタイムアウト");
        }
        let stream = localStream;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
            // Enable audio for broadcasters (Ion-SFU requires it)
          });
          if (cancelledRef.current) return;
          setLocalStream(stream);
        }
        console.log("[DEBUG][STEP4] Calling joinRoom...");
        await joinRoom(roomId, userName);
        console.log("[DEBUG][STEP4] joinRoom completed");
        if (cancelledRef.current) return;
        console.log("[DEBUG][STEP4] Waiting for role determination...");
      } catch (error) {
        if (!cancelledRef.current) {
          console.error("❌ 初期化エラー:", error);
          setJoinError(error instanceof Error ? error.message : "初期化に失敗しました");
        }
      } finally {
        if (!cancelledRef.current) {
          setIsJoining(false);
        }
      }
    };
    initializeAll();
    return () => {
      cancelledRef.current = true;
      console.log("🧹 Cleanup called");
      if (roomId && isConnected) {
        leaveRoom(roomId);
      }
      if (timestampSyncRef.current) {
        timestampSyncRef.current.stopPeriodicSync();
        timestampSyncRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId]);
  const ionSession = useIonSession({
    roomId: roomId || "",
    userId: userName,
    sendIonMessage: sendSignalingMessage,
    autoJoin: false,
    // Manual join after role determination
    noPublish: isBroadcaster === false,
    // Viewer does not publish
    noSubscribe: isBroadcaster === true
    // Broadcaster does not subscribe
  });
  reactExports.useEffect(() => {
    ionSessionHandlerRef.current = ionSession.handleMessage;
  }, [ionSession.handleMessage]);
  reactExports.useEffect(() => {
    console.log("[SessionView] 🔍 Remote stream check:", {
      remoteStreamsCount: ionSession.remoteStreams.length,
      hasRemoteVideoRef: !!remoteVideoRef.current,
      isBroadcaster
    });
    if (ionSession.remoteStreams.length > 0) {
      const remoteStream = ionSession.remoteStreams[0];
      console.log("[SessionView] 📺 Received remote stream from Ion-SFU:", {
        streamId: remoteStream.id,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        videoTrackEnabled: remoteStream.getVideoTracks()[0]?.enabled,
        videoTrackReadyState: remoteStream.getVideoTracks()[0]?.readyState
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log("[SessionView] ✅ Remote stream set to video element");
        remoteVideoRef.current.play().then(() => {
          console.log("[SessionView] ✅ Remote video playing successfully");
          setNeedsPlayButton(false);
        }).catch((error) => {
          console.error("[SessionView] ❌ Remote video autoplay failed:", error);
          console.log("[SessionView] 🔄 Trying to play with muted...");
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().then(() => {
            console.log("[SessionView] ✅ Muted autoplay succeeded");
            setNeedsPlayButton(false);
          }).catch((e2) => {
            console.error("[SessionView] ❌ Muted play also failed:", e2);
            setNeedsPlayButton(true);
          });
        });
      } else {
        console.error("[SessionView] ❌ remoteVideoRef.current is null!");
      }
    }
  }, [ionSession.remoteStreams, isBroadcaster]);
  const ionInitializedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    console.log("[Ion-SFU] useEffect triggered with:", {
      roomId,
      isBroadcaster,
      isAuthenticated,
      hasLocalStream: !!localStream,
      broadcasterUserId,
      hasViewerReactionSender: !!viewerReactionSenderRef.current,
      hasTimestampSync: !!timestampSyncRef.current,
      ionInitialized: ionInitializedRef.current
    });
    if (!roomId) return;
    if (isBroadcaster === void 0) {
      console.log("[Ion-SFU] ⏳ Waiting for role determination...");
      return;
    }
    if (!isAuthenticated) {
      console.log("[Ion-SFU] ⏳ Waiting for authentication...");
      return;
    }
    if (!localStream) {
      console.log("[Ion-SFU] ⏳ Waiting for local stream...");
      return;
    }
    if (ionInitializedRef.current) {
      console.log("[Ion-SFU] ⏭️ Already initialized, skipping...");
      return;
    }
    const initializeServices = async () => {
      if (isBroadcaster) {
        if (!timestampSyncRef.current) {
          console.log("[SessionView] Initializing broadcaster services...");
          timestampSyncRef.current = new BroadcastTimestampSync(
            roomId,
            userName,
            sendBroadcastTimestamp
          );
          reactionReceiverRef.current = new ReactionReceiver();
          reactionReceiverRef.current.setReactionCallback((reaction) => {
            console.log("[SessionView] Received reaction:", reaction);
            setReceivedReactions((prev) => [...prev, reaction].slice(-100));
          });
          timestampSyncRef.current.startPeriodicSync(50);
          console.log("[SessionView] Broadcaster services initialized");
        }
        if (!ionSession.isJoined && !ionInitializedRef.current) {
          try {
            console.log("[SessionView] 📡 Starting Ion-SFU publish (WebSocket)...");
            await ionSession.join(localStream);
            ionInitializedRef.current = true;
            console.log("[SessionView] ✅ Ion-SFU publish completed");
          } catch (error) {
            console.error("[SessionView] ❌ Ion-SFU publish failed:", error);
          }
        }
      } else if (isBroadcaster === false) {
        if (!viewerReactionSenderRef.current) {
          console.log("[SessionView] Initializing viewer services with broadcaster:", broadcasterUserId);
          viewerReactionSenderRef.current = new ViewerReactionSender(
            roomId,
            userName,
            broadcasterUserId,
            sendEmotionWithTimestamp
          );
          console.log("[SessionView] Viewer services initialized");
        }
        if (!ionSession.isJoined && !ionInitializedRef.current) {
          try {
            console.log("[SessionView] 📡 Starting Ion-SFU subscribe (WebSocket)...");
            await ionSession.join(localStream);
            ionInitializedRef.current = true;
            console.log("[SessionView] ✅ Ion-SFU subscribe completed");
          } catch (error) {
            console.error("[SessionView] ❌ Ion-SFU subscribe failed:", error);
          }
        }
      }
    };
    initializeServices();
  }, [isBroadcaster, roomId, userName, broadcasterUserId, localStream, sendBroadcastTimestamp, sendEmotionWithTimestamp, isAuthenticated]);
  const waitForConnection = reactExports.useCallback(async (timeout = 5e3) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkConnection = () => {
        const wsState = getWebSocketState();
        const reactState = { connectionState, isConnected };
        const isWsConnected = wsState === "connected";
        const isReactConnected = connectionState === "connected" || isConnected;
        console.log("🔄 接続待機中:", {
          wsState,
          isWsConnected,
          connectionState,
          isConnected,
          reactState,
          isReactConnected,
          timeElapsed: Date.now() - startTime
        });
        if (isWsConnected) {
          console.log("✅ 接続確認完了 (WebSocket state)");
          resolve(true);
          return;
        }
        if (Date.now() - startTime > timeout) {
          console.log("⏰ 接続待機タイムアウト");
          resolve(false);
          return;
        }
        setTimeout(checkConnection, 100);
      };
      checkConnection();
    });
  }, []);
  const handleLeaveRoom = () => {
    console.log("🚪 [SessionView] Leaving room - START");
    try {
      if (ionSession) {
        console.log("🧹 Step 1: Cleaning up Ion session...");
        ionSession.leave();
        console.log("✅ Step 1: Ion session cleaned");
      } else {
        console.log("⏭️ Step 1: No Ion session to clean");
      }
    } catch (error) {
      console.error("❌ Step 1 failed:", error);
    }
    try {
      if (timestampSyncRef.current) {
        console.log("🧹 Step 2: Stopping timestamp sync...");
        timestampSyncRef.current.stopPeriodicSync();
        timestampSyncRef.current = null;
        console.log("✅ Step 2: Timestamp sync stopped");
      } else {
        console.log("⏭️ Step 2: No timestamp sync to stop");
      }
    } catch (error) {
      console.error("❌ Step 2 failed:", error);
    }
    try {
      if (localStream) {
        console.log("🧹 Step 3: Stopping local stream...");
        localStream.getTracks().forEach((track) => {
          track.stop();
          console.log("🛑 Stopped track:", track.kind);
        });
        console.log("✅ Step 3: Local stream stopped");
      } else {
        console.log("⏭️ Step 3: No local stream to stop");
      }
    } catch (error) {
      console.error("❌ Step 3 failed:", error);
    }
    try {
      if (roomId && isConnected) {
        console.log("🧹 Step 4: Leaving WebSocket room...");
        leaveRoom(roomId);
        console.log("✅ Step 4: Left WebSocket room");
      } else {
        console.log("⏭️ Step 4: Not connected or no roomId");
      }
    } catch (error) {
      console.error("❌ Step 4 failed:", error);
    }
    console.log("✅ [SessionView] All cleanup steps completed");
    console.log("📍 Current location:", window.location.pathname);
    console.log("🎯 Navigating to: /");
    try {
      console.log("🔄 Using window.location.href for navigation...");
      window.location.href = "/";
    } catch (error) {
      console.error("❌ Navigation failed:", error);
    }
  };
  const handleStartViewing = () => {
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.play().then(() => {
        console.log("[SessionView] ✅ Manual play succeeded");
        setNeedsPlayButton(false);
      }).catch((error) => {
        console.error("[SessionView] ❌ Manual play failed:", error);
      });
    }
  };
  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "text-green-400";
      case "connecting":
      case "reconnecting":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };
  const getConnectionStatusText = () => {
    switch (connectionState) {
      case "connected":
        return "接続済み";
      case "connecting":
        return "接続中...";
      case "reconnecting":
        return "再接続中...";
      case "failed":
        return "接続失敗";
      case "disconnected":
        return "切断済み";
      default:
        return "不明";
    }
  };
  if (isJoining) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-900 text-white flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: "lg", color: "white", className: "mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold mb-2", children: "セッション初期化中..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400", children: "WebSocket接続とカメラを初期化しています" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: getConnectionStatusColor(), children: [
        "● ",
        getConnectionStatusText()
      ] }) })
    ] }) });
  }
  if (joinError || mediaPipeError || signalingError) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-900 text-white flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-red-400 text-6xl mb-4", children: "⚠️" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold mb-2", children: "接続エラー" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 mb-2", children: joinError || mediaPipeError || signalingError }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-500 mb-6", children: [
        "接続状態: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: getConnectionStatusColor(), children: getConnectionStatusText() })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "primary",
          onClick: handleLeaveRoom,
          children: "ロビーに戻る"
        }
      )
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-900 text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold", children: [
          "ルーム: ",
          roomId
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-400", children: [
            "ユーザー: ",
            userName
          ] }),
          isBroadcaster !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `${isBroadcaster ? "text-blue-400" : "text-purple-400"}`, children: isBroadcaster ? "📡 配信者" : "👁️ 視聴者" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `${getConnectionStatusColor()}`, children: [
            "● ",
            getConnectionStatusText()
          ] }),
          isBroadcaster && receivedReactions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-green-400", children: [
            "💚 リアクション: ",
            receivedReactions.length,
            "件"
          ] }),
          !isBroadcaster && hasTimestamp && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-400", children: "✓ 配信受信中" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setOwnLaughMuted(!ownLaughMuted),
              className: `flex items-center gap-1 px-3 py-1 rounded transition-colors ${ownLaughMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`,
              title: ownLaughMuted ? "自分の笑い声をオンにする" : "自分の笑い声をミュートする",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: ownLaughMuted ? "🔇" : "🔊" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "自分" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setOthersLaughMuted(!othersLaughMuted),
              className: `flex items-center gap-1 px-3 py-1 rounded transition-colors ${othersLaughMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`,
              title: othersLaughMuted ? "他の人の笑い声をオンにする" : "他の人の笑い声をミュートする",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: othersLaughMuted ? "🔇" : "🔊" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "他の人" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "danger",
            onClick: handleLeaveRoom,
            children: "ルームを退出"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-4 text-center", children: isBroadcaster === true ? "あなたの配信映像" : isBroadcaster === false ? "配信映像" : "映像" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "video",
            {
              ref: localVideoRef,
              autoPlay: true,
              muted: true,
              playsInline: true,
              className: `w-full max-w-2xl rounded bg-black ${isBroadcaster !== true ? "hidden" : ""}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "video",
            {
              ref: remoteVideoRef,
              autoPlay: true,
              playsInline: true,
              className: `w-full max-w-2xl rounded bg-black ${isBroadcaster !== false ? "hidden" : ""}`
            }
          ),
          !isBroadcaster && needsPlayButton && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "primary",
              onClick: handleStartViewing,
              className: "text-xl px-8 py-4",
              children: "🎬 視聴を開始"
            }
          ) })
        ] }),
        !isBroadcaster && !remoteVideoRef.current?.srcObject && !needsPlayButton && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-gray-400 mt-4", children: "配信者の映像を待っています..." })
      ] }),
      !isBroadcaster && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-4 text-center", children: "あなたの表情ランドマーク" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col lg:flex-row gap-6 items-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 w-full max-w-md mx-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "video",
              {
                ref: viewerCameraRef,
                autoPlay: true,
                muted: true,
                playsInline: true,
                className: "hidden"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              NormalizedLandmarksViewer,
              {
                normalizedData: normalizationData,
                width: Math.min(400, window.innerWidth - 60),
                height: Math.min(400, window.innerWidth - 60)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 space-y-4" })
        ] })
      ] }),
      isBroadcaster && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-4", children: "受信したリアクション" }),
        receivedReactions.length > 0 ? (() => {
          const latestReactionsByUser = /* @__PURE__ */ new Map();
          receivedReactions.forEach((reaction) => {
            const current = latestReactionsByUser.get(reaction.data.userId);
            if (!current || reaction.data.reactionSentTime > current.data.reactionSentTime) {
              latestReactionsByUser.set(reaction.data.userId, reaction);
            }
          });
          const sortedReactions = Array.from(latestReactionsByUser.entries()).sort(([userIdA], [userIdB]) => userIdA.localeCompare(userIdB));
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4 pb-3 border-b border-gray-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-gray-400", children: [
                "視聴者数: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-blue-400 font-semibold", children: latestReactionsByUser.size }),
                "名"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-gray-400", children: [
                "総受信: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-400 font-semibold", children: receivedReactions.length }),
                "件"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: sortedReactions.map(([userId, reaction]) => {
              const intensity = reaction.data.intensity;
              const latency = reaction.metrics.broadcastToReceivedMs;
              const isGoodLatency = reaction.metrics.withinConstraint;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-700 rounded-lg p-4 space-y-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-medium text-blue-400 truncate", children: userId }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-gray-400", children: "感情強度" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-green-400", children: intensity })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-gray-600 rounded-full h-6 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-300 flex items-center justify-center text-white text-sm font-semibold",
                      style: { width: `${intensity}%` },
                      children: [
                        intensity,
                        "%"
                      ]
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-600", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "遅延" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: isGoodLatency ? "text-green-500" : "text-red-500", children: [
                    latency.toFixed(0),
                    "ms ",
                    isGoodLatency ? "✓" : "⚠️"
                  ] })
                ] })
              ] }, userId);
            }) })
          ] });
        })() : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-4xl mb-4", children: "💤" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium mb-2", children: "リアクションを待機中" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 text-sm", children: "視聴者からのリアクションがここに表示されます" })
        ] })
      ] }),
      !isBroadcaster && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-4", children: "リアルタイム感情データ" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
          Array.from(receivedEmotions.entries()).map(([userId, emotions]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            IntensityChart,
            {
              emotionData: emotions,
              userId,
              width: Math.min(400, window.innerWidth - 80),
              height: 200
            },
            userId
          )),
          receivedEmotions.size === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-full text-center py-8", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-4xl mb-4", children: "📊" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium mb-2", children: "感情データを待機中" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 text-sm", children: "バックエンドからの感情データを受信すると、リアルタイムグラフが表示されます" })
          ] })
        ] })
      ] })
    ] })
  ] }) });
};
const useBroadcast = (options) => {
  const { roomId, userId, syncIntervalMs = 50, autoStart = false } = options;
  const [isActive, setIsActive] = reactExports.useState(false);
  const [receivedReactions, setReceivedReactions] = reactExports.useState([]);
  const [latencyStats, setLatencyStats] = reactExports.useState(null);
  const timestampSyncRef = reactExports.useRef(null);
  const reactionReceiverRef = reactExports.useRef(null);
  const handleEmotionWithTimestamp = reactExports.useCallback((message) => {
    console.log("[useBroadcast] Received emotion with timestamp:", message);
    if (reactionReceiverRef.current) {
      reactionReceiverRef.current.handleReactionWithMetrics(message);
    }
  }, []);
  const {
    sendBroadcastTimestamp,
    connectionState,
    connect,
    joinRoom: joinSignalingRoom
  } = useSignaling({
    onEmotionWithTimestamp: handleEmotionWithTimestamp
  });
  const joinRoom = reactExports.useCallback(async () => {
    try {
      console.log("[useBroadcast] Connecting to WebSocket...");
      await connect();
      console.log("[useBroadcast] Connected! Joining room:", roomId, "as user:", userId);
      await joinSignalingRoom(roomId, userId);
      console.log("[useBroadcast] ✅ Successfully joined room:", roomId);
    } catch (error) {
      console.error("[useBroadcast] ❌ Failed to join room:", error);
    }
  }, [connect, joinSignalingRoom, roomId, userId]);
  reactExports.useEffect(() => {
    console.log("[useBroadcast] Auto-joining room...");
    joinRoom();
  }, [joinRoom]);
  const startBroadcast = reactExports.useCallback(() => {
    console.log("[useBroadcast] startBroadcast called, timestampSyncRef:", !!timestampSyncRef.current, "isActive:", isActive);
    if (timestampSyncRef.current && !isActive) {
      timestampSyncRef.current.startPeriodicSync(syncIntervalMs);
      setIsActive(true);
      console.log("[useBroadcast] ✅ Broadcasting started with interval:", syncIntervalMs, "ms");
    } else {
      console.log("[useBroadcast] ❌ Cannot start broadcasting - timestampSyncRef:", !!timestampSyncRef.current, "isActive:", isActive);
    }
  }, [isActive, syncIntervalMs]);
  reactExports.useEffect(() => {
    console.log("[useBroadcast] Initializing broadcast services...");
    timestampSyncRef.current = new BroadcastTimestampSync(
      roomId,
      userId,
      sendBroadcastTimestamp
    );
    console.log("[useBroadcast] ✅ BroadcastTimestampSync created");
    reactionReceiverRef.current = new ReactionReceiver();
    reactionReceiverRef.current.setReactionCallback((reaction) => {
      console.log("[useBroadcast] Reaction callback triggered:", reaction);
      setReceivedReactions((prev) => [...prev, reaction].slice(-100));
      const stats = reactionReceiverRef.current?.getLatencyStatistics();
      if (stats) {
        setLatencyStats(stats);
      }
    });
    console.log("[useBroadcast] ✅ ReactionReceiver created");
    return () => {
      console.log("[useBroadcast] Cleaning up broadcast services...");
      timestampSyncRef.current?.cleanup();
    };
  }, [roomId, userId, sendBroadcastTimestamp]);
  reactExports.useEffect(() => {
    if (autoStart && connectionState === "connected" && timestampSyncRef.current && !isActive) {
      console.log("[useBroadcast] Auto-starting broadcast...");
      startBroadcast();
    }
  }, [autoStart, connectionState, isActive, startBroadcast]);
  const stopBroadcast = reactExports.useCallback(() => {
    if (timestampSyncRef.current && isActive) {
      timestampSyncRef.current.stopPeriodicSync();
      setIsActive(false);
      console.log("[useBroadcast] Stopped broadcasting");
    }
  }, [isActive]);
  const resetStats = reactExports.useCallback(() => {
    reactionReceiverRef.current?.resetStatistics();
    setReceivedReactions([]);
    setLatencyStats(null);
  }, []);
  return {
    isActive,
    startBroadcast,
    stopBroadcast,
    receivedReactions,
    latencyStats,
    resetStats,
    connectionState,
    joinRoom
  };
};
const LatencyMonitor = ({ stats }) => {
  if (!stats) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-white mb-2", children: "レイテンシ統計" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 text-sm", children: "データなし" })
    ] });
  }
  const violationRatePercent = (stats.violationRate * 100).toFixed(2);
  const isGoodQuality = stats.violationRate < 0.05;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-white mb-3", children: "レイテンシ統計" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-400", children: "平均" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-white font-mono", children: [
          stats.mean.toFixed(2),
          "ms"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-400", children: "中央値" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-white font-mono", children: [
          stats.median,
          "ms"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-400", children: "P95" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-white font-mono", children: [
          stats.p95,
          "ms"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-400", children: "P99" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-white font-mono", children: [
          stats.p99,
          "ms"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 pt-4 border-t border-gray-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-400", children: "制約違反率" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${isGoodQuality ? "text-green-400" : "text-red-400"}`, children: [
          violationRatePercent,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-sm mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-400", children: "違反数 / 総数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white font-mono", children: [
          stats.violations,
          " / ",
          stats.total
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-3 h-3 rounded-full ${isGoodQuality ? "bg-green-400" : "bg-red-400"}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-gray-400", children: isGoodQuality ? "良好な品質" : "品質改善が必要" })
    ] }) })
  ] });
};
const BroadcasterView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Broadcaster";
  const localVideoRef = reactExports.useRef(null);
  const {
    isActive,
    startBroadcast,
    stopBroadcast,
    receivedReactions,
    latencyStats,
    resetStats,
    connectionState
  } = useBroadcast({
    roomId: roomId || "default",
    userId: userName,
    syncIntervalMs: 50,
    // 20Hz
    autoStart: true
  });
  reactExports.useEffect(() => {
    let stream = null;
    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Failed to access camera:", error);
      }
    };
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  const handleLeave = () => {
    if (isActive) {
      stopBroadcast();
    }
    navigate("/");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-900 text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "配信モード" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 text-sm mt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-400", children: [
            "ルーム: ",
            roomId
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `flex items-center gap-2 ${connectionState === "connected" ? "text-green-400" : "text-yellow-400"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2 h-2 rounded-full ${connectionState === "connected" ? "bg-green-400" : "bg-yellow-400"}` }),
            connectionState === "connected" ? "接続中" : "接続待機中"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `flex items-center gap-2 ${isActive ? "text-green-400" : "text-gray-400"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2 h-2 rounded-full ${isActive ? "bg-green-400" : "bg-gray-400"}` }),
            isActive ? "配信中" : "停止中"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        !isActive ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "primary", onClick: startBroadcast, children: "配信開始" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "secondary", onClick: stopBroadcast, children: "配信停止" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "danger", onClick: handleLeave, children: "退出" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium mb-3", children: "配信プレビュー" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "video",
          {
            ref: localVideoRef,
            autoPlay: true,
            muted: true,
            playsInline: true,
            className: "w-full rounded bg-black"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-400 mt-2", children: "※ この映像は視聴者には送信されません" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(LatencyMonitor, { stats: latencyStats }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium", children: "受信リアクション" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "secondary", onClick: resetStats, className: "text-xs", children: "統計リセット" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 max-h-96 overflow-y-auto", children: receivedReactions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 text-sm", children: "リアクション待機中..." }) : receivedReactions.slice(-10).reverse().map((reaction, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "bg-gray-700 rounded p-2 text-xs flex items-center justify-between",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-medium", children: reaction.data.userId }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-400 ml-2", children: [
                  "強度: ",
                  reaction.data.intensity
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-400", children: [
                  reaction.metrics.broadcastToReceivedMs,
                  "ms"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: reaction.metrics.withinConstraint ? "text-green-400" : "text-red-400", children: reaction.metrics.withinConstraint ? "✓" : "✗" })
              ] })
            ]
          },
          idx
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 bg-gray-800 rounded-lg p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium mb-2", children: "配信情報" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-400 space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "タイムスタンプ送信周期: 50ms (20Hz)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "レイテンシ制約: 500ms以内" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "受信リアクション総数: ",
          receivedReactions.length
        ] })
      ] })
    ] })
  ] }) });
};
const useViewer = (options) => {
  const { roomId, userId, broadcasterUserId } = options;
  const [hasTimestamp, setHasTimestamp] = reactExports.useState(false);
  const [currentTimestampInfo, setCurrentTimestampInfo] = reactExports.useState(null);
  const reactionSenderRef = reactExports.useRef(null);
  const handleBroadcastTimestamp = reactExports.useCallback((message) => {
    console.log("[useViewer] Received broadcast timestamp:", message);
    if (reactionSenderRef.current) {
      reactionSenderRef.current.handleBroadcastTimestamp(message);
      const info = reactionSenderRef.current.getCurrentTimestampInfo();
      setCurrentTimestampInfo(info);
      setHasTimestamp(info !== null);
      console.log("[useViewer] Updated timestamp info:", info);
    }
  }, []);
  const {
    sendEmotionWithTimestamp,
    connectionState,
    connect,
    joinRoom: joinSignalingRoom
  } = useSignaling({
    onBroadcastTimestamp: handleBroadcastTimestamp
  });
  const joinRoom = reactExports.useCallback(async () => {
    try {
      console.log("[useViewer] Connecting to WebSocket...");
      await connect();
      console.log("[useViewer] Connected! Joining room:", roomId, "as user:", userId);
      await joinSignalingRoom(roomId, userId);
      console.log("[useViewer] ✅ Successfully joined room:", roomId);
    } catch (error) {
      console.error("[useViewer] ❌ Failed to join room:", error);
    }
  }, [connect, joinSignalingRoom, roomId, userId]);
  reactExports.useEffect(() => {
    console.log("[useViewer] Auto-joining room...");
    joinRoom();
  }, [joinRoom]);
  reactExports.useEffect(() => {
    reactionSenderRef.current = new ViewerReactionSender(
      roomId,
      userId,
      broadcasterUserId,
      sendEmotionWithTimestamp
    );
    console.log("[useViewer] Initialized viewer reaction sender");
  }, [roomId, userId, broadcasterUserId, sendEmotionWithTimestamp]);
  const sendReaction = reactExports.useCallback((intensity, confidence) => {
    if (!reactionSenderRef.current) {
      console.warn("[useViewer] Reaction sender not initialized");
      return false;
    }
    return reactionSenderRef.current.sendReactionWithTimestamp(intensity, confidence);
  }, []);
  return {
    hasTimestamp,
    currentTimestampInfo,
    sendReaction,
    connectionState,
    joinRoom
  };
};
const ViewerView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Viewer";
  const broadcasterUserId = "Broadcaster";
  const localVideoRef = reactExports.useRef(null);
  const [reactionsSent, setReactionsSent] = reactExports.useState(0);
  const [videoReady, setVideoReady] = reactExports.useState(false);
  const {
    hasTimestamp,
    currentTimestampInfo,
    sendReaction,
    connectionState
  } = useViewer({
    roomId: roomId || "default",
    userId: userName,
    broadcasterUserId
  });
  const {
    isInitialized: isMediaPipeReady,
    landmarks,
    processVideoFrame
  } = useMediaPipe({});
  reactExports.useEffect(() => {
    if (landmarks && landmarks.length > 0) {
      console.log("[ViewerView] Landmarks detected:", landmarks.length);
    }
  }, [landmarks]);
  reactExports.useEffect(() => {
    let stream = null;
    const initCamera = async () => {
      try {
        console.log("[ViewerView] Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log("[ViewerView] Camera stream attached to video element");
          localVideoRef.current.onloadedmetadata = () => {
            console.log("[ViewerView] Video metadata loaded, playing...");
            localVideoRef.current?.play();
            setVideoReady(true);
          };
        }
      } catch (error) {
        console.error("[ViewerView] Failed to access camera:", error);
      }
    };
    initCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (!isMediaPipeReady) {
      console.log("[ViewerView] Waiting for MediaPipe initialization...");
      return;
    }
    console.log("[ViewerView] Starting MediaPipe processing loop");
    let frameCount = 0;
    const intervalId = setInterval(() => {
      if (localVideoRef.current) {
        const video = localVideoRef.current;
        if (frameCount % 50 === 0) {
          console.log("[ViewerView] Video state:", {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            paused: video.paused,
            currentTime: video.currentTime
          });
        }
        if (video.readyState >= 2) {
          processVideoFrame(video);
          frameCount++;
        } else {
          console.log("[ViewerView] Video not ready yet, readyState:", video.readyState);
        }
      } else {
        console.log("[ViewerView] Video element not found");
      }
    }, 100);
    return () => {
      console.log("[ViewerView] Stopping MediaPipe processing loop");
      clearInterval(intervalId);
    };
  }, [isMediaPipeReady, processVideoFrame]);
  reactExports.useEffect(() => {
    if (!hasTimestamp || !landmarks || landmarks.length === 0) {
      console.log("[ViewerView] Cannot send reactions - hasTimestamp:", hasTimestamp, "landmarks:", landmarks?.length || 0);
      return;
    }
    console.log("[ViewerView] Starting reaction sending loop");
    const intervalId = setInterval(() => {
      if (landmarks && landmarks.length > 0 && hasTimestamp) {
        const intensity = Math.floor(Math.random() * 100);
        const confidence = 0.9;
        const success = sendReaction(intensity, confidence);
        if (success) {
          setReactionsSent((prev) => prev + 1);
          console.log("[ViewerView] Reaction sent successfully, total:", reactionsSent + 1);
        } else {
          console.warn("[ViewerView] Failed to send reaction");
        }
      }
    }, 100);
    return () => {
      console.log("[ViewerView] Stopping reaction sending loop");
      clearInterval(intervalId);
    };
  }, [hasTimestamp, landmarks, sendReaction]);
  const handleLeave = () => {
    navigate("/");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-900 text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "container mx-auto p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "視聴モード" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 text-sm mt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-400", children: [
            "ルーム: ",
            roomId
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `flex items-center gap-2 ${connectionState === "connected" ? "text-green-400" : "text-yellow-400"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2 h-2 rounded-full ${connectionState === "connected" ? "bg-green-400" : "bg-yellow-400"}` }),
            connectionState === "connected" ? "接続中" : "接続待機中"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `flex items-center gap-2 ${hasTimestamp ? "text-green-400" : "text-yellow-400"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2 h-2 rounded-full ${hasTimestamp ? "bg-green-400" : "bg-yellow-400"}` }),
            hasTimestamp ? "配信受信中" : "タイムスタンプ待機中"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "danger", onClick: handleLeave, children: "退出" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium mb-3", children: "カメラプレビュー" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "video",
          {
            ref: localVideoRef,
            autoPlay: true,
            muted: true,
            playsInline: true,
            className: "w-full rounded bg-black"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 rounded-lg p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium mb-3", children: "ステータス" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-400", children: "MediaPipe" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: isMediaPipeReady ? "text-green-400" : "text-yellow-400", children: isMediaPipeReady ? "✓ 初期化済み" : "⏳ 初期化中" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-400", children: "ランドマーク検出" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: landmarks && landmarks.length > 0 ? "text-green-400" : "text-red-400", children: landmarks && landmarks.length > 0 ? `✓ ${landmarks.length}点` : "✗ 未検出" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-400", children: "ビデオ状態" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: videoReady ? "text-green-400" : "text-yellow-400", children: videoReady ? "✓ 再生中" : "⏳ 読み込み中" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-400", children: "配信タイムスタンプ" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: hasTimestamp ? "text-green-400" : "text-gray-400", children: hasTimestamp ? "✓ 受信中" : "✗ 未受信" })
          ] }),
          currentTimestampInfo && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 pt-4 border-t border-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-400 space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              "フレームID: ",
              currentTimestampInfo.frameId.slice(0, 8),
              "..."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              "タイムスタンプ: ",
              currentTimestampInfo.broadcastTimestamp
            ] })
          ] }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 bg-gray-800 rounded-lg p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium mb-2", children: "リアクション統計" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-400", children: [
        "送信済みリアクション: ",
        reactionsSent
      ] })
    ] })
  ] }) });
};
class ErrorBoundary extends reactExports.Component {
  state = {
    hasError: false
  };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  handleReload = () => {
    window.location.reload();
  };
  handleReset = () => {
    this.setState({ hasError: false, error: void 0 });
  };
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "svg",
          {
            className: "w-16 h-16 text-red-500 mx-auto",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              }
            )
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold text-gray-900 mb-2", children: "エラーが発生しました" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-gray-600 mb-6", children: [
          "申し訳ありません。予期しないエラーが発生しました。",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "ページをリロードするか、しばらく時間をおいて再度お試しください。"
        ] }),
        false,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "secondary",
              onClick: this.handleReset,
              className: "flex-1",
              children: "もう一度試す"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "primary",
              onClick: this.handleReload,
              className: "flex-1",
              children: "ページをリロード"
            }
          )
        ] })
      ] }) });
    }
    return this.props.children;
  }
}
function Footer() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "bg-gray-100 border-t border-gray-200 py-4 mt-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-sm text-gray-600", children: "Copyright © lollol Co.,  Ltd." }) });
}
function LoginView() {
  const [password, setPassword] = reactExports.useState("");
  const [showPassword, setShowPassword] = reactExports.useState(false);
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e2) => {
    e2.preventDefault();
    if (!password.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await login(password);
      if (success) {
        navigate("/");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-2", children: "LolUp Lives" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "笑い声でつながるライブ配信" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-lg p-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold text-gray-900 mb-6 text-center", children: "パスワード認証" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "password",
              className: "block text-sm font-medium text-gray-700 mb-2",
              children: "パスワード"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "password",
                type: showPassword ? "text" : "password",
                value: password,
                onChange: (e2) => setPassword(e2.target.value),
                className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12",
                placeholder: "パスワードを入力",
                disabled: isSubmitting || loading,
                autoFocus: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setShowPassword(!showPassword),
                className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none",
                disabled: isSubmitting || loading,
                "aria-label": showPassword ? "パスワードを隠す" : "パスワードを表示",
                children: showPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" })
                ] })
              }
            )
          ] })
        ] }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 animate-fade-in", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-600", children: error })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            disabled: isSubmitting || loading || !password.trim(),
            className: "w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center",
            children: isSubmitting || loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", fill: "none", viewBox: "0 0 24 24", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
              ] }),
              "ログイン中..."
            ] }) : "ログイン"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-sm text-gray-500", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "アクセスするにはパスワードが必要です" }) })
  ] }) });
}
function ProtectedRoute({ children }) {
  const { authenticated, loading } = useAuth();
  {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
  }
}
try {
  validateConfig();
  validateAuthConfig();
} catch (error) {
  console.error("Configuration error:", error);
}
function App() {
  console.log("🎯 App component rendering...");
  const basename = "/dev/";
  console.log("🔗 Router basename:", basename);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AuthProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(WebRTCProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { basename, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-gray-50 flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "/login", element: /* @__PURE__ */ jsxRuntimeExports.jsx(LoginView, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "/",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(LobbyView, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "/room/:roomId",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SessionView, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "/broadcast/:roomId",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BroadcasterView, {}) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Route,
        {
          path: "/watch/:roomId",
          element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ViewerView, {}) })
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Footer, {})
  ] }) }) }) }) });
}
console.log("🚀 main.tsx loaded");
const rootElement = document.getElementById("root");
console.log("📦 Root element:", rootElement);
if (rootElement) {
  console.log("🎨 Creating React root...");
  clientExports.createRoot(rootElement).render(
    // 一時的にStrictModeを無効化してWebSocket接続をテスト
    // <StrictMode>
    /* @__PURE__ */ jsxRuntimeExports.jsx(App, {})
    // </StrictMode>,
  );
  console.log("✅ React app rendered");
} else {
  console.error("❌ Root element not found!");
}
//# sourceMappingURL=index-DjqTjPi1.js.map

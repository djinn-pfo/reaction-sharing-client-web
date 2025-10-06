# Ion-SFU感情共有システム実装ガイド

## 1. 環境構築

### 1.1 必要な依存関係

#### iOS開発環境
```bash
# Xcode 15.0+
# iOS 16.0+ SDK

# CocoaPods依存関係
pod 'GoogleMLKit/FaceDetection'
pod 'IonSDK-iOS'
pod 'SwiftProtobuf'
pod 'MessagePack.swift'
```

#### バックエンド環境
```bash
# Go 1.21+
go get -u github.com/ionorg/ion-sfu
go get -u github.com/gofiber/fiber/v2
go get -u github.com/nats-io/nats.go

# Python 3.11+
pip install fastapi uvicorn numpy scipy
pip install mediapipe-runtime protobuf msgpack
```

### 1.2 Docker構成
```yaml
version: '3.8'
services:
  ion-sfu:
    image: ionorg/ion-sfu:latest
    ports:
      - "50051:50051"  # gRPC
      - "5000-5200:5000-5200/udp"  # WebRTC
    volumes:
      - ./config/sfu.toml:/config/sfu.toml
    environment:
      - ION_LOG_LEVEL=debug

  emotion-gateway:
    build: ./gateway
    ports:
      - "8080:8080"
    depends_on:
      - ion-sfu
      - redis
      - nats

  emotion-analyzer:
    build: ./analyzer
    depends_on:
      - nats
      - redis
    deploy:
      replicas: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nats:
    image: nats:2.10-alpine
    ports:
      - "4222:4222"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: emotion_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
```

## 2. フロントエンド実装（iOS）

### 2.1 MediaPipeセットアップ

```swift
import MediaPipeTasksVision
import AVFoundation

class FaceLandmarkDetector: ObservableObject {
    private var landmarker: FaceLandmarker?
    private let modelPath = "face_landmarker.task"

    @Published var landmarks: [NormalizedLandmark] = []
    @Published var confidence: Float = 0.0

    init() {
        setupLandmarker()
    }

    private func setupLandmarker() {
        let options = FaceLandmarkerOptions()
        options.runningMode = .liveStream
        options.numFaces = 1
        options.minFaceDetectionConfidence = 0.5
        options.minFacePresenceConfidence = 0.5
        options.minTrackingConfidence = 0.5
        options.outputFaceBlendshapes = true
        options.outputFacialTransformationMatrixes = true

        options.faceLandmarkerLiveStreamDelegate = self

        guard let modelPath = Bundle.main.path(forResource: "face_landmarker", ofType: "task") else {
            print("Failed to load model")
            return
        }

        options.baseOptions.modelAssetPath = modelPath

        do {
            landmarker = try FaceLandmarker(options: options)
        } catch {
            print("Failed to initialize FaceLandmarker: \(error)")
        }
    }

    func processFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let landmarker = landmarker else { return }

        let image = MLImage(sampleBuffer: sampleBuffer)
        image.orientation = .up

        do {
            try landmarker.detectAsync(image: image, timestampInMilliseconds: Int(Date().timeIntervalSince1970 * 1000))
        } catch {
            print("Detection failed: \(error)")
        }
    }
}

extension FaceLandmarkDetector: FaceLandmarkerLiveStreamDelegate {
    func faceLandmarker(_ faceLandmarker: FaceLandmarker, didFinishDetection result: FaceLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {
        guard let result = result,
              let face = result.faceLandmarks.first else { return }

        DispatchQueue.main.async {
            self.landmarks = face.landmarks
            self.confidence = face.categories?.first?.score ?? 0.0
            self.sendLandmarksToServer(face.landmarks, timestamp: timestampInMilliseconds)
        }
    }
}
```

### 2.2 WebRTC DataChannel実装

```swift
import WebRTC
import SwiftProtobuf

class EmotionWebRTCClient: NSObject {
    private var peerConnection: RTCPeerConnection?
    private var landmarkChannel: RTCDataChannel?
    private var emotionChannel: RTCDataChannel?
    private let factory = RTCPeerConnectionFactory()

    func setupPeerConnection(iceServers: [RTCIceServer]) {
        let config = RTCConfiguration()
        config.iceServers = iceServers
        config.bundlePolicy = .maxBundle
        config.rtcpMuxPolicy = .require
        config.continualGatheringPolicy = .gatherContinually

        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )

        peerConnection = factory.peerConnection(with: config, constraints: constraints, delegate: self)
        setupDataChannels()
    }

    private func setupDataChannels() {
        // ランドマーク送信用チャネル
        let landmarkConfig = RTCDataChannelConfiguration()
        landmarkConfig.isOrdered = true
        landmarkConfig.maxRetransmits = 3
        landmarkConfig.channelId = 1

        landmarkChannel = peerConnection?.dataChannel(forLabel: "emotion-landmarks", configuration: landmarkConfig)

        // 感情受信用チャネル
        let emotionConfig = RTCDataChannelConfiguration()
        emotionConfig.isOrdered = false
        emotionConfig.maxPacketLifeTime = 100
        emotionConfig.channelId = 2

        emotionChannel = peerConnection?.dataChannel(forLabel: "emotion-state", configuration: emotionConfig)
    }

    func sendLandmarks(_ landmarks: [NormalizedLandmark], timestamp: Int64) {
        guard let channel = landmarkChannel,
              channel.readyState == .open else { return }

        let packet = EmotionProto.LandmarkPacket.with {
            $0.userID = UserDefaults.standard.string(forKey: "userId") ?? ""
            $0.roomID = currentRoomId
            $0.timestamp = UInt64(timestamp)
            $0.landmarks = landmarks.flatMap { [$0.x, $0.y, $0.z] }
            $0.confidence = calculateConfidence(landmarks)
        }

        do {
            let data = try packet.serializedData()
            let buffer = RTCDataBuffer(data: data, isBinary: true)
            channel.sendData(buffer)
        } catch {
            print("Failed to send landmarks: \(error)")
        }
    }
}

extension EmotionWebRTCClient: RTCDataChannelDelegate {
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard dataChannel.label == "emotion-state" else { return }

        do {
            let emotionState = try EmotionProto.EmotionState(serializedData: buffer.data)
            DispatchQueue.main.async {
                self.updateUserEmotion(emotionState)
            }
        } catch {
            print("Failed to parse emotion state: \(error)")
        }
    }

    private func updateUserEmotion(_ state: EmotionProto.EmotionState) {
        // UIの更新処理
        NotificationCenter.default.post(
            name: .emotionUpdate,
            object: nil,
            userInfo: [
                "userId": state.userID,
                "smileScore": state.smileScore,
                "timestamp": state.timestamp
            ]
        )
    }
}
```

### 2.3 部屋管理UI

```swift
import SwiftUI
import Combine

struct RoomListView: View {
    @StateObject private var roomManager = RoomManager()
    @State private var username = ""
    @State private var isLoggedIn = false
    @State private var showCreateRoom = false

    var body: some View {
        NavigationStack {
            if !isLoggedIn {
                // ログイン画面
                VStack(spacing: 20) {
                    Text("感情共有システム")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    TextField("ユーザー名を入力", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .padding(.horizontal, 40)

                    Button(action: login) {
                        Text("ログイン")
                            .foregroundColor(.white)
                            .frame(width: 200, height: 50)
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                    .disabled(username.isEmpty)
                }
            } else {
                // 部屋一覧画面
                List {
                    ForEach(roomManager.rooms) { room in
                        NavigationLink(destination: EmotionSharingView(room: room)) {
                            RoomRowView(room: room)
                        }
                    }
                }
                .navigationTitle("部屋一覧")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { showCreateRoom.toggle() }) {
                            Image(systemName: "plus")
                        }
                    }
                }
                .sheet(isPresented: $showCreateRoom) {
                    CreateRoomView(roomManager: roomManager)
                }
                .refreshable {
                    await roomManager.fetchRooms()
                }
            }
        }
        .onAppear {
            checkLoginStatus()
        }
    }

    private func login() {
        Task {
            do {
                let token = try await AuthService.shared.login(username: username)
                UserDefaults.standard.set(token, forKey: "authToken")
                UserDefaults.standard.set(username, forKey: "username")
                isLoggedIn = true
                await roomManager.fetchRooms()
            } catch {
                print("Login failed: \(error)")
            }
        }
    }

    private func checkLoginStatus() {
        if UserDefaults.standard.string(forKey: "authToken") != nil {
            isLoggedIn = true
            Task {
                await roomManager.fetchRooms()
            }
        }
    }
}

struct RoomRowView: View {
    let room: Room

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(room.name)
                    .font(.headline)
                Text("\(room.participantCount)/\(room.maxParticipants) 参加中")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            if room.participantCount > 0 {
                EmotionIndicator(averageScore: room.averageEmotionScore)
            }
        }
        .padding(.vertical, 8)
    }
}
```

### 2.4 感情共有画面

```swift
struct EmotionSharingView: View {
    let room: Room
    @StateObject private var emotionManager = EmotionManager()
    @StateObject private var cameraManager = CameraManager()
    @State private var participants: [Participant] = []

    var body: some View {
        ZStack {
            // カメラプレビュー（自分）
            CameraPreview(cameraManager: cameraManager)
                .edgesIgnoringSafeArea(.all)

            VStack {
                // 上部: 参加者の感情状態
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(participants) { participant in
                            ParticipantEmotionView(participant: participant)
                        }
                    }
                    .padding()
                }
                .background(Color.black.opacity(0.3))

                Spacer()

                // 下部: 自分の感情スコア
                VStack(spacing: 8) {
                    Text("笑顔度: \(Int(emotionManager.mySmileScore * 100))%")
                        .font(.headline)
                        .foregroundColor(.white)

                    ProgressView(value: emotionManager.mySmileScore)
                        .progressViewStyle(LinearProgressViewStyle(tint: emotionColor(score: emotionManager.mySmileScore)))
                        .frame(height: 8)
                        .cornerRadius(4)
                }
                .padding()
                .background(Color.black.opacity(0.5))
                .cornerRadius(12)
                .padding()
            }
        }
        .navigationTitle(room.name)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            setupEmotionSharing()
        }
        .onDisappear {
            cleanupEmotionSharing()
        }
    }

    private func setupEmotionSharing() {
        Task {
            // Ion-SFUセッション開始
            await emotionManager.joinRoom(room.id)

            // カメラとランドマーク検出開始
            cameraManager.startSession()
            cameraManager.onFrameCaptured = { sampleBuffer in
                emotionManager.processFrame(sampleBuffer)
            }

            // 参加者リスト更新
            emotionManager.onParticipantUpdate = { updatedParticipants in
                self.participants = updatedParticipants
            }
        }
    }

    private func cleanupEmotionSharing() {
        cameraManager.stopSession()
        emotionManager.leaveRoom()
    }

    private func emotionColor(score: Double) -> Color {
        if score > 0.7 {
            return .green
        } else if score > 0.4 {
            return .yellow
        } else {
            return .orange
        }
    }
}

struct ParticipantEmotionView: View {
    let participant: Participant

    var body: some View {
        VStack(spacing: 4) {
            // アバターまたはイニシャル
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        gradient: Gradient(colors: [emotionGradientStart(participant.smileScore), emotionGradientEnd(participant.smileScore)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 60, height: 60)

                Text(participant.initials)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)

                // 感情インジケーター
                EmotionEmoji(score: participant.smileScore)
                    .offset(x: 20, y: -20)
            }

            Text(participant.name)
                .font(.caption)
                .foregroundColor(.white)
                .lineLimit(1)

            // スコアバー
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 4)
                        .cornerRadius(2)

                    Rectangle()
                        .fill(emotionColor(score: participant.smileScore))
                        .frame(width: geometry.size.width * CGFloat(participant.smileScore), height: 4)
                        .cornerRadius(2)
                        .animation(.easeInOut(duration: 0.3), value: participant.smileScore)
                }
            }
            .frame(height: 4)
        }
        .frame(width: 80)
    }

    private func emotionColor(score: Double) -> Color {
        if score > 0.7 {
            return .green
        } else if score > 0.4 {
            return .yellow
        } else {
            return .orange
        }
    }

    private func emotionGradientStart(_ score: Double) -> Color {
        emotionColor(score: score).opacity(0.8)
    }

    private func emotionGradientEnd(_ score: Double) -> Color {
        emotionColor(score: score)
    }
}

struct EmotionEmoji: View {
    let score: Double

    var emoji: String {
        switch score {
        case 0.8...1.0:
            return "😄"
        case 0.6..<0.8:
            return "😊"
        case 0.4..<0.6:
            return "🙂"
        case 0.2..<0.4:
            return "😐"
        default:
            return "😑"
        }
    }

    var body: some View {
        Text(emoji)
            .font(.system(size: 24))
            .background(Circle().fill(Color.white).frame(width: 30, height: 30))
    }
}
```

## 3. バックエンド実装

### 3.1 Ion-SFU設定

```toml
# config/sfu.toml
[log]
level = "debug"

[webrtc]
# ICE設定
portrange = [5000, 5200]
candidates = ["192.168.1.100", "your-public-ip"]

# STUN/TURNサーバー
[[webrtc.iceserver]]
urls = ["stun:stun.l.google.com:19302"]

[[webrtc.iceserver]]
urls = ["turn:your-turn-server:3478"]
username = "user"
credential = "pass"

[router]
# ビデオ設定
video = true
# 音声設定
audio = true
# データチャネル設定
datachannel = true

# Simulcast設定
[router.simulcast]
enable = true
layers = ["low", "medium", "high"]

[cluster]
# Redisを使用したクラスタリング
enabled = true
redis_addr = "redis:6379"
```

### 3.2 感情ゲートウェイ実装（Go）

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/websocket/v2"
    "github.com/golang-jwt/jwt/v4"
    "github.com/ionorg/ion-sdk-go"
    "github.com/nats-io/nats.go"
    "github.com/redis/go-redis/v9"
)

type EmotionGateway struct {
    app       *fiber.App
    ionClient *ion.Client
    nats      *nats.Conn
    redis     *redis.Client
    rooms     map[string]*Room
}

type Room struct {
    ID           string                 `json:"id"`
    Name         string                 `json:"name"`
    Participants map[string]*Participant `json:"participants"`
    CreatedAt    time.Time              `json:"created_at"`
}

type Participant struct {
    ID         string    `json:"id"`
    Username   string    `json:"username"`
    SmileScore float32   `json:"smile_score"`
    LastUpdate time.Time `json:"last_update"`
    Session    *ion.Session
}

func NewEmotionGateway() *EmotionGateway {
    gateway := &EmotionGateway{
        app:   fiber.New(),
        rooms: make(map[string]*Room),
    }

    // Redis接続
    gateway.redis = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // NATS接続
    nc, err := nats.Connect("nats://localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    gateway.nats = nc

    // Ion-SFU接続
    gateway.ionClient = ion.NewClient(
        ion.WithGRPC("localhost:50051"),
    )

    gateway.setupRoutes()
    gateway.setupSubscriptions()

    return gateway
}

func (g *EmotionGateway) setupRoutes() {
    // 認証ミドルウェア
    g.app.Use("/api", g.authMiddleware)

    // REST API
    g.app.Post("/api/auth/login", g.handleLogin)
    g.app.Get("/api/rooms", g.handleGetRooms)
    g.app.Post("/api/rooms", g.handleCreateRoom)
    g.app.Post("/api/rooms/:roomId/join", g.handleJoinRoom)

    // WebSocket
    g.app.Get("/ws", websocket.New(g.handleWebSocket))
}

func (g *EmotionGateway) handleJoinRoom(c *fiber.Ctx) error {
    roomID := c.Params("roomId")
    userID := c.Locals("userId").(string)

    room, exists := g.rooms[roomID]
    if !exists {
        return c.Status(404).JSON(fiber.Map{
            "error": "Room not found",
        })
    }

    // Ion-SFUセッション作成
    session, err := g.ionClient.Join(roomID, userID)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{
            "error": "Failed to join room",
        })
    }

    // Offer SDP生成
    offer, err := session.CreateOffer()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{
            "error": "Failed to create offer",
        })
    }

    // 参加者追加
    participant := &Participant{
        ID:         userID,
        Username:   c.Locals("username").(string),
        SmileScore: 0,
        LastUpdate: time.Now(),
        Session:    session,
    }
    room.Participants[userID] = participant

    // データチャネル設定
    g.setupDataChannels(session, roomID, userID)

    // レスポンス
    return c.JSON(fiber.Map{
        "sessionId": session.ID(),
        "offer":     offer,
        "iceServers": []fiber.Map{
            {
                "urls": []string{"stun:stun.l.google.com:19302"},
            },
        },
    })
}

func (g *EmotionGateway) setupDataChannels(session *ion.Session, roomID, userID string) {
    // ランドマーク受信チャネル
    session.OnDataChannel(func(dc *ion.DataChannel) {
        if dc.Label() == "emotion-landmarks" {
            dc.OnMessage(func(msg ion.Message) {
                // NATSに転送（解析サービスへ）
                g.nats.Publish("landmarks."+roomID, msg.Data)
            })
        }
    })

    // 感情状態配信用サブスクリプション
    sub, _ := g.nats.Subscribe("emotions."+roomID, func(msg *nats.Msg) {
        var emotionState EmotionState
        json.Unmarshal(msg.Data, &emotionState)

        // 該当ユーザーの感情状態更新
        if participant, exists := g.rooms[roomID].Participants[emotionState.UserID]; exists {
            participant.SmileScore = emotionState.SmileScore
            participant.LastUpdate = time.Now()

            // 部屋の全参加者に配信
            g.broadcastToRoom(roomID, emotionState)
        }
    })

    // セッション終了時のクリーンアップ
    session.OnClose(func() {
        sub.Unsubscribe()
        delete(g.rooms[roomID].Participants, userID)
    })
}

func (g *EmotionGateway) broadcastToRoom(roomID string, emotionState EmotionState) {
    room := g.rooms[roomID]
    data, _ := json.Marshal(emotionState)

    for _, participant := range room.Participants {
        if participant.Session != nil {
            // emotion-stateチャネルで送信
            participant.Session.SendDataChannel("emotion-state", data)
        }
    }
}
```

### 3.3 感情解析サービス（Python）

```python
import asyncio
import json
import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime

import mediapipe as mp
from fastapi import FastAPI
from nats.aio.client import Client as NATS
import redis.asyncio as redis
import msgpack

app = FastAPI()

@dataclass
class EmotionState:
    user_id: str
    smile_score: float
    confidence: float
    timestamp: int
    emotions: Dict[str, float]

class EmotionAnalyzer:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # 感情スコアの履歴（平滑化用）
        self.score_history: Dict[str, List[float]] = {}
        self.history_size = 10

        # 顔のAction Unit関連のランドマークインデックス
        self.mouth_landmarks = [61, 84, 17, 314, 405, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78]
        self.eye_landmarks = [33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380]
        self.cheek_landmarks = [35, 31, 48, 115, 131, 102, 204, 206, 214, 234, 93, 132]

    def extract_features(self, landmarks: np.ndarray) -> Dict[str, float]:
        """ランドマークから特徴量を抽出"""
        features = {}

        # 口角の角度
        mouth_left = landmarks[61]
        mouth_right = landmarks[291]
        mouth_center = landmarks[13]

        angle_left = self._calculate_angle(mouth_center, mouth_left)
        angle_right = self._calculate_angle(mouth_center, mouth_right)
        features['mouth_angle'] = (angle_left + angle_right) / 2

        # 口の開き具合
        upper_lip = landmarks[13]
        lower_lip = landmarks[14]
        features['mouth_openness'] = np.linalg.norm(upper_lip - lower_lip)

        # 目の細まり具合
        left_eye_height = np.linalg.norm(landmarks[159] - landmarks[145])
        right_eye_height = np.linalg.norm(landmarks[386] - landmarks[374])
        features['eye_squint'] = 1 - (left_eye_height + right_eye_height) / 2

        # 頬の持ち上がり
        left_cheek_lift = landmarks[35][1] - landmarks[31][1]
        right_cheek_lift = landmarks[206][1] - landmarks[214][1]
        features['cheek_raise'] = (left_cheek_lift + right_cheek_lift) / 2

        # 顔全体の動き
        features['face_motion'] = self._calculate_motion(landmarks)

        return features

    def calculate_smile_score(self, features: Dict[str, float], user_id: str) -> float:
        """特徴量から笑顔スコアを計算"""
        # 重み付き線形結合
        weights = {
            'mouth_angle': 0.35,
            'mouth_openness': 0.15,
            'eye_squint': 0.2,
            'cheek_raise': 0.2,
            'face_motion': 0.1
        }

        raw_score = sum(
            weights.get(k, 0) * self._normalize_feature(k, v)
            for k, v in features.items()
        )

        # スコアを0-1に正規化
        raw_score = np.clip(raw_score, 0, 1)

        # 時系列平滑化
        if user_id not in self.score_history:
            self.score_history[user_id] = []

        self.score_history[user_id].append(raw_score)
        if len(self.score_history[user_id]) > self.history_size:
            self.score_history[user_id].pop(0)

        # 指数移動平均
        alpha = 0.3
        smoothed_score = raw_score
        for hist_score in reversed(self.score_history[user_id][:-1]):
            smoothed_score = alpha * smoothed_score + (1 - alpha) * hist_score

        return smoothed_score

    def _normalize_feature(self, feature_name: str, value: float) -> float:
        """特徴量を0-1に正規化"""
        normalization_params = {
            'mouth_angle': (0, 30),  # 角度（度）
            'mouth_openness': (0, 0.05),  # 距離（正規化座標）
            'eye_squint': (0, 1),  # 既に正規化済み
            'cheek_raise': (-0.02, 0.02),  # Y座標差
            'face_motion': (0, 0.1)  # 動き量
        }

        min_val, max_val = normalization_params.get(feature_name, (0, 1))
        normalized = (value - min_val) / (max_val - min_val)
        return np.clip(normalized, 0, 1)

    def _calculate_angle(self, p1: np.ndarray, p2: np.ndarray) -> float:
        """2点間の角度を計算（度）"""
        delta = p2 - p1
        angle_rad = np.arctan2(delta[1], delta[0])
        angle_deg = np.degrees(angle_rad)
        return abs(angle_deg)

    def _calculate_motion(self, landmarks: np.ndarray) -> float:
        """前フレームとの差分から動き量を計算"""
        # TODO: 前フレームのランドマークを保持して差分計算
        return 0.05  # 仮の値

    def detect_emotions(self, features: Dict[str, float]) -> Dict[str, float]:
        """複数の感情を検出"""
        emotions = {
            'happiness': 0.0,
            'surprise': 0.0,
            'neutral': 0.0,
            'sadness': 0.0,
            'anger': 0.0
        }

        # 簡易的な感情分類（実際はMLモデルを使用）
        if features['mouth_angle'] > 0.5 and features['cheek_raise'] > 0.5:
            emotions['happiness'] = 0.8
            emotions['neutral'] = 0.2
        elif features['mouth_openness'] > 0.7:
            emotions['surprise'] = 0.7
            emotions['happiness'] = 0.3
        else:
            emotions['neutral'] = 0.8
            emotions['happiness'] = 0.2

        return emotions

class EmotionService:
    def __init__(self):
        self.analyzer = EmotionAnalyzer()
        self.nats_client = None
        self.redis_client = None

    async def connect(self):
        """外部サービスへの接続"""
        self.nats_client = NATS()
        await self.nats_client.connect("nats://localhost:4222")

        self.redis_client = redis.Redis(host='localhost', port=6379)

    async def process_landmarks(self, data: bytes, room_id: str):
        """ランドマークデータを処理"""
        try:
            # データのデコード
            packet = msgpack.unpackb(data)
            user_id = packet['user_id']
            timestamp = packet['timestamp']
            landmarks_flat = packet['landmarks']
            confidence = packet['confidence']

            # ランドマークを468x3の配列に整形
            landmarks = np.array(landmarks_flat).reshape(-1, 3)

            # 特徴量抽出
            features = self.analyzer.extract_features(landmarks)

            # 笑顔スコア計算
            smile_score = self.analyzer.calculate_smile_score(features, user_id)

            # 感情検出
            emotions = self.analyzer.detect_emotions(features)

            # 結果をEmotionStateにまとめる
            emotion_state = EmotionState(
                user_id=user_id,
                smile_score=smile_score,
                confidence=confidence,
                timestamp=timestamp,
                emotions=emotions
            )

            # Redisにキャッシュ
            cache_key = f"emotion:{room_id}:{user_id}"
            await self.redis_client.setex(
                cache_key,
                60,  # 60秒TTL
                json.dumps(emotion_state.__dict__)
            )

            # NATSで配信
            await self.nats_client.publish(
                f"emotions.{room_id}",
                json.dumps(emotion_state.__dict__).encode()
            )

            # メトリクス更新
            await self.update_metrics(room_id, smile_score)

        except Exception as e:
            print(f"Error processing landmarks: {e}")

    async def update_metrics(self, room_id: str, smile_score: float):
        """部屋ごとのメトリクスを更新"""
        # 移動平均の更新
        key = f"metrics:{room_id}:avg_smile"
        current = await self.redis_client.get(key)

        if current:
            current_val = float(current)
            new_val = current_val * 0.9 + smile_score * 0.1
        else:
            new_val = smile_score

        await self.redis_client.setex(key, 300, str(new_val))

    async def start_processing(self):
        """メッセージ処理を開始"""
        await self.connect()

        # すべての部屋のランドマークをサブスクライブ
        await self.nats_client.subscribe("landmarks.*", cb=self.landmark_handler)

        print("Emotion analysis service started")

    async def landmark_handler(self, msg):
        """NATSメッセージハンドラ"""
        subject_parts = msg.subject.split('.')
        room_id = subject_parts[1] if len(subject_parts) > 1 else 'unknown'

        await self.process_landmarks(msg.data, room_id)

# FastAPIアプリケーション
service = EmotionService()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(service.start_processing())

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/metrics/{room_id}")
async def get_room_metrics(room_id: str):
    """部屋のメトリクスを取得"""
    avg_smile = await service.redis_client.get(f"metrics:{room_id}:avg_smile")
    participants = await service.redis_client.keys(f"emotion:{room_id}:*")

    return {
        "room_id": room_id,
        "average_smile_score": float(avg_smile) if avg_smile else 0,
        "participant_count": len(participants),
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 4. デプロイメント

### 4.1 Kubernetes設定

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ion-sfu
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ion-sfu
  template:
    metadata:
      labels:
        app: ion-sfu
    spec:
      containers:
      - name: ion-sfu
        image: your-registry/ion-sfu:latest
        ports:
        - containerPort: 50051
          protocol: TCP
        - containerPort: 5000
          protocol: UDP
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: ion-sfu-service
spec:
  selector:
    app: ion-sfu
  type: LoadBalancer
  ports:
  - name: grpc
    port: 50051
    targetPort: 50051
  - name: webrtc
    port: 5000
    protocol: UDP
    targetPort: 5000
```

### 4.2 モニタリング設定

```yaml
# prometheus/config.yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'emotion-gateway'
    static_configs:
      - targets: ['gateway:8080']

  - job_name: 'emotion-analyzer'
    static_configs:
      - targets: ['analyzer:8000']

  - job_name: 'ion-sfu'
    static_configs:
      - targets: ['ion-sfu:9090']
```

## 5. テスト実装

### 5.1 統合テスト

```swift
// EmotionSystemTests.swift
import XCTest
@testable import EmotionSharingApp

class EmotionSystemTests: XCTestCase {
    var sut: EmotionManager!

    override func setUp() {
        super.setUp()
        sut = EmotionManager()
    }

    func testLandmarkProcessing() async throws {
        // Mock landmarks
        let mockLandmarks = generateMockLandmarks()

        // Process
        let result = await sut.processLandmarks(mockLandmarks)

        // Assert
        XCTAssertNotNil(result)
        XCTAssertTrue(result.smileScore >= 0 && result.smileScore <= 1)
        XCTAssertTrue(result.confidence >= 0 && result.confidence <= 1)
    }

    func testWebRTCConnection() async throws {
        // Setup
        let roomId = "test-room"
        let expectation = XCTestExpectation(description: "WebRTC connected")

        // Connect
        await sut.joinRoom(roomId)

        // Wait for connection
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            XCTAssertNotNil(self.sut.peerConnection)
            XCTAssertEqual(self.sut.connectionState, .connected)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 5.0)
    }

    func testEmotionBroadcast() async throws {
        // Setup room with multiple participants
        let room = await createTestRoom(participantCount: 3)

        // Send emotion update
        let emotionUpdate = EmotionState(
            userId: "user1",
            smileScore: 0.8,
            timestamp: Date().timeIntervalSince1970
        )

        await sut.broadcastEmotion(emotionUpdate, to: room)

        // Verify all participants received update
        for participant in room.participants {
            XCTAssertEqual(participant.lastEmotionUpdate?.smileScore, 0.8)
        }
    }
}
```

## 6. 運用・保守

### 6.1 ログ設定

```python
# logging_config.py
import logging
from pythonjsonlogger import jsonlogger

def setup_logging():
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        fmt='%(asctime)s %(levelname)s %(name)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    logHandler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.addHandler(logHandler)
    logger.setLevel(logging.INFO)

    return logger

logger = setup_logging()
```

### 6.2 バックアップ・リカバリ

```bash
#!/bin/bash
# backup.sh

# PostgreSQLバックアップ
pg_dump -h localhost -U admin -d emotion_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Redisバックアップ
redis-cli BGSAVE

# S3アップロード
aws s3 cp backup_*.sql s3://emotion-backups/postgres/
aws s3 cp /var/lib/redis/dump.rdb s3://emotion-backups/redis/
```

この実装ガイドで、Ion-SFUを使った感情共有システムの主要コンポーネントを構築できます。
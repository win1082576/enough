# 夠了 Enough — 安裝與設定指南

## 1. 安裝 Node.js

前往 https://nodejs.org/ 下載並安裝 LTS 版本（建議 v20+）

## 2. 安裝依賴套件

在專案資料夾開啟終端機（Terminal / PowerShell），執行：

```bash
npm install
```

## 3. 設定 Firebase

### 3a. 建立 Firebase 專案
1. 前往 https://console.firebase.google.com/
2. 新增專案（任意名稱，例如 `enough-retirement`）
3. 停用 Google Analytics（個人用途不需要）

### 3b. 啟用 Firestore
1. 左側選單 → Firestore Database → 建立資料庫
2. 選擇「以正式模式啟動」（之後會套用安全規則）
3. 選擇離你最近的區域（例如 `asia-east1`）

### 3c. 啟用 Authentication
1. 左側選單 → Authentication → 開始使用
2. 登入方式 → 匿名 → 啟用

### 3d. 取得 Web App 設定
1. 專案設定（齒輪圖示）→ 一般 → 您的應用程式 → 新增應用程式（Web）
2. 複製 firebaseConfig 物件

### 3e. 填入設定
開啟 `src/firebase.js`，將 `firebaseConfig` 的 placeholder 換成你的實際值：

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
}
```

### 3f. 套用安全規則
```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # 選擇你的專案，使用現有的 firestore.rules
firebase deploy --only firestore:rules
```

或直接在 Firebase Console → Firestore → 規則 貼上 `firestore.rules` 的內容。

## 4. 本地開發

```bash
npm run dev
```

開啟瀏覽器前往 http://localhost:5173

## 5. 部署到 Vercel

```bash
npm install -g vercel
vercel
```

或：
1. 將專案 push 到 GitHub
2. 前往 https://vercel.com/ 連結 GitHub repo
3. 自動部署

## 6. PWA 安裝

在 Chrome / Safari 開啟部署後的網址，網址列會出現「安裝」按鈕，或從瀏覽器選單「加入主畫面」。

---

## 專案結構

```
src/
├── main.jsx          # React 進入點
├── App.jsx           # 路由設定
├── index.css         # 設計系統（顏色、字體、元件）
├── firebase.js       # Firebase 設定
├── components/
│   ├── Navbar.jsx
│   └── Navbar.css
└── pages/
    ├── Landing.jsx / .css     # 入口頁
    ├── Philosophy.jsx / .css  # 理念頁
    ├── Simulator.jsx / .css   # 模擬器（Monte Carlo 引擎）
    ├── TravelMap.jsx / .css   # 旅居地圖（Firebase）
    ├── About.jsx / .css       # 關於頁
    └── FAQ.jsx / .css         # 概念說明頁

public/
├── icon-192.svg      # PWA 圖標（192px）
├── icon-512.svg      # PWA 圖標（512px）
└── manifest.json     # PWA Manifest
```

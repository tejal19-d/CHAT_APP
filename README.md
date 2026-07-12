# Chatty - Real-Time Enterprise Chat Application

Chatty is a secure, real-time, production-ready messaging platform built on top of the **MERN (MongoDB, Express, React, Node.js)** stack. The application provides instantaneous user-to-user and group communication, featuring robust state synchronization, real-time typing indicators, read receipts, and user presence tracking.

## 🚀 Live Deployment & GitHub Repository
- **Backend/Frontend Monorepo Deployment (Render):** *[Insert your Render deployment URL here]*
- **GitHub Repository Link:** *[Insert your GitHub repository link here]*

---

## 🛠️ Technology Stack

### Backend & Real-Time Gateway
* **Node.js (v18+) & Express.js:** Scalable server architecture.
* **Socket.io:** WebSockets framework for instantaneous bi-directional event broadcasts.
* **MongoDB & Mongoose ODM:** Flexible schema modeling, database indexing, and query operations.
* **Cloudinary API:** Secure media store for profile pictures, voice notes, and file attachments.
* **Winston & Morgan:** Structured JSON logging system for operational intelligence.

### Frontend Client
* **React & Vite:** High-performance Single Page Application (SPA) development with Fast Refresh.
* **Zustand:** Lightweight, reactive global store management for state synchronization.
* **Tailwind CSS & DaisyUI:** Responsive, WhatsApp-inspired modern UI styling (Light/Dark themes support).
* **React Hot Toast & Lucide React:** User notifications and lightweight icon packs.

---

## 📁 Repository Structure

```filepath
CHAT_APP/
├── backend/                  # Express REST API & Socket.io Server
│   ├── src/
│   │   ├── controllers/      # Route controllers (Auth, Messages, Groups, Sessions)
│   │   ├── lib/              # Shared utility integrations (DB connection, Socket initialization, Logging)
│   │   ├── middlewares/      # JWT verification, API rate limiting, Input sanitization
│   │   ├── models/           # Mongoose schemas (User, Message, Group, Session)
│   │   ├── routes/           # Router mappings
│   │   └── index.js          # Node.js Server Entry Point
│   ├── package.json
│   └── README.md
├── frontend/
│   └── chat_app/             # React SPA (Vite-built)
│       ├── src/
│       │   ├── components/   # UI elements (ChatContainer, Sidebar, Navbar, EmojiPicker)
│       │   ├── pages/        # Router pages (Home, Login, SignUp, Profile, Settings)
│       │   ├── store/        # Zustand state stores (useAuthStore, useChatStore, useThemeStore)
│       │   ├── lib/          # Axios custom client configurations
│       │   └── main.jsx      # React Client Entry Point
│       ├── package.json
│       └── README.md
├── package.json              # Monorepo Orchestration Scripts
└── README.md                 # Root Architectural Documentation (This file)
```

---

## ⚙️ Environment Variables Required

Create a `.env` file inside the `backend` folder with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_signing_key
NODE_ENV=development # Set to 'production' for live build serving
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:5173
```

---

## 🏁 Setup & Run Instructions

The workspace has root scripts configured to install dependencies and run both apps concurrently or independently.

### Option A: Running from the Monorepo Root (Recommended)

1. **Install all dependencies** (Backend & Frontend):
   ```bash
   npm run build
   ```
   *This triggers nested npm installations and builds the optimized frontend static package.*

2. **Start the applications**:
   * **Development Mode (Concurrent):**
     Create/configure `.env` in the `backend/` directory, then start the servers. You can run the backend server (`npm run dev` inside `/backend`) and frontend dev server (`npm run dev` inside `/frontend/chat_app`) concurrently.
   * **Production Server Serving Frontend Static Build:**
     Ensure `NODE_ENV=production` is set in `/backend/.env`.
     Run:
     ```bash
     npm start
     ```
     This starts the Node backend which serves the built React app statically from `/frontend/chat_app/dist`.

---

### Option B: Running Projects Separately

#### 1. Backend Server Setup
1. Navigate to `/backend`:
   ```bash
   cd backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server (runs with `nodemon` on `http://localhost:5001`):
   ```bash
   npm run dev
   ```

#### 2. Frontend React Client Setup
1. Navigate to `/frontend/chat_app`:
   ```bash
   cd frontend/chat_app
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

---

## 📡 Real-Time Socket.io Event Map

Communication between the React client and the Express backend is coordinated through these custom Socket events:

| Socket Event | Direction | Description |
| :--- | :--- | :--- |
| `connection` | Client $\rightarrow$ Server | Initiated during authentication. Associates the user's Mongoose ID with the `socket.id`. |
| `getOnlineUsers` | Server $\rightarrow$ Client | Broadcasts an array of all active User IDs to show green online/offline statuses. |
| `joinGroup` / `leaveGroup` | Client $\rightarrow$ Server | Handles room assignment for active group channels. |
| `activityState` | Client $\rightarrow$ Server | Sends status notifications (e.g., `typing`, `recording`, `uploading`, `downloading`). |
| `userActivityState` | Server $\rightarrow$ Client | Distributes typing/recording indicators directly to targeted chat windows. |
| `newMessage` | Server $\rightarrow$ Client | Instantly delivers a new message object containing text/media metadata to the recipient. |
| `messagesRead` | Server $\rightarrow$ Client | Signals the sender that their sent messages have been read (triggers double blue checkmarks). |
| `messageUpdate` | Server $\rightarrow$ Client | Syncs real-time events like *Delete for Everyone*, *Reactions*, or *Message Edits*. |
| `disconnect` | Client $\rightarrow$ Server | Clears active socket connection mappings and updates everyone's online list. |

---

## 🎨 Design Decisions

1. **WhatsApp Web Aesthetics (Tailwind CSS + DaisyUI):**
   * Designed to match WhatsApp's visual hierarchy: chat wallpaper background (#efeae2 in light, dark slate in dark mode), customized bubble colors, sidebar sorting by most recent message, and green badges indicating unread counts.
2. **State Management via Zustand:**
   * Used Zustand over Redux/Context to keep the real-time client responsive. Zustand allows React components to subscribe selectively to updates (such as messages, online users, or activity states) without unnecessary page re-renders.
3. **Monorepo Deployability (Render):**
   * Configured the monorepo scripts so that platforms like Render can deploy both components together. In production, Express serves Vite's build bundle (`/frontend/chat_app/dist`) statically.
4. **Security & Validation Controls:**
   * Incorporated Helmet headers, rate-limiting, and an input sanitizer middleware to prevent MongoDB query injections (by purging `$`/`.` prefix properties in request payloads).

---

## 💡 Assumptions Made

* **Dummy/Simulated Profile Up: Default Avatars**
  * If a user does not configure a profile photo or avatar during signup, they are automatically assigned a stylized initial placeholder. Cloudinary is configured to process profile updates dynamically.
* **Persistent History:**
  * Message history is permanently saved to a MongoDB Atlas cluster, making messages viewable after browser refreshes.
* **Network Interruption Resilience:**
  * The application monitors browser connectivity (`online`/`offline` window events) and displays a header warning banner if the client loses connection to the socket server.

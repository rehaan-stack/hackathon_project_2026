# RECALL — AI Incident Response Agent That Learns From Experience

> **"Every incident teaches the next one how to resolve itself."**

Built for **HackwithHyderabad 3.0**, **RECALL** is an autonomous AI incident-response platform that investigates production outages, recalls relevant historical postmortems using **Hindsight persistent memory**, recommends actionable remediation playbooks, and learns from the outcome of every incident to continuously improve future investigations.

---

## 🚀 The Core Innovation: The Hindsight Learning Loop

Traditional incident response relies on fragmented tribal knowledge, outdated runbooks, and buried Slack threads. When outages repeat, on-call engineers often waste hours rediscovering the same root causes.

RECALL transforms incident response into a closed-loop learning system powered by **Hindsight**:

```
[ Incident 1 Occurs ]
        ↓
[ AI Agent Investigates Telemetry & Diagnostics ]
        ↓
[ Agent Formulates Initial Hypothesis & Remediation ]
        ↓
[ SRE Resolves & Marks Outcome (Successful / Partial / Failed) ]
        ↓
[ Postmortem, Root Cause, & Lessons Stored in Hindsight ]
        ↓
[ Similar Incident 2 Strikes Later ]
        ↓
[ Hindsight Semantically Recalls Incident 1 ]
        ↓
[ UI Alerts: "Previously Encountered Pattern Detected" ]
        ↓
[ Agent Cites Historical Fix & Proposes Proven Mitigation in Seconds ]
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       RECALL Console                        │
│   (Next.js 16 + React 19 + Tailwind CSS + Dark Console UI)  │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
        Telemetry & Logs                Memory Queries
               ↓                               ↓
┌───────────────────────────────┐  ┌───────────────────────────┐
│     AI Investigation Agent    │  │  Hindsight Memory Engine  │
│  - Multi-stage diagnostic     │←─│  - retain()               │
│  - Hypothesis synthesis       │  │  - recall()               │
│  - Playbook generation        │  │  - reflect()              │
└──────────────┬────────────────┘  └───────────────────────────┘
               │                               ↑
               └────── Proven Resolution ──────┘
                      (Autonomous Learning)
```

### Key Subsystems:
1. **AI Investigation Workspace (`/investigation`)**:
   - Split-screen telemetry diagnostics and real-time Hindsight memory panel.
   - Stage progression tracker: Symptom parsing → Hindsight query → Pattern cross-referencing → Root cause synthesis → Mitigation plan.
   - Interactive resolution modal to verify fixes and trigger automatic retention into Hindsight.

2. **Memory Intelligence & Knowledge Graph (`/memory`)**:
   - Visual Learning Timeline tracking the propagation of experiences from first occurrence to recurrence mitigation.
   - Interactive semantic query sandbox to test Hindsight memory retrieval in real-time.
   - Postmortem inventory indexed with failure signatures and lessons learned.

3. **10-Step Interactive Learning Demo (`/demo`)**:
   - Cinematic guided walkthrough proving that the agent actually remembers and leverages past experiences.

4. **Production Overview & Operations Dashboard (`/`)**:
   - Real-time telemetry, active SEV counts, MTTR reduction trends, and live incident feed.

5. **Operational Analytics (`/analytics`)**:
   - 30-day MTTR trend, recurring failure signatures, and service memory coverage.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```bash
# Hindsight Persistent Memory Engine
HINDSIGHT_BASE_URL=http://localhost:8888
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=incident-response-bank

# Firebase Authentication + Firestore user profiles
# Firebase console > Project settings > Your apps > Web app
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Firebase Admin SDK (server-only service-account credentials)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional External AI Provider
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
```

> **Zero-Setup Fallback Note:** If external Hindsight credentials are not present, RECALL automatically activates its in-memory fallback provider (`DemoMemoryProvider`). The application remains 100% functional, responsive, and verifiable out of the box.

### Firebase setup

1. Create a Firebase project, register a **Web app**, and copy its configuration into the `NEXT_PUBLIC_FIREBASE_*` variables above.
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**. Add your local and production domains under **Authentication → Settings → Authorized domains**.
3. Create a Cloud Firestore database. RECALL creates or updates a `users/{uid}` profile document after a successful sign-in.
4. In Google Cloud IAM, create a Firebase Admin service-account key and set its project ID, client email, and private key in the three `FIREBASE_*` server-only variables. Do not commit these credentials.

The included [`firestore.rules`](firestore.rules) denies all direct browser access because profiles are written only through the Firebase Admin SDK. Deploy it with the Firebase CLI if this is the intended access model.

The browser receives only Firebase's public Web config. The server verifies each Firebase session cookie before using it, and the hard-coded demo account is not available.

---

## 🛠️ Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```

3. **Open RECALL in Browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing the Critical User Journey

RECALL comes equipped with automated tests and Playwright end-to-end test verification.

### Run Automated E2E Tests:
```bash
npx playwright test
```

### Manual Critical User Journey Verification:
1. Open the **Overview Dashboard** (`/`).
2. Click **RUN LEARNING DEMO** in the header or sidebar (`/demo`).
3. Click **START DEMO LOOP**.
4. Step through **Phase 1 (Incident 1)**: Observe the agent investigating a cold-start latency spike without prior precedent.
5. Advance to **Step 6 & 7**: Confirm the resolution and watch the experience get saved into Hindsight.
6. Step through **Phase 2 (Incident 2)**: Observe the agent detecting:
   > *"Previously encountered pattern detected."*
7. Inspect the memory panel showing **96% match with INC-1090**, proving that the system learned from experience!

---

## 🔒 Security & Privacy

- All memory client requests, Hindsight tokens, and AI integrations execute strictly server-side within Next.js Route Handlers.
- API keys are never leaked to client bundles.
- Safe structured parsing with strict schema validation.

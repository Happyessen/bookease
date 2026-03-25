# 📅 BookEase MCP Server
### A complete appointment booking system that runs inside ChatGPT

---

## 🗂️ Project Structure

```
bookease/
├── src/
│   ├── index.js          ← Main server (start here)
│   ├── tools.js          ← All ChatGPT tools (book, cancel, etc.)
│   ├── db.js             ← Database functions (Supabase)
│   ├── notifications.js  ← SMS via Termii
│   └── utils.js          ← Helper functions
├── db/
│   └── schema.sql        ← Run this in Supabase to create tables
├── .env.example          ← Copy this to .env and fill in your keys
├── package.json
├── railway.toml          ← Deployment config
└── README.md
```

---

## 🚀 STEP-BY-STEP SETUP GUIDE

### STEP 1 — Install Node.js
Download from https://nodejs.org (choose LTS version)

Verify it works:
```bash
node --version   # should show v18 or higher
npm --version
```

---

### STEP 2 — Download This Project
```bash
# Clone or download the project, then:
cd bookease
npm install
```

---

### STEP 3 — Set Up Supabase (Your Database)

1. Go to https://supabase.com and create a free account
2. Click **"New Project"** — give it a name like "bookease"
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** → **New Query**
5. Copy the entire contents of `db/schema.sql` and paste it in
6. Click **"Run"** — this creates your tables and adds sample data
7. Go to **Settings → API**
8. Copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon/public key** → this is your `SUPABASE_KEY`

---

### STEP 4 — Set Up Termii (SMS — Optional but Recommended)

1. Go to https://termii.com and create an account
2. Go to **API Keys** and copy your key
3. This is your `TERMII_API_KEY`
4. Your `TERMII_SENDER_ID` can be anything like "BookEase"

> 💡 If you skip this step, the app still works — SMS just won't send.

---

### STEP 5 — Configure Your Environment

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` in any text editor (Notepad, VS Code, etc.) and fill it in:

```env
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TERMII_API_KEY=TLxxxxxxxxxxxx
TERMII_SENDER_ID=BookEase
PORT=3000
BUSINESS_NAME=My Barbershop
```

---

### STEP 6 — Run Locally (Test It)

```bash
npm start
```

You should see:
```
🚀 BookEase MCP Server running on port 3000
📡 SSE endpoint: http://localhost:3000/sse
💊 Health check: http://localhost:3000/
✅ Ready for ChatGPT connections!
```

Open http://localhost:3000 in your browser — you'll see your server info.

---

### STEP 7 — Deploy to Railway (Make It Live)

Railway gives you a free public URL so ChatGPT can reach your server.

1. Go to https://railway.app and sign up (free)
2. Install the Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Login and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```
4. Add your environment variables in Railway Dashboard:
   - Go to your project → **Variables**
   - Add each line from your `.env` file
5. Your server is now live at something like:
   `https://bookease-production.up.railway.app`

---

### STEP 8 — Connect to ChatGPT

1. Go to https://chatgpt.com
2. Click your profile picture → **Settings**
3. Go to **Connectors** (or **Apps** depending on your plan)
4. Click **"Add MCP Server"** or **"Connect App"**
5. Enter your Railway URL: `https://bookease-production.up.railway.app/sse`
6. ChatGPT will auto-discover all 6 tools

---

### STEP 9 — Test It in ChatGPT

Try saying:
- *"What services does BookEase offer?"*
- *"I want to book a haircut next Monday"*
- *"Show me available slots for March 30"*
- *"Book me with Emeka at 10am tomorrow for a beard trim. My name is Chidi, 08012345678"*
- *"Show me all my appointments"*
- *"Cancel my appointment"*

---

### STEP 10 — Submit to ChatGPT App Store (Optional)

Once your app is working and deployed:

1. Go to https://developers.openai.com/apps-sdk/deploy/submission
2. Fill in:
   - App name: BookEase
   - Description: Book appointments directly in ChatGPT
   - MCP URL: your Railway URL
   - Icon, screenshots
3. Submit for review (~1-2 weeks)
4. Once approved, anyone can find and use your app in ChatGPT!

---

## 🔧 The 6 Tools ChatGPT Can Use

| Tool | What It Does |
|------|-------------|
| `get_services` | Lists all services + prices |
| `get_staff` | Lists all staff members |
| `get_available_slots` | Shows free time slots for a date |
| `book_appointment` | Creates a new booking + sends SMS |
| `get_appointments` | Retrieves bookings |
| `cancel_appointment` | Cancels a booking + sends SMS |

---

## 🛠️ Customizing for Your Business

**Change services/staff:**
Go to Supabase → Table Editor → `services` or `staff` table and edit directly.

**Change time slots:**
Edit `ALL_SLOTS` in `src/utils.js`

**Change working hours:**
Filter `ALL_SLOTS` based on the day of the week in `tools.js`

**Add payment (Paystack):**
In `book_appointment` handler in `tools.js`, add a Paystack payment link before confirming.

---

## 💡 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot find module` | Run `npm install` |
| `Missing SUPABASE_URL` | Check your `.env` file |
| `SSE not connecting` | Make sure PORT is correct on Railway |
| SMS not sending | Check Termii API key and phone format |
| Slot shows as booked | Check Supabase appointments table |

---

## 📞 Need Help?
Check the OpenAI Apps SDK docs: https://developers.openai.com/apps-sdk

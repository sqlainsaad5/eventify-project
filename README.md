# Eventify - Modern Event Orchestration Platform

Eventify is a comprehensive platform designed to streamline event planning, vendor management, and financial orchestration. Built with a modern tech stack, it offers a powerful dashboard for organizers and a seamless experience for vendors.

## 🚀 Tech Stack

- **Frontend:** Next.js, React, Redux Toolkit, TailwindCSS, Lucide React
- **Backend:** Flask, Flask-SQLAlchemy, Flask-JWT-Extended
- **Database:** SQLite (Development)
- **Integrations:** Stripe (Payments), OpenAI (Chatbot), Google OAuth

## 📁 Project Structure

```text
eventify-project/
├── eventify-app/       # Next.js Frontend
└── eventify-backend/   # Flask Backend
```

## 🛠️ Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd eventify-backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your API keys (OpenAI, Stripe, Google, Mail)
5. Run the server:
   ```bash
   python run.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd eventify-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env.local` file
   - Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Run the development server:
   ```bash
   npm run dev
   ```

## 🔐 Security Note

**Never commit your `.env` or `.env.local` files.** These files contain sensitive API keys and secrets. They are already added to the `.gitignore` files in their respective directories.

## 📄 License

MIT License

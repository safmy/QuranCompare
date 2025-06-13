# QuranOnlyStudies - Advanced Quran Study Application

A comprehensive web application for studying the Quran with advanced features including multi-translation comparison, AI-powered semantic search, manuscript analysis, and more.

## 🌐 Live Application

Visit: [https://quranonlystudies.app](https://quranonlystudies.app)

## ✨ Features

- **Multi-Translation Comparison**: Compare verses across multiple authorized translations
- **AI-Powered Semantic Search**: Search by meaning and context, not just keywords
- **Voice Search**: Speak your queries for instant results
- **Manuscript Analysis**: Explore mathematical patterns and verse statistics
- **Root Word Analysis**: Study Arabic root words and their occurrences
- **AI Debater Bot**: Engage with an AI assistant trained on Submission principles
- **Dark Mode**: Eye-friendly interface for extended study sessions

## 🚀 Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/safmy/QuranCompare.git
cd QuranCompare
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with required environment variables:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=your_api_url
```

4. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

## 📱 iOS App Development

### Building for iOS

1. Install Capacitor dependencies:
```bash
npm run ios:setup
```

2. Build and sync with iOS:
```bash
npm run ios:build
```

3. Open in Xcode:
```bash
npm run ios:open
```

## 🛠️ Available Scripts

- `npm start` - Run development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run ios:setup` - Setup iOS dependencies
- `npm run ios:build` - Build and sync iOS app
- `npm run ios:open` - Open project in Xcode

## 📂 Project Structure

```
QuranCompare/
├── src/
│   ├── components/     # React components
│   ├── contexts/       # Context providers
│   ├── data/          # Static data files
│   ├── utils/         # Utility functions
│   └── config/        # Configuration files
├── public/            # Public assets
├── api/              # Backend API (separate deployment)
└── ios/              # iOS app files
```

## 🔧 Backend API

The backend API is deployed separately on Render. See `/api/README.md` for API documentation.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built for the Submission community
- Based on the authorized translation by Rashad Khalifa
- Mathematical analysis inspired by Code 19 discoveries

---

For support, please visit [https://quranonlystudies.app](https://quranonlystudies.app) or contact the development team.
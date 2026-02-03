# 📍 Pinnit App

A simple and elegant location pinning app built with React Native and Expo. Pin your favorite places and come back to them anytime.

## 📱 About Pinnit

Pinnit is a mobile application that allows users to:
- **Pin Current Location**: Save your current location with a custom name
- **View on Map**: See all your pinned locations on an interactive map
- **Swipe to Delete**: Easily remove saved locations with a swipe gesture
- **Dark Mode Support**: Toggle between light and dark themes
- **Persistent Storage**: All your pinned locations are saved locally on your device

### Features

- 🗺️ Interactive map with real-time location tracking
- 📌 Pin locations by tapping on the map or using current location
- 🗑️ Swipe-to-delete functionality for saved locations
- 🌙 Dark mode support with persistent preference
- 📱 Cross-platform support (iOS, Android, Web)
- 🔄 Real-time location updates
- 🎨 Modern and clean UI design

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (will be installed globally or via npx)
- **Git**

For mobile development:
- **iOS**: Xcode (for iOS Simulator) or Expo Go app
- **Android**: Android Studio (for Android Emulator) or Expo Go app

### Clone the Repository

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd PinnitApp
```

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:

   ```env
   GEOCODE_API_KEY=your_api_key_here
   GEOCODE_API_URL=https://geocode.maps.co/reverse
   STORAGE_KEY=@pinnit_saved_pins
   ```

   > **Note**: Get your API key from [geocode.maps.co](https://geocode.maps.co/)

## 📋 Available Scripts

### Development

```bash
# Start the Expo development server
npm start
# or
npx expo start

# Start with specific platform
npm run android    # Start on Android emulator/device
npm run ios        # Start on iOS simulator/device
npm run web        # Start web version
```

### Code Quality

```bash
# Run ESLint to check code quality
npm run lint
```

### Project Management

```bash
# Reset project (moves starter code to app-example)
npm run reset-project
```

## 🏗️ Project Structure

```
PinnitApp/
├── app/                    # Main application code
│   ├── _layout.tsx         # Root layout with Stack navigator
│   └── (tabs)/             # Tab navigation screens
│       ├── _layout.tsx     # Tab layout configuration
│       ├── index.tsx       # Home screen (pinned locations list)
│       ├── map.tsx         # Map screen with location pins
│       └── settings.tsx    # Settings screen
├── components/             # Reusable components
│   ├── PinItem.tsx        # Pin item component with swipe-to-delete
│   └── SettingsRow.tsx    # Settings row component
├── types/                  # TypeScript type definitions
│   └── pinnit.ts          # PinnitItem type
├── utils/                  # Utility functions
│   ├── storage.ts         # AsyncStorage operations
│   ├── geocoding.ts       # Reverse geocoding API
│   └── format.ts          # Time formatting utilities
├── assets/                 # Images and static assets
├── .env                    # Environment variables (not in git)
├── .env.example           # Environment variables template
├── babel.config.js        # Babel configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project dependencies
└── README.md              # This file
```

## 🛠️ Technology Stack

### Core Technologies

- **React Native** (0.81.5) - Mobile app framework
- **Expo** (~54.0.33) - Development platform
- **TypeScript** (5.9.2) - Type safety
- **Expo Router** (~6.0.23) - File-based routing

### Key Libraries

- **react-native-maps** (1.20.1) - Map display and markers
- **expo-location** (~19.0.8) - GPS and location services
- **@react-native-async-storage/async-storage** (2.2.0) - Local data persistence
- **react-native-dotenv** (^3.4.11) - Environment variables
- **@expo/vector-icons** (^15.0.3) - Icon library

## 📖 Usage Guide

### Running the App

1. **Start the development server**

   ```bash
   npm start
   ```

2. **Choose your platform**

   - Press `a` for Android
   - Press `i` for iOS
   - Press `w` for Web
   - Scan QR code with Expo Go app on your device

### Development Workflow

1. **Make changes** to files in the `app/` directory
2. **Save the file** - Expo will automatically reload
3. **Test on device/emulator** - Changes appear instantly

### Building for Production

```bash
# Build for Android
npx expo build:android

# Build for iOS
npx expo build:ios

# Or use EAS Build (recommended)
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## 🔧 Configuration

### Environment Variables

The app uses environment variables for API keys and configuration. Make sure to:

1. Copy `.env.example` to `.env`
2. Fill in your API keys
3. Never commit `.env` to version control

### Babel Configuration

The project uses `react-native-dotenv` for environment variable support. Configuration is in `babel.config.js`.

### TypeScript Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { PinnitItem } from "@/types/pinnit";
import { loadPins } from "@/utils/storage";
import { PinItem } from "@/components/PinItem";
```

## 📱 App Screens

### Home Screen (`index.tsx`)
- Displays current location coordinates
- Shows list of all pinned locations
- Pin current location button
- Swipe-to-delete functionality

### Map Screen (`map.tsx`)
- Interactive map with all pinned locations
- Tap on map to pin new location
- View selected location from Home screen
- Zoom controls and recenter button

### Settings Screen (`settings.tsx`)
- Dark mode toggle
- Location accuracy settings
- Map style preferences
- Data management (export/import)
- About information

## 🔐 Permissions

The app requires the following permissions:

- **Location Permission**: To get current location and track movement
- **Storage Permission**: To save pinned locations locally

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler not starting**
   ```bash
   # Clear cache and restart
   npx expo start --clear
   ```

2. **Environment variables not loading**
   - Ensure `.env` file exists in root directory
   - Restart Metro bundler after creating `.env`
   - Check `babel.config.js` configuration

3. **Location not working**
   - Check device permissions
   - Ensure location services are enabled
   - For iOS simulator, set a location in Features > Location

4. **Build errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

## 📝 Development Notes

### Code Organization

- **Components**: Reusable UI components in `components/`
- **Utils**: Helper functions in `utils/`
- **Types**: TypeScript definitions in `types/`
- **Screens**: Main app screens in `app/(tabs)/`

### Best Practices

- Use TypeScript for type safety
- Follow React Native best practices
- Keep components small and focused
- Use environment variables for sensitive data
- Test on both iOS and Android

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is created as part of a course project (CS-VRU67/2-68, SCS337).

## 👨‍💻 Developer Information

- **Developed by**: Cherdsak Kh.
- **Email**: cherd8524@gmail.com
- **Project**: PinnitApp
- **Version**: 1.0.0

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- Maps powered by [react-native-maps](https://github.com/react-native-maps/react-native-maps)
- Icons from [Ionicons](https://ionic.io/ionicons)
- Geocoding API from [geocode.maps.co](https://geocode.maps.co/)

---

Made with ❤️ for keeping track of your favorite places.

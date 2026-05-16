# EchoServe Mobile App - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the EchoServe mobile app to iOS App Store and Google Play Store.

## Prerequisites

- Apple Developer account ($99/year) for iOS deployment
- Google Play Developer account ($25 one-time) for Android deployment
- Node.js and npm installed locally
- Expo CLI: `npm install -g expo-cli`
- For iOS: macOS and Xcode installed
- For Android: Android Studio and SDK

## Project Configuration

### 1. Update app.json

```json
{
  "expo": {
    "name": "EchoServe",
    "slug": "echoserve",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "scheme": "echoserve",
    "platforms": ["ios", "android"],
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#8B0000"
      },
      "package": "com.echoserve.mobile",
      "versionCode": 1
    },
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.echoserve.mobile",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSCameraUsageDescription": "Camera is used to scan barcodes and capture inventory photos",
        "NSPhotoLibraryUsageDescription": "Photo library access is used for inventory documentation",
        "NSLocationWhenInUseUsageDescription": "Location is used for venue-based operations"
      }
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow EchoServe to access your camera"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow EchoServe to access your photos"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

### 2. Environment Setup

Create `.env.production`:
```
REACT_APP_API_URL=https://api.echoserve.com/api
REACT_APP_ENV=production
REACT_APP_LOG_LEVEL=error
```

### 3. Asset Preparation

Required assets:
- `assets/icon.png` - 1024x1024px (app icon)
- `assets/adaptive-icon.png` - 1024x1024px (Android)
- `assets/splash.png` - 1242x2436px (iPhone)

## iOS Deployment (App Store)

### Step 1: Register Bundle Identifier

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Identifiers
3. Click "+" to create new identifier
4. Select "App IDs"
5. Enter `com.echoserve.mobile` as bundle identifier
6. Enable required capabilities:
   - Camera
   - Photos
   - Background Modes

### Step 2: Create Provisioning Profile

1. Certificates, Identifiers & Profiles → Provisioning Profiles
2. Create new "App Store" provisioning profile
3. Select bundle identifier created above
4. Download and install

### Step 3: Create Certificate

1. Certificates, Identifiers & Profiles → Certificates
2. Create "Apple Distribution Certificate"
3. Follow the CSR process
4. Download certificate and add to Keychain

### Step 4: Setup EAS (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Link to Expo account
eas login

# Link project
eas build:configure
```

Update `eas.json`:
```json
{
  "build": {
    "preview": {
      "ios": {
        "resourceClass": "default"
      }
    },
    "preview2": {
      "ios": {
        "resourceClass": "default"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "default"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "appleTeamId": "YOUR_TEAM_ID",
        "appleAppIdName": "EchoServe"
      }
    }
  }
}
```

### Step 5: Build iOS Binary

```bash
# Build for App Store
eas build --platform ios --auto-submit

# Or step-by-step
eas build --platform ios
eas submit --platform ios
```

### Step 6: Configure App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app:
   - Name: "EchoServe"
   - Primary language: English
   - Bundle ID: `com.echoserve.mobile`
   - SKU: `echoserve-001`

3. Configure app information:
   - Subtitle: "Hotel Inventory Management"
   - Description: "Real-time liquor inventory tracking with offline sync"
   - Keywords: inventory, hospitality, bar, wine, transfers
   - Support URL: https://echoserve.com/support
   - Privacy Policy: https://echoserve.com/privacy

4. Upload screenshots:
   - 5.5-inch display: Dashboard, Count, Transfer, Reports
   - iPad Pro: Full app interface
   - Tablet variants as needed

5. Rate app content
6. Add app review information

### Step 7: Submit for Review

1. Build number must match version in app.json
2. Add release notes: "Initial launch - manage liquor inventory with offline support"
3. Select pricing tier (Free for MVP)
4. Submit for review

**Review time:** 24-48 hours typically

## Android Deployment (Google Play)

### Step 1: Create Keystore

```bash
# Create Android keystore
keytool -genkey-and-selfcert-dname "CN=EchoServe,O=EchoServe,C=US" \
  -alias echoserve-key \
  -keystore echoserve-release-key.keystore \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10950 \
  -storepass YOUR_KEYSTORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD
```

### Step 2: Configure EAS for Android

Update `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "resourceClass": "default"
      }
    }
  }
}
```

Or use keystore:
```json
{
  "android": {
    "keystore": {
      "keystorePath": "echoserve-release-key.keystore",
      "keystorePassword": "YOUR_PASSWORD",
      "keyAlias": "echoserve-key",
      "keyPassword": "YOUR_PASSWORD"
    }
  }
}
```

### Step 3: Build Android Binary

```bash
# Build AAB (recommended)
eas build --platform android --auto-submit

# Or build APK
eas build --platform android --local
```

### Step 4: Setup Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app:
   - Name: "EchoServe"
   - Language: English
   - Type: Business
   - Free app: Yes (for MVP)

3. Complete store listing:
   - Short description: "Inventory management for hospitality"
   - Full description: Complete feature list
   - Category: Business
   - Content rating: Complete questionnaire
   - Target audience: Hotels, Bars, Restaurants

4. Upload screenshots:
   - Phone: 5 screenshots (max 8)
   - Tablet: 5 screenshots
   - Feature graphic: 1024x500px

5. Add app icon: 512x512px
6. Add feature graphic: 1024x500px

### Step 5: Submit for Review

1. Upload signed APK/AAB
2. Add release notes: "Initial launch with offline inventory tracking"
3. Add privacy policy URL
4. Accept Google Play policies
5. Submit

**Review time:** Usually 1-3 hours (faster than iOS)

## Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (0.X when beta)
- **MINOR**: New features
- **PATCH**: Bug fixes

Update in:
- `package.json` (version)
- `app.json` (version)
- `eas.json` (buildNumber/versionCode)

```bash
# Increment version
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Over-the-Air Updates

Using Expo Updates:

```bash
# Publish update
eas update --branch production

# Automatic rollout
eas update --branch production --message "Bug fix"
```

Configure in `app.json`:
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 30000,
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    }
  }
}
```

## Monitoring Deployment

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] API endpoints tested
- [ ] Offline sync tested
- [ ] Camera permissions working
- [ ] Barcode scanning working
- [ ] Database migrations working
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Battery usage acceptable
- [ ] Data privacy compliant

### Post-Deployment Monitoring

Track metrics using:
- Firebase Analytics
- Sentry error tracking
- Custom logging

```javascript
// Add to App.jsx
import * as Sentry from "sentry-expo";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  enableInExpoDevelopment: true,
  debug: true,
});
```

### Common Issues & Fixes

**Issue: Build fails with camera permission**
```
Solution: Ensure expo-camera plugin configured in app.json
```

**Issue: Keystore password issues**
```
Solution: Use EAS keystore management instead of local
```

**Issue: Slow initial sync on first launch**
```
Solution: Implement progressive loading with larger pagination
```

**Issue: App crashes on offline mode**
```
Solution: Ensure all API calls have proper error handling
```

## Rollback Procedure

If critical issue found after deployment:

```bash
# Revert to previous version
eas update --branch production --auto-rollback

# Or manually build previous version
git checkout v1.0.0
eas build --platform ios
eas submit --platform ios
```

## Beta Testing

### iOS TestFlight

```bash
# Build for TestFlight
eas build --platform ios --auto-submit

# Add testers in App Store Connect
# → TestFlight → Testers
```

### Android Internal Testing

```bash
# Build for internal testing
eas build --platform android

# Upload to Google Play Console
# → Testing → Internal Testing
```

## Release Schedule

### Week 1-2: Beta Testing
- Limited iOS TestFlight (50-100 users)
- Android internal testing (10-20 users)
- Gather feedback

### Week 3: Store Submission
- Fix critical bugs from beta
- Create app store listings
- Submit to both stores

### Week 4: Launch
- Coordinate simultaneous launch
- Monitor early reviews
- Quick patch deployment as needed

### Ongoing
- Monthly feature releases
- Weekly bug fix releases
- Quarterly major updates

## Support & Maintenance

### App Store Connect Maintenance

- Monitor crash reports
- Review user feedback
- Update screenshots seasonally
- Refresh description with new features

### Google Play Console Maintenance

- Monitor crash analytics
- Respond to reviews
- Update release notes
- Track user acquisition

### User Support

- Setup support email: support@echoserve.com
- FAQ page on website
- In-app help/contact form
- Release notes in app

## Analytics Dashboard

Setup in app:

```javascript
// Track key metrics
analytics.logEvent('inventory_count_saved', {
  venue_id: venueId,
  count: 15,
  is_offline: true,
});

analytics.logEvent('transfer_requested', {
  from_venue: fromVenue,
  to_venue: toVenue,
  item_count: 5,
});

analytics.logEvent('sync_completed', {
  items_synced: 42,
  duration_ms: 3200,
  success: true,
});
```

## Security Considerations

### API Security
- Use HTTPS only
- Implement OAuth 2.0 for auth
- Rotate API keys monthly
- Rate limit endpoints

### Data Security
- Encrypt sensitive data in SQLite
- Use secure storage for tokens
- Clear cache on logout
- Implement biometric auth (future)

### App Security
- Code signing with valid certificates
- Regular dependency updates
- Security scanning with Semgrep
- Pen testing before major releases

## Success Criteria

✅ Week 3-4 Completion:
- Mobile app deployed to App Store
- Mobile app deployed to Google Play
- 100+ beta testers
- Average rating 4.0+
- Zero critical bugs post-launch
- 99%+ sync success rate
- < 5% app crash rate
- < 2 minute sync times

## Next Phase (Week 5-6)

Focus on:
- POS system integration
- Real-time inventory updates
- Push notifications
- Advanced analytics
- Staff performance metrics

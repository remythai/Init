#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$SCRIPT_DIR/init-client"
OUTPUT_DIR="$SCRIPT_DIR/init-web/public"

export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# ── Install JDK if missing ──────────────────────────────────────────
if ! command -v javac &>/dev/null; then
  echo "Installing JDK 17..."
  sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk-headless
fi

export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac))))

# ── Install Android SDK if missing ───────────────────────────────────
if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
  echo "Installing Android SDK..."
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  cd /tmp
  curl -sO https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -qo commandlinetools-linux-11076708_latest.zip
  mv cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
  rm -f commandlinetools-linux-11076708_latest.zip
  yes | sdkmanager --licenses > /dev/null 2>&1 || true
  sdkmanager --update > /dev/null 2>&1
  sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" > /dev/null 2>&1
fi

# ── Build APK ────────────────────────────────────────────────────────
echo "🔨 Building APK..."
cd "$CLIENT_DIR"
npm ci --silent
npx expo prebuild --clean
cd android
./gradlew assembleRelease -q

# ── Copy APK to init-web/public ──────────────────────────────────────
APK_PATH=$(find "$CLIENT_DIR/android/app/build/outputs/apk/release" -name "*.apk" | head -1)

if [ -z "$APK_PATH" ]; then
  echo "❌ APK build failed – no APK found"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
cp "$APK_PATH" "$OUTPUT_DIR/init.apk"
echo "✅ APK copied to init-web/public/init.apk"

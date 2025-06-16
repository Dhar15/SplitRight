import 'dotenv/config';

export default {
  expo: {
    name: "SplitRight",
    slug: "splitright",
    version: "1.0.0",
    owner: "kingofthefall15",
    scheme: "splitright", 
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.splitright.app",
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png", 
        backgroundColor: "#FFFFFF"
      },
      versionCode: 1,
      compileSdkVersion: 35,
      targetSdkVersion: 34,
      buildToolsVersion: "35.0.0",
      icon: "./assets/logo.png",
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-sqlite",
      "expo-router",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: "35.0.0",
            extraMavenRepos: [
              "https://maven.google.com" 
            ],
            TextRecognition_compileSdkVersion: 35,
            TextRecognition_targetSdkVersion: 34,
            TextRecognition_buildToolsVersion: "34.0.0"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "bb99b92a-0c28-4abd-b316-588cfd489489"
      },
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
    }
  }
};
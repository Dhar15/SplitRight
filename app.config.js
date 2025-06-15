import 'dotenv/config';

export default {
  expo: {
    name: "SplitRight",
    slug: "splitright",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png", 
    android: {
      package: "com.splitright.app"
    },
    extra: {
      eas: {
        projectId: "bb99b92a-0c28-4abd-b316-588cfd489489"
      },
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
    }
  }
};

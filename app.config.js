import 'dotenv/config';

export default {
  expo: {
    name: "SplitRight",
    slug: "splitright",
    version: "1.0.0",
     extra: {
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    },
  },
};
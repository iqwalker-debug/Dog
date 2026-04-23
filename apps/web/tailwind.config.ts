import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        "kennel-navy": "#1B2F5A",
        "kennel-sun": "#F5C518",
      },
    },
  },
  plugins: [],
} satisfies Config;

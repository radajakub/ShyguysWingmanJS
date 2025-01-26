import dotenv from "dotenv";
dotenv.config();

export default {
  define: {
    "process.env": process.env,
  },
  server: {
    open: true,
    allowedHosts: ["jakubrada-shyguyswingman.hf.space"],
  },
};

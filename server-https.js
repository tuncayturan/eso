import https from "https";
import fs from "fs";
import pkg from "http-proxy";

const { createProxyServer } = pkg;

// Sertifika dosyaları
const options = {
  key: fs.readFileSync("./cert/localhost-key.pem"),
  cert: fs.readFileSync("./cert/localhost.pem"),
};

// Proxy: HTTPS → HTTP (Next.js dev server)
const proxy = createProxyServer({
  target: "http://localhost:3000",
  secure: false,
  changeOrigin: false,
});

// HTTPS server
const httpsServer = https.createServer(options, (req, res) => {
  proxy.web(req, res);
});

// Dinle
httpsServer.listen(3443, () => {
  console.log("🟢 HTTPS server running at https://localhost:3443");
});

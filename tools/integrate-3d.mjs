import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/3d/weather-station-base.html");
const targetPath = path.join(root, "src/3d/weather-station-babylon.html");
const cssPath = path.join(root, "src/3d/twine-bridge.css");
const markerPath = path.join(root, "src/3d/room-markers.html");
const bridgePath = path.join(root, "src/3d/twine-bridge.js");

const css = fs.readFileSync(cssPath, "utf8");
const markers = fs.readFileSync(markerPath, "utf8");
const bridge = fs.readFileSync(bridgePath, "utf8");
let html = fs.readFileSync(sourcePath, "utf8");

html = html
  .replace(/<link rel="stylesheet" href="_ds\/[^"]+\/styles\.css">\s*/, "")
  .replace("</style>", `\n${css}\n</style>`)
  .replace('<canvas id="c"></canvas>', `<canvas id="c"></canvas>\n${markers}`)
  .replace(
    "const moved = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6;\n  downAt = null;",
    "const moved = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6;\n  downAt = null;\n  if (window.__twineManaged) return;"
  )
  .replace(
    "const gust = (0.6 + 0.5 * S.amp) * (1 + 0.35 * Math.sin(t * 2.3) + 0.15 * Math.sin(t * 7.1));",
    "const gust = (0.6 + 0.5 * S.amp) * (0.35 + bridgeWindFactor * 1.65) * (1 + 0.35 * Math.sin(t * 2.3) + 0.15 * Math.sin(t * 7.1));"
  )
  .replace(
    "engine.runRenderLoop(() => scene.render());",
    `${bridge}\n\nengine.runRenderLoop(() => scene.render());`
  );

if (!html.includes("Twine bridge for Babylon model 8")) {
  throw new Error("Babylon/Twine bridge injection failed.");
}

if (!html.includes("if (window.__twineManaged) return;")) {
  throw new Error("Native pointer guard injection failed.");
}

fs.writeFileSync(targetPath, html);
console.log(`3D station generated: ${path.relative(root, targetPath)}`);


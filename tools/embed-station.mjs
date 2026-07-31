import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stationPath = path.join(root, "src/3d/weather-station-babylon.html");
const tweePath = path.join(root, "src/story/내면 기상 관측소_IFS.twee");

const encoded = fs.readFileSync(stationPath).toString("base64");
const twee = fs.readFileSync(tweePath, "utf8");
const payloadPattern = /window\.WEATHER_STATION_IFRAME_B64 = "[A-Za-z0-9+/=]*";/;

if (!payloadPattern.test(twee)) {
  throw new Error("Embedded weather-station payload was not found in the Twee source.");
}

fs.writeFileSync(
  tweePath,
  twee.replace(
    payloadPattern,
    `window.WEATHER_STATION_IFRAME_B64 = "${encoded}";`
  )
);

console.log(`3D station embedded: ${path.relative(root, tweePath)}`);


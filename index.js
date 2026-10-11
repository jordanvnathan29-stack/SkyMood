const form = document.getElementById("coord-form");
const latInput = document.getElementById("lat");
const lonInput = document.getElementById("lon");
const statusText = document.getElementById("out-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusText.textContent = "Loading...";

  try {
    const url = `/api/weather?lat=${encodeURIComponent(latInput.value)}&lon=${encodeURIComponent(lonInput.value)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      statusText.textContent = data.reason || data.error || "Something went wrong.";
      return;
    }

    const now = data.current;
    document.getElementById("out-temp").textContent = now.temperature_2m + " \u00b0C";
    document.getElementById("out-cloud").textContent = now.cloud_cover + " %";
    document.getElementById("out-wind").textContent = now.wind_speed_10m + " km/h";
    document.getElementById("out-day").textContent = now.is_day === 1 ? "Daytime" : "Night";
    document.getElementById("out-time").textContent = now.time;
    statusText.textContent = "Showing weather for " + latInput.value + ", " + lonInput.value;

    paintSky(now);
  } catch (error) {
    statusText.textContent = "Could not load weather. Check that the Java server is running.";
  }
});

document.getElementById("locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    statusText.textContent = "Your browser can't share location. Type coordinates instead.";
    return;
  }

  statusText.textContent = "Finding your location...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latInput.value = position.coords.latitude.toFixed(4);
      lonInput.value = position.coords.longitude.toFixed(4);
      statusText.textContent = "Location filled in. Now press Get Sky!";
    },
    () => {
      statusText.textContent = "Location permission was denied. Type coordinates instead.";
    }
  );
});

// ---------- sky colors ----------
const PALETTES = {
  night: ["#0b1026", "#1b2a4e"],
  dawn:  ["#35508f", "#ffa07a"],
  day:   ["#2f7ae0", "#a8d8f8"],
  dusk:  ["#3d3f8f", "#ff7e5a"],
};

function paintSky(now) {
  const root = document.documentElement;
  const isDay = now.is_day === 1;
  const hour = Number(now.time.slice(11, 13));

  // 1) time of day picks the base colors
  let phase = "day";
  if (!isDay) phase = "night";
  else if (hour < 9) phase = "dawn";
  else if (hour >= 17) phase = "dusk";
  let [top, bottom] = PALETTES[phase];

  // 2) clouds wash the colors toward gray
  const gray = isDay ? "#8a929b" : "#3a4048";
  const cloudy = Math.round(now.cloud_cover * 0.6);
  top = `color-mix(in srgb, ${top}, ${gray} ${cloudy}%)`;
  bottom = `color-mix(in srgb, ${bottom}, ${gray} ${cloudy}%)`;

  // 3) very hot or very cold air tints the whole sky a little
  if (now.temperature_2m >= 30) {
    top = `color-mix(in srgb, ${top}, #ff9a4d 18%)`;
    bottom = `color-mix(in srgb, ${bottom}, #ff9a4d 18%)`;
  } else if (now.temperature_2m <= 5) {
    top = `color-mix(in srgb, ${top}, #8cc8ff 18%)`;
    bottom = `color-mix(in srgb, ${bottom}, #8cc8ff 18%)`;
  }

  // 4) hand the colors to the CSS (it fades between them smoothly)
  root.style.setProperty("--sky-top", top);
  root.style.setProperty("--sky-bottom", bottom);
  const bright = phase === "day";   // dawn, dusk and night skies are darker, so use light text
  root.style.setProperty("--ink", bright ? "#10202e" : "#eef3ff");
  root.style.setProperty("--panel", bright ? "rgba(255, 255, 255, 0.45)" : "rgba(10, 16, 34, 0.45)");
}

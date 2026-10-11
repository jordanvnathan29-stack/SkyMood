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
    document.getElementById("out-temp").textContent = now.temperature_2m + " °C";
    document.getElementById("out-cloud").textContent = now.cloud_cover + " %";
    document.getElementById("out-wind").textContent = now.wind_speed_10m + " km/h";
    document.getElementById("out-day").textContent = now.is_day === 1 ? "Daytime" : "Night";
    document.getElementById("out-time").textContent = now.time;
    statusText.textContent = "Showing weather for " + latInput.value + ", " + lonInput.value;
  } catch (error) {
    statusText.textContent = "Could not load weather. Check that the Java server is running.";
  }
});

document.getElementById("locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    statusText.textContent = "Your browser can't share location. Type coordinates instead.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latInput.value = position.coords.latitude.toFixed(4);
      lonInput.value = position.coords.longitude.toFixed(4);
    },
    () => {
      statusText.textContent = "Location permission was denied. Type coordinates instead.";
    }
  );
});

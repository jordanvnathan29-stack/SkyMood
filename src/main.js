import './style.css'
import * as THREE from 'three'

const app = document.querySelector('#app')
app.innerHTML = `
  <main class="experience">
    <canvas class="sky-canvas" aria-label="Animated sky visualization"></canvas>
    <div class="grain" aria-hidden="true"></div>
    <div class="vignette" aria-hidden="true"></div>
    <header class="topbar">
      <a class="brand" href="#" aria-label="SkyMood home"><span class="brand-mark">✳</span><span>sky<span class="brand-light">mood</span></span></a>
      <div class="live-tag"><i></i><span>LIVE ATMOSPHERE</span></div>
      <button class="icon-button settings-button" aria-label="Open settings" title="Settings">☷</button>
    </header>
    <section class="scene-copy" aria-live="polite">
      <p class="eyebrow"><span class="eyebrow-line"></span><span id="weather-label">THE SKY, RIGHT NOW</span></p>
      <h1 id="sky-title">A little<br><em>afterglow.</em></h1>
      <p class="scene-description" id="sky-description">The day loosens its hold. The sky keeps the color.</p>
    </section>
    <section class="weather-card glass-card" aria-label="Current conditions">
      <div class="place-row"><span class="pin">⌖</span><div><p id="place-name">New York</p><span id="place-region">New York, United States</span></div><button class="locate-button" aria-label="Use my location" title="Use my location">◎</button></div>
      <div class="temp-row"><span id="temperature">18°</span><div><b id="condition">Partly cloudy</b><span id="feels-like">Feels like 17°</span></div></div>
      <div class="weather-stats"><div><span>CLOUDS</span><b id="clouds">32%</b></div><div><span>WIND</span><b id="wind">12 <small>km/h</small></b></div><div class="aqi-stat"><span>AIR QUALITY</span><b><i id="aqi-dot"></i><span id="aqi">Good</span></b></div></div>
      <div class="card-foot"><span id="updated-at">UPDATED JUST NOW</span><span class="unit-toggle"><button data-unit="c" class="selected">°C</button><span>/</span><button data-unit="f">°F</button></span></div>
    </section>
    <section class="search-wrap" aria-label="Find a city">
      <form class="search-box" id="search-form"><span class="search-icon">⌕</span><input id="city-search" type="search" placeholder="Find a city…" autocomplete="off" aria-label="Search city"><button type="submit" aria-label="Search">↗</button></form>
      <div class="search-results" id="search-results" hidden></div>
    </section>
    <nav class="mood-nav glass-card" aria-label="Choose a sky mood">
      <span class="nav-label">SKY MOOD</span>
      <button class="mood-button active" data-mood="current"><span class="mood-icon">✺</span><span>Now</span></button>
      <button class="mood-button" data-mood="golden"><span class="mood-icon">◒</span><span>Golden</span></button>
      <button class="mood-button" data-mood="blue"><span class="mood-icon">☾</span><span>Blue hour</span></button>
      <button class="mood-button" data-mood="storm"><span class="mood-icon">ϟ</span><span>Storm</span></button>
      <span class="nav-divider"></span>
      <button class="motion-button" aria-label="Pause animation" title="Pause animation"><span>Ⅱ</span></button>
      <button class="export-button" title="Save this sky as a PNG"><span>↓</span><span>Save sky</span></button>
    </nav>
    <div class="toast" id="toast" role="status"></div>
    <div class="loading-layer" id="loading-layer" hidden><span class="loader"></span><span>Finding your sky…</span></div>
    <aside class="settings-panel glass-card" id="settings-panel" hidden><button class="panel-close" aria-label="Close settings">×</button><span class="nav-label">YOUR SKY</span><h2>Make it yours.</h2><label class="setting-row"><span>Ambient motion</span><input id="motion-setting" type="checkbox" checked><i></i></label><label class="setting-row"><span>Show atmosphere grain</span><input id="grain-setting" type="checkbox" checked><i></i></label><p>Weather updates as you search. Your sky is yours to keep.</p></aside>
    <footer class="footer-note"><span>MADE OF WEATHER &amp; WONDER</span><span class="footer-dot">✳</span><span id="local-time">LOCAL TIME —</span></footer>
  </main>
`

const canvas = document.querySelector('.sky-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12
const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
camera.position.z = 10

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uTop: { value: new THREE.Color('#384b86') }, uMid: { value: new THREE.Color('#db7187') }, uLow: { value: new THREE.Color('#f6bd8c') }, uWeather: { value: 0.18 }, uSun: { value: 0.42 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position,1.0);}`,
  fragmentShader: `
    varying vec2 vUv; uniform float uTime; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform float uWeather; uniform float uSun;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec2 uv=vUv; float horizon=smoothstep(.05,.78,uv.y); vec3 col=mix(uLow,uMid,horizon); col=mix(col,uTop,smoothstep(.5,1.0,uv.y));
      float glow=exp(-((uv.x-.78)*(uv.x-.78)*13.0+(uv.y-.32)*(uv.y-.32)*22.0));
      col+=vec3(1.0,.48,.28)*glow*(.18+uSun*.22);
      float haze=noise(vec2(uv.x*3.0+uTime*.009,uv.y*2.3))*.035;
      col+=haze; col=mix(col,col*vec3(.58,.68,.86),uWeather*.45);
      float edge=smoothstep(0.0,.22,uv.y); col=mix(col,col*vec3(.58,.65,.78),uWeather*(1.0-edge)*.26);
      gl_FragColor=vec4(col,1.0);
    }`
})
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial))

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256
  const ctx = c.getContext('2d')
  const glow = ctx.createRadialGradient(256, 150, 10, 256, 150, 210)
  glow.addColorStop(0, 'rgba(255,246,235,0.40)'); glow.addColorStop(.42, 'rgba(255,218,211,0.22)'); glow.addColorStop(1, 'rgba(255,235,233,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 29; i++) {
    const x = 55 + Math.random() * 402, y = 108 + Math.random() * 73, r = 19 + Math.random() * 57
    const puff = ctx.createRadialGradient(x - r * .2, y - r * .22, r * .05, x, y, r)
    puff.addColorStop(0, 'rgba(255,249,245,0.20)'); puff.addColorStop(.5, 'rgba(255,225,221,0.13)'); puff.addColorStop(1, 'rgba(255,221,218,0)')
    ctx.fillStyle = puff; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex
}
const cloudTex = cloudTexture()
const clouds = []
for (let i = 0; i < 12; i++) {
  const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: .7, depthWrite: false, color: i < 4 ? '#fff0e8' : '#ffffff' })
  const sprite = new THREE.Sprite(mat)
  const scale = .6 + Math.random() * 1.15
  sprite.scale.set(scale * (1.5 + Math.random()), scale * .66, 1)
  sprite.position.set((Math.random() - .5) * 3.1, -0.05 + Math.random() * .93, 1 + Math.random() * 3)
  sprite.userData = { drift: .003 + Math.random() * .009, homeY: sprite.position.y, phase: Math.random() * Math.PI * 2 }
  scene.add(sprite); clouds.push(sprite)
}

const count = 520
const particleGeometry = new THREE.BufferGeometry()
const positions = new Float32Array(count * 3)
const velocities = new Float32Array(count)
for (let i = 0; i < count; i++) { positions[i * 3] = (Math.random() - .5) * 2.4; positions[i * 3 + 1] = Math.random() * 2 - 1; positions[i * 3 + 2] = 2 + Math.random() * 4; velocities[i] = .0003 + Math.random() * .0012 }
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
const particleMaterial = new THREE.PointsMaterial({ color: '#fff5e9', size: .009, transparent: true, opacity: .55, depthWrite: false, sizeAttenuation: true })
const particles = new THREE.Points(particleGeometry, particleMaterial); scene.add(particles)

const palettes = {
  golden: ['#735078', '#dd8292', '#ffd29d', .04, .8],
  blue: ['#101c46', '#405c92', '#879dc4', .12, .12],
  storm: ['#172640', '#586477', '#818e9e', .88, .04],
  clear: ['#315b9d', '#8aa9d0', '#ffe0bd', .02, .72],
  overcast: ['#3d4b67', '#8791a1', '#c2b9b7', .45, .15],
  rain: ['#192941', '#53677d', '#8e9aa6', .82, .06],
  night: ['#080e2d', '#252f5d', '#594e70', .12, .02]
}
let activeMode = 'current', paused = false, weatherType = 'clear', celsius = 18, unit = 'c', currentPlace = { name: 'New York', region: 'New York, United States', lat: 40.7128, lon: -74.006 }
function setPalette(key) {
  const p = palettes[key] || palettes.clear
  skyMaterial.uniforms.uTop.value.set(p[0]); skyMaterial.uniforms.uMid.value.set(p[1]); skyMaterial.uniforms.uLow.value.set(p[2]); skyMaterial.uniforms.uWeather.value = p[3]; skyMaterial.uniforms.uSun.value = p[4]
  clouds.forEach((cloud, i) => { cloud.material.opacity = key === 'storm' || key === 'rain' ? .9 : key === 'blue' || key === 'night' ? .26 : .68; cloud.material.color.set(key === 'storm' || key === 'rain' ? '#bbc6d5' : '#fff0e8'); cloud.position.y = cloud.userData.homeY - (key === 'storm' ? .16 : 0) })
}
let last = performance.now()
function animate(now) {
  requestAnimationFrame(animate)
  const delta = Math.min(now - last, 40); last = now
  if (!paused) {
    skyMaterial.uniforms.uTime.value += delta * .001
    clouds.forEach((cloud) => { cloud.position.x += cloud.userData.drift * delta * .03; cloud.position.y = cloud.userData.homeY + Math.sin(now * .00018 + cloud.userData.phase) * .018; if (cloud.position.x > 2.3) cloud.position.x = -2.3 })
    if (weatherType === 'rain' || activeMode === 'storm') {
      for (let i = 0; i < count; i++) { positions[i * 3 + 1] -= velocities[i] * delta * 2.2; positions[i * 3] -= velocities[i] * delta * .26; if (positions[i * 3 + 1] < -.8) { positions[i * 3 + 1] = 1; positions[i * 3] = (Math.random() - .5) * 2.4 } }
      particleMaterial.opacity = .53; particleMaterial.size = .006
    } else {
      for (let i = 0; i < count; i++) { positions[i * 3 + 1] += velocities[i] * delta * .32; if (positions[i * 3 + 1] > 1) positions[i * 3 + 1] = -1 }
      particleMaterial.opacity = .32; particleMaterial.size = .008
    }
    particleGeometry.attributes.position.needsUpdate = true
  }
  renderer.render(scene, camera)
}
requestAnimationFrame(animate)
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)) })

const $ = (selector) => document.querySelector(selector)
const title = $('#sky-title'), description = $('#sky-description')
function setMood(mood) {
  activeMode = mood
  document.querySelectorAll('.mood-button').forEach((button) => button.classList.toggle('active', button.dataset.mood === mood))
  if (mood === 'current') { applyWeatherMood(); return }
  const copy = { golden: ['GOLDEN HOUR, ON REPEAT', 'A little<br><em>afterglow.</em>', 'The day loosens its hold. The sky keeps the color.'], blue: ['A QUIETER KIND OF BLUE', 'Into the<br><em>blue.</em>', 'That in-between hour, when everything softens.'], storm: ['A LITTLE DRAMA', 'Let it<br><em>pour.</em>', 'A front-row seat to the beautiful mess above.'] }[mood]
  $('#weather-label').textContent = copy[0]; title.innerHTML = copy[1]; description.textContent = copy[2]; setPalette(mood)
}
function applyWeatherMood() {
  const map = { clear: ['clear', 'THE SKY, RIGHT NOW', 'A little<br><em>afterglow.</em>', 'The day loosens its hold. The sky keeps the color.'], clouds: ['overcast', 'CLOUDS GATHERING', 'A softer kind of light.', 'The clouds are doing their own thing up there.'], rain: ['rain', 'RAIN IN THE AIR', 'Let the sky<br><em>exhale.</em>', 'A passing shower gives the world a fresh start.'], night: ['night', 'AFTER HOURS', 'Under a<br><em>wide sky.</em>', 'The city glows a little brighter after dark.'] }
  const c = map[weatherType] || map.clear; $('#weather-label').textContent = c[1]; title.innerHTML = c[2]; description.textContent = c[3]; setPalette(c[0])
}
function cToF(value) { return Math.round(value * 9 / 5 + 32) }
function updateTemperature() { $('#temperature').textContent = `${unit === 'c' ? Math.round(celsius) : cToF(celsius)}°`; $('#feels-like').textContent = `Feels like ${unit === 'c' ? Math.round(celsius - 1) : cToF(celsius - 1)}°` }
function conditionFor(code) {
  if (code === 0 || code === 1) return ['Mostly clear', 'clear']
  if (code === 2 || code === 3 || code === 45 || code === 48) return ['Partly cloudy', 'clouds']
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Rain showers', 'rain']
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Snow showers', 'clouds']
  if ([95, 96, 99].includes(code)) return ['Thunderstorms', 'rain']
  return ['Cloudy', 'clouds']
}
function setAqi(value) {
  const levels = [['Good', '#a3d7b0'], ['Fair', '#d2dc91'], ['Moderate', '#f0c483'], ['Poor', '#ed987d'], ['Very poor', '#d77d91']]
  const idx = value <= 20 ? 0 : value <= 40 ? 1 : value <= 60 ? 2 : value <= 80 ? 3 : 4
  $('#aqi').textContent = value == null ? '—' : levels[idx][0]; $('#aqi-dot').style.background = value == null ? '#aaa' : levels[idx][1]
}
function updateLocalTime() { $('#local-time').textContent = `LOCAL TIME ${new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', timeZone: currentPlace.timezone }).format(new Date())}` }
async function loadWeather(place = currentPlace) {
  $('#loading-layer').hidden = false
  try {
    const query = new URLSearchParams({ latitude: place.lat, longitude: place.lon, current: 'temperature_2m,apparent_temperature,cloud_cover,wind_speed_10m,weather_code,is_day', timezone: 'auto', forecast_days: '1' })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`)
    if (!response.ok) throw new Error('Weather service unavailable')
    const data = await response.json(), now = data.current
    currentPlace = { ...place, timezone: data.timezone }
    celsius = now.temperature_2m
    $('#place-name').textContent = place.name; $('#place-region').textContent = place.region || data.timezone.replaceAll('_', ' ')
    updateTemperature(); $('#clouds').textContent = `${now.cloud_cover}%`; $('#wind').innerHTML = `${Math.round(now.wind_speed_10m)} <small>km/h</small>`
    const [condition, kind] = conditionFor(now.weather_code); $('#condition').textContent = condition; weatherType = kind
    if (activeMode === 'current') applyWeatherMood()
    const aqiQuery = new URLSearchParams({ latitude: place.lat, longitude: place.lon, current: 'us_aqi', timezone: 'auto' })
    try { const air = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqiQuery}`).then((r) => r.json()); setAqi(air.current?.us_aqi) } catch { setAqi(null) }
    $('#updated-at').textContent = 'UPDATED JUST NOW'; updateLocalTime()
  } catch (error) {
    showToast('Couldn’t reach live weather. Showing the last sky instead.')
    if (!$('#condition').textContent) { $('#condition').textContent = 'Partly cloudy'; setAqi(null) }
  } finally { $('#loading-layer').hidden = true }
}
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 3600) }

document.querySelectorAll('.mood-button').forEach((button) => button.addEventListener('click', () => setMood(button.dataset.mood)))
document.querySelectorAll('.unit-toggle button').forEach((button) => button.addEventListener('click', () => { unit = button.dataset.unit; document.querySelectorAll('.unit-toggle button').forEach((b) => b.classList.toggle('selected', b === button)); updateTemperature() }))
$('.motion-button').addEventListener('click', (event) => { paused = !paused; event.currentTarget.innerHTML = paused ? '<span>▶</span>' : '<span>Ⅱ</span>'; event.currentTarget.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation') })
$('#motion-setting').addEventListener('change', (event) => { paused = !event.target.checked; $('.motion-button').innerHTML = paused ? '<span>▶</span>' : '<span>Ⅱ</span>' })
$('#grain-setting').addEventListener('change', (event) => $('.grain').classList.toggle('hidden', !event.target.checked))
$('.settings-button').addEventListener('click', () => { $('#settings-panel').hidden = false })
$('.panel-close').addEventListener('click', () => { $('#settings-panel').hidden = true })
$('.export-button').addEventListener('click', () => { renderer.render(scene, camera); renderer.domElement.toBlob((blob) => { if (!blob) return showToast('Couldn’t save this sky. Try again.'); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `skymood-${currentPlace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`; link.click(); URL.revokeObjectURL(link.href); showToast('Your sky is saved as a PNG.') }, 'image/png') })

const searchForm = $('#search-form'), searchInput = $('#city-search'), searchResults = $('#search-results')
searchForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const term = searchInput.value.trim(); if (!term) { searchInput.focus(); return }
  searchResults.hidden = false; searchResults.innerHTML = '<div class="result-message">Looking for that sky…</div>'
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: term, count: 5, language: 'en', format: 'json' })}`)
    const data = await response.json(), results = data.results || []
    if (!results.length) { searchResults.innerHTML = '<div class="result-message">No cities found. Try another name.</div>'; return }
    searchResults.innerHTML = results.map((place, index) => `<button class="search-result" data-index="${index}"><span>⌖</span><span><b>${escapeHtml(place.name)}</b><small>${escapeHtml([place.admin1, place.country].filter(Boolean).join(', '))}</small></span><span class="result-arrow">↗</span></button>`).join('')
    searchResults.querySelectorAll('.search-result').forEach((button) => button.addEventListener('click', () => { const place = results[Number(button.dataset.index)]; searchResults.hidden = true; searchInput.value = ''; loadWeather({ name: place.name, region: [place.admin1, place.country].filter(Boolean).join(', '), lat: place.latitude, lon: place.longitude }) }))
  } catch { searchResults.innerHTML = '<div class="result-message">Search is unavailable right now.</div>' }
})
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])) }
document.addEventListener('click', (event) => { if (!event.target.closest('.search-wrap')) searchResults.hidden = true })
$('.locate-button').addEventListener('click', () => {
  if (!navigator.geolocation) return showToast('Location isn’t available in this browser.')
  $('#loading-layer').hidden = false
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try { const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${new URLSearchParams({ latitude: coords.latitude, longitude: coords.longitude, language: 'en', format: 'json' })}`).then((r) => r.json()); const p = geo.results?.[0]; loadWeather(p ? { name: p.name, region: [p.admin1, p.country].filter(Boolean).join(', '), lat: coords.latitude, lon: coords.longitude } : { name: 'Your location', region: 'Current location', lat: coords.latitude, lon: coords.longitude }) } catch { loadWeather({ name: 'Your location', region: 'Current location', lat: coords.latitude, lon: coords.longitude }) }
  }, () => { $('#loading-layer').hidden = true; showToast('Location permission was unavailable. Search for a city instead.') })
})
addEventListener('keydown', (event) => { if (event.key === 'Escape') { searchResults.hidden = true; $('#settings-panel').hidden = true } })
setInterval(updateLocalTime, 60_000)
loadWeather()

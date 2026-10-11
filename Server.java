import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;

public class Server {
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    private static final String GROQ_KEY = readEnv("GROQ_API_KEY");
    private static final String WEATHER_KEY = readEnv("WEATHER_API_KEY");
    private static final String GROQ_URL =
            "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(
                System.getenv().getOrDefault("PORT", "5555"));

        HttpServer server = HttpServer.create(
                new InetSocketAddress(port), 0);

        server.createContext("/api/weather", Server::weather);
        server.createContext("/api/mood", Server::mood);
        server.createContext("/", Server::staticFile);
        server.start();

        System.out.println("Server started on port " + port);
        System.out.println(GROQ_KEY == null || GROQ_KEY.isBlank()
                ? "WARNING: GROQ_API_KEY is not set."
                : "Groq key found.");
    }

    private static void mood(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equals("GET")) {
            exchange.getResponseHeaders().set("Allow", "GET");
            sendJson(exchange, 405, "reason",
                    "Use GET for this endpoint.");
            return;
        }

        if (GROQ_KEY == null || GROQ_KEY.isBlank()) {
            sendJson(exchange, 500, "reason",
                    "The server has no GROQ_API_KEY set.");
            return;
        }

        double temp;
        double cloud;
        double wind;
        String query = exchange.getRequestURI().getRawQuery();

        try {
            temp = Double.parseDouble(parameter(query, "temp"));
            cloud = Double.parseDouble(parameter(query, "cloud"));
            wind = Double.parseDouble(parameter(query, "wind"));
        } catch (IllegalArgumentException e) {
            sendJson(exchange, 400, "reason",
                    "temp, cloud and wind must be numbers.");
            return;
        }

        boolean isDay = parameter(query, "day").equals("1");

        String prompt = String.format(Locale.US,
                "Write ONE short, poetic sentence (max 25 words) describing the sky right now. "
                        + "Facts: %.0f degrees C, %.0f%% cloud cover, wind %.0f km/h, it is %s. "
                        + "No emojis. Reply with the sentence only.",
                temp, cloud, wind, isDay ? "daytime" : "night");

        JSONObject body = new JSONObject()
                .put("model", GROQ_MODEL)
                .put("temperature", 0.8)
                .put("max_completion_tokens", 80)
                .put("messages", new JSONArray()
                        .put(new JSONObject()
                                .put("role", "user")
                                .put("content", prompt)));

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GROQ_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + GROQ_KEY)
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                    .build();

            HttpResponse<String> response = CLIENT.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.out.println("Groq error " + response.statusCode()
                        + ": " + response.body());
                sendJson(exchange, 502, "reason",
                        "Groq returned an error. Check the server console.");
                return;
            }

            String text = new JSONObject(response.body())
                    .getJSONArray("choices")
                    .getJSONObject(0)
                    .getJSONObject("message")
                    .getString("content")
                    .trim();

            sendJson(exchange, 200, "mood", text);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendJson(exchange, 502, "reason",
                    "The AI request was interrupted.");
        } catch (IOException | RuntimeException e) {
            sendJson(exchange, 502, "reason",
                    "Could not reach Groq.");
        }
    }

    private static void weather(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equals("GET")) {
            exchange.getResponseHeaders().set("Allow", "GET");
            sendJson(exchange, 405, "error",
                    "Use GET for this endpoint.");
            return;
        }

        double lat;
        double lon;

        try {
            String query = exchange.getRequestURI().getRawQuery();
            lat = Double.parseDouble(parameter(query, "lat"));
            lon = Double.parseDouble(parameter(query, "lon"));
        } catch (IllegalArgumentException e) {
            sendJson(exchange, 400, "reason",
                    "Provide valid latitude and longitude numbers.");
            return;
        }

        if (!Double.isFinite(lat) || !Double.isFinite(lon)
                || lat < -90 || lat > 90
                || lon < -180 || lon > 180) {
            sendJson(exchange, 400, "reason",
                    "Latitude must be -90 to 90 and longitude -180 to 180.");
            return;
        }

        if (WEATHER_KEY == null || WEATHER_KEY.isBlank()) {
            sendJson(exchange, 500, "reason",
                    "WEATHER_API_KEY is not set. Add it to your environment or .env file.");
            return;
        }

        String url = "https://api.weatherapi.com/v1/current.json"
                + "?key=" + URLEncoder.encode(
                        WEATHER_KEY, StandardCharsets.UTF_8)
                + "&q=" + URLEncoder.encode(
                        lat + "," + lon, StandardCharsets.UTF_8);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> response = CLIENT.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.out.println("WeatherAPI error "
                        + response.statusCode() + ": " + response.body());
                sendJson(exchange, 502, "reason",
                        "WeatherAPI returned an error. Check the server console.");
                return;
            }

            JSONObject data = new JSONObject(response.body());
            JSONObject current = data.getJSONObject("current");
            JSONObject location = data.getJSONObject("location");

            JSONObject result = new JSONObject()
                    .put("current", new JSONObject()
                            .put("temperature_2m",
                                    current.getDouble("temp_c"))
                            .put("cloud_cover",
                                    current.getInt("cloud"))
                            .put("wind_speed_10m",
                                    current.getDouble("wind_kph"))
                            .put("is_day", current.getInt("is_day"))
                            .put("time", location.getString("localtime")));

            send(exchange, 200, result.toString(),
                    "application/json; charset=utf-8");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendJson(exchange, 502, "error",
                    "The weather request was interrupted.");
        } catch (IOException | RuntimeException e) {
            sendJson(exchange, 502, "error",
                    "Could not retrieve weather data.");
        }
    }

    private static void staticFile(HttpExchange exchange)
            throws IOException {
        String path = exchange.getRequestURI().getPath();

        if (path.equals("/")) {
            path = "/index.html";
        }

        Path root = Path.of("dist").toAbsolutePath().normalize();
        Path file = root.resolve(path.substring(1)).normalize();

        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            send(exchange, 404, "Not found.",
                    "text/plain; charset=utf-8");
            return;
        }

        String name = file.getFileName().toString();
        String type = name.endsWith(".html") ? "text/html"
                : name.endsWith(".js") ? "text/javascript"
                : name.endsWith(".css") ? "text/css"
                : name.endsWith(".svg") ? "image/svg+xml"
                : "application/octet-stream";

        send(exchange, 200, Files.readString(file),
                type + "; charset=utf-8");
    }

    private static String readEnv(String name) {
        String value = System.getenv(name);

        if (value != null && !value.isBlank()) {
            return value;
        }

        Path envFile = Path.of(".env").toAbsolutePath().normalize();

        if (Files.isRegularFile(envFile)) {
            try {
                for (String line : Files.readAllLines(envFile)) {
                    String trimmed = line.trim();

                    if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                        continue;
                    }

                    int equals = trimmed.indexOf('=');

                    if (equals > 0
                            && trimmed.substring(0, equals)
                                    .trim().equals(name)) {
                        String result =
                                trimmed.substring(equals + 1).trim();

                        if (result.length() >= 2
                                && ((result.startsWith("\"")
                                && result.endsWith("\""))
                                || (result.startsWith("'")
                                && result.endsWith("'")))) {
                            result = result.substring(
                                    1, result.length() - 1);
                        }

                        return result;
                    }
                }
            } catch (IOException e) {
                System.err.println("Could not read .env file.");
            }
        }

        return null;
    }

    private static String parameter(String query, String name) {
        if (query != null) {
            for (String part : query.split("&")) {
                String[] pair = part.split("=", 2);
                String key = URLDecoder.decode(
                        pair[0], StandardCharsets.UTF_8);

                if (key.equals(name)) {
                    return pair.length > 1
                            ? URLDecoder.decode(
                                    pair[1], StandardCharsets.UTF_8)
                            : "";
                }
            }
        }

        return "";
    }

    private static void sendJson(
            HttpExchange exchange,
            int status,
            String key,
            String message) throws IOException {
        send(exchange, status,
                new JSONObject().put(key, message).toString(),
                "application/json; charset=utf-8");
    }

    private static void send(
            HttpExchange exchange,
            int status,
            String body,
            String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
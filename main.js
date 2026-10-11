const API_URL =
    "https://weather-api-988c.mariamimmm972.workers.dev";

const city = document.querySelector(".weather-top h3");
const date = document.querySelector(".weather-top p");
const locationButton = document.querySelector(".location-btn");
const temperature = document.querySelector(".temperature");
const condition = document.querySelector(".condition");
const weatherIcon = document.querySelector(".weather-icon");
const hourlyContainer = document.querySelector(".hourly-container");
const chartCanvas = document.querySelector("#tempChart");
const searchInput = document.querySelector("#searchInput");

const miniCards = document.querySelectorAll(".mini-card h2");
const humidity = miniCards[0];
const wind = miniCards[1];
const pressure = miniCards[2];
const feelsLike = miniCards[3];

let tempChart;
let activeController;
let requestNumber = 0;

function getWeatherIcon(weather) {
    const icons = {
        Clear: "fa-sun",
        Clouds: "fa-cloud",
        Rain: "fa-cloud-rain",
        Drizzle: "fa-cloud-rain",
        Thunderstorm: "fa-cloud-bolt",
        Snow: "fa-snowflake",
        Mist: "fa-smog",
        Fog: "fa-smog",
        Haze: "fa-smog",
        Smoke: "fa-smog",
        Dust: "fa-smog",
        Sand: "fa-smog",
        Ash: "fa-smog",
        Squall: "fa-wind",
        Tornado: "fa-tornado"
    };

    return icons[weather] || "fa-cloud";
}

function formatCityTime(timestamp, timezone) {
    return new Date(
        (timestamp + timezone) * 1000
    ).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC"
    });
}

function updateCurrentWeather(data) {
    city.textContent = data.name;
    temperature.textContent = `${Math.round(data.main.temp)}°`;
    condition.textContent = data.weather[0].main;

    weatherIcon.className =
        `fa-solid ${getWeatherIcon(data.weather[0].main)} weather-icon`;

    humidity.textContent = `${data.main.humidity}%`;
    wind.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    pressure.textContent = `${data.main.pressure} hPa`;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;

    if (date) {
        const cityDate = new Date(
            (data.dt + data.timezone) * 1000
        );

        date.textContent = cityDate.toLocaleString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC"
        });
    }
}

function updateForecast(data) {
    const labels = [];
    const temperatures = [];
    const fragment = document.createDocumentFragment();

    data.list.slice(0, 8).forEach((hour) => {
        const time = formatCityTime(
            hour.dt,
            data.city.timezone
        );

        const temp = Math.round(hour.main.temp);
        const iconClass = getWeatherIcon(
            hour.weather[0].main
        );

        labels.push(time);
        temperatures.push(temp);

        const item = document.createElement("div");
        item.className = "hour";

        const timeLabel = document.createElement("p");
        timeLabel.textContent = time;

        const icon = document.createElement("i");
        icon.className = `fa-solid ${iconClass}`;
        icon.setAttribute("aria-hidden", "true");

        const temperatureLabel = document.createElement("h3");
        temperatureLabel.textContent = `${temp}°`;

        item.append(timeLabel, icon, temperatureLabel);
        fragment.appendChild(item);
    });

    hourlyContainer.replaceChildren(fragment);
    createChart(labels, temperatures);
}

function createChart(labels, temperatures) {
    if (!chartCanvas || typeof Chart === "undefined") {
        return;
    }

    if (tempChart) {
        tempChart.destroy();
    }

    tempChart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Temperature (°C)",
                    data: temperatures,
                    borderColor: "#60a5fa",
                    backgroundColor: "rgba(96, 165, 250, 0.15)",
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: (value) => `${value}°C`
                    }
                }
            }
        }
    });
}

async function fetchWeatherData(type, query, signal) {
    const url = new URL(API_URL);
    url.searchParams.set("type", type);

    Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });

    const response = await fetch(url, { signal });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Unable to load weather data"
        );
    }

    return data;
}

async function loadWeather(query) {
    const currentRequest = ++requestNumber;

    if (activeController) {
        activeController.abort();
    }

    const controller = new AbortController();
    activeController = controller;

    try {
        const current = await fetchWeatherData(
            "weather",
            query,
            controller.signal
        );

        if (currentRequest !== requestNumber) {
            return;
        }

        updateCurrentWeather(current);

        hourlyContainer.replaceChildren();

        if (tempChart) {
            tempChart.destroy();
            tempChart = null;
        }

        const forecast = await fetchWeatherData(
            "forecast",
            {
                lat: current.coord.lat,
                lon: current.coord.lon
            },
            controller.signal
        );

        if (currentRequest !== requestNumber) {
            return;
        }

        updateForecast(forecast);
    } catch (error) {
        if (
            error.name !== "AbortError" &&
            currentRequest === requestNumber
        ) {
            alert(error.message);
        }
    }
}

function searchCity() {
    const cityName = searchInput.value.trim();

    if (cityName) {
        loadWeather({ q: cityName });
    }
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert("Your browser does not support location.");
        return;
    }

    locationButton.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                await loadWeather({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            } finally {
                locationButton.disabled = false;
            }
        },
        (error) => {
            locationButton.disabled = false;

            const messages = {
                1: "Allow location access to use this feature.",
                2: "Your location could not be determined.",
                3: "Location request timed out. Please try again."
            };

            alert(
                messages[error.code] ||
                "Unable to get your location."
            );
        },
        {
            timeout: 10000,
            maximumAge: 300000,
            enableHighAccuracy: false
        }
    );
}

locationButton.addEventListener("click", getCurrentLocation);

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchCity();
    }
});

const searchForm = searchInput.closest("form");

if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        searchCity();
    });
}

function initializeMap() {
    if (
        !document.querySelector("#map") ||
        typeof L === "undefined"
    ) {
        return;
    }

    const map = L.map("map").setView([20, 0], 2);

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }
    ).addTo(map);

    const demoTemperatureData = [
        [25.2769, 55.2962, 1],
        [21.3891, 39.8579, 0.9],
        [13.7563, 100.5018, 0.8],
        [35.6762, 139.6503, 0.7],
        [40.7128, -74.0060, 0.6],
        [51.5072, -0.1276, 0.5],
        [41.0082, 28.9784, 0.5],
        [59.9139, 10.7522, 0.1],
        [64.1466, -21.9426, 0.2]
    ];

    if (typeof L.heatLayer === "function") {
        L.heatLayer(demoTemperatureData, {
            radius: 70,
            blur: 50,
            maxZoom: 3,
            gradient: {
                0.1: "blue",
                0.3: "cyan",
                0.5: "lime",
                0.7: "orange",
                1: "red"
            }
        }).addTo(map);
    }

    const mapLabel = L.control({
        position: "bottomleft"
    });

    mapLabel.onAdd = () => {
        const label = L.DomUtil.create("div");
        label.textContent = "Demo heatmap — sample data";
        label.style.background = "white";
        label.style.color = "#111827";
        label.style.padding = "6px 10px";
        label.style.borderRadius = "6px";
        return label;
    };

    mapLabel.addTo(map);

    const mapContainer = map.getContainer();

    if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });

        observer.observe(mapContainer);
    }
}

initializeMap();
loadWeather({ q: "Tbilisi" });
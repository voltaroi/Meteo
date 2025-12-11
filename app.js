// ===== Configuration =====
const CONFIG = {
    GEOCODING_API: 'https://geocoding-api.open-meteo.com/v1/search',
    WEATHER_API: 'https://api.open-meteo.com/v1/forecast',
    STORAGE_KEY_FAVORITES: 'meteo-pwa-favorites',
    STORAGE_KEY_THEME: 'meteo-pwa-theme',
    RAIN_CODES: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99],
    TEMP_THRESHOLD: 10 // Température seuil pour notification
};

// ===== Éléments DOM =====
const elements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    notifyBtn: document.getElementById('notify-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    weatherSection: document.getElementById('weather-section'),
    favoritesSection: document.getElementById('favorites-section'),
    favoritesList: document.getElementById('favorites-list'),
    favoriteBtn: document.getElementById('favorite-btn'),
    cityName: document.getElementById('city-name'),
    temperature: document.getElementById('temperature'),
    weatherIcon: document.getElementById('weather-icon'),
    wind: document.getElementById('wind'),
    humidity: document.getElementById('humidity'),
    feelsLike: document.getElementById('feels-like'),
    hourlyList: document.getElementById('hourly-list'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message')
};

// ===== État de l'application =====
let currentCity = null;

// ===== Gestionnaire d'erreurs global (pour déboguer sur mobile) =====
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
    showError(`Erreur: ${event.error?.message || 'Erreur inconnue'}`);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    showError(`Erreur: ${event.reason?.message || 'Erreur de connexion'}`);
});

// ===== Initialisation =====
document.addEventListener('DOMContentLoaded', () => {
    updateNotifyButton();
    registerServiceWorker();
});

// ===== Service Worker =====
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/Meteo/service-worker.js');
            console.log('✅ Service Worker enregistré:', registration.scope);
        } catch (error) {
            console.error('❌ Erreur Service Worker:', error);
        }
    }
}

// ===== Notifications =====
function isNotificationSupported() {
    return 'Notification' in window && typeof Notification !== 'undefined';
}

function updateNotifyButton() {
    if (!isNotificationSupported()) {
        elements.notifyBtn.textContent = '🔔 Non disponible (iOS)';
        elements.notifyBtn.disabled = true;
        return;
    }
    
    if (!('Notification' in window)) {
        elements.notifyBtn.textContent = '🔔 Notifications non supportées';
        elements.notifyBtn.disabled = true;
        return;
    }

    const permission = Notification.permission;
    
    if (permission === 'granted') {
        elements.notifyBtn.textContent = '✅ Notifications activées';
        elements.notifyBtn.classList.add('granted');
        elements.notifyBtn.classList.remove('denied');
    } else if (permission === 'denied') {
        elements.notifyBtn.textContent = '❌ Notifications bloquées';
        elements.notifyBtn.classList.add('denied');
        elements.notifyBtn.classList.remove('granted');
    } else {
        elements.notifyBtn.textContent = '🔔 Activer les notifications';
        elements.notifyBtn.classList.remove('granted', 'denied');
    }
}

async function requestNotificationPermission() {
    console.log('🔔 Demande de permission notifications...');
    console.log('Support:', 'Notification' in window);
    console.log('Permission actuelle:', Notification.permission);
    
    if (!('Notification' in window)) {
        showError('Les notifications ne sont pas supportées par votre navigateur.');
        return;
    }

    if (Notification.permission === 'denied') {
        showError('Les notifications sont bloquées. Veuillez les réactiver dans les paramètres de votre navigateur.');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('✅ Permission obtenue:', permission);
        updateNotifyButton();
        
        if (permission === 'granted') {
            console.log('📤 Envoi notification de test...');
            // Notification de test
            const notif = new Notification('MétéoPWA', {
                body: 'Les notifications sont maintenant activées ! 🎉',
                icon: './icons/icon-192.png',
                tag: 'welcome',
                requireInteraction: false
            });
            
            notif.onclick = () => {
                console.log('Notification cliquée');
                window.focus();
                notif.close();
            };
            
            // Afficher aussi un message dans l'interface
            showError('✅ Notification de test envoyée !');
            setTimeout(() => hideError(), 3000);
        }
    } catch (error) {
        console.error('Erreur lors de la demande de permission:', error);
        showError('Erreur: ' + error.message);
    }
}

function sendWeatherNotification(city, message, type = 'info') {
    console.log('📢 Tentative notification:', { city, message, type });
    console.log('Permission:', Notification?.permission);
    
    // Si notifications pas disponibles, afficher dans l'interface
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        console.log('⚠️ Notifications non disponibles, affichage dans UI');
        displayNotificationUI(city, message, type);
        return;
    }
    
    // Utiliser le Service Worker pour afficher la notification (PWA)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
            console.log('📤 Envoi notification via Service Worker...');
            registration.showNotification(city, {
                body: message,
                icon: '/Meteo/icons/icon-192.png',
                badge: '/Meteo/icons/icon-192.png',
                tag: type,
                requireInteraction: false,
                actions: [
                    {
                        action: 'open',
                        title: 'Ouvrir'
                    }
                ]
            }).then(() => {
                console.log('✅ Notification envoyée avec succès');
            }).catch(err => {
                console.error('❌ Erreur notification:', err);
                displayNotificationUI(city, message, type);
            });
        });
    } else {
        // Fallback: utiliser l'API Notification standard (hors PWA)
        try {
            console.log('✅ Envoi notification standard...');
            const notif = new Notification(city, {
                body: message,
                icon: '/Meteo/icons/icon-192.png',
                tag: type,
                badge: '/Meteo/icons/icon-192.png',
                requireInteraction: false
            });
            
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
            
            console.log('✅ Notification envoyée avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de notification:', error);
            // Fallback: afficher dans l'interface
            displayNotificationUI(city, message, type);
        }
    }
}

function displayNotificationUI(city, message, type = 'info') {
    // Créer une notification visuelle dans l'interface
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification notification-${type}`;
    notificationDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${city}</div>
        <div>${message}</div>
    `;
    
    // Insérer au début du container
    const container = document.querySelector('.container');
    container.insertBefore(notificationDiv, container.firstChild);
    
    // Animer l'entrée
    requestAnimationFrame(() => {
        notificationDiv.classList.add('show');
    });
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        notificationDiv.classList.remove('show');
        setTimeout(() => notificationDiv.remove(), 300);
    }, 5000);
}

// ===== Recherche et API Météo =====
async function handleSearch() {
    requestNotificationPermission()

    const query = elements.cityInput.value.trim();
    
    if (!query) {
        showError('Veuillez entrer un nom de ville.');
        return;
    }

    showLoading();
    hideError();

    try {
        // 1. Géocodage : trouver les coordonnées de la ville
        const geoResponse = await fetch(
            `${CONFIG.GEOCODING_API}?name=${encodeURIComponent(query)}&count=1&language=fr&format=json`
        );
        
        if (!geoResponse.ok) throw new Error('Erreur de géocodage');
        
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`Ville "${query}" non trouvée. Vérifiez l'orthographe.`);
        }

        const location = geoData.results[0];
        const cityName = `${location.name}, ${location.country}`;
        
        // 2. Récupérer la météo
        await fetchWeather(location.latitude, location.longitude, cityName);
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function fetchWeather(lat, lon, cityName) {
    showLoading();
    hideError();

    try {
        const weatherResponse = await fetch(
            `${CONFIG.WEATHER_API}?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
            `&hourly=temperature_2m,weather_code,precipitation_probability` +
            `&timezone=auto&forecast_days=1`
        );

        if (!weatherResponse.ok) throw new Error('Erreur lors de la récupération des données météo');

        const weatherData = await weatherResponse.json();
        
        // Sauvegarder la ville courante
        currentCity = { name: cityName, lat, lon };
        
        // Afficher les résultats
        displayWeather(weatherData, cityName);
        
        // Notification de test à chaque recherche
        const temp = Math.round(weatherData.current.temperature_2m);
        const emoji = getWeatherEmoji(weatherData.current.weather_code);
        sendWeatherNotification(
            cityName,
            `${emoji} Température actuelle: ${temp}°C`,
            'search'
        );
        
        // Vérifier les alertes pour les 4 prochaines heures
        checkWeatherAlerts(weatherData, cityName);
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayWeather(data, cityName) {
    const current = data.current;
    const hourly = data.hourly;

    // Données actuelles
    elements.cityName.textContent = cityName;
    elements.temperature.textContent = Math.round(current.temperature_2m);
    elements.weatherIcon.textContent = getWeatherEmoji(current.weather_code);
    elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    elements.humidity.textContent = `${current.relative_humidity_2m} %`;
    elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;

    // Prévisions horaires (4 prochaines heures)
    const currentHour = new Date().getHours();
    const hourlyItems = [];
    
    for (let i = 0; i < 4; i++) {
        const hourIndex = currentHour + i + 1;
        if (hourIndex < hourly.time.length) {
            const time = new Date(hourly.time[hourIndex]);
            const temp = hourly.temperature_2m[hourIndex];
            const code = hourly.weather_code[hourIndex];
            const isRain = CONFIG.RAIN_CODES.includes(code);
            const isHighTemp = temp > CONFIG.TEMP_THRESHOLD;
            
            let alertClass = '';
            if (isRain) alertClass = 'rain-alert';
            else if (isHighTemp) alertClass = 'temp-alert';

            hourlyItems.push(`
                <div class="hourly-item ${alertClass}">
                    <div class="hourly-time">${time.getHours()}h</div>
                    <div class="hourly-icon">${getWeatherEmoji(code)}</div>
                    <div class="hourly-temp">${Math.round(temp)}°C</div>
                </div>
            `);
        }
    }

    elements.hourlyList.innerHTML = hourlyItems.join('');
    elements.weatherSection.classList.add('show');
}

function checkWeatherAlerts(data, cityName) {
    console.log('🔍 Vérification des alertes météo pour:', cityName);
    const hourly = data.hourly;
    const currentHour = new Date().getHours();
    
    let rainAlert = false;
    let tempAlert = false;
    let rainHour = null;
    let highTemp = null;

    console.log('⏰ Heure actuelle:', currentHour);
    
    // Vérifier les 4 prochaines heures
    for (let i = 1; i <= 4; i++) {
        const hourIndex = currentHour + i;
        if (hourIndex < hourly.time.length) {
            const code = hourly.weather_code[hourIndex];
            const temp = hourly.temperature_2m[hourIndex];
            
            console.log(`  Heure +${i} (${hourIndex}h): Code=${code}, Temp=${temp}°C`);
            
            // Vérifier la pluie
            if (!rainAlert && CONFIG.RAIN_CODES.includes(code)) {
                rainAlert = true;
                rainHour = i;
                console.log(`  ⚠️ ALERTE PLUIE détectée dans ${i}h`);
            }
            
            // Vérifier la température > 10°C
            if (!tempAlert && temp > CONFIG.TEMP_THRESHOLD) {
                tempAlert = true;
                highTemp = Math.round(temp);
                console.log(`  ⚠️ ALERTE TEMPÉRATURE détectée: ${highTemp}°C`);
            }
        }
    }

    console.log('📊 Résumé alertes:', { rainAlert, tempAlert, rainHour, highTemp });

    // Envoyer les notifications
    if (rainAlert) {
        console.log('📤 Envoi notification pluie...');
        sendWeatherNotification(
            cityName,
            `🌧️ Pluie prévue dans ${rainHour} heure${rainHour > 1 ? 's' : ''} !`,
            'rain'
        );
    }

    if (tempAlert) {
        console.log('📤 Envoi notification température...');
        sendWeatherNotification(
            cityName,
            `🌡️ Température supérieure à ${CONFIG.TEMP_THRESHOLD}°C prévue (${highTemp}°C)`,
            'temp'
        );
    }
    
    if (!rainAlert && !tempAlert) {
        console.log('✅ Aucune alerte détectée');
    }
}

// ===== Utilitaires =====
function getWeatherEmoji(code) {
    const weatherEmojis = {
        0: '☀️',      // Clear sky
        1: '🌤️',     // Mainly clear
        2: '⛅',      // Partly cloudy
        3: '☁️',      // Overcast
        45: '🌫️',    // Fog
        48: '🌫️',    // Depositing rime fog
        51: '🌦️',    // Light drizzle
        53: '🌦️',    // Moderate drizzle
        55: '🌧️',    // Dense drizzle
        56: '🌨️',    // Light freezing drizzle
        57: '🌨️',    // Dense freezing drizzle
        61: '🌧️',    // Slight rain
        63: '🌧️',    // Moderate rain
        65: '🌧️',    // Heavy rain
        66: '🌨️',    // Light freezing rain
        67: '🌨️',    // Heavy freezing rain
        71: '🌨️',    // Slight snow
        73: '🌨️',    // Moderate snow
        75: '❄️',     // Heavy snow
        77: '🌨️',    // Snow grains
        80: '🌦️',    // Slight rain showers
        81: '🌧️',    // Moderate rain showers
        82: '⛈️',     // Violent rain showers
        85: '🌨️',    // Slight snow showers
        86: '❄️',     // Heavy snow showers
        95: '⛈️',     // Thunderstorm
        96: '⛈️',     // Thunderstorm with slight hail
        99: '⛈️'      // Thunderstorm with heavy hail
    };
    
    return weatherEmojis[code] || '🌤️';
}

function showLoading() {
    elements.loading.style.display = 'block';
    elements.weatherSection.classList.remove('show');
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add('show');
}

function hideError() {
    elements.errorMessage.classList.remove('show');
}

// ===== Événements =====

// Rechercher la ville
elements.searchBtn.addEventListener('click', handleSearch);

// Appuyer sur "Entrée" dans l'input
elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Activer les notifications
elements.notifyBtn.addEventListener('click', requestNotificationPermission);

// Ajouter aux favoris
elements.favoriteBtn.addEventListener('click', () => {
    if (!currentCity) return showError('Aucune ville sélectionnée.');
    
    const favorites = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_FAVORITES) || '[]');
    
    if (!favorites.find(f => f.name === currentCity.name)) {
        favorites.push(currentCity);
        localStorage.setItem(CONFIG.STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
        loadFavorites();
    }
});

// Changer le thème
elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
    
    localStorage.setItem(
        CONFIG.STORAGE_KEY_THEME,
        document.body.classList.contains('dark-theme') ? 'dark' : 'light'
    );
});

// Charger les favoris
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_FAVORITES) || '[]');

    elements.favoritesList.innerHTML = favorites.map(fav => `
        <div class="favorite-item" onclick="fetchWeather(${fav.lat}, ${fav.lon}, '${fav.name.replace(/'/g, "\\'")}')">  
            <div class="favorite-name">${fav.name}</div>
            <button class="favorite-remove" onclick="event.stopPropagation(); removeFavorite('${fav.name.replace(/'/g, "\\'")}')">🗑️</button>
        </div>
    `).join('');

    if (favorites.length === 0) {
        elements.favoritesSection.classList.remove('show');
    } else {
        elements.favoritesSection.classList.add('show');
    }
}

// Supprimer un favori
function removeFavorite(cityName) {
    const favorites = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_FAVORITES) || '[]');
    const filtered = favorites.filter(f => f.name !== cityName);
    localStorage.setItem(CONFIG.STORAGE_KEY_FAVORITES, JSON.stringify(filtered));
    loadFavorites();
}

// Charger les données au démarrage
document.addEventListener('DOMContentLoaded', () => {
    updateNotifyButton();
    registerServiceWorker();
    
    // Charger thème
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY_THEME);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
    
    loadFavorites();
});


// Load Leaflet CSS
const leafletCSS = document.createElement('link');
leafletCSS.rel = 'stylesheet';
leafletCSS.href =
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
document.head.appendChild(leafletCSS);

// Load Locate Control CSS
const locateCSS = document.createElement('link');
locateCSS.rel = 'stylesheet';
locateCSS.href =
    'https://unpkg.com/leaflet.locatecontrol@0.79.0/dist/L.Control.Locate.min.css';
document.head.appendChild(locateCSS);

// Load Leaflet first, then Locate Control
window.leafletReady = new Promise((resolve, reject) => {

    const leafletScript = document.createElement('script');
    leafletScript.src =
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

    leafletScript.onload = () => {

        const locateScript = document.createElement('script');
        locateScript.src =
            'https://unpkg.com/leaflet.locatecontrol@0.79.0/dist/L.Control.Locate.min.js';

        locateScript.onload = () => resolve(window.L);
        locateScript.onerror = () =>
            reject(new Error('Could not load Locate Control'));

        document.head.appendChild(locateScript);
    };

    leafletScript.onerror = () =>
        reject(new Error('Could not load Leaflet'));

    document.head.appendChild(leafletScript);
});

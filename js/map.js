window.leafletReady.then((L) => {

    const map = L.map('map', {
        center: [49.0096, 8.4132],
        zoom: 16,
        minZoom: 13,
        maxBounds: [[48.95, 8.30], [49.07, 8.50]]
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        maxZoom: 19
    }).addTo(map);

    L.marker([49.0096, 8.4132])
        .addTo(map)
        .bindPopup('KIT Campus Süd')
        .openPopup();


    L.control.locate({
    position: 'topleft',
    flyTo: true,
    showPopup: true,
    strings: {
        title: 'Show my location'
    },
    locateOptions: {
        enableHighAccuracy: true
    }
    }).addTo(map);

}).catch(error => {
    console.error(error);
});

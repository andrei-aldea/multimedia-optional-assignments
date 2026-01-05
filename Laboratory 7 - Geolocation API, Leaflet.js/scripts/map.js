window.onload = function () {
    navigator.geolocation.getCurrentPosition(function (position) {
        console.log(position);

        let lat = position.coords.latitude;
        let long = position.coords.longitude;

        let map = L.map('map').setView([lat, long], 18);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">My awesome website</a>'
        }).addTo(map);

        L.marker([lat, long]).addTo(map);

        L.circle([lat, long], {
            color: 'green',
            fillColor: 'rgba(62, 240, 62, 1)',
            fillOpacity: 0.5,
            radius: position.coords.accuracy
        }).addTo(map);
    })


}
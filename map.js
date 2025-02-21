// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5kdW9vbyIsImEiOiJjbTdlaWZvdzUwZmN0MnNxM3JjaGUyMmxiIn0.YICfEOj7JccOvaOMV-97Sw';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});


map.on('load', () => { 
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });
    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',  // A bright green using hex code
            'line-width': 5,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
        }
    });
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });
    map.addLayer({
        id: 'bike-lanes-cambridge',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#d789e8',  // A bright green using hex code
            'line-width': 4,          // Thicker lines
            'line-opacity': 0.6       // Slightly less transparent
        }
    }); 

    // Load the nested JSON file
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
    const tripurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'

    const svg = d3.select('#map').select('svg');
    // let stations = [];

    d3.json(jsonurl).then(jsonData => {
        console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);

        // Load traffic data CSV
        d3.csv(tripurl).then(trips => {
            console.log('Loaded Traffic Data:', trips);

            // Convert relevant fields to numbers
            trips.forEach(d => {
                d.start_station_id = d.start_station_id.trim();
                d.end_station_id = d.end_station_id.trim();
            });

            // Calculate departures (grouped by start_station_id)
            const departures = d3.rollup(
                trips,
                v => v.length,  // Count occurrences
                d => d.start_station_id
            );
            // Calculate arrivals (grouped by end_station_id)
            const arrivals = d3.rollup(
                trips,
                v => v.length,  // Count occurrences
                d => d.end_station_id
            );
            // Merge traffic data into station dataset
            stations = stations.map(station => {
                let id = station.short_name.trim();
                station.departures = departures.get(id) ?? 0;  // Get departures count, default to 0
                station.arrivals = arrivals.get(id) ?? 0;      // Get arrivals count, default to 0
                station.totalTraffic = station.arrivals + station.departures; // Compute total traffic
                return station;
            });
            console.log('Updated Stations with Traffic Data:', stations);
        

            const radiusScale = d3
            .scaleSqrt()
            .domain([0, d3.max(stations, (d) => d.totalTraffic)])
            .range([0, 25]);

            // Append circles to the SVG for each station
            const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', d => radiusScale(d.totalTraffic))               // Radius of the circle
            .attr('fill', 'steelblue')  // Circle fill color
            .attr('stroke', 'white')    // Circle border color
            .attr('stroke-width', 1)    // Circle border thickness
            .attr('opacity', 0.8)      // Circle opacity
            .each(function(d) {
                // Add <title> for browser tooltips
                d3.select(this)
                  .append('title')
                  .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            });

            function getCoords(station) {
                const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
                const { x, y } = map.project(point);  // Project to pixel coordinates
                return { cx: x, cy: y };  // Return as object for use in SVG attributes
            }

            // Function to update circle positions when the map moves/zooms
            function updatePositions() {
                circles
                .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
                .attr('cy', d => getCoords(d).cy) // Set the y-position using projected coordinates
                .attr('r', d => radiusScale(d.totalTraffic));
            }
        
            // Initial position update when map loads
            updatePositions();
            

            // Reposition markers on map interactions
            map.on('move', updatePositions);     // Update during map movement
            map.on('zoom', updatePositions);     // Update during zooming
            map.on('resize', updatePositions);   // Update on window resize
            map.on('moveend', updatePositions);  // Final adjustment after movement ends
            
    }).catch(error => {
        console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
    });
 
    });
});






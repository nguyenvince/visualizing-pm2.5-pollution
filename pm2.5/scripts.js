// https://api.openaq.org/v1/locations?coordinates=40.7279,-73.9966&radius=10000&order_by=distance
var coordinates;
var location_url = 'https://api.openaq.org/v1/locations?&radius=100000&order_by=distance&coordinates=';
var measurement_url = 'https://api.openaq.org/v1/measurements?parameter=pm25';
var dur = 250;

var total_air = 16; //volume of air per day (m^3)
var air_per_sec = total_air / 86400; //volume of air per second (m^3)

var current_mass_concentration;
var current_number_concentration;

var currentCityName;

var who_guideline = 10; //who guideline on pm2.5 limit

var num_alveoli = 480000000; //avg number of aveoli

//Get location function
function geolocate() {
    $("#auto-locate").html("Getting location...");
    $("#auto-locate").addClass("loading");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getGeoLocation, showError);
    } else {
        alert("geolocation is not supported on your browser, try searching for your location instead");
    }
}

function showError(err) {
    alert(`ERROR(${err.code}): ${err.message}`);
}

function getGeoLocation(pos) {
    coordinates = pos.coords;
    getLocations().catch(error => {
        console.log(error.message);
        alert("there is no monitoring station near you " + coordinates.latitude + ',' + coordinates.longitude);
    })
}

async function getLocations() {
    var response = await fetch(location_url + coordinates.latitude + ',' + coordinates.longitude);
    var loc_data = await response.json();

    //loop through the list to find the nearest station with the latest data
    var d = new Date;
    var dateString = d.toISOString().substr(0, d.toISOString().search("T"));
    for (let i = 0; i < loc_data.results.length; i++) {
        if (loc_data.results[i].lastUpdated.includes(dateString)) {
            var city = loc_data.results[i].city;
            var location = loc_data.results[i].location;
            var country = loc_data.results[i].country;
            break;
        }
    }

    //console.log(city);
    //console.log(location);
    currentCityName = city + ' ' + country;

    getPM25({ 'city': city, 'cityName': currentCityName, 'location': location }, true);
    for (let i = 0; i < locations.length; i++) {
        getPM25({ 'city': locations[i].city, 'cityName': locations[i].cityName, 'location': locations[i].location }, false);
    }


    return loc_data;
}

//city: for API, cityName: for graph display
var locations = [
    { 'city': 'Beijing', 'cityName': 'Beijing, CN', 'location': 'Beijing US Embassy' },
    { 'city': 'Shanghai', 'cityName': 'Shanghai, CN', 'location': 'Shanghai' },
    { 'city': 'Delhi', 'cityName': 'New Delhi, IN', 'location': 'Dwarka-Sector 8, Delhi - DPCC ' },
    { 'city': 'London', 'cityName': 'London, UK', 'location': 'Camden Kerbside' },
    { 'city': 'Paris', 'cityName': 'Paris, FR', 'location': 'FR04329' },
    { 'city': 'Los Angeles-Long Beach-Santa Ana', 'cityName': 'Los Angeles, US', 'location': 'Los Angeles - N. Mai' },
    { 'city': 'DISTRITO FEDERAL', 'cityName': 'Mexico City, MX', 'location': 'Merced' },
];

//homeLocation: true -> get data for geolocation, false -> get data for other cities
async function getPM25(data, homeLocation) {
    //get yesterday
    var d1 = new Date;
    d1.setDate(d1.getDate() - 1);
    var dateString_1 = d1.toISOString().substr(0, d1.toISOString().search("T"));
    //get the day before yesterday date to get yesterday's mean value
    var d2 = new Date;
    d2.setDate(d2.getDate() - 1);
    var dateString_2 = d2.toISOString().substr(0, d2.toISOString().search("T"));

    //fetch data from the station
    var response = await fetch(measurement_url + '&city=' + data.city + '&location=' + data.location + '&date_from=' + dateString_2);
    //console.log(measurement_url + '&city=' + data.city + '&location=' + data.location + '&date_from=' + dateString_2);
    var pm_data = await response.json();

    //add to location graph data array
    addCityToGraph({ "city": data.cityName, "value": pm_data.results[0].value / who_guideline });

    //update the page information if homelocation is true
    if (homeLocation) {
        //mass concentration
        current_mass_concentration = pm_data.results[0].value;
        //console.log(current_mass_concentration);

        //calculate current number concentration
        current_number_concentration = convertToNumberConcentration(current_mass_concentration);
        console.log(current_number_concentration);

        //update station name
        $(".station").html(pm_data.results[0].location + ', ' + pm_data.results[0].city);

        //update current time
        var time = new Date(pm_data.results[0].date.local);
        $(".current-time").html(time);

        //update city name
        $("#city").html(pm_data.results[0].city);

        //update WHO guideline value
        $(".outdoor-guideline").html(compareWHO(current_mass_concentration));

        //get yesterday's mean value and update yesterday count
        let sum = 0;
        let cnt = 0;
        for (let i = 0; i < pm_data.results.length; i++) {
            if (pm_data.results[i].date.local.includes(dateString_1)) {
                if (typeof(pm_data.results[i].value) == "number") {
                    sum += pm_data.results[i].value;
                    cnt++;
                }
            }
        }
        let mean_yesterday = sum / cnt;
        let yesterday_count = convertToNumberConcentration(mean_yesterday) * total_air;
        $("#particle-yesterday").html(formatNumber(yesterday_count));
        //update WHO guideline value
        $("#yesterday-guideline").html(compareWHO(mean_yesterday));
        //update yesterday
        $("#yesterday").html(d1.toDateString().substr(4, 6));

        //update lung diagram
        let percent_lung = yesterday_count / num_alveoli;
        let height_viewBox;
        if (percent_lung < 1) {
            height_viewBox = 500 * (1 - percent_lung);
            $("#white").attr('viewBox', '0 0 500 ' + height_viewBox);
            $("#alveoli").html('<b>' + formatNumber(percent_lung) + '</b>' + ' of your <b>480 million</b> lung alveoli with one particle each');
        } else {
            $("#white").attr('viewBox', '0 0 500 0');
            $("#alveoli").html('all your <b>480 million</b> lung alveoli with one particle each, while still having <b>' + formatNumber(yesterday_count - num_alveoli).toString() + '</b> particles to spare');
        }

        //hide splash screen and show page
        $("#splash").fadeOut(dur, function() {
            $("#page-wrapper").fadeIn(dur, function() {
                //start painting canvas
                started = true;
                //send trigger signal to init outdoor and protection sketches
                initCanvas();
            });
        });
    }



    return pm_data;
}

//function to convert from mass concentration to number concentration
function convertToNumberConcentration(val) {
    //all values are in ft^3
    let v1 = Math.pow(val / (9.14 * Math.pow(10, -5)), 1 / 0.96);
    let v2 = Math.pow(val / (7.33 * Math.pow(10, -4)), 1 / 0.82);
    let v3 = solveQuadratic(0.65 - val, 4.16 * Math.pow(10, -5), 1.57 * Math.pow(10, -11));
    let v4 = (val - 4.75) / (2.8 * Math.pow(10, -5));
    //calculate average and convert to m^3
    return (v1 + v2 + v3 + v4) / 4 * 35.3147;
}

//solve quadratic function
function solveQuadratic(c, b, a) {
    var x1 = (-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
    var x2 = (-1 * b - Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
    if (x1 > x2) return x1;
    else return x2;
}

//return comparison to WHO's guideline of 10um annually
function compareWHO(val) {
    let v = (val / who_guideline);
    let c;
    if (v <= 1.0) {
        c = 'rgb(0,150,0)';
    } else {
        c = 'rgb(150,0,0)';
    }
    return '<span style="color:' + c + '">' + v.toFixed(1).toString() + 'x </span>';

}

//format number
function formatNumber(num) {
    //return percentage value rounded to integer
    if (num < 10) {
        return Math.round(num * 100) + '%';
    }
    //with comma for small number
    else if (num < 1000000) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
    }
    //with M or B for big numnber
    else if (num < 1000000000 && num >= 1000000) {
        return Math.floor(num / 1000000).toString() + ' M'; //million
    } else if (num >= 1000000000) {
        return Math.floor(num / 1000000).toString() + ' B'; //billion
    }

}

//init enterview.js on ready
$(document).ready(function() {
    enterView({
        selector: '.protection-item',
        enter: function(el) {
            changeProtection(parseInt(el.getAttribute("data-step"))); //send data step information to sketch
            //update fields
            $("#protection-title").html(el.innerHTML);

        },
        offset: 0.2
    });
});
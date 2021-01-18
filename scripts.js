var url = 'https://api.waqi.info/feed/';
var token = '/?token=89f64a7d2fdf5c4f6e13c0645fa1d5a382e40fe5'; //uhmmmm so github page doesn't support backend stuffs, so please dont overuse this api key, you can register for one at aqicn.org/api
var dur = 250;

var total_air = 16; //volume of air per day (m^3)
var air_per_sec = total_air / 86400; //volume of air per second (m^3)

var current_mass_concentration;
var current_number_concentration;

var currentCityName;

var who_guideline = 10; //who guideline on pm2.5 limit

var num_alveoli = 480000000; //avg number of aveoli

//station: for API request
var locations = [
    { 'city': 'Abu Dhabi', 'country': 'AE', 'station': 'US Embassy, Abu Dhabi City, UAE' },
    { 'city': 'Addis Ababa', 'country': 'ET', 'station': 'Addis Ababa US Embassy, Ethiopia' },
    { 'city': 'Beijing', 'country': 'CN', 'station': 'Beijing US Embassy, Beijing' },
    { 'city': 'Shanghai', 'country': 'CN', 'station': 'Shanghai US Consulate, Shanghai' },
    { 'city': 'New Delhi', 'country': 'IN', 'station': 'New Delhi US Embassy, India' },
    { 'city': 'London', 'country': 'UK', 'station': 'London' },
    { 'city': 'Paris', 'country': 'FR', 'station': 'Paris' },
    { 'city': 'Los Angeles', 'country': 'US', 'station': 'Los Angeles-North Main Street' },
    { 'city': 'New York', 'country': 'US', 'station': 'New York' },
    { 'city': 'Hanoi', 'country': 'VN', 'station': 'Hanoi US Embassy, Vietnam' },
    { 'city': 'Bangkok', 'country': 'TH', 'station': 'Bangkok' },
    { 'city': 'Lima', 'country': 'PE', 'station': 'US Embassy, Lima, Peru' },
    { 'city': 'Jakarta', 'country': 'ID', 'station': 'Jakarta Central (US Consulate), Indonesia' },
    { 'city': 'Ulaanbaatar', 'country': 'MM', 'station': 'Ulaanbaatar US Embassy' },
    { 'city': 'Madrid', 'country': 'ES', 'station': 'Madrid' },
    { 'city': 'Skopje', 'country': 'MK', 'station': 'Centar, Skopje, Macedonia' },
    { 'city': 'Seoul', 'country': 'IN', 'station': 'Seoul' },
    { 'city': 'Milan', 'country': 'IN', 'station': 'Milan' }
];
// sort alphabetically
locations.sort((a, b) => {
    let fa = a.city.toLowerCase(),
        fb = b.city.toLowerCase();

    if (fa < fb) {
        return -1;
    }
    if (fa > fb) {
        return 1;
    }
    return 0;
});

function showError(err) {
    alert(`ERROR(${err.code}): ${err.message}`);
}

//homeLocation: true -> get data for selected location, false -> get data for other cities
async function getPM25(data, selectedLocation) {

    //fetch data from the station
    var full_url = url + data.station + token;
    var response = await fetch(full_url);
    var pm_data = await response.json();
    console.log(data.station)
        //mass concentration
    current_mass_concentration = convertToMassConcentration(pm_data.data.iaqi.pm25.v);

    // if selected location, update UI
    if (selectedLocation) {
        //calculate current number concentration
        current_number_concentration = convertToNumberConcentration(current_mass_concentration);

        //update station name
        $(".station").html(data.station + ', ' + data.city + ', ' + data.country);

        //update data time
        $(".current-time").html(pm_data.data.time.iso);

        //update city name
        $("#city").html(data.city);

        //update WHO guideline value
        $(".outdoor-guideline").html(compareWHO(current_mass_concentration));

        //extrapolate current data for one day worth of pm2.5
        let daily = current_number_concentration * total_air;
        $("#particle-daily").html(formatNumber(daily));
        //update WHO guideline value
        $("#daily-guideline").html(compareWHO(current_mass_concentration));

        //update lung diagram
        let percent_lung = daily / num_alveoli;
        let height_viewBox;
        if (percent_lung < 1) {
            height_viewBox = 500 * (1 - percent_lung);
            $("#white").attr('viewBox', '0 0 500 ' + height_viewBox);
            $("#alveoli").html('<b>' + formatNumber(percent_lung) + '</b>' + ' of your <b>480 million</b> lung alveoli with one particle each');
        } else {
            $("#white").attr('viewBox', '0 0 500 0');
            $("#alveoli").html('all your <b>480 million</b> lung alveoli with one particle each, while still having <b>' + formatNumber(daily - num_alveoli).toString() + '</b> particles to spare');
        }

        //hide splash screen and show page
        //start painting canvas
        started = true;
        //send trigger signal to init outdoor and protection sketches
        initCanvas();
    }
    // else: other cities' comparison graph
    else {
        //add to location graph data array
        compare_graph_array.push({ "city": data.city, "value": current_mass_concentration / who_guideline });

    }
    return pm_data;
}

//function to convert US AQI to mass concentration
function linearPieceWise(aqiHigh, aqiLow, concenHigh, concenLow, AQIvalue) {
    c = ((AQIvalue - aqiLow) / (aqiHigh - aqiLow)) * (concenHigh - concenLow) + concenLow;
    return c;
}

function convertToMassConcentration(val) {
    if (val >= 0 && val <= 50) {
        mass = linearPieceWise(50, 0, 12, 0, val);
    } else if (val > 50 && val <= 100) {
        mass = linearPieceWise(100, 51, 35.4, 12.1, val);
    } else if (val > 100 && val <= 150) {
        mass = linearPieceWise(150, 101, 55.4, 35.5, val);
    } else if (val > 150 && val <= 200) {
        mass = linearPieceWise(200, 151, 150.4, 55.5, val);
    } else if (val > 200 && val <= 300) {
        mass = linearPieceWise(300, 201, 250.4, 150.5, val);
    } else if (val > 300 && val <= 400) {
        mass = linearPieceWise(400, 301, 350.4, 250.5, val);
    } else if (val > 400 && val <= 500) {
        mass = linearPieceWise(500, 401, 500.4, 350.5, val);
    } else if (val > 400 && val <= 1000) {
        mass = linearPieceWise(1000, 501, 1250.4, 500.5, val);
    }
    return mass;
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

//format number helper function
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
        return (Math.floor(num / 1000000) / 1000).toString() + ' B'; //billion
    }

}


$(document).ready(function() {
    //init enterview.js on ready
    enterView({
        selector: '.protection-item',
        enter: function(el) {
            changeProtection(parseInt(el.getAttribute("data-step"))); //send data step information to sketch
            //update fields
            $("#protection-title").html(el.innerHTML);

        },
        offset: 0.2
    });

    // add the locations
    for (i = 0; i < locations.length; i++) {
        let loc = locations[i];
        let b = document.createElement("button");
        button = $(b);
        button.addClass("cities");
        button.html(loc.city);
        button.attr("station", loc.station);

        // on choosing a new location
        button.on("click", function() {
            // reset particle count
            particle_count = 0;
            // delete canvas if existed
            if ($("canvas")) $("canvas").remove();
            // get PM2.5 for selected location (true)
            getPM25(loc, true);
            // show main page
            $("#page-wrapper").show();
            document.getElementById("page-wrapper").scrollIntoView();
            // draw comparison graph if not existed
            if ($("#comparison-graph").length == 0) drawGraph();
            // highlight current selected city
            $(".bar").each(function() {
                if ($(this).hasClass("current-city-bar")) $(this).removeClass("current-city-bar");
                if ($(this).hasClass(loc.city)) $(this).addClass("current-city-bar");
            });
        });
        // get PM2.5 for other cities for comparison (false)
        getPM25(loc, false);
        $("#cities-wrapper").append(button);
    }
});
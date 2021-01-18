var compare_graph_array = [];

function addCityToGraph(val) {
    compare_graph_array.push(val);
    console.log(compare_graph_array);
    //check when API calls returns all the data points, then call function to draw grpah
    if (compare_graph_array.length == locations.length + 1) {
        drawGraph();
    }
}

function drawGraph() {
    // format the data
    compare_graph_array.forEach(function(d) {
        d.value = +d.value;
    });

    //sort bars based on value
    compare_graph_array = compare_graph_array.sort(function(a, b) {
        return d3.ascending(a.value, b.value);
    });

    // set the dimensions and margins of the graph
    var margin = {
            top: 20,
            right: 20,
            bottom: 50,
            left: 100
        },
        width = $("#compare-wrapper").width() - margin.left - margin.right,
        height = $("#compare-wrapper").width() * 0.5 - margin.top - margin.bottom;

    // set the ranges
    var y = d3.scaleBand()
        .range([height, 0])
        .padding(0.1);

    var x = d3.scaleLinear()
        .range([0, width]);

    // append the svg object to the body of the page
    // append a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3.select("#compare-graph").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the compare_graph_array in the domains
    x.domain([0, d3.max(compare_graph_array, function(d) {
        return d.value;
    })])
    y.domain(compare_graph_array.map(function(d) {
        return d.city;
    }));

    // append the rectangles for the bar chart
    svg.selectAll(".bar")
        .data(compare_graph_array)
        .enter().append("rect")
        .attr("class", function(d) {
            if (d.city == currentCityName) return "current-city-bar";
            else return d.city + " bar";
        })
        .attr("width", function(d) {
            return x(d.value);
        })
        .attr("y", function(d) {
            return y(d.city);
        })
        .attr("height", y.bandwidth());

    // add the x Axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // text label for the x axis
    svg.append("text")
        .attr("transform",
            "translate(" + (width / 2) + " ," +
            (height + margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("Time(s) WHO's limit");

    // add the y Axis
    svg.append("g")
        .call(d3.axisLeft(y));

    //add who limit line
    svg.append("line")
        .attr("class", "limit-line")
        .attr("x1", x(1))
        .attr("y1", 0)
        .attr("x2", x(1))
        .attr("y2", height);

}
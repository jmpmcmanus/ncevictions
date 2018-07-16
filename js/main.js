var margin = {top:50, right:50, bottom:0, left:50},
    width = 1050 - margin.left - margin.right,
    height = 460 - margin.top - margin.bottom;

var years = ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16"]

var cdata, tdata, circle, zoomlevel = 1;

var projection = d3.geoMercator()
    .center([-80.0, 35.00])
    .scale(6000)
    .translate([width / 2, height / 2]);

var path = d3.geoPath()
    .projection(projection);

var svg = d3.select(".map-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

var layer = svg.append("g");
var map = layer.append("g")
  .attr("id","map");
var durhamtrts = layer.append("g")
  .attr("id","durhamtrts");

// Set the ranges tip bar plot
var pwidth = 300;
var pheight = 200;

var xBar = d3.scaleBand()
          .range([0, pwidth], 0.1, 0.2);
var yBar = d3.scaleLinear()
          .range([pheight, 0]);

var format = d3.format(",");

// Select Menu
var fields = [
    {name: "Eviction Rate", id: "evictionrate"},
    {name: "Number of Evictions", id: "evictions"}
  ],
  fieldsById = d3.nest()
    .key(function(d) { return d.id; })
    .rollup(function(d) { return d[0]; })
    .map(fields),
    field = fields[0];

var fieldSelect = d3.select("#field")
  .on("change", function(e) {
    field = fields[this.selectedIndex];
    location.hash = "#" + [field.id].join("/");
  });

fieldSelect.selectAll("option")
  .data(fields)
  .enter()
  .append("option")
    .attr("value", function(d) { return d.id; })
    .text(function(d) { return d.name; });

//tiptool;
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .direction('nw')
  .offset([-120, -120])
  .html(function(d, evict, year) {
    if (d.CTYPE === 'county') {
      if (d.PARM === 'evictionrate') {
        return  "<strong>"+d.NAME.charAt(0) + d.NAME.slice(1).toLowerCase() + 
        " Co. had a " + format( Math.abs( evict ) ) + "% eviction rate " +
        "in " + year + "</strong>" + "<div id='tipDiv'></div>";  
      }
      else if (d.PARM === 'evictions') {
        return  "<strong>"+d.NAME.charAt(0) + d.NAME.slice(1).toLowerCase() + 
        " Co. had " + format( Math.abs( evict ) ) + " evictions " +
        "in " + year + "</strong>" + "<div id='tipDiv'></div>";  
      }
    }
    else if (d.CTYPE === 'tract') {
      if (d.PARM === 'evictionrate') {
        return  "<strong>"+d.NAME.charAt(0) + d.NAME.slice(1).toLowerCase() + 
        " had a " + format( Math.abs( evict ) ) + "% eviction rate " +
        "in " + year + "</strong>" + "<div id='tipDiv'></div>";  
      }
      else if (d.PARM === 'evictions') {
        return  "<strong>"+d.NAME.charAt(0) + d.NAME.slice(1).toLowerCase() + 
        " had " + format( Math.abs( evict ) ) + " evictions " +
        "in " + year + "</strong>" + "<div id='tipDiv'></div>";  
      }
    }
  })

svg.call(tip);

var interval,
frameLength = 500,
isPlaying = false;

var formatDateIntoYear = d3.timeFormat("%Y");
var formatDate = d3.timeFormat("%b %Y");
var parseDate = d3.timeParse("%m/%d/%y");

var startDate = new Date("2000-01-02"),
    endDate = new Date("2016-12-31");

var moving = false;
var currentValue = 342;
var targetValue = width;
  
var playButton = d3.select("#play-button");
      
var xTime = d3.scaleTime()
  .domain([startDate, endDate])
  .range([0, targetValue])
  .clamp(true);

var svgslider = d3.select("#slider-container")
  .append("svg")
  .attr("width", width + margin.left*3 + margin.right)
  .attr("height", height/8 + margin.top + margin.bottom);

var slider = svgslider.append("g")
  .attr("class", "slider")
  .attr("transform", "translate(" + margin.left*3 + "," + height/8 + ")");
  
slider.append("line")
  .attr("class", "track")
  .attr("x1", xTime.range()[0])
  .attr("x2", xTime.range()[1])
  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
  .attr("class", "track-inset")
  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
  .attr("class", "track-overlay")
  .call(d3.drag()
    .on("start.interrupt", function() { slider.interrupt(); })
    .on("start drag", function() {
      currentValue = d3.event.x;
      update(xTime.invert(currentValue)); 
    })
  );
  
slider.insert("g", ".track-overlay")
  .attr("class", "ticks")
  .attr("transform", "translate(0," + 18 + ")")
  .selectAll("text")
  .data(xTime.ticks(10))
  .enter()
  .append("text")
  .attr("x", xTime)
  .attr("y", 10)
  .attr("text-anchor", "middle")
  .text(function(d) { return formatDateIntoYear(d); });
  
var handle = slider.insert("circle", ".track-overlay")
  .attr("class", "handle")
  .attr("r", 9);
  
var label = slider.append("text")  
  .attr("class", "label")
  .attr("text-anchor", "middle")
  .text(formatDateIntoYear(startDate))
  .attr("transform", "translate(0," + (-25) + ")")

playButton
  .on("click", function() {
  var button = d3.select(this);
  if (button.text() == "Pause") {
    moving = false;
    clearInterval(timer);
    // timer = 0;
    button.text("Play");
  } else {
    moving = true;
    timer = setInterval(step, 100);
    button.text("Pause");
  }
})

window.onhashchange = function() {
  parseHash();
};

window.onload = function() {
  if (location.hash.substr(1)) {
    location.replace("");
  }
};

d3.json("data/counties.topojson", function(error, nc) {
  map.selectAll("path")
    .data(topojson.feature(nc, nc.objects.counties).features)
    .enter()
    .append("path")
      .attr("class","counties")
      .attr("vector-effect","non-scaling-stroke")
      .attr("d", path);

  d3.csv("data/countyevictdata.csv",function(error, data) {
    cdata = data;
    var dataset = [];
    for (i = 0; i < cdata.length; i++) {
      if (cdata[i]['PARM'] === 'evictionrate') {
        dataset.push(cdata[i])
      }
    }
    drawPoints(dataset);
    createLegend('evictionrate','county');
    update(xTime.invert(currentValue));
  })
});

d3.json("data/durhamtrts10.topojson", function(error, trts) {
  durhamtrts.selectAll("path")
    .data(topojson.feature(trts, trts.objects.durhamtrts10).features)
    .enter()
    .append("path")
      .attr("d", path)
      .attr("class","durhamtrts")
      .attr("vector-effect","non-scaling-stroke")
      .attr('visibility', 'hidden');

  d3.csv("data/durhamtractevictdata.csv",function(error, data) {
    tdata = data;
    var dataset = [];
    for (i = 0; i < tdata.length; i++) {
      if (tdata[i]['PARM'] === 'evictionrate') {
        dataset.push(tdata[i])
      }
    }
    drawPoints(dataset);
    createLegend('evictionrate','tract');
  })
});

function changeCountyEvict(parameter) {
  d3.selectAll('circle.county').remove()
  d3.selectAll('#legend').remove()

  var dataset = []
  for (i = 0; i < cdata.length; i++) {
    if (cdata[i]['PARM'] === parameter) {
      dataset.push(cdata[i])
    }
  }

  drawPoints(dataset);
  createLegend(parameter,'county');
}

function changeTrtsEvict(parameter) {
  d3.selectAll('circle.tract').remove()
  d3.selectAll('#tractlegend').remove()

  var dataset = []
  for (i = 0; i < tdata.length; i++) {
    if (tdata[i]['PARM'] === parameter) {
      dataset.push(tdata[i])
    }
  }

  drawPoints(dataset);
  createLegend(parameter,'tract');
}

// functions and reading data
function circleSize(parm,ctype,d) {
  if (ctype == 'county') {
    if (parm == 'evictions') {
      return Math.sqrt( 0.1 * Math.abs(d) );
    }
    else if (parm == 'evictionrate') {
      return Math.sqrt( 50.0 * Math.abs(d) );
    }
  }
  else if (ctype == 'tract') {
    if (parm == 'evictions') {
      return Math.sqrt( 0.01 * Math.abs(d) );
    }
    else if (parm == 'evictionrate') {
      return Math.sqrt( 0.1 * Math.abs(d) );
    }
  }
};

function drawCircles(m,tween) {
  circle = map.selectAll('circle')
    .sort(function(a,b) {
      // catch nulls, and sort circles by size (smallest on top)
      if ( isNaN(a[m]) ) a[m] = 0;
      if ( isNaN(b[m]) ) b[m] = 0;
      return Math.abs(b[m]) - Math.abs(a[m]);
    })
    .attr('visibility', 'visible')
    .attr("class",function(d) {
      return d["CTYPE"] == "county" ? "county" : "tract";
    });
  if ( tween ) {
    circle
      .transition()
      .ease("linear")
      .duration(frameLength)
      .attr("r",function(d) {
        if (d["CTYPE"]) {
          return circleSize(d['PARM'],d["CTYPE"],d[m])
        }
      });
  } 
  else {
    circle.attr("r",function(d) {
      if (d["CTYPE"]) {
        return circleSize(d['PARM'],d["CTYPE"],d[m])
      }  
    });
  }

  if (zoomlevel == 1) {
    d3.selectAll('circle.county').attr('visibility', 'visible')
    d3.selectAll('circle.tract').attr('visibility', 'hidden')
  }
  else if (zoomlevel == 8) {
    d3.selectAll('circle.county').attr('visibility', 'hidden')
    d3.selectAll('circle.tract').attr('visibility', 'visible')
  }
}

function drawPoints(dataset) {
  // draw county points 
  for ( var i in dataset ){
    var projected = projection([ parseFloat(dataset[i].LON), parseFloat(dataset[i].LAT) ])
    if ( isNaN(projected[0]) ) projected[0] = 0;
    if ( isNaN(projected[1]) ) projected[1] = 0;
    map.append('circle')
      .datum( dataset[i] )
      .attr("cx",projected[0])
      .attr("cy",projected[1])
      .attr("r",1)
      .attr("vector-effect","non-scaling-stroke")  
      .on("mouseover",function(d){
        var year = xTime.invert(currentValue).getFullYear();
        var evict = d[ year ];
        tip.show(d, evict, year, this);    
        var tipsvg = d3.select("#tipDiv")
          .append("svg")
          .attr("width", pwidth+70)
          .attr("height", pheight+30)
        .append("g")
          .attr("transform", "translate(" + 50 + "," + 10 + ")");
        var i, edata = [], maxdata = [];
        for (i = 0; i < years.length; i++) {
          if (isNaN(d["20"+years[i]])) {
            edata.push({'year':years[i],'evict': []});
          } else {
            edata.push({'year':years[i],'evict': d["20"+years[i]]});
            maxdata.push(parseFloat(d["20"+years[i]]))
          }
        };
        xBar.domain(edata.map(function(ed) { return ed.year; }));
        yBar.domain([0, d3.max(maxdata)]);     
        tipsvg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (pheight) + ")")
          .call(d3.axisBottom(xBar));
        tipsvg.append("g")
          .attr("class", "y axis")
          .call(d3.axisLeft(yBar));   
        tipsvg.selectAll(".bar")
          .data(edata)
        .enter().append("rect")
          .attr("class", "bar")
          .attr("x", function(ed) { return xBar(ed.year) })
          .attr("width", xBar.bandwidth())
          .attr("y", function(ed) { return yBar(ed.evict) })
          .attr("height", function(ed) { return (pheight) - yBar(ed.evict) })
          .attr("fill", function (ed){ 
            if ('20'+ed.year == year) {
              return 'red' 
            } else {
              return 'steelblue' 
            }
          });
          tipsvg.append("g")
            .attr("transform", "translate(0," + pheight + ")")
            .attr("class", "axisWhite")
            .call(d3.axisBottom(xBar));
          tipsvg.append("g")
            .attr("class", "axisWhite")
            .call(d3.axisLeft(yBar));
      })
      .on("mouseout",function(d){
        tip.hide(d);
      });
  }
  drawCircles(xTime.invert(currentValue).getFullYear());
}

function step() {
  update(xTime.invert(currentValue));
  currentValue = currentValue + (targetValue/151);
  if (currentValue > targetValue) {
    moving = false;
    currentValue = 0;
    clearInterval(timer);
    // timer = 0;
    playButton.text("Play");
    //.log("Slider move: " + moving);
  }
}

function update(h) {
  // update position and text of label according to slider scale
  handle.attr("cx", xTime(h));
  label
    .attr("x", xTime(h))
    .text(formatDateIntoYear(h));

  drawCircles(h.getFullYear().toString());
}

function createLegend(parm,ctype) {
  if (ctype == 'county') {
    var legend = layer.append("g").attr("id","legend").attr("transform","translate(5,20)");    
    if (parm == 'evictions') {
      var sizes = [ 1000, 7000, 14000 ];
      var title = 'evictions'
    }
    else if (parm == 'evictionrate') {
      var sizes = [ 1.0, 5.0, 15.0 ];
      var title = 'evictions per 100 renter-occupied hh'
    }
    for ( var i in sizes ){
      legend.append('circle')
        .attr( "r", circleSize(parm, ctype, sizes[i] ) )
        .attr( "cx", 80 + circleSize(parm, ctype, sizes[sizes.length-1] ) )
        .attr( "cy", 2 * circleSize(parm, ctype, sizes[sizes.length-1] ) - circleSize(parm, ctype, sizes[i] ) )
        .attr("vector-effect","non-scaling-stroke");
      legend.append("text")
        .text( (sizes[i] ) + (i == sizes.length-1 ? " "+title : "") )
        .attr( "text-anchor", "middle" )
        .attr( "x", 80 + circleSize(parm, ctype, sizes[sizes.length-1] ) )
        .attr( "y", 2 * ( circleSize(parm, ctype, sizes[sizes.length-1] ) - circleSize(parm, ctype, sizes[i] ) ) + 5 )
        .attr( "dy", -6);
    }
  }
  else if (ctype === 'tract') {
    if ( zoomlevel === 1 ) {
      var visibility = 'hidden'
    }
    else if (zoomlevel == 8) {
      var visibility = 'visible'
    }
    var legend = layer.append("g")
      .attr("id","tractlegend")
      .attr("transform","translate(5,50)")
      .attr('visibility', visibility);
    if (parm == 'evictions') {
      var sizes = [ 50, 200, 400 ];
      var title = 'evictions'
    }
    else if (parm === 'evictionrate') {
      var sizes = [ 5.0, 20.0, 40.0 ];
      var title = 'eviction rate'
    }
    for ( var i in sizes ){
      legend.append('circle')
        .attr( "r", circleSize(parm, ctype, sizes[i] ) )
        .attr( "cx", 550 + circleSize(parm, ctype, sizes[sizes.length-1] ) )
        .attr( "cy", 2 * circleSize(parm, ctype, sizes[sizes.length-1] ) - circleSize(parm, ctype, sizes[i] ) )
        .attr("vector-effect","non-scaling-stroke");
      legend.append("text")
        .text( (sizes[i] ) + (i == sizes.length-1 ? "% "+title : "") )
        .attr( "text-anchor", "middle" )
        .attr( "x", 550 + circleSize(parm, ctype, sizes[sizes.length-1] ) )
        .attr( "y", 2 * ( circleSize(parm, ctype, sizes[sizes.length-1] ) - circleSize(parm, ctype, sizes[i] ) ) + 5 )
        .attr( "dy", -5);
    }
  }
}

//Toggle zoom button
d3.select("#zoom-button").on("click", function() {
  let x;
  let y;

  if (zoomlevel == 1) {
    x = 581.6695679863883
    y = 72.67791485049302
    zoomlevel = 8

    d3.selectAll('.durhamtrts').attr('visibility', 'visible')
    d3.selectAll('#tractlegend').attr('visibility', 'visible')
    d3.selectAll('circle.tract').attr('visibility', 'visible')
    d3.selectAll('circle.county').attr('visibility', 'hidden')
  }
  else {
    x = width / 2
    y = height / 2
    zoomlevel = 1

    d3.selectAll('.durhamtrts').attr('visibility', 'hidden')
    d3.selectAll('#tractlegend').attr('visibility', 'hidden')
    d3.selectAll('circle.tract').attr('visibility', 'hidden')
    d3.selectAll('circle.county').attr('visibility', 'visible')
  }

  layer.transition()
    .duration(750)
    .attr('transform', 'translate(' + width / 2 + ',' + height / 1.75 + ')scale(' + zoomlevel + ')translate(' + -x + ',' + -y + ')')
    .style('stroke-width', 1.5 / zoomlevel + 'px')
});

var hashish = d3.selectAll("a.hashish")
  .datum(function() {
    return this.href;
  });

function parseHash() {
  var parts = location.hash.substr(1).split("/"),
      desiredFieldId = parts[0],

  field = fieldsById.get(desiredFieldId) || fields[0];
  fieldSelect.property("selectedIndex", fields.indexOf(field));

  changeCountyEvict(field.id);
  changeTrtsEvict(field.id);

  location.replace("#" + [field.id].join("/"));

  hashish.attr("href", function(href) {
    return
  });
}

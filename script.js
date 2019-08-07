var wink = require('wink-distance');
var cluster = require('hierarchical-clustering');

var width = 1100;
var radius = width / 2 - 140;
var legendRadius = 90;
var dr = 5;
var L = 0; // number of languages
var W = 0; //number of words
var smallSize = "17px";
var bigSize = "20px";
// used to assign nodes color by group  
//var color = d3.scale.category20();
var color = d3.scale.ordinal().domain(d3.range(58)).range(["dodgerblue", "pink", "beige", "slategray", "brown", "red", "orange", "khaki", "#CCCCFF", "turquoise", "mediumslateblue", "purple", "hotpink", "mistyrose", "black", "gold", "#e1ad01", "olive", "teal", "wheat", "blue", "green", "yellow", "grey", "darkgreen", "brown", "slateblue", "#A9A9A9", "orange", "mediumvioletred", "silver", "lime", "teal", "navy", "fuchsia", "maroon","seagreen", "cadetblue", "royalblue", "orchid", "lemonchiffon", "#009b7d", "#19e194", "#ff6a4e", "#ffe4b5", "#812d2a", "#c16873", "indigo", "#CCA9B4", "#9b81ba", "#a1666d"]);

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

// Draws an arc diagram for the provided undirected graph
function drawGraph(graph, languages) {

    languages = d3.nest()
	.key(function(d) { return d.iso; })
	.map(languages);

    var nestedData = d3.nest()
	.key(function(d) { return d.lang; })
	.entries(graph.nodes)
	.map(function(d) {
	    return {
		"key":  d.key,
		"values": d.values,
		"year": languages[d.key][0].year
	    };
	})
	.sort(function(a, b) {
            return a.year - b.year;
	});

    graph.nodes = d3.merge(
	nestedData.map(function(d) { //sort graph.nodes using Jaro-Winkler clustering   
            var words = d.values.map(function(v) { return v.label; });
            var levels = cluster({
		input: words,
                distance: wink.string.jaroWinkler, //wink.string.levenshtein, // wink.string.jaroWinkler  
                linkage: "complete",
                minClusters: 1 // only want clusters containing one element     
            });
            var clusters = levels[levels.length - 1].clusters;
            return clusters.map(function (cluster) {
                return cluster.map(function (index) {
                    return d.values[index];
                })
            })[0];
        })
    );
    
    // create svg image
    var svg = d3.select("body")
	.select("#circle")
        .append("svg")
        .attr("width", width)
        .attr("height", width);

    // define legendData
    var partialCount = 0;
    var legendData = nestedData.map(function(d, i) {
	var toreturn = {
	    "lang": d.key,
	    "language": languages[d.key][0].label,
	    "year": languages[d.key][0].year,
	    "count": d.values.length,
	    "partialCount": partialCount,
	    "color": color(i)
	};
	partialCount += toreturn.count;
	return toreturn;
    });
    
    // add legend to the graph
    W = graph.nodes.length;
    var drawArc = function(thickness) {
	return d3.svg.arc()
	    .innerRadius(radius-5-thickness)
	    .outerRadius(radius+thickness)
	    .startAngle(function(d) {
		var angle = (+d.partialCount - 0.5) * 2 * Math.PI / W;
		return Math.PI - angle;
	    })
	    .endAngle(function(d) {
		var angle = (+d.count + d.partialCount - 0.5) * 2 * Math.PI / W;
		return Math.PI - angle;
	    });
    };

    //add legend in the center of the graph
    L = legendData.length;
    
    var drawLegend = function(thickness) {
	return d3.svg.arc()
            .innerRadius(legendRadius - thickness)
            .outerRadius(legendRadius + 10 + thickness)
            .startAngle(function(d, i) {
		var angle = - i * 2 * Math.PI / L - Math.PI;
		return angle;
	    })
            .endAngle(function(d, i) {
		var angle = - (i+1) * 2 * Math.PI / L - Math.PI;
		return angle;
	    });
    };
    
    var legend = d3.select("svg")
	.selectAll(".arc")
        .data(legendData)
        .enter();
    
    legend.append("svg:path")
	.attr("d", drawArc(0))
	.attr("class", "arc-path")
        .attr("fill", function(d) { return d.color; }) 	
	.attr("transform", "translate(" + (width/2) + "," + (width/2) + ")")
	.on("mouseover", function(d) {
	    d3.select(this)
		.attr("d", drawArc(3));
	    d3.selectAll(".legend-text")
		.filter(function(e) {
		    return e.lang == d.lang;
		})
		.attr("font-weight", "bold")
		.attr("font-size", bigSize);
	    d3.selectAll(".node-text")
		.filter(function(e) {
		    return e.lang == d.lang;
		})
		.attr("font-weight", "bold")
		.attr("font-size", bigSize);
	})
	.on("mouseout", function() {
            d3.select(this)
                .attr("d", drawArc(0));
	    d3.selectAll(".legend-text")
		.attr("font-weight", "normal")
		.attr("font-size", smallSize);
	    d3.selectAll(".node-text")
                .attr("font-weight", "normal")
		.attr("font-size", smallSize);
        });
    
    legend.append("svg:path")
	.attr("d", drawLegend(0))
	.attr("class", "legend-arc")
	.attr("fill", function(d) { return d.color })
	.attr("transform", "translate(" + (width/2) + "," + (width/2) + ")")
	.on("mouseover", function(d) {
	    d3.selectAll(".legend-text")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("font-weight", "bold")
		.attr("font-size", bigSize);
	    d3.selectAll(".arc-path")
		.filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("d", drawArc(3));
	    d3.selectAll(".node-text")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("font-weight", "bold")
		.attr("font-size",  bigSize);
	})
	.on("mouseout", function(d) {
	    d3.selectAll(".legend-text")
                .attr("font-weight", "normal")
		.attr("font-size", smallSize);
	    d3.selectAll(".arc-path")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("d", drawArc(0));
	    d3.selectAll(".node-text")
                  .attr("font-weight", "normal")
		.attr("font-size", smallSize);
        });

    legend.append("text")
	.attr("dy", "0.31em")
	.attr("class", "legend-text")
	.attr("transform", function(d, i) {
	    var angle = 90 - (i + 1/2) * 360 / L;
	    return "translate(" + (width/2) + "," + (width/2) + ")" + "rotate(" +  angle + " )translate(" + (legendRadius + 10 + 3) + "," + 0 + ")" + ((angle + 90 > 0) ? "" : "rotate(180)");
	})
	.attr("text-anchor", function(d, i) {	    
	    var angle = 90 - (i + 1/2)  * 360 / L;
	    return (angle + 90 > 0)? "start" : "end";
	})
	.attr("font-size", smallSize)
	.text(function(d, i) {
	    return d.language;
	})
	.on("mouseover", function(d) {
	    d3.select(this)
		.attr("d", drawLegend(3));
	    d3.select(this)
		.attr("font-weight", "bold");
	    d3.selectAll(".arc-path")
                .filter(function(e) {
                    return e.lang == d.lang;
	        })
                .attr("d", drawArc(3));
	    d3.selectAll(".node-text")
                .filter(function(e) {
                    return e.lang == d.lang;
                })
                .attr("font-weight", "bold");
	})
	.on("mouseout", function(d) {
            d3.select(this)
		.attr("d", drawLegend(0));
	    d3.select(this)
                .attr("font-weight", "normal");
	    d3.selectAll(".arc-path")
                .filter(function(e) {
                    return e.lang == d.lang;
	        })
                .attr("d", drawArc(0));
	    d3.selectAll(".node-text")
                .attr("font-weight", "normal");
        });
        
    // create plot area within svg image
    var plot = svg.append("g")
        .attr("id", "plot")
        .attr("transform", "translate(" + width/2 + ", " + width/2 + ")");
        
    // fix graph links to map to objects instead of indices
    graph.links.forEach(function(d, i) {
        d.source = isNaN(d.source) ? d.source : graph.nodes.filter(function(n) { return n.id == d.source; })[0];
        d.target = isNaN(d.target) ? d.target : graph.nodes.filter(function(n) { return n.id == d.target; })[0];
    });
    
    // calculate node positions
    circleLayout(graph.nodes);
    
    drawCurves(graph.nodes, graph.links);
    
    drawNodes(graph.nodes, graph.links);
}

// Calculates node locations
function circleLayout(nodes) {
    // use to scale node index to theta value
    var scale = d3.scale.linear()
        .domain([0, nodes.length])
        .range([0, 2 * Math.PI]);
    
    // calculate theta for each node
    nodes.forEach(function(d, i) {
        // calculate polar coordinates
        var theta = scale(i);
        var radial = radius - dr;
	
        // convert to cartesian coordinates
        d.x = radial * Math.sin(theta);
        d.y = radial * Math.cos(theta);
	d.theta = 180 * theta/Math.PI;
	d.theta = d.theta > 0 ? d.theta : d.theta+360;
    });
}

// Draws nodes with tooltips
function drawNodes(nodes, links) {
    var node = d3.select("#plot").selectAll(".node")
        .data(nodes)
        .enter();
    
    var nodeText = node.append("text")
        .attr("dy", "0.31em")
        .attr("class", "node-text")
        .attr("transform", function(d) {
            return "rotate(" + (90 - d.theta) +" )translate(" + (radius + 3) + ",0)" + ((d.theta < 180) ? "" : "rotate(180)");
        })
        .attr("text-anchor", function(d) { return (d.theta < 180)? "start" : "end"; })
        .attr("font-size", smallSize)
        .text(function(d) { return d.label; });

    nodeText.each(function(d) {
	var tmp = links.filter(function(l) { return l.target.id == d.id; });
        d.parentsLinksId = tmp.map(function(l) { return l.id; })
	    .filter(onlyUnique);
        d.parentsId = tmp.map(function(l) { return l.source.id; }).filter(onlyUnique);
        d.ancestorsLinksId = [];
    });

    var getNodesWithIds = function(ids) {
	var toreturn = [];

	nodeText.each(function(d) {
	    if (ids.includes(d.id))
		toreturn.push(d);
	});
	return toreturn;
    }

    nodeText.each(function(d) {// define ancestorsLinksId, ancestorsId and ancestorsLanguages
	//initialize parentsId
	var parentsId = d.parentsId;
	var ids = parentsId;
	d.ancestorsLinksId = d.ancestorsLinksId.concat(d.parentsLinksId);
	do {	    
	    var nextParentsId = [];
	    var parentsNode = getNodesWithIds(parentsId);
	    for (var i of parentsNode) {
		for (var j of i.parentsId) {
		    if (!ids.includes(j)) {
			nextParentsId.push(j);
		    }
		    d.ancestorsLinksId = d.ancestorsLinksId.concat(i.parentsLinksId);
		}
	    }
	    parentsId = nextParentsId.sort().filter(onlyUnique);
	    ids = ids.concat(parentsId);
	} while (parentsId.length > 0);
	
	d.ancestorsLinksId = d.ancestorsLinksId.sort().filter(onlyUnique);

	d.ancestorsId = links.filter(function(e) { return d.ancestorsLinksId.includes(e.id); })
	    .map(function(e) { return [ e.source, e.target ]; })
	    .flat()
	    .map(function(e) { return e.id; })
	    .filter(onlyUnique);
	d.ancestorsLanguages = nodes.filter(function(e) {
	    return d.ancestorsId.includes(e.id);
	})
	    .map(function(e) { return e.lang; })
	    .filter(onlyUnique);
	//d.descendantsCount = 0;
    });		     
   /*
    nodeText.each(function(d) {
	nodeText.each(function(n) { if (n.ancestorsId.includes(d.id)) d.descendantsCount += 1; });
    });
   */  
    nodeText.on("mouseover", function(d) {
        d3.selectAll(".link")
            .classed("link-active", function(l) {
                return (typeof d.ancestorsLinksId === "undefined") ? false :
                    d.ancestorsLinksId
                    .includes(l.id);
	    });
        d3.select(this)
            .attr("font-weight", "bold")
	    .attr("font-size", bigSize);
	
	d3.selectAll(".node-text")
	    .filter(function(e) {
		return d.ancestorsId
		    .includes(e.id);
	    })
	    .attr("font-weight", "bold");
	d3.selectAll(".legend-text")
            .filter(function(e) {
	        return d.ancestorsLanguages
		    .includes(e.lang);
                })
            .attr("font-weight", "bold")
	    .attr("font-size", function(e) {
		return (e.lang == d.lang) ? bigSize : smallSize;
	    });
    })
	.on("mouseout", function() {
            d3.selectAll(".node-text")
                .attr("font-weight", "normal");
	    d3.selectAll(".link")
		.classed("link-active", false);
	    d3.select(this)
		.attr("font-size", smallSize);
	    d3.selectAll(".legend-text")
		.attr("font-weight", "normal")
		.attr("font-size", smallSize);
        });
}

// Draws curved edges between nodes
function drawCurves(nodes, links) {    
    d3.select("#plot").selectAll(".link")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", function(d){
            var lineData = [
		{
		    x: Math.round(d.target.x),
		    y: Math.round(d.target.y)
		}, {
		    x: Math.round(d.target.x) - Math.round(d.target.x)/8,
		    y: Math.round(d.target.y) - Math.round(d.target.y)/8
		}, 
		{
		    x: Math.round(d.source.x) - Math.round(d.source.x)/8,
		    y: Math.round(d.source.y) - Math.round(d.source.y)/8
		},{
		    x: Math.round(d.source.x),
		    y: Math.round(d.source.y)
		}];
            return `M${lineData[0].x},${lineData[0].y}C${lineData[1].x},${lineData[1].y},${lineData[2].x},${lineData[2].y},${lineData[3].x},${lineData[3].y} `;
        })
	.attr("id", function(d) { return d.id; })
	.attr("stroke",  "#888888")
	.on("mouseover", function(d) {
	    d3.selectAll(".node-text")
		.filter(function(e) {
                    return (e.id == d.target.id || e.id == d.source.id);
		})
                .attr("font-weight", "bold");
        })
	.on("mouseout", function(d) {
            d3.selectAll(".node-text")
                .attr("font-weight", "normal");
	});
}

var dsv = d3.dsv(";","text/plain");
dsv("languages.csv", function(l) {
    d3.json("graph.json", function(d) {
	drawGraph(d, l);
    });
})

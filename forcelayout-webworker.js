//importScripts("https://d3js.org/d3-collection.v1.min.js");
//importScripts("https://d3js.org/d3-dispatch.v1.min.js");
//importScripts("https://d3js.org/d3-quadtree.v1.min.js");
//importScripts("https://d3js.org/d3-timer.v1.min.js");
//importScripts("https://d3js.org/d3-force.v1.min.js");
importScripts("https://unpkg.com/d3-force-3d@1.0/build/d3-force-3d.bundle.min.js");


onmessage = function(event) {
  var nodes = event.data.nodes,
      links = event.data.links;

  var simulation = d3_force.forceSimulation(nodes)
		.numDimensions(3)
		.force("charge", d3_force.forceManyBody())
		.force("link", d3_force.forceLink(links).id(function(d) { return d.id; }).distance(20).strength(1))
		.force('center', d3_force.forceCenter())
		.force("x", d3_force.forceX())
		.force("y", d3_force.forceY())
		.force("z", d3_force.forceZ()) 
		.numDimensions(3)
		.stop();

  
  for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n && i<10; ++i) {
    postMessage({type: "tick", progress: i / n});
    console.log("tick " + i);
    simulation.tick();
  }
  
  simulation.stop();
  
	// DEBUG:
  console.log("worker finished simulation");
  console.log('This should NOT be NaN:');
  console.log(nodes[0].z);
  
  
  postMessage({type: "end", nodes: nodes, links: links});
};
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
		.stop();

  const MAX_ITERATIONS=1000;
  
  for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n && i<MAX_ITERATIONS; ++i) {
    postMessage({type: "tick", progress: i / n});
    simulation.tick();
  }
  
  simulation.stop();

  
  postMessage({type: "end", nodes: nodes, links: links});
};
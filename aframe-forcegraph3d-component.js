
AFRAME.registerComponent('forcegraph3d', {
  	schema: {
  		src: 			{ type: 'asset',  default: 'none' }, // JSON data file
		width: 			{ type: 'number', default: 10 },
		height:			{ type: 'number', default: 10 },
		depth:			{ type: 'number', default: 10 },
		nodeRelSize: 	{ type: 'number', default: 0.5 },
  		nodeSprite:		{ type: 'asset',  default: null },
		lineOpacity: 	{ type: 'number', default: 1 },
		valField:	 	{ type: 'string', default: 'val'},
		nameField: 		{ type: 'string', default: 'name'},
		colorField: 	{ type: 'string', default: 'color'},
		defaultNodeColor:{type: 'color',  default: '#f00'},
		warmUpTicks: 	{ type: 'number', default: 0},
		coolDownTicks:	{ type: 'number', default: Infinity },
		coolDownTime: 	{ type: 'number', default: 15000}
  	},

  	init: function() {
  		var data = this.data
  	},

	update: function (oldData) {
		var data = this.data
    	var el = this.el

    	if (data !== oldData) {
    		if (data.src !== "none") {
    			buildMyself(el, data)			
    		} else {
    			console.log("no data")
    		}	
    	}
    }
})

/*
 This just let users write a a nice <a-forcegraph3d src="mydata.json"></a-forcegraph>" AFrame component. They can also use the classic <a-entity forcegraph3d="src:mydata.json"></a-entity>"
 */
AFRAME.registerPrimitive('a-forcegraph3d', {
	defaultComponents: {
		forcegraph3d: {}
	},
	mappings: {
		src: 			'forcegraph3d.src',
		width: 			'forcegraph3d.width',
		height: 		'forcegraph3d.height',
		nodeRelSize:	'forcegraph3d.nodeRelSize',
  		nodeSprite:		'forcegraph3d.nodeSprite',
		lineOpacity:	'forcegraph3d.lineOpacity',
		valField:	 	'forcegraph3d.valField',
		nameField: 		'forcegraph3d.nameField',
		colorField: 	'forcegraph3d.colorField',
		defaultNodeColor:'forcegraph3d.defaultNodeColor',
		warmUpTicks: 	'forcegraph3d.warmUpTicks',
		coolDownTicks:	'forcegraph3d.coolDownTicks',
		coolDownTime: 	'forcegraph3d.coolDownTime'
	}
})





/* This function gets called afer the force layout algo is finished */
function forceLayoutComplete(el, data) {
	
	console.log(data.nodes[3].x);
	console.log(data.nodes[3].y);
	console.log(data.nodes[3].z);
	console.log(data.nodes[3].fx);
	console.log(data.nodes[3].fy);
	console.log(data.nodes[3].fz);
	
	var thisObject = el.components["forcegraph3d"].data;
	
	data.nodes.forEach( node => {node.fx*=thisObject.width; node.fy*=thisObject.height; node.fz*=thisObject.depth;});
	
	
	let nodes = d3.select('a-scene').selectAll('a-icosahedron.node').data(data.nodes, d=> d._id);
	nodes.exit().remove();
	
	nodelabels = null;
	if (data.nodes[0]["name"]) {
		nodelabels = d3.select('a-scene').selectAll('a-entity.nodelabel').data(data.nodes, d=> d._id);
		nodelabels.exit().remove();
	}
	
	
	thisObject.valAccessor = node => node[thisObject.valField];
	thisObject.nameAccessor = node => node[thisObject.nameField];
	thisObject.colorAccessor = node => node[thisObject.colorField];

	// TODO: Draw a sprite in case [thisObject.nodeSprite!=null] . This will be much faster than geometries at each node.
	if (thisObject.nodeSprite) {
		console.log("ERROR: nodeSprite not yet implmeneted");
	} else {
		nodes = nodes.merge(
			nodes.enter()
				.append('a-icosahedron')
				.classed('node', true)
//				.attr('segments-width', 8)	// Lower geometry resolution to improve perf
//				.attr('segments-height', 8)
				.attr('radius', d => Math.cbrt(thisObject.valAccessor(d) || 1) * thisObject.nodeRelSize)
				.attr('color', d =>  '' + (thisObject.colorAccessor(d) || thisObject.defaultNodeColor).toString(16))
				.attr('position', d => [d.fx, d.fy, d.fz].join(" "))
				.attr('fog', false)
				.attr('roughness', '1')
				.attr('opacity', 0.75)
		);
		if (nodelabels)
			nodelabels = nodelabels.merge(
				nodelabels.enter()
					.append('a-entity')
					.classed('nodelabel', true)
					.attr('text', d => "value:" + d.name + "; color:#f00; align:left")
					.attr('position', d => [d.fx, d.fy, d.fz].join(" "))
			);
	}
	
//	nodes.attr('position', d => [d.fx, d.fy, d.fz].join(" "))
	

	let links = d3.select('a-scene').selectAll('a-entity.link').data(data.links, d => d._id);
	links.exit().remove();

	links = links.merge(
	links.enter()
		.append('a-entity')
		.classed('link', true)
		.attr('linebad', 'color: #f0f0f0; opacity: 0.7')
		.attr('line', `color: #f0f0f0; opacity: ${thisObject.lineOpacity}`)
		.attr('line3', 'test:test')
		//.attr('line', `color: #f0f0f0; opacity: ${state.lineOpacity}`)
	);
	
	links.attr('line', d => `start: ${d.source.fx} ${d.source.fy || 0} ${d.source.fz || 0};  end: ${d.target.fx} ${d.target.fy || 0} ${d.target.fz || 0}`);
		
}




function buildMyself(el, data) {

	d3.json(data.src, function(json) {

		json.nodes.forEach(node => { json.nodes[node.id] = node }); // Index by ID field

		var USE_WEB_WORKER=1;
		
		if (USE_WEB_WORKER) {
			// Launch a WebWorker to calculate the layout in a separate thread
			var worker = new Worker("forcelayout-webworker.js");
			worker.postMessage({
			  nodes: json.nodes,
			  links: json.links
			});

			// Listen for 'tick' and 'end' message from the worker
			worker.onmessage = function(event) {
			  switch (event.data.type) {
				case "tick": console.log('tick'); break;
				case "end": return forceLayoutComplete(el,event.data);
			  }
			};
			
			
		} else {
			
			
			var simulation = d3_force.forceSimulation(json.nodes)
				.numDimensions(3)
				.force("charge", d3_force.forceManyBody())
				.force("link", d3_force.forceLink(json.links).id(function(d) { return d.id; }).distance(20).strength(1))
				.force('center', d3_force.forceCenter())
				.force("x", d3_force.forceX())
				.force("y", d3_force.forceY())
				.force("z", d3_force.forceZ()) 
				.numDimensions(3);
				/*
			for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n && i<10; ++i) {
				console.log("tick " + i);
				simulation.tick();
			}

			simulation.stop();
*/			forceLayoutComplete(el,{nodes: json.nodes, links: json.links})
  
		} // USE web worker or not?
  
		
	}); // Parse the JSON source data
}





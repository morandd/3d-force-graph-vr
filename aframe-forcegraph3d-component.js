
AFRAME.registerComponent('forcegraph3d', {
  	schema: {
		width: 			{ type: 'number', default: 1 },
		height:			{ type: 'number', default: null }, // Auto-set to the same as width, if user does not specify otherwise
		depth:			{ type: 'number', default: null },
		lineOpacity: 	{ type: 'number', default: null }, // This has precedence, then the valField, and finally 1 if neither is specified
  		src: 			{ type: 'asset',  default: 'none' }, 
		nodeMinSize: 	{ type: 'number', default: 0.1 },
		nodeMaxSize: 	{ type: 'number', default: 1 },
  		nodeSprite:		{ type: 'asset',  default: '' },
		valField:	 	{ type: 'string', default: 'val'},
		nameField: 		{ type: 'string', default: 'name'},
		colorField: 	{ type: 'string', default: 'color'},
		defaultNodeColor:{type: 'color',  default: '#0f0'},
		labelColor:		{type: 'color',  default: '#000'},
		labelScaleFactor:{ type: 'number', default: 1},
		warmUpTicks: 	{ type: 'number', default: 0},
		coolDownTicks:	{ type: 'number', default: Infinity },
		coolDownTime: 	{ type: 'number', default: 15000}
  	},


	update: function (oldData) {
		var data = this.data
    	var el = this.el

		
    	if (data !== oldData) {
    		if (data.src !== "none") {
				data.height = data.height || data.width;
				data.depth = data.depth || data.width;
    			buildMyself(el, data)			
    		} else {
    			console.log("no data")
    		}
    	}
    }

});





/* This function gets called afer the force layout algo is finished */
function forceLayoutComplete(el, data) {
	
	
	var thisObject = el.components["forcegraph3d"].data;
	
	// Find min and max values for all axes
	stats = {};
	
	stats.minfX = d3.min(data.nodes, d => d.fx);
	stats.minfY = d3.min(data.nodes, d => d.fy);
	stats.minfZ = d3.min(data.nodes, d => d.fz);
	stats.maxfX = d3.max(data.nodes, d => d.fx);
	stats.maxfY = d3.max(data.nodes, d => d.fy);
	stats.maxfZ = d3.max(data.nodes, d => d.fz);
	stats.minX = d3.min(data.nodes, d => d.x);
	stats.minY = d3.min(data.nodes, d => d.y);
	stats.minZ = d3.min(data.nodes, d => d.z);
	stats.maxX = d3.max(data.nodes, d => d.x);
	stats.maxY = d3.max(data.nodes, d => d.y);
	stats.maxZ = d3.max(data.nodes, d => d.z);
	
	
	if (data.links[0][thisObject.valField]) {
		stats.linkMinVal  = d3.min(data.links, d => d[thisObject.valField]);
		stats.linkMaxVal  = d3.max(data.links, d => d[thisObject.valField]);
		stats.scaleLinkValueV = d3.scaleLinear().domain([stats.linkMinVal, stats.linkMaxVal]).range([.05, 1]);
		
		stats.minV = d3.min(data.nodes, d => d[thisObject.valField]);
		stats.maxV = d3.max(data.nodes, d => d[thisObject.valField]);
		stats.scaleV = d3.scaleLinear().domain([stats.minV, stats.maxV]).range([thisObject.nodeMinSize, thisObject.nodeMaxSize])
		stats.scaleV01 = d3.scaleLinear().domain([stats.minV, stats.maxV]).range([0,1])
		
	} else {
		stats.linkMinVal  = 0
		stats.linkMaxVal  = 1;
		stats.scaleLinkValueV = xxx =>  null;
		
		stats.scaleV = xxx =>  thisObject.nodeMaxSize/2; // Default radius = 0.5
		stats.scaleV01 = xxx => 1;
	}
	
	
	
	stats.scaleX = d3.scaleLinear().domain([stats.minX, stats.maxX]).range([0, thisObject.width])
	stats.scaleY = d3.scaleLinear().domain([stats.minY, stats.maxY]).range([0, thisObject.height])
	stats.scaleZ = d3.scaleLinear().domain([stats.minZ, stats.maxZ]).range([0, thisObject.depth])

	stats.scalefX = d3.scaleLinear().domain([stats.minfX, stats.maxfX]).range([0, thisObject.width])
	stats.scalefY = d3.scaleLinear().domain([stats.minfY, stats.maxfY]).range([0, thisObject.height])
	stats.scalefZ = d3.scaleLinear().domain([stats.minfZ, stats.maxfZ]).range([0, thisObject.depth])
		
	

	// Normalize the node coordinates so we fit inside the depth x width x height box specified by the AFrame component
	for (var i=0; i<data.nodes.length; i++){
		let node = data.nodes[i];
		
		node.x = stats.scaleX(node.x);
		node.y = stats.scaleY(node.y);
		node.z = stats.scaleZ(node.z);
		
		node.fx = stats.scalefX(node.fx);
		node.fy = stats.scalefY(node.fy);
		node.fz = stats.scalefZ(node.fz);
		
		node[thisObject.valField] = stats.scaleV(node[thisObject.valField] );
		
		if (!isFinite(node.z)) node.z = 0; // BAD!
		
		data.nodes[i] = node;
	}

	
	
	console.log(data.nodes[3].x);
	console.log(data.nodes[3].y);
	console.log(data.nodes[3].z);
	console.log(data.nodes[3].fx);
	console.log(data.nodes[3].fy);
	console.log(data.nodes[3].fz);
	console.log(data.nodes[3][thisObject.valField]);
	
	let nodes = d3.select('a-scene').selectAll(thisObject.nodeSprite ?'a-image.node' : 'a-sphere.node').data(data.nodes, d=> d._id);
	nodes.exit().remove();
	
	// Shall we construct node labels?
	nodelabels = null;
	if (data.nodes[0]["name"]) {
		nodelabels = d3.select('a-scene').selectAll('a-entity.nodelabel').data(data.nodes, d=> d._id);
		nodelabels.exit().remove();
	}
	
	
	thisObject.valAccessor = node => node[thisObject.valField]; // any resizing with cbrt should go here, or better, above in the scaling section
	thisObject.nameAccessor = node => node[thisObject.nameField];
	thisObject.colorAccessor = node => node[thisObject.colorField];

	if (thisObject.nodeSprite) {
		nodes = nodes.merge(
			nodes.enter()
				.append('a-image')
				.classed('node', true)
				.attr('src', thisObject.nodeSprite)
				.attr('transparent', true)
				.attr('width', d => thisObject.valAccessor(d))
				.attr('height', d =>thisObject.valAccessor(d))
				.attr('position', d => [d.x, d.y, d.z].join(" "))
				);
	} else {
		nodes = nodes.merge(
			nodes.enter()
				.append('a-sphere')
				.classed('node', true)
				.attr('segments-width', AFRAME.utils.device.isMobile () ? 3 : 8)	// Lower geometry resolution to improve perf
				.attr('segments-height',AFRAME.utils.device.isMobile () ? 3 : 8 )
				.attr('radius', d => thisObject.valAccessor(d)/2)
				.attr('color', d =>  '' + (thisObject.colorAccessor(d) || thisObject.defaultNodeColor).toString(16))
//				.attr('lambertoon-material', "dummy:1")
//				.attr('material', null)
				.attr('position', d => [d.x, d.y, d.z].join(" "))
				.attr('opacity', 0.8)
		);
		if (AFRAME.utils.device.isMobile) 
			nodes.enter().attr('material','shader:flat; wireframe: true')

	} // render the nodes as spheres or sprites
	
	
	if (nodelabels)
		nodelabels = nodelabels.merge(
			nodelabels.enter()
				.append('a-entity')
				.classed('nodelabel', true)
				.attr('text', d => "value:" + d.name + "; color:" + thisObject.labelColor +" ; align:center")
				.attr('position', d => [d.x, d.y - 1.5*thisObject.valAccessor(d)/2, d.z].join(" ")) // Move the label down 150% of the radius away from the center of the sphere
				
				//TODO finish tweaking these scaling params
				.attr('scale', d => [thisObject.width * thisObject.labelScaleFactor + (3*(stats.scaleV01(thisObject.valAccessor(d)))) , thisObject.height * thisObject.labelScaleFactor +(3*(stats.scaleV01(thisObject.valAccessor(d)))) , 1].join(" "))
		);
	
	
	

	let links = d3.select('a-scene').selectAll('a-entity.link').data(data.links, d => d._id);
	links.exit().remove();

	links = links.merge(
	links.enter()
		.append('a-entity')
		.classed('link', true)
		.attr('line', d => `color: #f0f0f0; opacity: ${thisObject.lineOpacity  || stats.scaleLinkValueV(d[thisObject.valField]) || 1}; start: ${d.source.x} ${d.source.y || 0} ${d.source.z || 0};  end: ${d.target.x} ${d.target.y || 0} ${d.target.z || 0}`)
	);
	
		
}




function buildMyself(el, data) {

	d3.json(data.src, function(json) {

		json.nodes.forEach(node => { json.nodes[node.id] = node }); // Index by ID field

		// For testing. Once this is working, it's good to only use the web worker.
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
				//case "tick": console.log('tick'); break;
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
				.force("z", d3_force.forceZ())  // When I run this, .z becomes NaN at the first simulation tick.
				.numDimensions(3);
			
			// Render the graph:
			forceLayoutComplete(el,{nodes: json.nodes, links: json.links})
  
		} // USE web worker or not?
  
		
	}); // Parse the JSON source data
}






/*
 This just let users write a a nice <a-forcegraph3d src="mydata.json"></a-forcegraph>" AFrame component. They can also use the classic <a-entity forcegraph3d="src:mydata.json"></a-entity>"
 */
AFRAME.registerPrimitive('a-forcegraph3d', {
	defaultComponents: {
		forcegraph3d: {}
	},
	mappings: {
		lineopacity:	'forcegraph3d.lineOpacity',
		width: 			'forcegraph3d.width',
		height: 		'forcegraph3d.height',
		depth: 			'forcegraph3d.depth',
		nodeminsize:	'forcegraph3d.nodeMinSize',
		nodemaxsize:	'forcegraph3d.nodeMaxSize',
  		nodesprite:		'forcegraph3d.nodeSprite',
		valfield:	 	'forcegraph3d.valField',
		namefield: 		'forcegraph3d.nameField',
		colorfield: 	'forcegraph3d.colorField',
		defaultnodecolor:'forcegraph3d.defaultNodeColor',
		warmupticks: 	'forcegraph3d.warmUpTicks',
		cooldownticks:	'forcegraph3d.coolDownTicks',
		cooldowntime: 	'forcegraph3d.coolDownTime',
		src: 			'forcegraph3d.src',
		labelcolor:		'forcegraph3d.labelColor',
		labelscalefactor:'forcegraph3d.labelScaleFactor'
	}
})

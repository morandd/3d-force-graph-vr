import './3d-force-graph-vr.css';

import 'aframe';
//import 'aframe-line-component';
import './aframe-line-component';

import graph from 'ngraph.graph';
import forcelayout3d from 'ngraph.forcelayout3d';
const ngraph = { graph, forcelayout3d };

import * as d3 from 'd3';
import * as SWC from 'swc';

//

export default SWC.createComponent({

	props: [
		new SWC.Prop('width', window.innerWidth),
		new SWC.Prop('height', window.innerHeight),
		new SWC.Prop('graphData', {
			nodes: {},
			links: [] // [from, to]
		}),
		new SWC.Prop('numDimensions', 3),
		new SWC.Prop('nodeRelSize', 4), // volume per val unit
		new SWC.Prop('lineOpacity', 0.2),
		new SWC.Prop('valAccessor', node => node.val),
		new SWC.Prop('nameAccessor', node => node.name),
		new SWC.Prop('colorAccessor', node => node.color),
		new SWC.Prop('warmUpTicks', 0), // how many times to tick the force engine at init before starting to render
		new SWC.Prop('coolDownTicks', Infinity),
		new SWC.Prop('coolDownTime', 15000), // ms
		new SWC.Prop('alphaDecay', 0.0228), // cool-down curve
		new SWC.Prop('velocityDecay', 0.4) // atmospheric friction
	],

	init: (domNode, state) => {
		// Wipe DOM
		domNode.innerHTML = '';

		// Add nav info section
		d3.select(domNode).append('div')
			.classed('graph-nav-info', true)
			.text('Mouse drag: look, arrow/wasd keys: move');

		// Add scene
		state.scene = d3.select(domNode).append('a-scene'); //.attr('stats', '');
		state.scene.append('a-sky').attr('color', '#002');

		// Add camera and cursor
		const camera = state.scene.append('a-entity')
			.attr('position', '0 0 300')
			.append('a-camera')
			.attr('user-height', '0')
			.attr('reverse-mouse-drag', true)
			.attr('wasd-controls', 'fly: true; acceleration: 3000');

		camera.append('a-cursor')
			.attr('color', 'lavender')
			.attr('opacity', 0.5);

		// Setup tooltip (attached to camera)
		state.tooltipElem = camera.append('a-text')
			.attr('position', '0 -0.7 -1') // Aligned to canvas bottom
			.attr('width', 2)
			.attr('align', 'center')
			.attr('color', 'lavender')
			.attr('value', '');

		// Add force-directed layout
		state.forceLayoutGraph = ngraph.graph();
		state.forceLayout = ngraph.forcelayout3d(state.forceLayoutGraph);

		// Setup ticker
		(function frameTick() { // IIFE
			if (state.onFrame) state.onFrame();
			requestAnimationFrame(frameTick);
		})();

	},

	update: state => {
		state.onFrame = null; // Pause simulation

		// Build graph with data
		const d3Nodes = [];
		for (let nodeId in state.graphData.nodes) { // Turn nodes into array
			const node = state.graphData.nodes[nodeId];
			node._id = nodeId;
			d3Nodes.push(node);
		}
		const d3Links = state.graphData.links.map(link => {
			return { _id: link.join('>'), source: link[0], target: link[1] };
		});
		if (!d3Nodes.length) { return; }

		// Add A-frame objects
		let nodes = state.scene.selectAll('a-sphere.node')
			.data(d3Nodes, d => d._id);

		nodes.exit().remove();

		nodes = nodes.merge(
			nodes.enter()
				.append('a-sphere')
				.classed('node', true)
				.attr('segments-width', 8)	// Lower geometry resolution to improve perf
				.attr('segments-height', 8)
				.attr('radius', d => Math.cbrt(state.valAccessor(d) || 1) * state.nodeRelSize)
				.attr('color', d => '#' + (state.colorAccessor(d) || 0xffffaa).toString(16))
				.attr('opacity', 0.75)
				.on('mouseenter', d => {
					state.tooltipElem.attr('value', state.nameAccessor(d) || '');
				})
				.on('mouseleave', () => {
					state.tooltipElem.attr('value', '');
				})
		);

		let links = state.scene.selectAll('a-entity.link')
			.data(d3Links, d => d._id);

		links.exit().remove();

		links = links.merge(
			links.enter()
				.append('a-entity')
				.classed('link', true)
				.attr('line', `color: #f0f0f0; opacity: ${state.lineOpacity}`)
		);

		// Feed data to force-directed layout
		state.forceLayoutGraph.clear();
		for (let node of d3Nodes) { state.forceLayoutGraph.addNode(node._id); }
		for (let link of d3Links) { state.forceLayoutGraph.addLink(link.source, link.target); }

		for (let i=0; i<state.warmUpTicks; i++) { state.forceLayout.step(); } // Initial ticks before starting to render

		let cntTicks = 0;
		const startTickTime = new Date();
		state.onFrame = layoutTick;

		//

		function layoutTick() {
			if (cntTicks++ > state.coolDownTicks || (new Date()) - startTickTime > state.coolDownTime) {
				state.onFrame = null; // Stop ticking graph
			}

			state.forceLayout.step(); // Tick it

			// Update nodes position
			nodes.attr('position', d => {
				const pos = state.forceLayout.getNodePosition(d._id);
				return `${pos.x} ${pos.y || 0} ${pos.z || 0}`;
			});

			//Update links position
			links.attr('line', d => {
				const pos = state.forceLayout.getLinkPosition(state.forceLayoutGraph.getLink(d.source, d.target).id);
				return `start: ${pos.from.x} ${pos.from.y || 0} ${pos.from.z || 0};  end: ${pos.to.x} ${pos.to.y || 0} ${pos.to.z || 0}`;
			});
		}
	}
});
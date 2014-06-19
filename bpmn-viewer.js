require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"bpmn-js":[function(require,module,exports){
module.exports=require('Focm2+');
},{}],"Focm2+":[function(require,module,exports){
module.exports = require('./lib/Viewer');
},{"./lib/Viewer":"KXdkPL"}],3:[function(require,module,exports){
var _  = (window._);

function failSafeAsync(fn) {

  return function() {

    var args = Array.prototype.slice.call(arguments);

    var done = args[args.length - 1];
    if (!done || !_.isFunction(done)) {
      done = function(e) {
        throw e;
      };
    }

    try {
      fn.apply(this, args);
    } catch (e) {
      done(e);
    }
  };
}

module.exports.failSafeAsync = failSafeAsync;
},{}],"KXdkPL":[function(require,module,exports){
'use strict';

var Diagram = require('diagram-js'),
    BpmnModel = require('bpmn-moddle'),
    $ = (window.$),
    _ = (window._);

var Importer = require('./import/Importer'),
    util = require('./Util');


function getSvgContents(diagram) {
  var paper = diagram.get('canvas').getPaper();
  var outerNode = paper.node.parentNode;

  var svg = outerNode.innerHTML;
  return svg.replace(/^<svg[^>]*>|<\/svg>$/g, '');
}

function initListeners(diagram, listeners) {
  var events = diagram.get('eventBus');

  listeners.forEach(function(l) {
    events.on(l.event, l.handler);
  });
}

/**
 * @class
 *
 * A viewer for BPMN 2.0 diagrams
 *
 * @param {Object} [options] configuration options to pass to the viewer
 * @param {DOMElement} [options.container] the container to render the viewer in, defaults to body.
 * @param {String|Number} [options.width] the width of the viewer
 * @param {String|Number} [options.height] the height of the viewer
 */
function Viewer(options) {
  this.options = options = options || {};

  var parent = options.container || $('body');

  var container = $('<div></div>').addClass('bjs-container').css({
    position: 'relative'
  }).appendTo(parent);

  _.forEach([ 'width', 'height' ], function(a) {
    if (options[a]) {
      container.css(a, options[a]);
    }
  });

  // unwrap jquery
  this.container = container.get(0);

  /**
   * The code in the <project-logo></project-logo> area
   * must not be changed, see http://bpmn.io/license for more information
   *
   * <project-logo>
   */

  /* jshint -W101 */

  // inlined ../resources/bpmnjs.png
  var logoData = 'iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAMAAADypuvZAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFiMte9PrwldFwfcZPqtqN0+zEyOe1XLgjvuKncsJAZ70y6fXh3vDT////UrQV////G2zN+AAAABB0Uk5T////////////////////AOAjXRkAAAHDSURBVHjavJZJkoUgDEBJmAX8979tM8u3E6x20VlYJfFFMoL4vBDxATxZcakIOJTWSmxvKWVIkJ8jHvlRv1F2LFrVISCZI+tCtQx+XfewgVTfyY3plPiQEAzI3zWy+kR6NBhFBYeBuscJLOUuA2WVLpCjVIaFzrNQZArxAZKUQm6gsj37L9Cb7dnIBUKxENaaMJQqMpDXvSL+ktxdGRm2IsKgJGGPg7atwUG5CcFUEuSv+CwQqizTrvDTNXdMU2bMiDWZd8d7QIySWVRsb2vBBioxOFt4OinPBapL+neAb5KL5IJ8szOza2/DYoipUCx+CjO0Bpsv0V6mktNZ+k8rlABlWG0FrOpKYVo8DT3dBeLEjUBAj7moDogVii7nSS9QzZnFcOVBp1g2PyBQ3Vr5aIapN91VJy33HTJLC1iX2FY6F8gRdaAeIEfVONgtFCzZTmoLEdOjBDfsIOA6128gw3eu1shAajdZNAORxuQDJN5A5PbEG6gNIu24QJD5iNyRMZIr6bsHbCtCU/OaOaSvgkUyDMdDa1BXGf5HJ1To+/Ym6mCKT02Y+/Sa126ZKyd3jxhzpc1r8zVL6YM1Qy/kR4ABAFJ6iQUnivhAAAAAAElFTkSuQmCC';

  /* jshint +W101 */

  var a = $('<a href="http://bpmn.io" target="_blank" class="bjs-powered-by" title="Powered by bpmn.io" />').css({
    position: 'absolute',
    bottom: 15,
    right: 15,
    zIndex: 100
  });

  var logo = $('<img/>').attr('src', 'data:image/png;base64,' + logoData).appendTo(a);

  a.appendTo(container);

  /* </project-logo> */
}

Viewer.prototype.importXML = function(xml, done) {

  var self = this;

  BpmnModel.fromXML(xml, 'bpmn:Definitions', function(err, definitions) {
    if (err) {
      return done(err);
    }

    self.importDefinitions(definitions, done);
  });
};

Viewer.prototype.saveXML = function(options, done) {

  if (!done) {
    done = options;
    options = {};
  }

  var definitions = this.definitions;

  if (!definitions) {
    return done(new Error('no definitions loaded'));
  }

  BpmnModel.toXML(definitions, options, function(err, xml) {
    done(err, xml);
  });
};


var SVG_HEADER =
'<?xml version="1.0" encoding="utf-8"?>\n' +
'<!-- created with bpmn-js / http://bpmn.io -->\n' +
'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">\n';

var SVG_FOOTER = '</svg>';

Viewer.prototype.saveSVG = function(options, done) {
  if (!done) {
    done = options;
    options = {};
  }

  if (!this.definitions) {
    return done(new Error('no definitions loaded'));
  }

  var svgContents = getSvgContents(this.diagram);

  var svg = SVG_HEADER + svgContents + SVG_FOOTER;

  done(null, svg);
};

Viewer.prototype.get = function(name) {

  if (!this.diagram) {
    throw new Error('no diagram loaded');
  }

  return this.diagram.get(name);
};

Viewer.prototype.invoke = function(fn) {

  if (!this.diagram) {
    throw new Error('no diagram loaded');
  }

  return this.diagram.invoke(fn);
};

Viewer.prototype.importDefinitions = util.failSafeAsync(function(definitions, done) {

  var diagram = this.diagram;

  if (diagram) {
    this.clear();
  }

  diagram = this.createDiagram(this.options.modules);

  this.initDiagram(diagram);

  this.definitions = definitions;

  Importer.importBpmnDiagram(diagram, definitions, done);
});

Viewer.prototype.initDiagram = function(diagram) {
  this.diagram = diagram;

  initListeners(diagram, this.__listeners || []);
};

Viewer.prototype.createDiagram = function(modules) {

  modules = [].concat(modules || this.getModules());

  // add self as an available service
  modules.unshift({
    bpmnjs: [ 'value', this ]
  });

  return new Diagram({
    canvas: { container: this.container },
    modules: modules
  });
};

Viewer.prototype.getModules = function() {
  return this._modules;
};

Viewer.prototype.clear = function() {
  var diagram = this.diagram;

  if (diagram) {
    diagram.destroy();
  }
};

Viewer.prototype.on = function(event, handler) {
  var diagram = this.diagram,
      listeners = this.__listeners = this.__listeners || [];

  listeners = this.__listeners || [];
  listeners.push({ event: event, handler: handler });

  if (diagram) {
    diagram.get('eventBus').on(event, handler);
  }
};

// modules that comprise the bpmn viewer
Viewer.prototype._modules = [
  require('./core'),
  require('diagram-js/lib/features/selection')
];

module.exports = Viewer;

},{"./Util":3,"./core":7,"./import/Importer":12,"bpmn-moddle":"UqDJNG","diagram-js":35,"diagram-js/lib/features/selection":56}],"bpmn-js/Viewer":[function(require,module,exports){
module.exports=require('KXdkPL');
},{}],6:[function(require,module,exports){
'use strict';

var _ = (window._);


/**
 * @class
 *
 * A registry that keeps track of bpmn semantic / di elements and the
 * corresponding shapes.
 *
 * @param {EventBus} events
 * @param {ElementRegistry} elementRegistry
 */
function BpmnRegistry(events, elementRegistry) {

  var elements = {
    di: {},
    semantic: {},
    diagramElement: {}
  };

  events.on('bpmn.element.add', function(e) {
    var semantic = e.semantic,
        id = semantic.id;

    elements.di[id] = e.di;
    elements.semantic[id] = e.semantic;
    elements.diagramElement[id] = e.diagramElement;
  });

  events.on('bpmn.element.removed', function(e) {
    var semantic = e.semantic,
        id = semantic.id;

    delete elements.di[id];
    delete elements.semantic[id];
    delete elements.diagramElement[id];
  });

  function get(type) {
    var collection = elements[type];

    return function(element) {
      var id = _.isObject(element) ? element.id : element;

      // strip label suffix
      id = id.replace(/_label$/, '');

      return collection[id];
    };
  }

  // API
  this.getSemantic = get('semantic');
  this.getDi = get('di');
  this.getDiagramElement = get('diagramElement');
}

BpmnRegistry.$inject = [ 'eventBus', 'elementRegistry' ];

module.exports = BpmnRegistry;
},{}],7:[function(require,module,exports){
module.exports = {
  __depends__: [ require('../draw') ],
  bpmnRegistry: [ 'type', require('./BpmnRegistry') ]
};
},{"../draw":10,"./BpmnRegistry":6}],8:[function(require,module,exports){
'use strict';

var _ = (window._);

var DefaultRenderer = require('diagram-js/lib/draw/Renderer');
var LabelUtil = require('diagram-js/lib/util/LabelUtil');

var DiUtil = require('../util/Di');

var flattenPoints = DefaultRenderer.flattenPoints;


function BpmnRenderer(events, styles, bpmnRegistry, pathMap) {

  DefaultRenderer.call(this, styles);

  var TASK_BORDER_RADIUS = 10;
  var INNER_OUTER_DIST = 3;

  var LABEL_STYLE = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px'
  };

  var labelUtil = new LabelUtil({
    style: LABEL_STYLE,
    size: { width: 100 }
  });

  var markers = {};

  function addMarker(id, element) {
    markers[id] = element;
  }

  function marker(id) {
    return markers[id];
  }

  function initMarkers(paper) {

    function createMarker(id, options) {
      var attrs = _.extend({
        fill: 'black',
        strokeWidth: 1,
        strokeLinecap: 'round',
        strokeDasharray: 'none'
      }, options.attrs);

      var ref = options.ref || { x: 0, y: 0 };

      var scale = options.scale || 1;

      // fix for safari / chrome / firefox bug not correctly
      // resetting stroke dash array
      if (attrs.strokeDasharray === 'none') {
        attrs.strokeDasharray = [10000, 1];
      }

      var marker = options.element
                     .attr(attrs)
                     .marker(0, 0, 20, 20, ref.x, ref.y)
                     .attr({
                       markerWidth: 20 * scale,
                       markerHeight: 20 * scale
                     });

      return addMarker(id, marker);
    }


    createMarker('sequenceflow-end', {
      element: paper.path('M 1 5 L 11 10 L 1 15 Z'),
      ref: { x: 11, y: 10 },
      scale: 0.5
    });

    createMarker('messageflow-start', {
      element: paper.circle(6, 6, 5),
      attrs: {
        fill: 'white',
        stroke: 'black'
      },
      ref: { x: 6, y: 6 }
    });

    createMarker('messageflow-end', {
      element: paper.path('M 1 5 L 11 10 L 1 15 Z'),
      attrs: {
        fill: 'white',
        stroke: 'black'
      },
      ref: { x: 11, y: 10 }
    });

    createMarker('data-association-end', {
      element: paper.path('M 1 5 L 11 10 L 1 15'),
      attrs: {
        fill: 'white',
        stroke: 'black'
      },
      ref: { x: 11, y: 10 },
      scale: 0.5
    });

    createMarker('conditional-flow-marker', {
      element: paper.path('M 0 10 L 8 6 L 16 10 L 8 14 Z'),
      attrs: {
        fill: 'white',
        stroke: 'black'
      },
      ref: { x: -1, y: 10 },
      scale: 0.5
    });

    createMarker('conditional-default-flow-marker', {
      element: paper.path('M 1 4 L 5 16'),
      attrs: {
        stroke: 'black'
      },
      ref: { x: -5, y: 10 },
      scale: 0.5
    });
  }

  function computeStyle(custom, traits, defaultStyles) {
    if (!_.isArray(traits)) {
      defaultStyles = traits;
      traits = [];
    }

    return styles.style(traits || [], _.extend(defaultStyles, custom || {}));
  }

  function drawCircle(p, width, height, offset, attrs) {

    if (_.isObject(offset)) {
      attrs = offset;
      offset = 0;
    }

    offset = offset || 0;

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    var cx = width / 2,
        cy = height / 2;

    return p.circle(cx, cy, Math.round((width + height) / 4 - offset)).attr(attrs);
  }

  function drawRect(p, width, height, r, offset, attrs) {

    if (_.isObject(offset)) {
      attrs = offset;
      offset = 0;
    }

    offset = offset || 0;

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    return p.rect(offset, offset, width - offset * 2, height - offset * 2, r).attr(attrs);
  }

  function drawDiamond(p, width, height, attrs) {

    var x_2 = width / 2;
    var y_2 = height / 2;

    var points = [x_2, 0, width, y_2, x_2, height, 0, y_2 ];

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    return p.polygon(points).attr(attrs);
  }

  function drawLine(p, waypoints, attrs) {
    var points = flattenPoints(waypoints);

    attrs = computeStyle(attrs, [ 'no-fill' ], {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'none'
    });

    return p.polyline(points).attr(attrs);
  }

  function drawPath(p, d, attrs) {

    attrs = computeStyle(attrs, [ 'no-fill' ], {
      strokeWidth: 2,
      stroke: 'black'
    });

    return p.path(d).attr(attrs);
  }

  function as(type) {
    return function(p, data) {
      return handlers[type](p, data);
    };
  }

  function renderer(type) {
    return handlers[type];
  }

  function renderEventContent(data, p) {

    var event = bpmnRegistry.getSemantic(data);
    var isThrowing = isThrowEvent(event);

    if (isTypedEvent(event, 'bpmn:MessageEventDefinition')) {
      return renderer('bpmn:MessageEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:TimerEventDefinition')) {
      return renderer('bpmn:TimerEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:ConditionalEventDefinition')) {
      return renderer('bpmn:ConditionalEventDefinition')(p, data);
    }

    if (isTypedEvent(event, 'bpmn:SignalEventDefinition')) {
      return renderer('bpmn:SignalEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:CancelEventDefinition') &&
      isTypedEvent(event, 'bpmn:TerminateEventDefinition', { parallelMultiple: false })) {
      return renderer('bpmn:MultipleEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:CancelEventDefinition') &&
      isTypedEvent(event, 'bpmn:TerminateEventDefinition', { parallelMultiple: true })) {
      return renderer('bpmn:ParallelMultipleEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:EscalationEventDefinition')) {
      return renderer('bpmn:EscalationEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:LinkEventDefinition')) {
      return renderer('bpmn:LinkEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:ErrorEventDefinition')) {
      return renderer('bpmn:ErrorEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:CancelEventDefinition')) {
      return renderer('bpmn:CancelEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:CompensateEventDefinition')) {
      return renderer('bpmn:CompensateEventDefinition')(p, data, isThrowing);
    }

    if (isTypedEvent(event, 'bpmn:TerminateEventDefinition')) {
      return renderer('bpmn:TerminateEventDefinition')(p, data, isThrowing);
    }

    return null;
  }

  function renderLabel(p, label, options) {
    return labelUtil.createLabel(p, label || '', options).addClass('djs-label');
  }

  function renderEmbeddedLabel(p, data, align) {
    var element = bpmnRegistry.getSemantic(data);

    return renderLabel(p, element.name, { box: data, align: align });
  }

  function renderExternalLabel(p, data, align) {
    var element = bpmnRegistry.getSemantic(data.attachedId);
    return renderLabel(p, element.name, { box: data, align: align, style: { fontSize: '11px' } });
  }

  function renderLaneLabel(p, text, data) {
    var textBox = renderLabel(p, text, {
      box: { height: 30, width: data.height },
      align: 'center-middle'
    });

    var top = -1 * data.height;
    textBox.transform(
      'rotate(270) ' +
      'translate(' + top + ',' + 0 + ')'
    );
  }

  function createPathFromWaypoints(waypoints) {
    var pathData = 'm  ' + waypoints[0].x + ',' + waypoints[0].y;
    for (var i = 1; i < waypoints.length; i++) {
      pathData += 'L' + waypoints[i].x + ',' + waypoints[i].y + ' ';
    }
    return pathData;
  }

  var handlers = {
    'bpmn:Event': function(p, data, attrs) {
      return drawCircle(p, data.width, data.height,  attrs);
    },
    'bpmn:StartEvent': function(p, data) {
      var attrs = {};
      var semantic = getSemantic(data);

      if (!semantic.isInterrupting) {
        attrs = {
          strokeDasharray: '6',
          strokeLinecap: 'round'
        };
      }

      var circle = renderer('bpmn:Event')(p, data, attrs);

      renderEventContent(data, p);

      return circle;
    },
    'bpmn:MessageEventDefinition': function(p, data, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_MESSAGE', {
        xScaleFactor: 0.9,
        yScaleFactor: 0.9,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.235,
          my: 0.315
        }
      });

      var fill = isThrowing ? 'black' : 'none';
      var stroke = isThrowing ? 'white' : 'black';

      var messagePath = drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill,
        stroke: stroke
      });

      return messagePath;
    },
    'bpmn:TimerEventDefinition': function(p, data) {

      var circle = drawCircle(p, data.width, data.height, 0.2 * data.height, {
        strokeWidth: 2
      });

      var pathData = pathMap.getScaledPath('EVENT_TIMER_WH', {
        xScaleFactor: 0.75,
        yScaleFactor: 0.75,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.5,
          my: 0.5
        }
      });

      var path = drawPath(p, pathData, {
        strokeWidth: 2
      });

      return circle;
    },
    'bpmn:EscalationEventDefinition': function(p, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_ESCALATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.5,
          my: 0.555
        }
      });

      var fill = isThrowing ? 'black' : 'none';

      return drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill
      });
    },
    'bpmn:ConditionalEventDefinition': function(p, event) {
      var pathData = pathMap.getScaledPath('EVENT_CONDITIONAL', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.5,
          my: 0.222
        }
      });

      return drawPath(p, pathData, {
        strokeWidth: 1
      });
    },
    'bpmn:LinkEventDefinition': function(p, event) {
      var pathData = pathMap.getScaledPath('EVENT_LINK', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.57,
          my: 0.263
        }
      });

      return drawPath(p, pathData, {
        strokeWidth: 1
      });
    },
    'bpmn:ErrorEventDefinition': function(p, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_ERROR', {
        xScaleFactor: 1.1,
        yScaleFactor: 1.1,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.2,
          my: 0.722
        }
      });

      var fill = isThrowing ? 'black' : 'none';

      return drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill
      });
    },
    'bpmn:CancelEventDefinition': function(p, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_CANCEL_45', {
        xScaleFactor: 1.0,
        yScaleFactor: 1.0,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.638,
          my: -0.055
        }
      });

      var fill = isThrowing ? 'black' : 'none';

      return drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill
      }).transform('rotate(45)');
    },
    'bpmn:CompensateEventDefinition': function(p, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_COMPENSATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.201,
          my: 0.472
        }
      });

      var fill = isThrowing ? 'black' : 'none';

      return drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill
      });
    },
    'bpmn:SignalEventDefinition': function(p, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_SIGNAL', {
        xScaleFactor: 0.9,
        yScaleFactor: 0.9,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.5,
          my: 0.2
        }
      });

      var fill = isThrowing ? 'black' : 'none';

      return drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill
      });
    },
    'bpmn:MultipleEventDefinition': function(p, event, isThrowing) {
      var pathData = pathMap.getScaledPath('EVENT_MULTIPLE', {
        xScaleFactor: 1.1,
        yScaleFactor: 1.1,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.222,
          my: 0.36
        }
      });

      var fill = isThrowing ? 'black' : 'none';

      return drawPath(p, pathData, {
        strokeWidth: 1,
        fill: fill
      });
    },
    'bpmn:ParallelMultipleEventDefinition': function(p, event) {
      var pathData = pathMap.getScaledPath('EVENT_PARALLEL_MULTIPLE', {
        xScaleFactor: 1.2,
        yScaleFactor: 1.2,
        containerWidth: event.width,
        containerHeight: event.height,
        position: {
          mx: 0.458,
          my: 0.194
        }
      });

      return drawPath(p, pathData, {
        strokeWidth: 1
      });
    },
    'bpmn:EndEvent': function(p, data) {
      var circle = renderer('bpmn:Event')(p, data, {
        strokeWidth: 4
      });

      renderEventContent(data, p, true);

      return circle;
    },
    'bpmn:TerminateEventDefinition': function(p, data) {
      var circle = drawCircle(p, data.width, data.height, 8, {
        strokeWidth: 4,
        fill: 'black'
      });

      return circle;
    },
    'bpmn:IntermediateEvent': function(p, data) {
      var outer = renderer('bpmn:Event')(p, data, { strokeWidth: 1 });
      var inner = drawCircle(p, data.width, data.height, INNER_OUTER_DIST, { strokeWidth: 1 });

      renderEventContent(data, p);

      return outer;
    },
    'bpmn:IntermediateCatchEvent': as('bpmn:IntermediateEvent'),
    'bpmn:IntermediateThrowEvent': as('bpmn:IntermediateEvent'),

    'bpmn:Activity': function(p, data, attrs) {
      return drawRect(p, data.width, data.height, TASK_BORDER_RADIUS, attrs);
    },

    'bpmn:Task': function(p, data) {
      var rect = renderer('bpmn:Activity')(p, data);
      renderEmbeddedLabel(p, data, 'center-middle');
      attachTaskMarkers(p, data);
      return rect;
    },
    'bpmn:ServiceTask': function(p, data) {
      var task = renderer('bpmn:Task')(p, data);

      var pathDataBG = pathMap.getScaledPath('TASK_TYPE_SERVICE', {
        abspos: {
          x: 12,
          y: 18
        }
      });

      var servicePathBG = drawPath(p, pathDataBG, {
        strokeWidth: 1,
        fill: 'none'
      });

      var fillPathData = pathMap.getScaledPath('TASK_TYPE_SERVICE_FILL', {
        abspos: {
          x: 17.2,
          y: 18
        }
      });

      var serviceFillPath = drawPath(p, fillPathData, {
        strokeWidth: 0,
        stroke: 'none',
        fill: 'white'
      });

      var pathData = pathMap.getScaledPath('TASK_TYPE_SERVICE', {
        abspos: {
          x: 17,
          y: 22
        }
      });

      var servicePath = drawPath(p, pathData, {
        strokeWidth: 1,
        fill: 'white'
      });

      return task;
    },
    'bpmn:UserTask': function(p, data) {
      var task = renderer('bpmn:Task')(p, data);

      var x = 15;
      var y = 12;

      var pathData = pathMap.getScaledPath('TASK_TYPE_USER_1', {
        abspos: {
          x: x,
          y: y
        }
      });

      var userPath = drawPath(p, pathData, {
        strokeWidth: 0.5,
        fill: 'none'
      });

      var pathData2 = pathMap.getScaledPath('TASK_TYPE_USER_2', {
        abspos: {
          x: x,
          y: y
        }
      });

      var userPath2 = drawPath(p, pathData2, {
        strokeWidth: 0.5,
        fill: 'none'
      });

      var pathData3 = pathMap.getScaledPath('TASK_TYPE_USER_3', {
        abspos: {
          x: x,
          y: y
        }
      });

      var userPath3 = drawPath(p, pathData3, {
        strokeWidth: 0.5,
        fill: 'black'
      });

      return task;
    },
    'bpmn:ManualTask': function(p, data) {
      var task = renderer('bpmn:Task')(p, data);

      var pathData = pathMap.getScaledPath('TASK_TYPE_MANUAL', {
        abspos: {
          x: 17,
          y: 15
        }
      });

      var userPath = drawPath(p, pathData, {
        strokeWidth: 0.25,
        fill: 'none',
        stroke: 'black'
      });

      return task;
    },
    'bpmn:SendTask': function(p, data) {
      var task = renderer('bpmn:Task')(p, data);

      var pathData = pathMap.getScaledPath('TASK_TYPE_SEND', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: 21,
        containerHeight: 14,
        position: {
          mx: 0.285,
          my: 0.357
        }
      });

      var sendPath = drawPath(p, pathData, {
        strokeWidth: 1,
        fill: 'black',
        stroke: 'white'
      });

      return task;
    },
    'bpmn:ReceiveTask' : function(p, data) {
      var semantic = getSemantic(data);

      var task = renderer('bpmn:Task')(p, data);
      var pathData;

      if (semantic.instantiate) {
        drawCircle(p, 28, 28, 20 * 0.22, { strokeWidth: 1 });

        pathData = pathMap.getScaledPath('TASK_TYPE_INSTANTIATING_SEND', {
          abspos: {
            x: 7.77,
            y: 9.52
          }
        });
      } else {

        pathData = pathMap.getScaledPath('TASK_TYPE_SEND', {
          xScaleFactor: 0.9,
          yScaleFactor: 0.9,
          containerWidth: 21,
          containerHeight: 14,
          position: {
            mx: 0.3,
            my: 0.4
          }
        });
      }

      var sendPath = drawPath(p, pathData, {
        strokeWidth: 1
      });

      return task;
    },
    'bpmn:ScriptTask': function(p, data) {
      var task = renderer('bpmn:Task')(p, data);

      var pathData = pathMap.getScaledPath('TASK_TYPE_SCRIPT', {
        abspos: {
          x: 15,
          y: 20
        }
      });

      var scriptPath = drawPath(p, pathData, {
        strokeWidth: 1
      });

      return task;
    },
    'bpmn:BusinessRuleTask': function(p, data) {
      var task = renderer('bpmn:Task')(p, data);

      var headerPathData = pathMap.getScaledPath('TASK_TYPE_BUSINESS_RULE_HEADER', {
        abspos: {
          x: 8,
          y: 8
        }
      });

      var businessHeaderPath = drawPath(p, headerPathData);
      businessHeaderPath.attr({
        strokeWidth: 1,
        fill: 'AAA'
      });

      var headerData = pathMap.getScaledPath('TASK_TYPE_BUSINESS_RULE_MAIN', {
        abspos: {
          x: 8,
          y: 8
        }
      });

      var businessPath = drawPath(p, headerData);
      businessPath.attr({
        strokeWidth: 1
      });

      return task;
    },
    'bpmn:SubProcess': function(p, data, attrs) {
      var rect = renderer('bpmn:Activity')(p, data, attrs);

      var semantic = getSemantic(data),
          di = getDi(data);

      var expanded = DiUtil.isExpanded(semantic, di);

      var isEventSubProcess = !!(getSemantic(data).triggeredByEvent);
      if (isEventSubProcess) {
        rect.attr({
          strokeDasharray: '1,2'
        });
      }

      renderEmbeddedLabel(p, data, expanded ? 'center-top' : 'center-middle');

      if (expanded) {
        attachTaskMarkers(p, data);
      } else {
        attachTaskMarkers(p, data, ['SubProcessMarker']);
      }

      return rect;
    },
    'bpmn:AdHocSubProcess': function(p, data) {
      return renderer('bpmn:SubProcess')(p, data);
    },
    'bpmn:Transaction': function(p, data) {
      var outer = renderer('bpmn:SubProcess')(p, data);

      var innerAttrs = styles.style([ 'no-fill', 'no-events' ]);
      var inner = drawRect(p, data.width, data.height, TASK_BORDER_RADIUS - 2, INNER_OUTER_DIST, innerAttrs);

      return outer;
    },
    'bpmn:CallActivity': function(p, data) {
      return renderer('bpmn:SubProcess')(p, data, {
        strokeWidth: 5
      });
    },
    'bpmn:Participant': function(p, data) {

      var lane = renderer('bpmn:Lane')(p, data);

      var expandedPool = DiUtil.isExpandedPool(getSemantic(data));

      if (expandedPool) {
        drawLine(p, [
          {x: 30, y: 0},
          {x: 30, y: data.height}
        ]);
        var text = getSemantic(data).name;
        renderLaneLabel(p, text, data);
      } else {
        // Collapsed pool draw text inline
        var text2 = getSemantic(data).name;
        renderLabel(p, text2, { box: data, align: 'center-middle' });
      }

      var participantMultiplicity = !!(getSemantic(data).participantMultiplicity);

      if(participantMultiplicity) {
        renderer('ParticipantMultiplicityMarker')(p, data);
      }

      return lane;
    },
    'bpmn:Lane': function(p, data) {
      var rect = drawRect(p, data.width, data.height, 0, {
        fill: 'none'
      });

      var semantic = getSemantic(data);

      if (semantic.$type === 'bpmn:Lane') {
        var text = semantic.name;
        renderLaneLabel(p, text, data);
      }

      return rect;
    },
    'bpmn:InclusiveGateway': function(p, data) {
      var diamond = drawDiamond(p, data.width, data.height);

      var circle = drawCircle(p, data.width, data.height, data.height * 0.24, {
        strokeWidth: 2.5,
        fill: 'none'
      });

      return diamond;
    },
    'bpmn:ExclusiveGateway': function(p, data) {
      var diamond = drawDiamond(p, data.width, data.height);

      var pathData = pathMap.getScaledPath('GATEWAY_EXCLUSIVE', {
        xScaleFactor: 0.4,
        yScaleFactor: 0.4,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.32,
          my: 0.3
        }
      });

      var exclusivePath = drawPath(p, pathData, {
        strokeWidth: 1,
        fill: 'black'
      });

      return diamond;
    },
    'bpmn:ComplexGateway': function(p, data) {
      var diamond = drawDiamond(p, data.width, data.height);

      var pathData = pathMap.getScaledPath('GATEWAY_COMPLEX', {
        xScaleFactor: 0.5,
        yScaleFactor:0.5,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.46,
          my: 0.26
        }
      });

      var complexPath = drawPath(p, pathData, {
        strokeWidth: 1,
        fill: 'black'
      });

      return diamond;
    },
    'bpmn:ParallelGateway': function(p, data) {
      var diamond = drawDiamond(p, data.width, data.height);

      var pathData = pathMap.getScaledPath('GATEWAY_PARALLEL', {
        xScaleFactor: 0.6,
        yScaleFactor:0.6,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.46,
          my: 0.2
        }
      });

      var parallelPath = drawPath(p, pathData, {
        strokeWidth: 1,
        fill: 'black'
      });

      return diamond;
    },
    'bpmn:EventBasedGateway': function(p, data) {

      var semantic = getSemantic(data);

      var diamond = drawDiamond(p, data.width, data.height);

      var outerCircle = drawCircle(p, data.width, data.height, data.height * 0.20, {
        strokeWidth: 1,
        fill: 'none'
      });

      var type = semantic.eventGatewayType;
      var instantiate = !!semantic.instantiate;

      function drawEvent() {

        var pathData = pathMap.getScaledPath('GATEWAY_EVENT_BASED', {
          xScaleFactor: 0.18,
          yScaleFactor: 0.18,
          containerWidth: data.width,
          containerHeight: data.height,
          position: {
            mx: 0.36,
            my: 0.44
          }
        });

        var eventPath = drawPath(p, pathData, {
          strokeWidth: 2,
          fill: 'none'
        });
      }

      if (type === 'Parallel') {

        var pathData = pathMap.getScaledPath('GATEWAY_PARALLEL', {
          xScaleFactor: 0.4,
          yScaleFactor:0.4,
          containerWidth: data.width,
          containerHeight: data.height,
          position: {
            mx: 0.474,
            my: 0.296
          }
        });

        var parallelPath = drawPath(p, pathData);
        parallelPath.attr({
          strokeWidth: 1,
          fill: 'none'
        });
      } else if (type === 'Exclusive') {

        if (!instantiate) {
          var innerCircle = drawCircle(p, data.width, data.height, data.height * 0.26);
          innerCircle.attr({
            strokeWidth: 1,
            fill: 'none'
          });
        }

        drawEvent();
      }


      return diamond;
    },
    'bpmn:Gateway': function(p, data) {
      return drawDiamond(p, data.width, data.height);
    },
    'bpmn:SequenceFlow': function(p, data) {
      var pathData = createPathFromWaypoints(data.waypoints);
      var path = drawPath(p, pathData, {
        markerEnd: marker('sequenceflow-end')
      });

      var sequenceFlow = bpmnRegistry.getSemantic(data.id);
      var source = sequenceFlow.sourceRef;

      // conditional flow marker
      if (sequenceFlow.conditionExpression && source.$instanceOf('bpmn:Task')) {
        path.attr({
          markerStart: marker('conditional-flow-marker')
        });
      }

      // default marker
      if (source.default && source.$instanceOf('bpmn:Gateway') && source.default === sequenceFlow) {
        path.attr({
          markerStart: marker('conditional-default-flow-marker')
        });
      }

      return path;
    },
    'bpmn:Association': function(p, data, attrs) {

      attrs = _.extend({
        strokeDasharray: '1,6',
        strokeLinecap: 'round'
      }, attrs || {});

      // TODO(nre): style according to directed state
      return drawLine(p, data.waypoints, attrs);
    },
    'bpmn:DataInputAssociation': function(p, data) {
      return renderer('bpmn:Association')(p, data, {
        markerEnd: marker('data-association-end')
      });
    },
    'bpmn:DataOutputAssociation': function(p, data) {
      return renderer('bpmn:Association')(p, data, {
        markerEnd: marker('data-association-end')
      });
    },
    'bpmn:MessageFlow': function(p, data) {

      var di = getDi(data);

      var pathData = createPathFromWaypoints(data.waypoints);
      var path = drawPath(p, pathData, {
        markerEnd: marker('messageflow-end'),
        markerStart: marker('messageflow-start'),
        strokeDasharray: '10',
        strokeLinecap: 'round',
        strokeWidth: 1
      });

      if (!!di.messageVisibleKind) {
        var midPoint = path.getPointAtLength(path.getTotalLength() / 2);

        var markerPathData = pathMap.getScaledPath('MESSAGE_FLOW_MARKER', {
          abspos: {
            x: midPoint.x,
            y: midPoint.y
          }
        });

        var messageAttrs = { strokeWidth: 1 };

        if (di.messageVisibleKind === 'initiating') {
          messageAttrs.fill = 'white';
          messageAttrs.stroke = 'black';
        } else {
          messageAttrs.fill = '#888';
          messageAttrs.stroke = 'white';
        }

        drawPath(p, markerPathData, messageAttrs);
      }

      return path;
    },
    'bpmn:DataObject': function(p, data) {
      var pathData = pathMap.getScaledPath('DATA_OBJECT_PATH', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.474,
          my: 0.296
        }
      });

      var dataObject = drawPath(p, pathData, { fill: 'white' });

      var semantic = getSemantic(data);

      if (isCollection(semantic)) {
        renderDataItemCollection(p, data);
      }

      return dataObject;
    },
    'bpmn:DataObjectReference': as('bpmn:DataObject'),
    'bpmn:DataInput': function(p, data) {

      var arrowPathData = pathMap.getRawPath('DATA_ARROW');

      // page
      var dataObject = renderer('bpmn:DataObject')(p, data);

      // arrow
      var dataInput = drawPath(p, arrowPathData, { strokeWidth: 1 });

      return dataObject;
    },
    'bpmn:DataOutput': function(p, data) {
      var arrowPathData = pathMap.getRawPath('DATA_ARROW');

      // page
      var dataObject = renderer('bpmn:DataObject')(p, data);

      // arrow
      var dataInput = drawPath(p, arrowPathData, {
        strokeWidth: 1,
        fill: 'black'
      });

      return dataObject;
    },
    'bpmn:DataStoreReference': function(p, data) {
      var DATA_STORE_PATH = pathMap.getScaledPath('DATA_STORE', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0,
          my: 0.133
        }
      });

      var dataStore = drawPath(p, DATA_STORE_PATH, {
        strokeWidth: 2,
        fill: 'white'
      });

      return dataStore;
    },
    'bpmn:BoundaryEvent': function(p, data) {

      var semantic = getSemantic(data),
          cancel = semantic.cancelActivity;

      var attrs = {
        strokeLinecap: 'round',
        strokeWidth: 1
      };

      if (!cancel) {
        attrs.strokeDasharray = '6';
      }

      var outer = renderer('bpmn:Event')(p, data, attrs);
      var inner = drawCircle(p, data.width, data.height, INNER_OUTER_DIST, attrs);

      renderEventContent(data, p);

      return outer;
    },
    'bpmn:Group': function(p, data) {
      return drawRect(p, data.width, data.height, TASK_BORDER_RADIUS, {
        strokeWidth: 1,
        strokeDasharray: '8,3,1,3',
        fill: 'none',
        pointerEvents: 'none'
      });
    },
    'label': function(p, data) {
      return renderExternalLabel(p, data, '');
    },
    'bpmn:TextAnnotation': function(p, data) {
      var textPathData = pathMap.getScaledPath('TEXT_ANNOTATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: 0.0,
          my: 0.0
        }
      });
      drawPath(p, textPathData);

      var text = getSemantic(data).text || '';
      var label = renderLabel(p, text, { box: data, align: 'left-middle' });

      return label;
    },
    'ParticipantMultiplicityMarker': function(p, data) {
      var subProcessPath = pathMap.getScaledPath('MARKER_PARALLEL', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: ((data.width / 2) / data.width),
          my: (data.height - 15) / data.height
        }
      });

      drawPath(p, subProcessPath);
    },
    'SubProcessMarker': function(p, data) {
      var markerRect = drawRect(p, 14, 14, 0, {
        strokeWidth: 1
      });

      // Process marker is placed in the middle of the box
      // therefore fixed values can be used here
      markerRect.transform('translate(' + (data.width / 2 - 7.5) + ',' + (data.height - 20) + ')');

      var subProcessPath = pathMap.getScaledPath('MARKER_SUB_PROCESS', {
        xScaleFactor: 1.5,
        yScaleFactor: 1.5,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: (data.width / 2 - 7.5) / data.width,
          my: (data.height - 20) / data.height
        }
      });

      drawPath(p, subProcessPath);
    },
    'ParallelMarker': function(p, data, position) {
      var subProcessPath = pathMap.getScaledPath('MARKER_PARALLEL', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: ((data.width / 2 + position.parallel) / data.width),
          my: (data.height - 20) / data.height
        }
      });
      drawPath(p, subProcessPath);
    },
    'SequentialMarker': function(p, data, position) {
      var sequentialPath = pathMap.getScaledPath('MARKER_SEQUENTIAL', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: ((data.width / 2 + position.seq) / data.width),
          my: (data.height - 19) / data.height
        }
      });
      drawPath(p, sequentialPath);
    },
    'CompensationMarker': function(p, data, position) {
      var compensationPath = pathMap.getScaledPath('MARKER_COMPENSATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: ((data.width / 2 + position.compensation) / data.width),
          my: (data.height - 13) / data.height
        }
      });
      drawPath(p, compensationPath, { strokeWidth: 1 });
    },
    'LoopMarker': function(p, data, position) {
      var loopPath = pathMap.getScaledPath('MARKER_LOOP', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: ((data.width / 2 + position.loop) / data.width),
          my: (data.height - 7) / data.height
        }
      });

      drawPath(p, loopPath, {
        strokeWidth: 1,
        fill: 'none',
        strokeLinecap: 'round',
        strokeMiterlimit: 0.5
      });
    },
    'AdhocMarker': function(p, data, position) {
      var loopPath = pathMap.getScaledPath('MARKER_ADHOC', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: data.width,
        containerHeight: data.height,
        position: {
          mx: ((data.width / 2 + position.adhoc) / data.width),
          my: (data.height - 15) / data.height
        }
      });

      drawPath(p, loopPath, {
        strokeWidth: 1,
        fill: 'black'
      });
    }
  };

  function attachTaskMarkers(p, data, taskMarkers) {
    var obj = getSemantic(data);

    var subprocess = _.contains(taskMarkers, 'SubProcessMarker');
    var position;

    if (subprocess) {
      position = {
        seq: -21,
        parallel: -22,
        compensation: -42,
        loop: -18,
        adhoc: 10
      };
    } else {
      position = {
        seq: -3,
        parallel: -6,
        compensation: -27,
        loop: 0,
        adhoc: 10
      };
    }

    _.forEach(taskMarkers, function(marker) {
      renderer(marker)(p, data, position);
    });

    if (obj.$type === 'bpmn:AdHocSubProcess') {
      renderer('AdhocMarker')(p, data, position);
    }
    if (obj.loopCharacteristics && obj.loopCharacteristics.isSequential === undefined) {
      renderer('LoopMarker')(p, data, position);
      return;
    }
    if (obj.loopCharacteristics &&
      obj.loopCharacteristics.isSequential !== undefined &&
      !obj.loopCharacteristics.isSequential) {
      renderer('ParallelMarker')(p, data, position);
    }
    if (obj.loopCharacteristics && !!obj.loopCharacteristics.isSequential) {
      renderer('SequentialMarker')(p, data, position);
    }
    if (!!obj.isForCompensation) {
      renderer('CompensationMarker')(p, data, position);
    }
  }

  function drawShape(parent, data) {
    var type = data.type;
    var h = handlers[type];

    /* jshint -W040 */
    if (!h) {
      return DefaultRenderer.prototype.drawShape.apply(this, [ parent, data ]);
    } else {
      return h(parent, data);
    }
  }

  function drawConnection(parent, data) {
    var type = data.type;
    var h = handlers[type];

    /* jshint -W040 */
    if (!h) {
      return DefaultRenderer.prototype.drawConnection.apply(this, [ parent, data ]);
    } else {
      return h(parent, data);
    }
  }

  function renderDataItemCollection(p, data) {

    var yPosition = (data.height - 16) / data.height;

    var pathData = pathMap.getScaledPath('DATA_OBJECT_COLLECTION_PATH', {
      xScaleFactor: 1,
      yScaleFactor: 1,
      containerWidth: data.width,
      containerHeight: data.height,
      position: {
        mx: 0.451,
        my: yPosition
      }
    });

    var collectionPath = drawPath(p, pathData, {
      strokeWidth: 2
    });
  }

  function isCollection(element, filter) {
    return element.isCollection ||
           (element.dataObjectRef && element.dataObjectRef.isCollection);
  }

  function getDi(element) {
    return bpmnRegistry.getDi(_.isString(element) ? element : element.id);
  }

  function getSemantic(element) {
    return bpmnRegistry.getSemantic(_.isString(element) ? element : element.id);
  }

  /**
   * Checks if eventDefinition of the given element matches with semantic type.
   *
   * @return {boolean} true if element is of the given semantic type
   */
  function isTypedEvent(event, eventDefinitionType, filter) {

    function matches(definition, filter) {
      return _.all(filter, function(val, key) {

        // we want a == conversion here, to be able to catch
        // undefined == false and friends
        /* jshint -W116 */
        return definition[key] == val;
      });
    }

    return _.any(event.eventDefinitions, function(definition) {
      return definition.$type === eventDefinitionType && matches(event, filter);
    });
  }

  function isThrowEvent(event) {
    return (event.$type === 'bpmn:IntermediateThrowEvent') || (event.$type === 'bpmn:EndEvent');
  }

  // hook onto canvas init event to initialize
  // connection start/end markers on paper
  events.on('canvas.init', function(event) {
    var paper = event.paper;

    initMarkers(paper);
  });

  this.drawShape = drawShape;
  this.drawConnection = drawConnection;
}

BpmnRenderer.prototype = Object.create(DefaultRenderer.prototype);


BpmnRenderer.$inject = [ 'eventBus', 'styles', 'bpmnRegistry', 'pathMap' ];

module.exports = BpmnRenderer;
},{"../util/Di":13,"diagram-js/lib/draw/Renderer":45,"diagram-js/lib/util/LabelUtil":58}],9:[function(require,module,exports){
'use strict';

/**
 * Map containing SVG paths needed by BpmnRenderer.
 */

function PathMap(Snap) {

  /**
   * Contains a map of path elements
   *
   * <h1>Path definition</h1>
   * A parameterized path is defined like this:
   * <pre>
   * 'GATEWAY_PARALLEL': {
   *   d: 'm {mx},{my} {e.x0},0 0,{e.x1} {e.x1},0 0,{e.y0} -{e.x1},0 0,{e.y1} ' +
          '-{e.x0},0 0,-{e.y1} -{e.x1},0 0,-{e.y0} {e.x1},0 z',
   *   height: 17.5,
   *   width:  17.5,
   *   heightElements: [2.5, 7.5],
   *   widthElements: [2.5, 7.5]
   * }
   * </pre>
   * <p>It's important to specify a correct <b>height and width</b> for the path as the scaling
   * is based on the ratio between the specified height and width in this object and the
   * height and width that is set as scale target (Note x,y coordinates will be scaled with
   * individual ratios).</p>
   * <p>The '<b>heightElements</b>' and '<b>widthElements</b>' array must contain the values that will be scaled.
   * The scaling is based on the computed ratios.
   * Coordinates on the y axis should be in the <b>heightElement</b>'s array, they will be scaled using
   * the computed ratio coefficient.
   * In the parameterized path the scaled values can be accessed through the 'e' object in {} brackets.
   *   <ul>
   *    <li>The values for the y axis can be accessed in the path string using {e.y0}, {e.y1}, ....</li>
   *    <li>The values for the x axis can be accessed in the path string using {e.x0}, {e.x1}, ....</li>
   *   </ul>
   *   The numbers x0, x1 respectively y0, y1, ... map to the corresponding array index.
   * </p>
   */
  this.pathMap = {
    'EVENT_MESSAGE': {
      d: 'm {mx},{my} l 0,{e.y1} l {e.x1},0 l 0,-{e.y1} z l {e.x0},{e.y0} l {e.x0},-{e.y0}',
      height: 36,
      width:  36,
      heightElements: [6, 14],
      widthElements: [10.5, 21]
    },
    'EVENT_SIGNAL': {
      d: 'M {mx},{my} l {e.x0},{e.y0} l -{e.x1},0 Z',
      height: 36,
      width: 36,
      heightElements: [18],
      widthElements: [10, 20]
    },
    'EVENT_ESCALATION': {
      d: 'm {mx},{my} c -{e.x1},{e.y0} -{e.x3},{e.y1} -{e.x5},{e.y4} {e.x1},-{e.y3} {e.x3},-{e.y5} {e.x5},-{e.y6} ' +
        '{e.x0},{e.y3} {e.x2},{e.y5} {e.x4},{e.y6} -{e.x0},-{e.y0} -{e.x2},-{e.y1} -{e.x4},-{e.y4} z',
      height: 36,
      width: 36,
      heightElements: [2.382, 4.764, 4.926, 6.589333, 7.146, 13.178667, 19.768],
      widthElements: [2.463, 2.808, 4.926, 5.616, 7.389, 8.424]
    },
    'EVENT_CONDITIONAL': {
      d: 'M {e.x0},{e.y0} l {e.x1},0 l 0,{e.y2} l -{e.x1},0 Z ' +
         'M {e.x2},{e.y3} l {e.x0},0 ' +
         'M {e.x2},{e.y4} l {e.x0},0 ' +
         'M {e.x2},{e.y5} l {e.x0},0 ' +
         'M {e.x2},{e.y6} l {e.x0},0 ' +
         'M {e.x2},{e.y7} l {e.x0},0 ' +
         'M {e.x2},{e.y8} l {e.x0},0 ',
      height: 36,
      width:  36,
      heightElements: [8.5, 14.5, 18, 11.5, 14.5, 17.5, 20.5, 23.5, 26.5],
      widthElements:  [10.5, 14.5, 12.5]
    },
    'EVENT_LINK': {
      d: 'm {mx},{my} 0,{e.y0} -{e.x1},0 0,{e.y1} {e.x1},0 0,{e.y0} {e.x0},-{e.y2} -{e.x0},-{e.y2} z',
      height: 36,
      width: 36,
      heightElements: [4.4375, 6.75, 7.8125],
      widthElements: [9.84375, 13.5]
    },
    'EVENT_ERROR': {
      d: 'm {mx},{my} {e.x0},-{e.y0} {e.x1},-{e.y1} {e.x2},{e.y2} {e.x3},-{e.y3} -{e.x4},{e.y4} -{e.x5},-{e.y5} z',
      height: 36,
      width: 36,
      heightElements: [0.023, 8.737, 8.151, 16.564, 10.591, 8.714],
      widthElements: [0.085, 6.672, 6.97, 4.273, 5.337, 6.636]
    },
    'EVENT_CANCEL_45': {
      d: 'm {mx},{my} -{e.x1},0 0,{e.x0} {e.x1},0 0,{e.y1} {e.x0},0 ' +
        '0,-{e.y1} {e.x1},0 0,-{e.y0} -{e.x1},0 0,-{e.y1} -{e.x0},0 z',
      height: 36,
      width: 36,
      heightElements: [4.75, 8.5],
      widthElements: [4.75, 8.5]
    },
    'EVENT_COMPENSATION': {
      d: 'm {mx},{my} {e.x0},-{e.y0} 0,{e.y1} z m {e.x0},0 {e.x0},-{e.y0} 0,{e.y1} z',
      height: 36,
      width: 36,
      heightElements: [5, 10],
      widthElements: [10]
    },
    'EVENT_TIMER_WH': {
      d: 'M {mx},{my} m -{e.x1},-{e.y1} l {e.x1},{e.y1} l {e.x0},-{e.y0}',
      height: 36,
      width:  36,
      heightElements: [3.5,4],
      widthElements: [8.75,10.5]
    },
    'EVENT_MULTIPLE': {
      d:'m {mx},{my} {e.x1},-{e.y0} {e.x1},{e.y0} -{e.x0},{e.y1} -{e.x2},0 z',
      height: 36,
      width:  36,
      heightElements: [6.28099, 12.56199],
      widthElements: [3.1405, 9.42149, 12.56198]
    },
    'EVENT_PARALLEL_MULTIPLE': {
      d:'m {mx},{my} {e.x0},0 0,{e.y1} {e.x1},0 0,{e.y0} -{e.x1},0 0,{e.y1} ' +
        '-{e.x0},0 0,-{e.y1} -{e.x1},0 0,-{e.y0} {e.x1},0 z',
      height: 36,
      width:  36,
      heightElements: [2.56228, 7.68683],
      widthElements: [2.56228, 7.68683]
    },
    'GATEWAY_EXCLUSIVE': {
      d:'m {mx},{my} {e.x0},{e.y0} {e.x1},{e.y0} {e.x2},0 {e.x4},{e.y2} ' +
                    '{e.x4},{e.y1} {e.x2},0 {e.x1},{e.y3} {e.x0},{e.y3} ' +
                    '{e.x3},0 {e.x5},{e.y1} {e.x5},{e.y2} {e.x3},0 z',
      height: 17.5,
      width:  17.5,
      heightElements: [8.5, 6.5312, -6.5312, -8.5],
      widthElements:  [6.5, -6.5, 3, -3, 5, -5]
    },
    'GATEWAY_PARALLEL': {
      d:'m {mx},{my} 0,{e.y1} -{e.x1},0 0,{e.y0} {e.x1},0 0,{e.y1} {e.x0},0 ' +
        '0,-{e.y1} {e.x1},0 0,-{e.y0} -{e.x1},0 0,-{e.y1} -{e.x0},0 z',
      height: 30,
      width:  30,
      heightElements: [5, 12.5],
      widthElements: [5, 12.5]
    },
    'GATEWAY_EVENT_BASED': {
      d:'m {mx},{my} {e.x0},{e.y0} {e.x0},{e.y1} {e.x1},{e.y2} {e.x2},0 z',
      height: 11,
      width:  11,
      heightElements: [-6, 6, 12, -12],
      widthElements: [9, -3, -12]
    },
    'GATEWAY_COMPLEX': {
      d:'m {mx},{my} 0,{e.y0} -{e.x0},-{e.y1} -{e.x1},{e.y2} {e.x0},{e.y1} -{e.x2},0 0,{e.y3} ' +
        '{e.x2},0  -{e.x0},{e.y1} l {e.x1},{e.y2} {e.x0},-{e.y1} 0,{e.y0} {e.x3},0 0,-{e.y0} {e.x0},{e.y1} ' +
        '{e.x1},-{e.y2} -{e.x0},-{e.y1} {e.x2},0 0,-{e.y3} -{e.x2},0 {e.x0},-{e.y1} -{e.x1},-{e.y2} ' +
        '-{e.x0},{e.y1} 0,-{e.y0} -{e.x3},0 z',
      height: 17.125,
      width:  17.125,
      heightElements: [4.875, 3.4375, 2.125, 3],
      widthElements: [3.4375, 2.125, 4.875, 3]
    },
    'DATA_OBJECT_PATH': {
      d:'m 0,0 {e.x1},0 {e.x0},{e.y0} 0,{e.y1} -{e.x2},0 0,-{e.y2} {e.x1},0 0,{e.y0} {e.x0},0',
      height: 61,
      width:  51,
      heightElements: [10, 50, 60],
      widthElements: [10, 40, 50, 60]
    },
    'DATA_OBJECT_COLLECTION_PATH': {
      d:'m {mx}, {my} ' +
        'm  0 15  l 0 -15 ' +
        'm  4 15  l 0 -15 ' +
        'm  4 15  l 0 -15 ',
      height: 61,
      width:  51,
      heightElements: [12],
      widthElements: [1, 6, 12, 15]
    },
    'DATA_ARROW': {
      d:'m 5,9 9,0 0,-3 5,5 -5,5 0,-3 -9,0 z',
      height: 61,
      width:  51,
      heightElements: [],
      widthElements: []
    },
    'DATA_STORE': {
      d:'m  {mx},{my} ' +
        'l  0,{e.y2} ' +
        'c  {e.x0},{e.y1} {e.x1},{e.y1}  {e.x2},0 ' +
        'l  0,-{e.y2} ' +
        'c -{e.x0},-{e.y1} -{e.x1},-{e.y1} -{e.x2},0' +
        'c  {e.x0},{e.y1} {e.x1},{e.y1}  {e.x2},0 ' +
        'm  0,{e.y0}' +
        'c -{e.x0},{e.y1} -{e.x1},{e.y1} -{e.x2},0' +
        'm  0,{e.y0}' +
        'c  {e.x0},{e.y1} {e.x1},{e.y1}  {e.x2},0',
      height: 61,
      width:  61,
      heightElements: [7, 10, 45],
      widthElements:  [2, 58, 60]
    },
    'TEXT_ANNOTATION': {
      d: 'm {mx}, {my} m 10,0 l -10,0 l 0,{e.y0} l 10,0',
      height: 30,
      width: 10,
      heightElements: [30],
      widthElements: [10]
    },
    'MARKER_SUB_PROCESS': {
      d: 'm{mx},{my} m 7,2 l 0,10 m -5,-5 l 10,0',
      height: 10,
      width: 10,
      heightElements: [],
      widthElements: []
    },
    'MARKER_PARALLEL': {
      d: 'm{mx},{my} m 3,2 l 0,10 m 3,-10 l 0,10 m 3,-10 l 0,10',
      height: 10,
      width: 10,
      heightElements: [],
      widthElements: []
    },
    'MARKER_SEQUENTIAL': {
      d: 'm{mx},{my} m 0,3 l 10,0 m -10,3 l 10,0 m -10,3 l 10,0',
      height: 10,
      width: 10,
      heightElements: [],
      widthElements: []
    },
    'MARKER_COMPENSATION': {
      d: 'm {mx},{my} 8,-5 0,10 z m 9,0 8,-5 0,10 z',
      height: 10,
      width: 21,
      heightElements: [],
      widthElements: []
    },
    'MARKER_LOOP': {
      d: 'm {mx},{my} c 3.526979,0 6.386161,-2.829858 6.386161,-6.320661 0,-3.490806 -2.859182,-6.320661 ' +
        '-6.386161,-6.320661 -3.526978,0 -6.38616,2.829855 -6.38616,6.320661 0,1.745402 ' +
        '0.714797,3.325567 1.870463,4.469381 0.577834,0.571908 1.265885,1.034728 2.029916,1.35457 ' +
        'l -0.718163,-3.909793 m 0.718163,3.909793 -3.885211,0.802902',
      height: 13.9,
      width: 13.7,
      heightElements: [],
      widthElements: []
    },
    'MARKER_ADHOC': {
      d: 'm {mx},{my} m 0.84461,2.64411 c 1.05533,-1.23780996 2.64337,-2.07882 4.29653,-1.97997996 2.05163,0.0805 ' +
        '3.85579,1.15803 5.76082,1.79107 1.06385,0.34139996 2.24454,0.1438 3.18759,-0.43767 0.61743,-0.33642 ' +
        '1.2775,-0.64078 1.7542,-1.17511 0,0.56023 0,1.12046 0,1.6807 -0.98706,0.96237996 -2.29792,1.62393996 ' +
        '-3.6918,1.66181996 -1.24459,0.0927 -2.46671,-0.2491 -3.59505,-0.74812 -1.35789,-0.55965 ' +
        '-2.75133,-1.33436996 -4.27027,-1.18121996 -1.37741,0.14601 -2.41842,1.13685996 -3.44288,1.96782996 z',
      height: 4,
      width: 15,
      heightElements: [],
      widthElements: []
    },
    'TASK_TYPE_SEND': {
      d: 'm {mx},{my} l 0,{e.y1} l {e.x1},0 l 0,-{e.y1} z l {e.x0},{e.y0} l {e.x0},-{e.y0}',
      height: 14,
      width:  21,
      heightElements: [6, 14],
      widthElements: [10.5, 21]
    },
    'TASK_TYPE_SCRIPT': {
      d: 'm {mx},{my} c 9.966553,-6.27276 -8.000926,-7.91932 2.968968,-14.938 l -8.802728,0 ' +
        'c -10.969894,7.01868 6.997585,8.66524 -2.968967,14.938 z ' +
        'm -7,-12 l 5,0 ' +
        'm -4.5,3 l 4.5,0 ' +
        'm -3,3 l 5,0' +
        'm -4,3 l 5,0',
      height: 15,
      width:  12.6,
      heightElements: [6, 14],
      widthElements: [10.5, 21]
    },
    'TASK_TYPE_USER_1': {
      d: 'm {mx},{my} c 0.909,-0.845 1.594,-2.049 1.594,-3.385 0,-2.554 -1.805,-4.62199999 ' +
        '-4.357,-4.62199999 -2.55199998,0 -4.28799998,2.06799999 -4.28799998,4.62199999 0,1.348 ' +
        '0.974,2.562 1.89599998,3.405 -0.52899998,0.187 -5.669,2.097 -5.794,4.7560005 v 6.718 ' +
        'h 17 v -6.718 c 0,-2.2980005 -5.5279996,-4.5950005 -6.0509996,-4.7760005 z' +
        'm -8,6 l 0,5.5 m 11,0 l 0,-5'
    },
    'TASK_TYPE_USER_2': {
      d: 'm {mx},{my} m 2.162,1.009 c 0,2.4470005 -2.158,4.4310005 -4.821,4.4310005 ' +
        '-2.66499998,0 -4.822,-1.981 -4.822,-4.4310005 '
    },
    'TASK_TYPE_USER_3': {
      d: 'm {mx},{my} m -6.9,-3.80 c 0,0 2.25099998,-2.358 4.27399998,-1.177 2.024,1.181 4.221,1.537 ' +
        '4.124,0.965 -0.098,-0.57 -0.117,-3.79099999 -4.191,-4.13599999 -3.57499998,0.001 ' +
        '-4.20799998,3.36699999 -4.20699998,4.34799999 z'
    },
    'TASK_TYPE_MANUAL': {
      d: 'm {mx},{my} c 0.234,-0.01 5.604,0.008 8.029,0.004 0.808,0 1.271,-0.172 1.417,-0.752 0.227,-0.898 ' +
        '-0.334,-1.314 -1.338,-1.316 -2.467,-0.01 -7.886,-0.004 -8.108,-0.004 -0.014,-0.079 0.016,-0.533 0,-0.61 ' +
        '0.195,-0.042 8.507,0.006 9.616,0.002 0.877,-0.007 1.35,-0.438 1.353,-1.208 0.003,-0.768 -0.479,-1.09 ' +
        '-1.35,-1.091 -2.968,-0.002 -9.619,-0.013 -9.619,-0.013 v -0.591 c 0,0 5.052,-0.016 7.225,-0.016 ' +
        '0.888,-0.002 1.354,-0.416 1.351,-1.193 -0.006,-0.761 -0.492,-1.196 -1.361,-1.196 -3.473,-0.005 ' +
        '-10.86,-0.003 -11.0829995,-0.003 -0.022,-0.047 -0.045,-0.094 -0.069,-0.139 0.3939995,-0.319 ' +
        '2.0409995,-1.626 2.4149995,-2.017 0.469,-0.4870005 0.519,-1.1650005 0.162,-1.6040005 -0.414,-0.511 ' +
        '-0.973,-0.5 -1.48,-0.236 -1.4609995,0.764 -6.5999995,3.6430005 -7.7329995,4.2710005 -0.9,0.499 ' +
        '-1.516,1.253 -1.882,2.19 -0.37000002,0.95 -0.17,2.01 -0.166,2.979 0.004,0.718 -0.27300002,1.345 ' +
        '-0.055,2.063 0.629,2.087 2.425,3.312 4.859,3.318 4.6179995,0.014 9.2379995,-0.139 13.8569995,-0.158 ' +
        '0.755,-0.004 1.171,-0.301 1.182,-1.033 0.012,-0.754 -0.423,-0.969 -1.183,-0.973 -1.778,-0.01 ' +
        '-5.824,-0.004 -6.04,-0.004 10e-4,-0.084 0.003,-0.586 10e-4,-0.67 z'
    },
    'TASK_TYPE_INSTANTIATING_SEND': {
      d: 'm {mx},{my} l 0,8.4 l 12.6,0 l 0,-8.4 z l 6.3,3.6 l 6.3,-3.6'
    },
    'TASK_TYPE_SERVICE': {
      d: 'm {mx},{my} v -1.71335 c 0.352326,-0.0705 0.703932,-0.17838 1.047628,-0.32133 ' +
        '0.344416,-0.14465 0.665822,-0.32133 0.966377,-0.52145 l 1.19431,1.18005 1.567487,-1.57688 ' +
        '-1.195028,-1.18014 c 0.403376,-0.61394 0.683079,-1.29908 0.825447,-2.01824 l 1.622133,-0.01 ' +
        'v -2.2196 l -1.636514,0.01 c -0.07333,-0.35153 -0.178319,-0.70024 -0.323564,-1.04372 ' +
        '-0.145244,-0.34406 -0.321407,-0.6644 -0.522735,-0.96217 l 1.131035,-1.13631 -1.583305,-1.56293 ' +
        '-1.129598,1.13589 c -0.614052,-0.40108 -1.302883,-0.68093 -2.022633,-0.82247 l 0.0093,-1.61852 ' +
        'h -2.241173 l 0.0042,1.63124 c -0.353763,0.0736 -0.705369,0.17977 -1.049785,0.32371 -0.344415,0.14437 ' +
        '-0.665102,0.32092 -0.9635006,0.52046 l -1.1698628,-1.15823 -1.5667691,1.5792 1.1684265,1.15669 ' +
        'c -0.4026573,0.61283 -0.68308,1.29797 -0.8247287,2.01713 l -1.6588041,0.003 v 2.22174 ' +
        'l 1.6724648,-0.006 c 0.073327,0.35077 0.1797598,0.70243 0.3242851,1.04472 0.1452428,0.34448 ' +
        '0.3214064,0.6644 0.5227339,0.96066 l -1.1993431,1.19723 1.5840256,1.56011 1.1964668,-1.19348 ' +
        'c 0.6140517,0.40346 1.3028827,0.68232 2.0233517,0.82331 l 7.19e-4,1.69892 h 2.226848 z ' +
        'm 0.221462,-3.9957 c -1.788948,0.7502 -3.8576,-0.0928 -4.6097055,-1.87438 -0.7521065,-1.78321 ' +
        '0.090598,-3.84627 1.8802645,-4.59604 1.78823,-0.74936 3.856881,0.0929 4.608987,1.87437 ' +
        '0.752106,1.78165 -0.0906,3.84612 -1.879546,4.59605 z'
    },
    'TASK_TYPE_SERVICE_FILL': {
      d: 'm {mx},{my} c -1.788948,0.7502 -3.8576,-0.0928 -4.6097055,-1.87438 -0.7521065,-1.78321 ' +
        '0.090598,-3.84627 1.8802645,-4.59604 1.78823,-0.74936 3.856881,0.0929 4.608987,1.87437 ' +
        '0.752106,1.78165 -0.0906,3.84612 -1.879546,4.59605 z'
    },
    'TASK_TYPE_BUSINESS_RULE_HEADER': {
      d: 'm {mx},{my} 0,4 20,0 0,-4 z'
    },
    'TASK_TYPE_BUSINESS_RULE_MAIN': {
      d: 'm {mx},{my} 0,12 20,0 0,-12 z' +
        'm 0,8 l 20,0 ' +
        'm -13,-4 l 0,8'
    },
    'MESSAGE_FLOW_MARKER': {
      d: 'm {mx},{my} m -10.5 ,-7 l 0,14 l 21,0 l 0,-14 z l 10.5,6 l 10.5,-6'
    }
  };

  this.getRawPath = function getRawPath(pathId) {
    return this.pathMap[pathId].d;
  };

  /**
   * Scales the path to the given height and width.
   * <h1>Use case</h1>
   * <p>Use case is to scale the content of elements (event, gateways) based
   * on the element bounding box's size.
   * </p>
   * <h1>Why not transform</h1>
   * <p>Scaling a path with transform() will also scale the stroke and IE does not support
   * the option 'non-scaling-stroke' to prevent this.
   * Also there are use cases where only some parts of a path should be
   * scaled.</p>
   *
   * @param {String} pathId The ID of the path.
   * @param {Object} param <p>
   *   Example param object scales the path to 60% size of the container (data.width, data.height).
   *   <pre>
   *   {
   *     xScaleFactor: 0.6,
   *     yScaleFactor:0.6,
   *     containerWidth: data.width,
   *     containerHeight: data.height,
   *     position: {
   *       mx: 0.46,
   *       my: 0.2,
   *     }
   *   }
   *   </pre>
   *   <ul>
   *    <li>targetpathwidth = xScaleFactor * containerWidth</li>
   *    <li>targetpathheight = yScaleFactor * containerHeight</li>
   *    <li>Position is used to set the starting coordinate of the path. M is computed:
    *    <ul>
    *      <li>position.x * containerWidth</li>
    *      <li>position.y * containerHeight</li>
    *    </ul>
    *    Center of the container <pre> position: {
   *       mx: 0.5,
   *       my: 0.5,
   *     }</pre>
   *     Upper left corner of the container
   *     <pre> position: {
   *       mx: 0.0,
   *       my: 0.0,
   *     }</pre>
   *    </li>
   *   </ul>
   * </p>
   *
   */
  this.getScaledPath = function getScaledPath(pathId, param) {
    var rawPath = this.pathMap[pathId];

    // positioning
    // compute the start point of the path
    var mx, my;

    if(!!param.abspos) {
      mx = param.abspos.x;
      my = param.abspos.y;
    } else {
      mx = param.containerWidth * param.position.mx;
      my = param.containerHeight * param.position.my;
    }

    var coordinates = {}; //map for the scaled coordinates
    if(param.position) {

      // path
      var heightRatio = (param.containerHeight / rawPath.height) * param.yScaleFactor;
      var widthRatio = (param.containerWidth / rawPath.width) * param.xScaleFactor;


      //Apply height ratio
      for (var heightIndex = 0; heightIndex < rawPath.heightElements.length; heightIndex++) {
        coordinates['y' + heightIndex] = rawPath.heightElements[heightIndex] * heightRatio;
      }

      //Apply width ratio
      for (var widthIndex = 0; widthIndex < rawPath.widthElements.length; widthIndex++) {
        coordinates['x' + widthIndex] = rawPath.widthElements[widthIndex] * widthRatio;
      }
    }

    //Apply value to raw path
    var path = Snap.format(
      rawPath.d, {
        mx: mx,
        my: my,
        e: coordinates
      }
    );
    return path;
  };
}


PathMap.$inject = [ 'snap' ];

module.exports = PathMap;
},{}],10:[function(require,module,exports){
module.exports = {
  renderer: [ 'type', require('./BpmnRenderer') ],
  pathMap: [ 'type', require('./PathMap') ]
};
},{"./BpmnRenderer":8,"./PathMap":9}],11:[function(require,module,exports){
var _ = (window._);

function BpmnTraverser(handler) {

  var elementDiMap = {};
  var elementGfxMap = {};

  // list of containers already walked
  var handledProcesses = [];

  ///// Helpers /////////////////////////////////

  function contextual(fn, ctx) {
    return function(e) {
      fn(e, ctx);
    };
  }

  function is(element, type) {
    return element.$instanceOf(type);
  }

  function visit(element, di, ctx) {

    var gfx = elementGfxMap[element.id];

    // avoid multiple rendering of elements
    if (gfx) {
      return gfx;
    }

    // call handler
    gfx = handler.element(element, di, ctx);

    // and log returned result
    elementGfxMap[element.id] = gfx;

    return gfx;
  }

  function visitIfDi(element, ctx) {
    var di = getDi(element);

    if (di) {
      return visit(element, di, ctx);
    }
  }

  function logError(message, context) {
    handler.error(message, context);
  }

  ////// DI handling ////////////////////////////

  function buildDiMap(definitions) {
    _.forEach(definitions.diagrams, handleDiagram);
  }

  function registerDi(element) {
    var bpmnElement = element.bpmnElement;
    if (bpmnElement) {
      elementDiMap[bpmnElement.id] = element;
    } else {
      logError('no bpmnElement for <' + element.$type + '#' + element.id + '>', { element: element });
    }
  }

  function getDi(bpmnElement) {
    var id = bpmnElement.id;
    return id ? elementDiMap[id] : null;
  }

  function handleDiagram(diagram) {
    handlePlane(diagram.plane);
  }

  function handlePlane(plane) {
    registerDi(plane);

    _.forEach(plane.planeElement, handlePlaneElement);
  }

  function handlePlaneElement(planeElement) {
    registerDi(planeElement);
  }


  ////// Semantic handling //////////////////////

  function handleDefinitions(definitions, diagram) {
    // make sure we walk the correct bpmnElement

    var diagrams = definitions.diagrams;

    if (diagram && diagrams.indexOf(diagram) === -1) {
      throw new Error('diagram not part of bpmn:Definitions');
    }

    if (!diagram) {
      if (diagrams && diagrams.length) {
        diagram = diagrams[0];
      }
    }

    // no diagram -> nothing to import
    if (!diagram) {
      return;
    }

    // load DI from selected diagram only
    handleDiagram(diagram);

    var rootElement = diagram.plane.bpmnElement;

    if (!rootElement) {
      throw new Error('no rootElement referenced in BPMNPlane <' + diagram.plane.id + '>');
    }

    if (is(rootElement, 'bpmn:Process')) {
      handleProcess(rootElement);
    } else
    if (is(rootElement, 'bpmn:Collaboration')) {
      handleCollaboration(rootElement);

      // force drawing of everything not yet drawn that is part of the target DI
      handleUnhandledProcesses(definitions.rootElements);
    } else {
      throw new Error('unsupported root element for bpmndi:Diagram <' + rootElement.$type + '>');
    }
  }

  function handleUnhandledProcesses(rootElements) {

    // walk through all processes that have not yet been drawn and draw them
    // (in case they contain lanes with DI information)
    var processes = _.forEach(rootElements, function(e) {
      return e.$type === 'bpmn:Process' && e.laneSets && handledProcesses.indexOf(e) !== -1;
    });

    processes.forEach(contextual(handleProcess));
  }

  function handleDataAssociation(association, context) {
    visitIfDi(association, context);
  }

  function handleDataInput(dataInput, context) {
    visitIfDi(dataInput, context);
  }

  function handleDataOutput(dataOutput, context) {
    visitIfDi(dataOutput, context);
  }

  function handleArtifact(artifact, context) {

    // bpmn:TextAnnotation
    // bpmn:Group
    // bpmn:Association

    visitIfDi(artifact, context);
  }

  function handleArtifacts(artifacts, context) {
    _.forEach(artifacts, contextual(handleArtifact, context));
  }

  function handleIoSpecification(ioSpecification, context) {

    if (!ioSpecification) {
      return;
    }

    _.forEach(ioSpecification.dataInputs, contextual(handleDataInput, context));
    _.forEach(ioSpecification.dataOutputs, contextual(handleDataOutput, context));
  }

  function handleSubProcess(subProcess, context) {
    handleFlowElementsContainer(subProcess, context);
    handleArtifacts(subProcess.artifacts, context);
  }

  function handleFlowNode(flowNode, context) {
    var childCtx = visitIfDi(flowNode, context);

    if (is(flowNode, 'bpmn:SubProcess')) {
      handleSubProcess(flowNode, childCtx || context);
    }

    if (is(flowNode, 'bpmn:Activity')) {
      _.forEach(flowNode.dataInputAssociations, contextual(handleDataAssociation, null));
      _.forEach(flowNode.dataOutputAssociations, contextual(handleDataAssociation, null));

      handleIoSpecification(flowNode.ioSpecification, context);
    }
  }

  function handleSequenceFlow(sequenceFlow, context) {
    visitIfDi(sequenceFlow, context);
  }

  function handleDataElement(dataObject, context) {
    visitIfDi(dataObject, context);
  }

  function handleLane(lane, context) {
    var newContext = visitIfDi(lane, context);

    if (lane.childLaneSet) {
      handleLaneSet(lane.childLaneSet, newContext || context);
    } else {
      handleFlowElements(lane.flowNodeRef, newContext || context);
    }
  }

  function handleLaneSet(laneSet, context) {
    _.forEach(laneSet.lanes, contextual(handleLane, context));
  }

  function handleLaneSets(laneSets, context) {
    _.forEach(laneSets, contextual(handleLaneSet, context));
  }

  function handleFlowElementsContainer(container, context) {

    if (container.laneSets) {
      handleLaneSets(container.laneSets, context);
      handleNonFlowNodes(container.flowElements);
    } else {
      handleFlowElements(container.flowElements, context);
    }
  }

  function handleNonFlowNodes(flowElements, context) {
    var sequenceFlows = [];

    _.forEach(flowElements, function(e) {
      if (is(e, 'bpmn:SequenceFlow')) {
        sequenceFlows.push(e);
      } else
      if (is(e, 'bpmn:DataObject')) {
        // SKIP (assume correct referencing via DataObjectReference)
      } else
      if (is(e, 'bpmn:DataStoreReference')) {
        handleDataElement(e, context);
      } else
      if (is(e, 'bpmn:DataObjectReference')) {
        handleDataElement(e, context);
      }
    });

    // handle SequenceFlows
    _.forEach(sequenceFlows, contextual(handleSequenceFlow, context));
  }

  function handleFlowElements(flowElements, context) {
    var sequenceFlows = [];

    _.forEach(flowElements, function(e) {
      if (is(e, 'bpmn:SequenceFlow')) {
        sequenceFlows.push(e);
      } else
      if (is(e, 'bpmn:FlowNode')) {
        handleFlowNode(e, context);
      } else
      if (is(e, 'bpmn:DataObject')) {
        // SKIP (assume correct referencing via DataObjectReference)
      } else
      if (is(e, 'bpmn:DataStoreReference')) {
        handleDataElement(e, context);
      } else
      if (is(e, 'bpmn:DataObjectReference')) {
        handleDataElement(e, context);
      } else {
        throw new Error('unrecognized element <' + e.$type + '> in context ' + (context ? context.id : null));
      }
    });

    // handle SequenceFlows
    _.forEach(sequenceFlows, contextual(handleSequenceFlow, context));
  }

  function handleParticipant(participant, context) {
    var newCtx = visitIfDi(participant, context);

    var process = participant.processRef;
    if (process) {
      handleProcess(process, newCtx || context);
    }
  }

  function handleProcess(process, context) {
    handleFlowElementsContainer(process, context);
    handleIoSpecification(process.ioSpecification, context);

    handleArtifacts(process.artifacts, context);

    // log process handled
    handledProcesses.push(process);
  }

  function handleMessageFlow(messageFlow, context) {
    visitIfDi(messageFlow, context);
  }

  function handleMessageFlows(messageFlows, context) {
    if (messageFlows) {
      _.forEach(messageFlows, contextual(handleMessageFlow, context));
    }
  }

  function handleCollaboration(collaboration) {

    _.forEach(collaboration.participants, contextual(handleParticipant));

    handleArtifacts(collaboration.artifacts);

    handleMessageFlows(collaboration.messageFlows);
  }


  ///// API ////////////////////////////////

  return {
    handleDefinitions: handleDefinitions
  };
}

module.exports = BpmnTraverser;
},{}],12:[function(require,module,exports){
'use strict';

var _ = (window._);

var BpmnTreeWalker = require('./BpmnTreeWalker'),
    Util = require('../Util');


function hasLabel(element) {

  return element.$instanceOf('bpmn:Event') ||
         element.$instanceOf('bpmn:Gateway') ||
         element.$instanceOf('bpmn:DataStoreReference') ||
         element.$instanceOf('bpmn:DataObjectReference') ||
         element.$instanceOf('bpmn:SequenceFlow') ||
         element.$instanceOf('bpmn:MessageFlow');
}


function isCollapsed(element, di) {
  return element.$instanceOf('bpmn:SubProcess') && di && !di.isExpanded;
}

function getWaypointsMid(waypoints) {

  var mid = waypoints.length / 2 - 1;

  var first = waypoints[Math.floor(mid)];
  var second = waypoints[Math.ceil(mid + 0.01)];

  return {
    x: first.x + (second.x - first.x) / 2,
    y: first.y + (second.y - first.y) / 2
  };
}


/**
 * Returns the bounds of an elements label, parsed from the elements DI or
 * generated from its bounds.
 */
function getLabelBounds(di, data) {

  var mid,
      size;

  var label = di.label;
  if (label && label.bounds) {
    var bounds = label.bounds;

    size = {
      width: Math.max(150, bounds.width),
      height: bounds.height
    };

    mid = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y
    };
  } else {

    if (data.waypoints) {
      mid = getWaypointsMid(data.waypoints);
    } else {
      mid = {
        x: data.x + data.width / 2,
        y: data.y + data.height - 5
      };
    }

    size = {
      width: 90,
      height: 50
    };
  }

  return _.extend({
    x: mid.x - size.width / 2,
    y: mid.y
  }, size);
}


function importBpmnDiagram(diagram, definitions, done) {

  var canvas = diagram.get('canvas');
  var events = diagram.get('eventBus');
  var commandStack = diagram.get('commandStack');


  function addLabel(element, di, data) {
    if (!hasLabel(element)) {
      return;
    }

    var labelBounds = getLabelBounds(di, data);

    var label = _.extend({
      id: element.id + '_label',
      attachedId: element.id,
      type: 'label',
      hidden: data.hidden
    }, labelBounds);

    canvas.addShape(label);

    // we wire data and label so that
    // the label of a BPMN element can be quickly accessed via
    // element.label in various components
    data.label = label;
  }


  var visitor = {

    element: function(element, di, parent) {

      var shape;

      function fire(type, shape) {
        events.fire('bpmn.element.' + type, {
          semantic: element, di: di, diagramElement: shape
        });
      }

      if (di.$type === 'bpmndi:BPMNShape') {
        var bounds = di.bounds;

        var collapsed = isCollapsed(element, di);
        var hidden = parent && (parent.hidden || parent.collapsed);

        shape = {
          id: element.id, type: element.$type,
          x: bounds.x, y: bounds.y,
          width: bounds.width, height: bounds.height,
          collapsed: collapsed,
          hidden: hidden,
          parent: parent
        };

        fire('add', shape);
        canvas.addShape(shape);
      } else {

        var waypoints = _.collect(di.waypoint, function(p) {
          return { x: p.x, y: p.y };
        });

        shape = { id: element.id, type: element.$type, waypoints: waypoints };

        fire('add', shape);
        canvas.addConnection(shape);
      }

      fire('added', shape);

      // add label if needed
      addLabel(element, di, shape);

      return shape;
    },

    error: function(message, context) {
      console.warn('[import]', message, context);
    }
  };

  var walker = new BpmnTreeWalker(visitor);
  walker.handleDefinitions(definitions);

  commandStack.clear();

  done();
}

module.exports.importBpmnDiagram = Util.failSafeAsync(importBpmnDiagram);
},{"../Util":3,"./BpmnTreeWalker":11}],13:[function(require,module,exports){
'use strict';

function isExpandedPool(semantic) {
  return !!semantic.processRef;
}

function isExpanded(semantic, di) {
  return di.isExpanded;
}

module.exports.isExpandedPool = isExpandedPool;
module.exports.isExpanded = isExpanded;
},{}],"UqDJNG":[function(require,module,exports){
module.exports = require('./lib/model/Simple');
},{"./lib/model/Simple":17}],"bpmn-moddle":[function(require,module,exports){
module.exports=require('UqDJNG');
},{}],16:[function(require,module,exports){
var _ = (window._);

var Moddle = require('moddle'),
    xml = require('moddle-xml');


function createModel(packages) {
  return new Moddle(packages);
}

/**
 * @class Bpmn
 *
 * A wrapper around {@link Moddle} with support for import and export of BPMN 2.0 xml files.
 *
 * @param {Object|Array} packages to use for instantiating the model
 */
function Bpmn(packages) {

  var model = createModel(packages);

  /**
   * Instantiates a BPMN model tree from a given xml string.
   *
   * @method Bpmn#fromXML
   *
   * @param  {String}   xmlStr
   * @param  {String}   [typeName] name of the root element, defaults to 'bpmn:Definitions'
   * @param  {Object}   [options] options to pass to the underlying reader
   * @param  {Function} callback callback that is invoked with (err, result, parseContext) once the import completes
   */
  function fromXML(xmlStr, typeName, options, callback) {

    if (!_.isString(typeName)) {
      callback = options;
      options = typeName;
      typeName = 'bpmn:Definitions';
    }

    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    var reader = new xml.Reader(model, options);
    var rootHandler = reader.handler(typeName);

    reader.fromXML(xmlStr, rootHandler, function(err, result) {
      callback(err, result, rootHandler.context);
    });
  }

  /**
   * Serializes a BPMN 2.0 object tree to XML.
   *
   * @method Bpmn#toXML
   *
   * @param  {String}   element the root element, typically an instance of `bpmn:Definitions`
   * @param  {Object}   [options] to pass to the underlying writer
   * @param  {Function} callback invoked with (err, xmlStr) once the import completes
   */
  function toXML(element, options, callback) {

    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    var writer = new xml.Writer(options);
    try {
      var result = writer.toXML(element);
      callback(null, result);
    } catch (e) {
      callback(e);
    }
  }

  /**
   * Returns the underlying moddle instance.
   *
   * @method  Bpmn#instance
   *
   * @return {Moddle}
   */
  function instance() {
    return model;
  }


  // API
  this.instance = instance;

  this.fromXML = fromXML;
  this.toXML = toXML;
}


module.exports = Bpmn;
},{"moddle":27,"moddle-xml":18}],17:[function(require,module,exports){
var BpmnModdle = require('../Bpmn');

var packages = {
  bpmn: require('../../resources/bpmn/json/bpmn.json'),
  bpmndi: require('../../resources/bpmn/json/bpmndi.json'),
  dc: require('../../resources/bpmn/json/dc.json'),
  di: require('../../resources/bpmn/json/di.json')
};

module.exports = new BpmnModdle(packages);
},{"../../resources/bpmn/json/bpmn.json":31,"../../resources/bpmn/json/bpmndi.json":32,"../../resources/bpmn/json/dc.json":33,"../../resources/bpmn/json/di.json":34,"../Bpmn":16}],18:[function(require,module,exports){
'use strict';

var Reader = require('./lib/Reader'),
    Writer = require('./lib/Writer');

module.exports.Reader = Reader;
module.exports.Writer = Writer;
},{"./lib/Reader":19,"./lib/Writer":20}],19:[function(require,module,exports){
'use strict';

var sax = (window.sax),
    _ = (window._);

var common = require('./common'),
    util = require('moddle/lib/util'),
    Stack = require('tiny-stack'),

    logger = util.logger,

    parseNameNs = util.parseNameNs,
    coerceType = util.coerceType,
    isSimpleType = util.isSimpleType,
    aliasToName = common.aliasToName;


function parseNodeAttributes(node) {
  var nodeAttrs = node.attributes;

  return _.reduce(nodeAttrs, function(result, v, k) {
    var name, ns;

    if (!v.local) {
      name = v.prefix;
    } else {
      ns = parseNameNs(v.name, v.prefix);
      name = ns.name;
    }

    result[name] = v.value;
    return result;
  }, {});
}

/**
 * Normalizes namespaces for a node given an optional default namespace and a
 * number of mappings from uris to default prefixes.
 *
 * @param  {XmlNode} node
 * @param  {Model} model the model containing all registered namespaces
 * @param  {Uri} defaultNsUri
 */
function normalizeNamespaces(node, model, defaultNsUri) {
  var uri, childUri, prefix;

  uri = node.uri || defaultNsUri;

  if (uri) {
    var pkg = model.getPackage(uri);

    if (pkg) {
      prefix = pkg.prefix;
    } else {
      prefix = node.prefix;
    }

    node.prefix = prefix;
    node.uri = uri;
  }

  _.forEach(node.attributes, function(attr) {
    normalizeNamespaces(attr, model, null);
  });
}

/**
 * A parse context.
 *
 * @class
 *
 * @param {ElementHandler} parseRoot the root handler for parsing a document
 */
function Context(parseRoot) {

  var elementsById = {};
  var references = [];

  var warnings = [];

  this.addReference = function(reference) {
    references.push(reference);
  };

  this.addElement = function(id, element) {

    if (!id || !element) {
      throw new Error('[xml-reader] id or ctx must not be null');
    }

    elementsById[id] = element;
  };

  this.addWarning = function (w) {
    logger.debug('[warning]', w.message, w);
    warnings.push(w);
  };

  this.warnings = warnings;
  this.references = references;

  this.elementsById = elementsById;

  this.parseRoot = parseRoot;
}


function BaseHandler() {}

BaseHandler.prototype.handleEnd = function() {};
BaseHandler.prototype.handleText = function() {};
BaseHandler.prototype.handleNode = function() {};
BaseHandler.prototype.getElement = function() {
  return this.element;
};

function BodyHandler() {}

BodyHandler.prototype = new BaseHandler();

BodyHandler.prototype.handleText = function(text) {
  this.body = (this.body || '') + text;
};

function ReferenceHandler(property, context) {
  this.property = property;
  this.context = context;
}

ReferenceHandler.prototype = new BodyHandler();

ReferenceHandler.prototype.handleNode = function(node) {

  if (this.element) {
    throw new Error('expected no sub nodes');
  } else {
    this.element = this.createReference(node);
  }

  return this;
};

ReferenceHandler.prototype.handleEnd = function() {
  this.element.id = this.body;
};

ReferenceHandler.prototype.createReference = function() {
  return {
    property: this.property.ns.name,
    id: ''
  };
};

function ValueHandler(propertyDesc, element) {
  this.element = element;
  this.propertyDesc = propertyDesc;
}

ValueHandler.prototype = new BodyHandler();

ValueHandler.prototype.handleEnd = function() {

  var value = this.body,
      element = this.element,
      propertyDesc = this.propertyDesc;

  value = coerceType(propertyDesc.type, value);

  if (propertyDesc.isMany) {
    element.get(propertyDesc.name).push(value);
  } else {
    element.set(propertyDesc.name, value);
  }
};


function BaseElementHandler(model, type, context) {

}

BaseElementHandler.prototype = Object.create(BodyHandler.prototype);

BaseElementHandler.prototype.handleNode = function(node) {
  var parser = this;

  if (!this.element) {
    this.element = this.createElement(node);
    var id = this.element.id;

    if (id) {
      this.context.addElement(id, this.element);
    }
  } else {
    parser = this.handleChild(node);
  }

  return parser;
};

/**
 * @class XMLReader.ElementHandler
 *
 */
function ElementHandler(model, type, context) {
  this.model = model;
  this.type = model.getType(type);
  this.context = context;
}

ElementHandler.prototype = new BaseElementHandler();

ElementHandler.prototype.addReference = function(reference) {
  this.context.addReference(reference);
};

ElementHandler.prototype.handleEnd = function() {

  var value = this.body,
      element = this.element,
      descriptor = element.$descriptor,
      bodyProperty = descriptor.bodyProperty;

  if (bodyProperty && value !== undefined) {
    value = coerceType(bodyProperty.type, value);
    element.set(bodyProperty.name, value);
  }
};

/**
 * Create an instance of the model from the given node.
 *
 * @param  {Element} node the xml node
 */
ElementHandler.prototype.createElement = function(node) {
  var attributes = parseNodeAttributes(node),
      Type = this.type,
      descriptor = Type.$descriptor,
      context = this.context,
      instance = new Type({});

  _.forEach(attributes, function(value, name) {

    var prop = descriptor.propertiesByName[name];

    if (prop && prop.isReference) {
      context.addReference({
        element: instance,
        property: prop.ns.name,
        id: value
      });
    } else {
      if (prop) {
        value = coerceType(prop.type, value);
      }

      instance.set(name, value);
    }
  });

  return instance;
};

ElementHandler.prototype.getPropertyForElement = function(nameNs) {
  if (_.isString(nameNs)) {
    nameNs = parseNameNs(nameNs);
  }

  var type = this.type,
      model = this.model,
      descriptor = type.$descriptor;

  var propertyName = nameNs.name;

  var property = descriptor.propertiesByName[propertyName];

  // search for properties by name first
  if (property) {
    return property;
  }

  var pkg = model.getPackage(nameNs.prefix);

  if (pkg) {
    var typeName = nameNs.prefix + ':' + aliasToName(nameNs.localName, descriptor.$pkg),
        elementType = model.getType(typeName);

    // search for collection members later
    property = _.find(descriptor.properties, function(p) {
      return !p.isVirtual && !p.isReference && !p.isAttribute && elementType.isA(p.type);
    });

    if (property) {
      return _.extend({}, property, { effectiveType: elementType.$descriptor.name });
    }
  } else {
    // parse unknown element (maybe extension)
    property = _.find(descriptor.properties, function(p) {
      return !p.isReference && !p.isAttribute && p.type === 'Element';
    });

    if (property) {
      return property;
    }
  }

  throw new Error('unrecognized element <' + nameNs.name + '>');
};

ElementHandler.prototype.toString = function() {
  return 'ElementDescriptor[' + this.type.$descriptor.name + ']';
};

ElementHandler.prototype.valueHandler = function(propertyDesc, element) {
  return new ValueHandler(propertyDesc, element);
};

ElementHandler.prototype.referenceHandler = function(propertyDesc) {
  return new ReferenceHandler(propertyDesc, this.context);
};

ElementHandler.prototype.handler = function(type) {
  if (type === 'Element') {
    return new GenericElementHandler(this.model, type, this.context);
  } else {
    return new ElementHandler(this.model, type, this.context);
  }
};

/**
 * Handle the child element parsing
 *
 * @param  {Element} node the xml node
 */
ElementHandler.prototype.handleChild = function(node) {
  var nameNs = parseNameNs(node.local, node.prefix);

  var propertyDesc, type, childHandler;

  propertyDesc = this.getPropertyForElement(nameNs);

  type = propertyDesc.effectiveType || propertyDesc.type;

  if (isSimpleType(propertyDesc.type)) {
    return this.valueHandler(propertyDesc, this.element);
  }

  if (propertyDesc.isReference) {
    childHandler = this.referenceHandler(propertyDesc).handleNode(node);
  } else {
    childHandler = this.handler(type).handleNode(node);
  }

  var newElement = childHandler.getElement();

  // child handles may decide to skip elements
  // by not returning anythign
  if (newElement !== undefined) {

    if (propertyDesc.isMany) {
      this.element.get(propertyDesc.name).push(newElement);
    } else {
      this.element.set(propertyDesc.name, newElement);
    }

    if (propertyDesc.isReference) {
      _.extend(newElement, {
        element: this.element
      });

      this.context.addReference(newElement);
    }
  }

  return childHandler;
};


function GenericElementHandler(model, type, context) {
  this.model = model;
  this.context = context;
}

GenericElementHandler.prototype = new BaseElementHandler();

GenericElementHandler.prototype.createElement = function(node) {

  var name = node.name,
      prefix = node.prefix,
      uri = node.ns[prefix],
      attributes = node.attributes;

  return this.model.createAny(name, uri, attributes);
};

GenericElementHandler.prototype.handleChild = function(node) {

  var handler = new GenericElementHandler(this.model, 'Element', this.context).handleNode(node);

  var child = handler.getElement();

  if (child !== undefined) {

    var children = this.element.$children;
    if (!children) {
      children = this.element.$children = [];
    }

    children.push(child);
  }

  return handler;
};

GenericElementHandler.prototype.handleText = function(text) {
  this.body = this.body || '' + text;
};

GenericElementHandler.prototype.handleEnd = function() {
  if (this.body) {
    this.element.$body = this.body;
  }
};

/**
 * A reader for a meta-model
 *
 * @class XMLReader
 *
 * @param {Model} model used to read xml files
 */
function XMLReader(model) {

  function resolveReferences(context) {

    var elementsById = context.elementsById;
    var references = context.references;

    _.forEach(references, function(r) {
      var element = r.element;
      var reference = elementsById[r.id];
      var property = element.$descriptor.propertiesByName[r.property];

      if (!reference) {
        context.addWarning({
          message: 'unresolved reference <' + r.id + '>',
          element: r.element,
          property: r.property,
          value: r.id
        });
      }

      if (property.isMany) {
        var collection = element.get(property.name),
            idx = collection.indexOf(r);

        if (!reference) {
          // remove unresolvable reference
          collection.splice(idx, 1);
        } else {
          // update reference
          collection[idx] = reference;
        }
      } else {
        element.set(property.name, reference);
      }
    });
  }

  function fromXML(xml, rootHandler, done) {

    var context = new Context(rootHandler);

    var parser = sax.parser(true, { xmlns: true, trim: true }),
        stack = new Stack();

    rootHandler.context = context;

    // push root handler
    stack.push(rootHandler);

    // error handling
    parser.onerror = function (e) {
      // just throw
      throw e;
    };

    parser.onopentag = function(node) {
      var handler = stack.peek();

      normalizeNamespaces(node, model);

      try {
        stack.push(handler.handleNode(node));
      } catch (e) {

        var line = this.line,
            column = this.column;

        throw new Error(
          'unparsable content <' + node.name + '> detected\n\t' +
            'line: ' + line + '\n\t' +
            'column: ' + column + '\n\t' +
            'nested error: ' + e.message);
      }
    };

    parser.ontext = parser.oncdata = function(text) {
      var handler = stack.peek();
      handler.handleText(text);
    };

    parser.onclosetag = function(tagName) {
      var old = stack.pop();
      old.handleEnd();
    };

    parser.onend = function () {
      resolveReferences(context);
      done(null, rootHandler.getElement(), context);
    };

    try {
      parser.write(xml).close();
    } catch (e) {
      // handle errors
      done(e, undefined, context);
    }
  }

  return {
    fromXML: fromXML,

    handler: function(name) {
      return new ElementHandler(model, name);
    }
  };
}

module.exports = XMLReader;
module.exports.ElementHandler = ElementHandler;
},{"./common":21,"moddle/lib/util":25,"tiny-stack":26}],20:[function(require,module,exports){
'use strict';

var _ = (window._);

var util = require('moddle').util,
    common = require('./common'),

    parseNameNs = util.parseNameNs,
    isSimpleType = util.isSimpleType,
    nameToAlias = common.nameToAlias;

var XML_PREAMBLE = '<?xml version="1.0" encoding="UTF-8"?>\n';

var CDATA_ESCAPE = /[<>"&]+/;

var DEFAULT_NS_MAP = common.DEFAULT_NS_MAP;


function nsName(ns) {
  if (_.isString(ns)) {
    return ns;
  } else {
    return (ns.prefix ? ns.prefix + ':' : '') + ns.localName;
  }
}

function getElementNs(ns, descriptor) {
  if (descriptor.isGeneric) {
    return descriptor.name;
  } else {
    return _.extend({ localName: nameToAlias(descriptor.ns.localName, descriptor.$pkg) }, ns);
  }
}

function getPropertyNs(ns, descriptor) {
  return _.extend({ localName: descriptor.ns.localName }, ns);
}

function getSerializableProperties(element) {
  var descriptor = element.$descriptor;

  return _.filter(descriptor.properties, function(p) {
    var name = p.name;

    // do not serialize defaults
    if (!element.hasOwnProperty(name)) {
      return false;
    }

    var value = element[name];

    // do not serialize default equals
    if (value === p.default) {
      return false;
    }

    return p.isMany ? value.length : true;
  });
}

/**
 * Escape a string attribute to not contain any bad values (line breaks, '"', ...)
 *
 * @param {String} str the string to escape
 * @return {String} the escaped string
 */
function escapeAttr(str) {
  var escapeMap = {
    '\n': '&#10;',
    '\n\r': '&#10;',
    '"': '&quot;'
  };

  // ensure we are handling strings here
  str = _.isString(str) ? str : '' + str;

  return str.replace(/(\n|\n\r|")/g, function(str) {
    return escapeMap[str];
  });
}

function filterAttributes(props) {
  return _.filter(props, function(p) { return p.isAttr; });
}

function filterContained(props) {
  return _.filter(props, function(p) { return !p.isAttr; });
}


function ReferenceSerializer(parent, ns) {
  this.ns = ns;
}

ReferenceSerializer.prototype.build = function(element) {
  this.element = element;
  return this;
};

ReferenceSerializer.prototype.serializeTo = function(writer) {
  writer
    .appendIndent()
    .append('<' + nsName(this.ns) + '>' + this.element.id + '</' + nsName(this.ns) + '>')
    .appendNewLine();
};

function BodySerializer() {}

BodySerializer.prototype.serializeValue = BodySerializer.prototype.serializeTo = function(writer) {
  var value = this.value,
      escape = this.escape;

  if (escape) {
    writer.append('<![CDATA[');
  }

  writer.append(this.value);

  if (escape) {
    writer.append(']]>');
  }
};

BodySerializer.prototype.build = function(prop, value) {
  this.value = value;

  if (prop.type === 'String' && CDATA_ESCAPE.test(value)) {
    this.escape = true;
  }

  return this;
};

function ValueSerializer(ns) {
  this.ns = ns;
}

ValueSerializer.prototype = new BodySerializer();

ValueSerializer.prototype.serializeTo = function(writer) {

  writer
    .appendIndent()
    .append('<' + nsName(this.ns) + '>');

  this.serializeValue(writer);

  writer
    .append( '</' + nsName(this.ns) + '>')
    .appendNewLine();
};

function ElementSerializer(parent, ns) {
  this.body = [];
  this.attrs = [];

  this.parent = parent;
  this.ns = ns;
}

ElementSerializer.prototype.build = function(element) {
  this.element = element;

  var otherAttrs = this.parseNsAttributes(element);

  if (!this.ns) {
    this.ns = this.nsTagName(element.$descriptor);
  }

  if (element.$descriptor.isGeneric) {
    this.parseGeneric(element);
  } else {
    var properties = getSerializableProperties(element);

    this.parseAttributes(filterAttributes(properties));
    this.parseContainments(filterContained(properties));

    this.parseGenericAttributes(element, otherAttrs);
  }

  return this;
};

ElementSerializer.prototype.nsTagName = function(descriptor) {
  var effectiveNs = this.logNamespaceUsed(descriptor.ns);
  return getElementNs(effectiveNs, descriptor);
};

ElementSerializer.prototype.nsPropertyTagName = function(descriptor) {
  var effectiveNs = this.logNamespaceUsed(descriptor.ns);
  return getPropertyNs(effectiveNs, descriptor);
};

ElementSerializer.prototype.isLocalNs = function(ns) {
  return ns.uri === this.ns.uri;
};

ElementSerializer.prototype.nsAttributeName = function(element) {

  var ns;

  if (_.isString(element)) {
    ns = parseNameNs(element);
  } else
  if (element.ns) {
    ns = element.ns;
  }

  var effectiveNs = this.logNamespaceUsed(ns);

  // strip prefix if same namespace like parent
  if (this.isLocalNs(effectiveNs)) {
    return { localName: ns.localName };
  } else {
    return _.extend({ localName: ns.localName }, effectiveNs);
  }
};

ElementSerializer.prototype.parseGeneric = function(element) {

  var self = this,
      body = this.body,
      attrs = this.attrs;

  _.forEach(element, function(val, key) {

    if (key === '$body') {
      body.push(new BodySerializer().build({ type: 'String' }, val));
    } else
    if (key === '$children') {
      _.forEach(val, function(child) {
        body.push(new ElementSerializer(self).build(child));
      });
    } else
    if (key.indexOf('$') !== 0) {
      attrs.push({ name: key, value: escapeAttr(val) });
    }
  });
};

/**
 * Parse namespaces and return a list of left over generic attributes
 *
 * @param  {Object} element
 * @return {Array<Object>}
 */
ElementSerializer.prototype.parseNsAttributes = function(element) {
  var self = this;

  var genericAttrs = element.$attrs;

  var attributes = [];

  // parse namespace attributes first
  // and log them. push non namespace attributes to a list
  // and process them later
  _.forEach(genericAttrs, function(value, name) {
    var nameNs = parseNameNs(name);

    if (nameNs.prefix === 'xmlns') {
      self.logNamespace({ prefix: nameNs.localName, uri: value });
    } else
    if (!nameNs.prefix && nameNs.localName === 'xmlns') {
      self.logNamespace({ uri: value });
    } else {
      attributes.push({ name: name, value: value });
    }
  });

  return attributes;
};

ElementSerializer.prototype.parseGenericAttributes = function(element, attributes) {

  var self = this;

  _.forEach(attributes, function(attr) {
    try {
      self.addAttribute(self.nsAttributeName(attr.name), attr.value);
    } catch (e) {
      console.warn('[writer] missing namespace information for ', attr.name, '=', attr.value, 'on', element, e);
    }
  });
};

ElementSerializer.prototype.parseContainments = function(properties) {

  var self = this,
      body = this.body,
      element = this.element,
      typeDesc = element.$descriptor;

  _.forEach(properties, function(p) {
    var value = element.get(p.name),
        isReference = p.isReference,
        isMany = p.isMany;

    var ns = self.nsPropertyTagName(p);

    if (!isMany) {
      value = [ value ];
    }

    if (p.isBody) {
      body.push(new BodySerializer().build(p, value[0]));
    } else
    if (isSimpleType(p.type)) {
      _.forEach(value, function(v) {
        body.push(new ValueSerializer(ns).build(p, v));
      });
    } else
    if (isReference) {
      _.forEach(value, function(v) {
        body.push(new ReferenceSerializer(self, ns).build(v));
      });
    } else {
      // allow serialization via type
      // rather than element name
      var asType = p.serialize === 'xsi:type';

      _.forEach(value, function(v) {
        var serializer;

        if (asType) {
          serializer = new TypeSerializer(self, ns);
        } else {
          serializer = new ElementSerializer(self);
        }

        body.push(serializer.build(v));
      });
    }
  });
};

ElementSerializer.prototype.getNamespaces = function() {
  if (!this.parent) {
    if (!this.namespaces) {
      this.namespaces = {
        prefixMap: {},
        uriMap: {},
        used: {}
      };
    }
  } else {
    this.namespaces = this.parent.getNamespaces();
  }

  return this.namespaces;
};

ElementSerializer.prototype.logNamespace = function(ns) {
  var namespaces = this.getNamespaces();

  var existing = namespaces.uriMap[ns.uri];

  if (!existing) {
    namespaces.uriMap[ns.uri] = ns;
  }

  namespaces.prefixMap[ns.prefix] = ns.uri;

  return ns;
};

ElementSerializer.prototype.logNamespaceUsed = function(ns) {
  var element = this.element,
      model = element.$model,
      namespaces = this.getNamespaces();

  // ns may be
  //
  //   * prefix only
  //   * prefix:uri

  var prefix = ns.prefix;
  var uri = ns.uri || DEFAULT_NS_MAP[prefix] ||
            namespaces.prefixMap[prefix] || (model ? (model.getPackage(prefix) || {}).uri : null);

  if (!uri) {
    throw new Error('no namespace uri given for prefix <' + ns.prefix + '>');
  }

  ns = namespaces.uriMap[uri];

  if (!ns) {
    ns = this.logNamespace({ prefix: prefix, uri: uri });
  }

  if (!namespaces.used[ns.uri]) {
    namespaces.used[ns.uri] = ns;
  }

  return ns;
};

ElementSerializer.prototype.parseAttributes = function(properties) {
  var self = this,
      element = this.element;

  _.forEach(properties, function(p) {
    self.logNamespaceUsed(p.ns);

    var value = element.get(p.name);

    if (p.isReference) {
      value = value.id;
    }

    self.addAttribute(self.nsAttributeName(p), value);
  });
};

ElementSerializer.prototype.addAttribute = function(name, value) {
  var attrs = this.attrs;

  if (_.isString(value)) {
    value = escapeAttr(value);
  }

  attrs.push({ name: name, value: value });
};

ElementSerializer.prototype.serializeAttributes = function(writer) {
  var element = this.element,
      attrs = this.attrs,
      root = !this.parent,
      namespaces = this.namespaces;

  function collectNsAttrs() {
    return _.collect(namespaces.used, function(ns) {
      var name = 'xmlns' + (ns.prefix ? ':' + ns.prefix : '');
      return { name: name, value: ns.uri };
    });
  }

  if (root) {
    attrs = collectNsAttrs().concat(attrs);
  }

  _.forEach(attrs, function(a) {
    writer
      .append(' ')
      .append(nsName(a.name)).append('="').append(a.value).append('"');
  });
};

ElementSerializer.prototype.serializeTo = function(writer) {
  var hasBody = this.body.length;

  writer
    .appendIndent()
    .append('<' + nsName(this.ns));

  this.serializeAttributes(writer);

  writer
    .append(hasBody ? '>' : ' />')
    .appendNewLine();

  writer.indent();

  _.forEach(this.body, function(b) {
    b.serializeTo(writer);
  });

  writer.unindent();

  if (hasBody) {
    writer
      .appendIndent()
      .append('</' + nsName(this.ns) + '>')
      .appendNewLine();
  }
};

/**
 * A serializer for types that handles serialization of data types
 */
function TypeSerializer(parent, ns) {
  ElementSerializer.call(this, parent, ns);
}

TypeSerializer.prototype = new ElementSerializer();

TypeSerializer.prototype.build = function(element) {
  this.element = element;
  this.typeNs = this.nsTagName(element.$descriptor);

  return ElementSerializer.prototype.build.call(this, element);
};

TypeSerializer.prototype.isLocalNs = function(ns) {
  return ns.uri === this.typeNs.uri;
};

function SavingWriter() {
  this.value = '';

  this.write = function(str) {
    this.value += str;
  };
}

function FormatingWriter(out, format) {

  var indent = [''];

  this.append = function(str) {
    out.write(str);

    return this;
  };

  this.appendNewLine = function() {
    if (format) {
      out.write('\n');
    }

    return this;
  };

  this.appendIndent = function() {
    if (format) {
      out.write(indent.join('  '));
    }

    return this;
  };

  this.indent = function() {
    indent.push('');
    return this;
  };

  this.unindent = function() {
    indent.pop();
    return this;
  };
}

/**
 * A writer for meta-model backed document trees
 *
 * @class XMLWriter
 */
function XMLWriter(options) {

  options = _.extend({ format: false, preamble: true }, options || {});

  function toXML(tree, writer) {
    var internalWriter = writer || new SavingWriter();
    var formatingWriter = new FormatingWriter(internalWriter, options.format);

    if (options.preamble) {
      formatingWriter.append(XML_PREAMBLE);
    }

    new ElementSerializer().build(tree).serializeTo(formatingWriter);

    if (!writer) {
      return internalWriter.value;
    }
  }

  return {
    toXML: toXML
  };
}

module.exports = XMLWriter;
},{"./common":21,"moddle":22}],21:[function(require,module,exports){
'use strict';


function hasLowerCaseAlias(pkg) {
  return pkg.xml && pkg.xml.alias === 'lowerCase';
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function aliasToName(alias, pkg) {
  if (hasLowerCaseAlias(pkg)) {
    return capitalize(alias);
  } else {
    return alias;
  }
}


function lower(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

function nameToAlias(name, pkg) {
  if (hasLowerCaseAlias(pkg)) {
    return lower(name);
  } else {
    return name;
  }
}


module.exports.aliasToName = aliasToName;
module.exports.nameToAlias = nameToAlias;


var DEFAULT_NS_MAP = {
  'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
};


module.exports.DEFAULT_NS_MAP = DEFAULT_NS_MAP;
},{}],22:[function(require,module,exports){
'use strict';

module.exports = require('./lib/Model');

module.exports.util = require('./lib/util');
},{"./lib/Model":23,"./lib/util":25}],23:[function(require,module,exports){
'use strict';

var _ = (window._);

var util = require('./util'),
    logger = util.logger,
    isBuiltInType = util.isBuiltInType,
    parseNameNs = util.parseNameNs;

var DESCRIPTOR = '$descriptor',
    MODEL = '$model',
    PACKAGE = '$pkg';

function $descriptor(type) {
  return type[DESCRIPTOR];
}

function $model(type) {
  return type[MODEL];
}

function $pkg(type) {
  return type[PACKAGE];
}

function $define(element, name, value) {
  Object.defineProperty(element, name, {
    value: value
  });
}

function $defineDescriptor(element, descriptor) {
  $define(element, DESCRIPTOR, descriptor);
}

function $defineModel(element, model) {
  $define(element, MODEL, model);
}

function $definePackage(element, pkg) {
  $define(element, PACKAGE, pkg);
}

function isA(name) {
  /* jshint -W040 */
  return !!_.find($descriptor(this).allTypes, function(t) {
    return t.name === name;
  });
}

//// BaseType implementation /////////////////////////////////////////////////

function BaseType(descriptor, model) {
  $defineDescriptor(this, descriptor);
  $defineModel(this, model);
}

BaseType.prototype.$propertyDescriptor = function(name) {
  return $descriptor(this).propertiesByName[name];
};

BaseType.prototype.$instanceOf = isA;

BaseType.prototype.get = function(name) {

  var property = this.$propertyDescriptor(name),
      propertyName;

  if (!property) {
    return this[name];
  }

  propertyName = property.name;

  // check if access to collection property and lazily initialize it
  if (!this[propertyName]) {
    if (property.isMany) {
      Object.defineProperty(this, propertyName, {
        enumerable: !property.isReference,
        writable: true,
        value: []
      });
    }
  }

  return this[propertyName];
};

BaseType.prototype.set = function(name, value) {
  var property = this.$propertyDescriptor(name);

  if (!property) {
    this.$attrs[name] = value;
  } else {
    Object.defineProperty(this, property.name, {
      enumerable: !property.isReference,
      writable: true,
      value: value
    });
  }
};

//// Model implementation /////////////////////////////////////////////////

/**
 * @class Model
 *
 * A model that can be used to create elements of a specific type.
 *
 * @example
 *
 * var Moddle = require('moddle');
 *
 * var pkg = {
 *   name: 'mypackage',
 *   prefix: 'my',
 *   types: [
 *     { name: 'Root' }
 *   ]
 * };
 *
 * var moddle = new Moddle([pkg]);
 *
 * @param {Array<Package>} packages  the packages to contain
 * @param {Object} options  additional options to pass to the model
 */
function Model(packages, options) {

  var modelInstance = {};

  var packageMap = {};
  var elementsByName = {};

  var typeCache = {};

  options = _.extend({ defaultId: 'id', generateIdProperty: true }, options || {});

  function getElementByName(name) {
    return elementsByName[name];
  }

  function createType(descriptor) {
    var proto = new BaseType(descriptor, modelInstance);

    // early initialize default values via prototype

    _.forEach(descriptor.properties, function(p) {
      if (!p.isMany && p.default !== undefined) {
        proto[p.name] = p.default;
      }
    });

    function ModelElement(attrs) {

      var descriptor = $descriptor(this);

      Object.defineProperty(this, '$attrs', {
        value: {}
      });

      Object.defineProperty(this, '$type', {
        value: descriptor.ns.name,
        enumerable: true
      });

      _.forEach(attrs, function(val, key) {
        this.set(key, val);
      }, this);
    }

    ModelElement.prototype = proto;

    // static accessor of the model descriptor
    $defineModel(ModelElement, modelInstance);
    $defineDescriptor(ModelElement, descriptor);

    ModelElement.isA = isA;

    return ModelElement;
  }

  function init() {
    _.forEach(packages, function(pkg) {
      var prefix = pkg.prefix;

      packageMap[pkg.uri] = pkg;
      packageMap[pkg.prefix] = pkg;

      function registerType(t) {

        // namespace types
        var typeNs = parseNameNs(t.name, prefix),
            nsName = typeNs.name;

        _.extend(t, {
          ns: typeNs,
          name: nsName
        });

        elementsByName[nsName] = t;

        // add back link to package
        $definePackage(t, pkg);

        t.propertiesByName = {};

        _.forEach(t.properties, function(p) {

          // namespace property names
          var propertyNs = parseNameNs(p.name, typeNs.prefix),
              propertyName = propertyNs.name;

          // namespace property types
          if (!isBuiltInType(p.type)) {
            var propertyTypeNs = parseNameNs(p.type, propertyNs.prefix);
            p.type = propertyTypeNs.name;
          }

          _.extend(p, {
            ns: propertyNs,
            name: propertyName
          });

          t.propertiesByName[propertyNs.name] = p;
        });
      }

      _.forEach(pkg.types, registerType);
    });
  }

  function collectEffectiveTypes(nameNs, result) {

    var type = elementsByName[nameNs.name];

    if (!type) {
      throw new Error('unknown type <' + nameNs.name + '>');
    }

    _.forEach(type.superClass, function(cls) {
      var parentNs = parseNameNs(cls, nameNs.prefix);
      collectEffectiveTypes(parentNs, result);
    });

    result.push(type);

    return result;
  }

  function getEffectiveDescriptor(type) {

    var nameNs = parseNameNs(type);

    // filter types for uniqueness
    var allTypes = _.unique(collectEffectiveTypes(nameNs, []));

    function redefineProperty(descriptor, p) {
      var nsPrefix = p.ns.prefix;
      var parts = p.redefines.split('#');

      var name = parseNameNs(parts[0], nsPrefix);
      var attrName = parseNameNs(parts[1], name.prefix).name;

      var redefinedProperty = descriptor.propertiesByName[attrName];
      if (!redefinedProperty) {
        logger.error('[model] ' + type + ' : property <' + attrName + '> ' +
                     'redefined by <' + p.ns.name + '> does not exist');

        throw new Error('[model] refined property not found');
      } else {
        replaceProperty(descriptor, redefinedProperty, p);
      }

      delete p.redefines;
    }

    function addProperty(descriptor, p, idx) {
      addNamedProperty(descriptor, p, true);

      var properties = descriptor.properties;

      if (idx !== undefined) {
        properties.splice(idx, 0, p);
      } else {
        properties.push(p);
      }
    }

    function replaceProperty(descriptor, oldProperty, newProperty) {
      var oldNameNs = oldProperty.ns,
          props = descriptor.properties,
          propsByName = descriptor.propertiesByName;

      if (oldProperty.isBody) {

        if (!newProperty.isBody) {
          throw new Error(
            '[model] property <' + newProperty.ns.name + '> must be body property ' +
            'to refine <' + oldProperty.ns.name + '>');
        }

        // TODO: Check compatibility
        setBodyProperty(descriptor, newProperty, false);
      }

      addNamedProperty(descriptor, newProperty, true);

      // replace old property at index with new one
      var idx = props.indexOf(oldProperty);
      if (idx === -1) {
        throw new Error('[model] property <' + oldNameNs.name + '> not found in property list');
      }

      props[idx] = newProperty;

      // replace propsByName entry with new property
      propsByName[oldNameNs.name] = newProperty;
      propsByName[oldNameNs.localName] = newProperty;
    }

    function addNamedProperty(descriptor, p, validate) {
      var ns = p.ns,
          propsByName = descriptor.propertiesByName;

      if (validate) {
        assertNotDefined(descriptor, p, ns.name);
        assertNotDefined(descriptor, p, ns.localName);
      }

      propsByName[ns.name] = p;
      propsByName[ns.localName] = p;
    }

    function setBodyProperty(descriptor, p, validate) {

      if (descriptor.bodyProperty) {
        throw new Error(
          '[model] body property defined multiple times ' +
          '(<' + descriptor.bodyProperty.ns.name + '>, <' + p.ns.name + '>)');
      }

      descriptor.bodyProperty = p;
    }

    function removeNamedProperty(descriptor, p) {
      var ns = p.ns,
          propsByName = descriptor.propertiesByName;

      delete propsByName[ns.name];
      delete propsByName[ns.localName];
    }

    function createIdProperty(descriptor) {
      var nameNs = parseNameNs(options.defaultId, descriptor.ns.prefix);

      var idProperty = {
        name: nameNs.localName,
        type: 'String',
        isAttr: true,
        ns: nameNs
      };

      // ensure that id is always the first attribute (if present)
      addProperty(descriptor, idProperty, 0);
    }

    function assertNotDefined(descriptor, property, name) {
      var propertyName = property.name,
          definedProperty = descriptor.propertiesByName[propertyName];

      if (definedProperty) {
        console.error(
          '[model] property <', propertyName, '> already defined. Override of ' +
          '<', definedProperty.definedBy, '>#<', definedProperty, '> by ' +
          '<', property.definedBy, '>#<', property, '> not allowed without redefines.');

        throw new Error(
          '[model] property <' + propertyName + '> already defined. Override of ' +
          '<' + definedProperty.definedBy.ns.name + '>#<' + definedProperty.ns.name + '> by ' +
          '<' + property.definedBy.ns.name + '>#<' + property.ns.name + '> not allowed without redefines.');
      }
    }

    function needsId(descriptor) {
      return options.generateIdProperty && !descriptor.propertiesByName[options.defaultId];
    }

    var descriptor = {
      name: nameNs.name,
      ns: nameNs,
      allTypes: allTypes,
      properties: [],
      propertiesByName: {},
      constraints: []
    };

    var last = _.last(allTypes);

    $definePackage(descriptor, $pkg(last));

    allTypes.forEach(function(t) {
      (t.properties || []).forEach(function(p) {

        // clone property to allow extensions
        p = _.extend({}, p);

        //if (p.ns.prefix === descriptor.ns.prefix) {
          // remove prefix if namespace == type namespace
          p.name = p.ns.localName;
        //}

        Object.defineProperty(p, 'definedBy', {
          value: t
        });

        // add redefine support
        if (p.redefines) {
          redefineProperty(descriptor, p);
        } else {
          if (p.isBody) {
            setBodyProperty(descriptor, p);
          }
          addProperty(descriptor, p);
        }
      });

      (t.constraints || []).forEach(function(c) {
        descriptor.constraints.push(c);
      });
    });

    if (needsId(descriptor)) {
      // create default ns id property unless it exists
      // confirms with the general schema abilities of xml / json
      createIdProperty(descriptor);
    }

    return descriptor;
  }

  function getPackage(uriOrPrefix) {
    return packageMap[uriOrPrefix];
  }

  function getPackages() {
    return _.clone(packages);
  }

  /**
   * Returns the type representing a given descriptor
   *
   * @method Model#getType
   *
   * @example
   *
   * var Foo = moddle.getType('my:Foo');
   * var foo = new Foo({ 'id' : 'FOO_1' });
   *
   * @param  {String|Object} descriptor the type descriptor or name know to the model
   * @return {Object}         the type representing the descriptor
   */
  function getType(descriptor) {

    var name = _.isString(descriptor) ? descriptor : descriptor.ns.name;

    var type = typeCache[name];

    if (!type) {
      descriptor = getEffectiveDescriptor(name);
      type = typeCache[descriptor.name] = createType(descriptor);
    }

    return type;
  }

  /**
   * Create an instance of the specified type.
   *
   * @method Model#create
   *
   * @example
   *
   * var foo = moddle.create('my:Foo');
   * var bar = moddle.create('my:Bar', { id: 'BAR_1' });
   *
   * @param  {String|Object} descriptor the type descriptor or name know to the model
   * @param  {Object} attrs   a number of attributes to initialize the model instance with
   * @return {Object}         model instance
   */
  function create(descriptor, attrs) {

    var Type = getType(descriptor);

    var instance = new Type(attrs);

    return instance;
  }

  /**
   * Creates an any-element type to be used within model instances.
   *
   * This can be used to create custom elements that lie outside the meta-model.
   * The created element contains all the meta-data required to serialize it
   * as part of meta-model elements.
   *
   * @method Model#createAny
   *
   * @example
   *
   * var foo = moddle.createAny('vendor:Foo', 'http://vendor', {
   *   value: 'bar'
   * });
   *
   * var container = moddle.create('my:Container', 'http://my', {
   *   any: [ foo ]
   * });
   *
   * // go ahead and serialize the stuff
   *
   *
   * @param  {String} name  the name of the element
   * @param  {String} nsUri the namespace uri of the element
   * @param  {Object} [properties] a map of properties to initialize the instance with
   * @return {Object} the any type instance
   */
  function createAny(name, nsUri, properties) {

    var nameNs = parseNameNs(name);

    var element = {
      $type: name
    };

    var descriptor = {
      name: name,
      isGeneric: true,
      ns: {
        prefix: nameNs.prefix,
        localName: nameNs.localName,
        uri: nsUri
      }
    };

    Object.defineProperty(element, '$descriptor', {
      enumerable: false,
      value: descriptor
    });

    _.forEach(properties, function(a, key) {
      if (_.isObject(a) && a.value !== undefined) {
        element[a.name] = a.value;
      } else {
        element[key] = a;
      }
    });

    return element;
  }

  init();

  return _.extend(modelInstance, {
    create: create,
    createAny: createAny,
    getDescriptor: $descriptor,
    getType: getType,
    getPackage: getPackage,
    getPackages: getPackages
  });
}

module.exports = Model;
},{"./util":25}],24:[function(require,module,exports){
'use strict';

var LEVEL_MAP = {
  'trace': 0,
  'debug': 1,
  'info': 2,
  'warn': 3,
  'error': 4,
  'none': 5
};

var DEFAULT_LEVEL = 'warn';

function Logger(defaultLevel, handler) {

  var level;

  function setLevel(l) {
    level = LEVEL_MAP[l || DEFAULT_LEVEL] || LEVEL_MAP[DEFAULT_LEVEL];
  }

  function setHandler(h) {
    handler = h || console;
  }

  function log(type, args) {

    var requestedLevel = LEVEL_MAP[type] || LEVEL_MAP.none,
        logArgs,
        fn;

    if (level <= requestedLevel) {
      if (handler) {
        logArgs = Array.prototype.slice.call(args);

        fn = handler[type] || handler.log;
        if (fn) {
          fn.apply(handler, logArgs);
        }
      }
    }
  }

  setLevel(defaultLevel);
  setHandler(handler || console);

  return {
    info: function() {
      log('info', arguments);
    },

    warn: function() {
      log('warn', arguments);
    },

    error: function() {
      log('error', arguments);
    },

    debug: function() {
      log('debug', arguments);
    },

    setLevel: setLevel,

    getLevels: function() {
      return LEVEL_MAP;
    },

    logging: function(temporaryLevel, fn) {
      var old = level;

      setLevel(temporaryLevel);

      fn();

      level = old;
    }
  };
}

module.exports = Logger;
},{}],25:[function(require,module,exports){
'use strict';

/**
 * Parses a namespaced attribute name of the form (ns:)localName to an object,
 * given a default prefix to assume in case no explicit namespace is given.
 */
function parseNameNs(name, defaultPrefix) {
  var parts = name.split(/:/),
      localName, prefix;

  // no prefix (i.e. only local name)
  if (parts.length === 1) {
    localName = name;
    prefix = defaultPrefix;
  } else
  // prefix + local name
  if (parts.length === 2) {
    localName = parts[1];
    prefix = parts[0];
  } else {
    throw new Error('expected <prefix:localName> or <localName>');
  }

  name = (prefix ? prefix + ':' : '') + localName;

  return {
    name: name,
    prefix: prefix,
    localName: localName
  };
}

/**
 * Built in moddle types
 */
var BUILD_IN_TYPES = {
  'String': true,
  'Boolean': true,
  'Integer': true,
  'Real': true,
  'Element': true,
};

/**
 * Converters for built in types from string representations
 */
var TYPE_CONVERTERS = {
  'String': function(s) { return s; },
  'Boolean': function(s) { return s === 'true'; },
  'Integer': function(s) { return parseInt(s, 10); },
  'Real': function(s) { return parseFloat(s, 10); }
};

function coerceType(type, value) {

  var converter = TYPE_CONVERTERS[type];

  if (converter) {
    return converter(value);
  } else {
    return value;
  }
}

function isBuiltInType(type) {
  return !!BUILD_IN_TYPES[type];
}

function isSimpleType(type) {
  return !!TYPE_CONVERTERS[type];
}

module.exports.coerceType = coerceType;
module.exports.isBuiltInType = isBuiltInType;
module.exports.isSimpleType = isSimpleType;
module.exports.parseNameNs = parseNameNs;

var Logger = require('./Logger');

module.exports.logger = new Logger();
},{"./Logger":24}],26:[function(require,module,exports){
/**
 * Tiny stack for browser or server
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2014 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/tiny-stack/master/LICENSE>
 * @link http://avoidwork.github.io/tiny-stack
 * @module tiny-stack
 * @version 0.1.0
 */

( function ( global ) {

"use strict";

/**
 * TinyStack
 *
 * @constructor
 */
function TinyStack () {
	this.data = [null];
	this.top  = 0;
}

/**
 * Clears the stack
 *
 * @method clear
 * @memberOf TinyStack
 * @return {Object} {@link TinyStack}
 */
TinyStack.prototype.clear = function clear () {
	this.data = [null];
	this.top  = 0;

	return this;
};

/**
 * Gets the size of the stack
 *
 * @method length
 * @memberOf TinyStack
 * @return {Number} Size of stack
 */
TinyStack.prototype.length = function length () {
	return this.top;
};

/**
 * Gets the item at the top of the stack
 *
 * @method peek
 * @memberOf TinyStack
 * @return {Mixed} Item at the top of the stack
 */
TinyStack.prototype.peek = function peek () {
	return this.data[this.top];
};

/**
 * Gets & removes the item at the top of the stack
 *
 * @method pop
 * @memberOf TinyStack
 * @return {Mixed} Item at the top of the stack
 */
TinyStack.prototype.pop = function pop () {
	if ( this.top > 0 ) {
		this.top--;

		return this.data.pop();
	}
	else {
		return undefined;
	}
};

/**
 * Pushes an item onto the stack
 *
 * @method push
 * @memberOf TinyStack
 * @return {Object} {@link TinyStack}
 */
TinyStack.prototype.push = function push ( arg ) {
	this.data[++this.top] = arg;

	return this;
};

/**
 * TinyStack factory
 *
 * @method factory
 * @return {Object} {@link TinyStack}
 */
function factory () {
	return new TinyStack();
}

// Node, AMD & window supported
if ( typeof exports != "undefined" ) {
	module.exports = factory;
}
else if ( typeof define == "function" ) {
	define( function () {
		return factory;
	} );
}
else {
	global.stack = factory;
}
} )( this );

},{}],27:[function(require,module,exports){
module.exports=require(22)
},{"./lib/Model":28,"./lib/util":30}],28:[function(require,module,exports){
module.exports=require(23)
},{"./util":30}],29:[function(require,module,exports){
module.exports=require(24)
},{}],30:[function(require,module,exports){
module.exports=require(25)
},{"./Logger":29}],31:[function(require,module,exports){
module.exports={
  "name": "BPMN20",
  "uri": "http://www.omg.org/spec/BPMN/20100524/MODEL",
  "associations": [],
  "types": [
    {
      "name": "Interface",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "operations",
          "type": "Operation",
          "association": "A_operations_interface",
          "isMany": true
        },
        {
          "name": "implementationRef",
          "type": "Element"
        }
      ]
    },
    {
      "name": "Operation",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "inMessageRef",
          "type": "Message",
          "association": "A_inMessageRef_operation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "outMessageRef",
          "type": "Message",
          "association": "A_outMessageRef_operation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "errorRefs",
          "type": "Error",
          "association": "A_errorRefs_operation",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "implementationRef",
          "type": "Element"
        }
      ]
    },
    {
      "name": "EndPoint",
      "superClass": [
        "RootElement"
      ]
    },
    {
      "name": "Auditing",
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "GlobalTask",
      "superClass": [
        "CallableElement"
      ],
      "properties": [
        {
          "name": "resources",
          "type": "ResourceRole",
          "association": "A_resources_globalTask",
          "isMany": true
        }
      ]
    },
    {
      "name": "Monitoring",
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "Performer",
      "superClass": [
        "ResourceRole"
      ]
    },
    {
      "name": "Process",
      "superClass": [
        "FlowElementsContainer",
        "CallableElement"
      ],
      "properties": [
        {
          "name": "processType",
          "type": "ProcessType",
          "isAttr": true
        },
        {
          "name": "isClosed",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "auditing",
          "type": "Auditing",
          "association": "A_auditing_process"
        },
        {
          "name": "monitoring",
          "type": "Monitoring",
          "association": "A_monitoring_process"
        },
        {
          "name": "properties",
          "type": "Property",
          "association": "A_properties_process",
          "isMany": true
        },
        {
          "name": "supports",
          "type": "Process",
          "association": "A_supports_process",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "definitionalCollaborationRef",
          "type": "Collaboration",
          "association": "A_definitionalCollaborationRef_process",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "isExecutable",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "resources",
          "type": "ResourceRole",
          "association": "A_resources_process",
          "isMany": true
        },
        {
          "name": "artifacts",
          "type": "Artifact",
          "association": "A_artifacts_process",
          "isMany": true
        },
        {
          "name": "correlationSubscriptions",
          "type": "CorrelationSubscription",
          "association": "A_correlationSubscriptions_process",
          "isMany": true
        }
      ]
    },
    {
      "name": "LaneSet",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "lanes",
          "type": "Lane",
          "association": "A_lanes_laneSet",
          "isMany": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Lane",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "childLaneSet",
          "type": "LaneSet",
          "association": "A_childLaneSet_parentLane"
        },
        {
          "name": "partitionElementRef",
          "type": "BaseElement",
          "association": "A_partitionElementRef_lane",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "flowNodeRef",
          "type": "FlowNode",
          "association": "A_flowNodeRefs_lanes",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "partitionElement",
          "type": "BaseElement",
          "association": "A_partitionElement_lane"
        }
      ]
    },
    {
      "name": "GlobalManualTask",
      "superClass": [
        "GlobalTask"
      ]
    },
    {
      "name": "ManualTask",
      "superClass": [
        "Task"
      ]
    },
    {
      "name": "UserTask",
      "superClass": [
        "Task"
      ],
      "properties": [
        {
          "name": "renderings",
          "type": "Rendering",
          "association": "A_renderings_usertask",
          "isMany": true
        },
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Rendering",
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "HumanPerformer",
      "superClass": [
        "Performer"
      ]
    },
    {
      "name": "PotentialOwner",
      "superClass": [
        "HumanPerformer"
      ]
    },
    {
      "name": "GlobalUserTask",
      "superClass": [
        "GlobalTask"
      ],
      "properties": [
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "renderings",
          "type": "Rendering",
          "association": "A_renderings_globalUserTask",
          "isMany": true
        }
      ]
    },
    {
      "name": "Gateway",
      "isAbstract": true,
      "superClass": [
        "FlowNode"
      ],
      "properties": [
        {
          "name": "gatewayDirection",
          "type": "GatewayDirection",
          "default": "unspecified",
          "isAttr": true
        }
      ]
    },
    {
      "name": "EventBasedGateway",
      "superClass": [
        "Gateway"
      ],
      "properties": [
        {
          "name": "instantiate",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "eventGatewayType",
          "type": "EventBasedGatewayType",
          "isAttr": true
        }
      ]
    },
    {
      "name": "ComplexGateway",
      "superClass": [
        "Gateway"
      ],
      "properties": [
        {
          "name": "activationCondition",
          "type": "Expression",
          "association": "A_activationCondition_complexGateway"
        },
        {
          "name": "default",
          "type": "SequenceFlow",
          "association": "A_default_complexGateway",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ExclusiveGateway",
      "superClass": [
        "Gateway"
      ],
      "properties": [
        {
          "name": "default",
          "type": "SequenceFlow",
          "association": "A_default_exclusiveGateway",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "InclusiveGateway",
      "superClass": [
        "Gateway"
      ],
      "properties": [
        {
          "name": "default",
          "type": "SequenceFlow",
          "association": "A_default_inclusiveGateway",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ParallelGateway",
      "superClass": [
        "Gateway"
      ]
    },
    {
      "name": "RootElement",
      "isAbstract": true,
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "Relationship",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "type",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "direction",
          "type": "RelationshipDirection",
          "isAttr": true
        },
        {
          "name": "sources",
          "association": "A_sources_relationship",
          "isMany": true,
          "isReference": true,
          "type": "Element"
        },
        {
          "name": "targets",
          "association": "A_targets_relationship",
          "isMany": true,
          "isReference": true,
          "type": "Element"
        }
      ]
    },
    {
      "name": "BaseElement",
      "isAbstract": true,
      "properties": [
        {
          "name": "id",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "extensionDefinitions",
          "type": "ExtensionDefinition",
          "association": "A_extensionDefinitions_baseElement",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "extensionElements",
          "type": "ExtensionElements",
          "association": "A_extensionElements_baseElement"
        },
        {
          "name": "documentation",
          "type": "Documentation",
          "association": "A_documentation_baseElement",
          "isMany": true
        }
      ]
    },
    {
      "name": "Extension",
      "properties": [
        {
          "name": "mustUnderstand",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "definition",
          "type": "ExtensionDefinition",
          "association": "A_definition_extension"
        }
      ]
    },
    {
      "name": "ExtensionDefinition",
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "extensionAttributeDefinitions",
          "type": "ExtensionAttributeDefinition",
          "association": "A_extensionAttributeDefinitions_extensionDefinition",
          "isMany": true
        }
      ]
    },
    {
      "name": "ExtensionAttributeDefinition",
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "type",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "isReference",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "extensionDefinition",
          "type": "ExtensionDefinition",
          "association": "A_extensionAttributeDefinitions_extensionDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ExtensionElements",
      "properties": [
        {
          "name": "valueRef",
          "association": "A_valueRef_extensionElements",
          "isAttr": true,
          "isReference": true,
          "type": "Element"
        },
        {
          "name": "values",
          "association": "A_value_extensionElements",
          "type": "Element",
          "isMany": true
        },
        {
          "name": "extensionAttributeDefinition",
          "type": "ExtensionAttributeDefinition",
          "association": "A_extensionAttributeDefinition_extensionElements",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Documentation",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "text",
          "isAttr": true,
          "type": "String",
          "isBody": true
        },
        {
          "name": "textFormat",
          "default": "text/plain",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Event",
      "isAbstract": true,
      "superClass": [
        "FlowNode",
        "InteractionNode"
      ],
      "properties": [
        {
          "name": "properties",
          "type": "Property",
          "association": "A_properties_event",
          "isMany": true
        }
      ]
    },
    {
      "name": "IntermediateCatchEvent",
      "superClass": [
        "CatchEvent"
      ]
    },
    {
      "name": "IntermediateThrowEvent",
      "superClass": [
        "ThrowEvent"
      ]
    },
    {
      "name": "EndEvent",
      "superClass": [
        "ThrowEvent"
      ]
    },
    {
      "name": "StartEvent",
      "superClass": [
        "CatchEvent"
      ],
      "properties": [
        {
          "name": "isInterrupting",
          "default": true,
          "isAttr": true,
          "type": "Boolean"
        }
      ]
    },
    {
      "name": "ThrowEvent",
      "isAbstract": true,
      "superClass": [
        "Event"
      ],
      "properties": [
        {
          "name": "inputSet",
          "type": "InputSet",
          "association": "A_inputSet_throwEvent"
        },
        {
          "name": "eventDefinitionRefs",
          "type": "EventDefinition",
          "association": "A_eventDefinitionRefs_throwEvent",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "dataInputAssociation",
          "type": "DataInputAssociation",
          "association": "A_dataInputAssociation_throwEvent",
          "isMany": true
        },
        {
          "name": "dataInputs",
          "type": "DataInput",
          "association": "A_dataInputs_throwEvent",
          "isMany": true
        },
        {
          "name": "eventDefinitions",
          "type": "EventDefinition",
          "association": "A_eventDefinitions_throwEvent",
          "isMany": true
        }
      ]
    },
    {
      "name": "CatchEvent",
      "isAbstract": true,
      "superClass": [
        "Event"
      ],
      "properties": [
        {
          "name": "parallelMultiple",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "outputSet",
          "type": "OutputSet",
          "association": "A_outputSet_catchEvent"
        },
        {
          "name": "eventDefinitionRefs",
          "type": "EventDefinition",
          "association": "A_eventDefinitionRefs_catchEvent",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "dataOutputAssociation",
          "type": "DataOutputAssociation",
          "association": "A_dataOutputAssociation_catchEvent",
          "isMany": true
        },
        {
          "name": "dataOutputs",
          "type": "DataOutput",
          "association": "A_dataOutputs_catchEvent",
          "isMany": true
        },
        {
          "name": "eventDefinitions",
          "type": "EventDefinition",
          "association": "A_eventDefinitions_catchEvent",
          "isMany": true
        }
      ]
    },
    {
      "name": "BoundaryEvent",
      "superClass": [
        "CatchEvent"
      ],
      "properties": [
        {
          "name": "cancelActivity",
          "default": true,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "attachedToRef",
          "type": "Activity",
          "association": "A_boundaryEventRefs_attachedToRef",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "EventDefinition",
      "isAbstract": true,
      "superClass": [
        "RootElement"
      ]
    },
    {
      "name": "CancelEventDefinition",
      "superClass": [
        "EventDefinition"
      ]
    },
    {
      "name": "ErrorEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "errorRef",
          "type": "Error",
          "association": "A_errorRef_errorEventDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "TerminateEventDefinition",
      "superClass": [
        "EventDefinition"
      ]
    },
    {
      "name": "EscalationEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "escalationRef",
          "type": "Escalation",
          "association": "A_escalationRef_escalationEventDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Escalation",
      "properties": [
        {
          "name": "structureRef",
          "type": "ItemDefinition",
          "association": "A_structureRef_escalation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "escalationCode",
          "isAttr": true,
          "type": "String"
        }
      ],
      "superClass": [
        "RootElement"
      ]
    },
    {
      "name": "CompensateEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "waitForCompletion",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "activityRef",
          "type": "Activity",
          "association": "A_activityRef_compensateEventDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "TimerEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "timeDate",
          "type": "Expression",
          "association": "A_timeDate_timerEventDefinition"
        },
        {
          "name": "timeCycle",
          "type": "Expression",
          "association": "A_timeCycle_timerEventDefinition"
        },
        {
          "name": "timeDuration",
          "type": "Expression",
          "association": "A_timeDuration_timerEventDefinition"
        }
      ]
    },
    {
      "name": "LinkEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "target",
          "type": "LinkEventDefinition",
          "association": "A_target_source",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "source",
          "type": "LinkEventDefinition",
          "association": "A_target_source",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "MessageEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "messageRef",
          "type": "Message",
          "association": "A_messageRef_messageEventDefinition",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "operationRef",
          "type": "Operation",
          "association": "A_operationRef_messageEventDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ConditionalEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "condition",
          "type": "Expression",
          "association": "A_condition_conditionalEventDefinition",
          "serialize": "xsi:type"
        }
      ]
    },
    {
      "name": "SignalEventDefinition",
      "superClass": [
        "EventDefinition"
      ],
      "properties": [
        {
          "name": "signalRef",
          "type": "Signal",
          "association": "A_signalRef_signalEventDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Signal",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "structureRef",
          "type": "ItemDefinition",
          "association": "A_structureRef_signal",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "ImplicitThrowEvent",
      "superClass": [
        "ThrowEvent"
      ]
    },
    {
      "name": "DataState",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "ItemAwareElement",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "itemSubjectRef",
          "type": "ItemDefinition",
          "association": "A_itemSubjectRef_itemAwareElement",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "dataState",
          "type": "DataState",
          "association": "A_dataState_itemAwareElement"
        }
      ]
    },
    {
      "name": "DataAssociation",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "transformation",
          "type": "FormalExpression",
          "association": "A_transformation_dataAssociation"
        },
        {
          "name": "assignment",
          "type": "Assignment",
          "association": "A_assignment_dataAssociation",
          "isMany": true
        },
        {
          "name": "sourceRef",
          "type": "ItemAwareElement",
          "association": "A_sourceRef_dataAssociation",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "targetRef",
          "type": "ItemAwareElement",
          "association": "A_targetRef_dataAssociation",
          "isReference": true
        }
      ]
    },
    {
      "name": "DataInput",
      "superClass": [
        "ItemAwareElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "isCollection",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "inputSetRefs",
          "type": "InputSet",
          "association": "A_dataInputRefs_inputSetRefs",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        },
        {
          "name": "inputSetWithOptional",
          "type": "InputSet",
          "association": "A_optionalInputRefs_inputSetWithOptional",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        },
        {
          "name": "inputSetWithWhileExecuting",
          "type": "InputSet",
          "association": "A_whileExecutingInputRefs_inputSetWithWhileExecuting",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "DataOutput",
      "superClass": [
        "ItemAwareElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "isCollection",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "outputSetRefs",
          "type": "OutputSet",
          "association": "A_dataOutputRefs_outputSetRefs",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        },
        {
          "name": "outputSetWithOptional",
          "type": "OutputSet",
          "association": "A_outputSetWithOptional_optionalOutputRefs",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        },
        {
          "name": "outputSetWithWhileExecuting",
          "type": "OutputSet",
          "association": "A_outputSetWithWhileExecuting_whileExecutingOutputRefs",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "InputSet",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "dataInputRefs",
          "type": "DataInput",
          "association": "A_dataInputRefs_inputSetRefs",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "optionalInputRefs",
          "type": "DataInput",
          "association": "A_optionalInputRefs_inputSetWithOptional",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "whileExecutingInputRefs",
          "type": "DataInput",
          "association": "A_whileExecutingInputRefs_inputSetWithWhileExecuting",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "outputSetRefs",
          "type": "OutputSet",
          "association": "A_inputSetRefs_outputSetRefs",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "OutputSet",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "dataOutputRefs",
          "type": "DataOutput",
          "association": "A_dataOutputRefs_outputSetRefs",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "inputSetRefs",
          "type": "InputSet",
          "association": "A_inputSetRefs_outputSetRefs",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "optionalOutputRefs",
          "type": "DataOutput",
          "association": "A_outputSetWithOptional_optionalOutputRefs",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "whileExecutingOutputRefs",
          "type": "DataOutput",
          "association": "A_outputSetWithWhileExecuting_whileExecutingOutputRefs",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Property",
      "superClass": [
        "ItemAwareElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "DataInputAssociation",
      "superClass": [
        "DataAssociation"
      ]
    },
    {
      "name": "DataOutputAssociation",
      "superClass": [
        "DataAssociation"
      ]
    },
    {
      "name": "InputOutputSpecification",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "inputSets",
          "type": "InputSet",
          "association": "A_inputSets_inputOutputSpecification",
          "isMany": true
        },
        {
          "name": "outputSets",
          "type": "OutputSet",
          "association": "A_outputSets_inputOutputSpecification",
          "isMany": true
        },
        {
          "name": "dataInputs",
          "type": "DataInput",
          "association": "A_dataInputs_inputOutputSpecification",
          "isMany": true
        },
        {
          "name": "dataOutputs",
          "type": "DataOutput",
          "association": "A_dataOutputs_inputOutputSpecification",
          "isMany": true
        }
      ]
    },
    {
      "name": "DataObject",
      "superClass": [
        "FlowElement",
        "ItemAwareElement"
      ],
      "properties": [
        {
          "name": "isCollection",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        }
      ]
    },
    {
      "name": "InputOutputBinding",
      "properties": [
        {
          "name": "inputDataRef",
          "type": "InputSet",
          "association": "A_inputDataRef_inputOutputBinding",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "outputDataRef",
          "type": "OutputSet",
          "association": "A_outputDataRef_inputOutputBinding",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "operationRef",
          "type": "Operation",
          "association": "A_operationRef_ioBinding",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Assignment",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "from",
          "type": "Expression",
          "association": "A_from_assignment"
        },
        {
          "name": "to",
          "type": "Expression",
          "association": "A_to_assignment"
        }
      ]
    },
    {
      "name": "DataStore",
      "superClass": [
        "RootElement",
        "ItemAwareElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "capacity",
          "isAttr": true,
          "type": "Integer"
        },
        {
          "name": "isUnlimited",
          "default": true,
          "isAttr": true,
          "type": "Boolean"
        }
      ]
    },
    {
      "name": "DataStoreReference",
      "superClass": [
        "ItemAwareElement",
        "FlowElement"
      ],
      "properties": [
        {
          "name": "dataStoreRef",
          "type": "DataStore",
          "association": "A_dataStoreRef_dataStoreReference",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "DataObjectReference",
      "superClass": [
        "ItemAwareElement",
        "FlowElement"
      ],
      "properties": [
        {
          "name": "dataObjectRef",
          "type": "DataObject",
          "association": "A_dataObjectRef_dataObject",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ConversationLink",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "sourceRef",
          "type": "InteractionNode",
          "association": "A_sourceRef_outgoingConversationLinks",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "targetRef",
          "type": "InteractionNode",
          "association": "A_targetRef_incomingConversationLinks",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "ConversationAssociation",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "innerConversationNodeRef",
          "type": "ConversationNode",
          "association": "A_innerConversationNodeRef_conversationAssociation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "outerConversationNodeRef",
          "type": "ConversationNode",
          "association": "A_outerConversationNodeRef_conversationAssociation",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "CallConversation",
      "superClass": [
        "ConversationNode"
      ],
      "properties": [
        {
          "name": "calledCollaborationRef",
          "type": "Collaboration",
          "association": "A_calledCollaborationRef_callConversation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "participantAssociations",
          "type": "ParticipantAssociation",
          "association": "A_participantAssociations_callConversation",
          "isMany": true
        }
      ]
    },
    {
      "name": "Conversation",
      "superClass": [
        "ConversationNode"
      ]
    },
    {
      "name": "SubConversation",
      "superClass": [
        "ConversationNode"
      ],
      "properties": [
        {
          "name": "conversationNodes",
          "type": "ConversationNode",
          "association": "A_conversationNodes_subConversation",
          "isMany": true
        }
      ]
    },
    {
      "name": "ConversationNode",
      "isAbstract": true,
      "superClass": [
        "InteractionNode",
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "participantRefs",
          "type": "Participant",
          "association": "A_participantRefs_conversationNode",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "messageFlowRefs",
          "type": "MessageFlow",
          "association": "A_messageFlowRefs_communication",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "correlationKeys",
          "type": "CorrelationKey",
          "association": "A_correlationKeys_conversationNode",
          "isMany": true
        }
      ]
    },
    {
      "name": "GlobalConversation",
      "superClass": [
        "Collaboration"
      ]
    },
    {
      "name": "PartnerEntity",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "participantRef",
          "type": "Participant",
          "association": "A_partnerEntityRef_participantRef",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "PartnerRole",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "participantRef",
          "type": "Participant",
          "association": "A_partnerRoleRef_participantRef",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "CorrelationProperty",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "correlationPropertyRetrievalExpression",
          "type": "CorrelationPropertyRetrievalExpression",
          "association": "A_correlationPropertyRetrievalExpression_correlationproperty",
          "isMany": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "type",
          "type": "ItemDefinition",
          "association": "A_type_correlationProperty",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Error",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "structureRef",
          "type": "ItemDefinition",
          "association": "A_structureRef_error",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "errorCode",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "CorrelationKey",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "correlationPropertyRef",
          "type": "CorrelationProperty",
          "association": "A_correlationPropertyRef_correlationKey",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Expression",
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "FormalExpression",
      "superClass": [
        "Expression"
      ],
      "properties": [
        {
          "name": "language",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "body",
          "type": "Element"
        },
        {
          "name": "evaluatesToTypeRef",
          "type": "ItemDefinition",
          "association": "A_evaluatesToTypeRef_formalExpression",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Message",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "itemRef",
          "type": "ItemDefinition",
          "association": "A_itemRef_message",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ItemDefinition",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "itemKind",
          "type": "ItemKind",
          "isAttr": true
        },
        {
          "name": "structureRef",
          "type": "Element"
        },
        {
          "name": "isCollection",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "import",
          "type": "Import",
          "association": "A_import_itemDefinition",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "FlowElement",
      "isAbstract": true,
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "auditing",
          "type": "Auditing",
          "association": "A_auditing_flowElement"
        },
        {
          "name": "monitoring",
          "type": "Monitoring",
          "association": "A_monitoring_flowElement"
        },
        {
          "name": "categoryValueRef",
          "type": "CategoryValue",
          "association": "A_categorizedFlowElements_categoryValueRef",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "SequenceFlow",
      "superClass": [
        "FlowElement"
      ],
      "properties": [
        {
          "name": "isImmediate",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "conditionExpression",
          "type": "Expression",
          "association": "A_conditionExpression_sequenceFlow"
        },
        {
          "name": "sourceRef",
          "type": "FlowNode",
          "association": "A_sourceRef_outgoing_flow",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "targetRef",
          "type": "FlowNode",
          "association": "A_targetRef_incoming_flow",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "FlowElementsContainer",
      "isAbstract": true,
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "laneSets",
          "type": "LaneSet",
          "association": "A_laneSets_flowElementsContainer",
          "isMany": true
        },
        {
          "name": "flowElements",
          "type": "FlowElement",
          "association": "A_flowElements_container",
          "isMany": true
        }
      ]
    },
    {
      "name": "CallableElement",
      "isAbstract": true,
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "ioSpecification",
          "type": "InputOutputSpecification",
          "association": "A_ioSpecification_callableElement"
        },
        {
          "name": "supportedInterfaceRefs",
          "type": "Interface",
          "association": "A_supportedInterfaceRefs_callableElements",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "ioBinding",
          "type": "InputOutputBinding",
          "association": "A_ioBinding_callableElement",
          "isMany": true
        }
      ]
    },
    {
      "name": "FlowNode",
      "isAbstract": true,
      "superClass": [
        "FlowElement"
      ],
      "properties": [
        {
          "name": "incoming",
          "type": "SequenceFlow",
          "association": "A_targetRef_incoming_flow",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "outgoing",
          "type": "SequenceFlow",
          "association": "A_sourceRef_outgoing_flow",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "lanes",
          "type": "Lane",
          "association": "A_flowNodeRefs_lanes",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "CorrelationPropertyRetrievalExpression",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "messagePath",
          "type": "FormalExpression",
          "association": "A_messagePath_correlationset"
        },
        {
          "name": "messageRef",
          "type": "Message",
          "association": "A_messageRef_correlationPropertyRetrievalExpression",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "CorrelationPropertyBinding",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "dataPath",
          "type": "FormalExpression",
          "association": "A_dataPath_correlationPropertyBinding"
        },
        {
          "name": "correlationPropertyRef",
          "type": "CorrelationProperty",
          "association": "A_correlationPropertyRef_correlationPropertyBinding",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Resource",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "resourceParameters",
          "type": "ResourceParameter",
          "association": "A_resourceParameters_resource",
          "isMany": true
        }
      ]
    },
    {
      "name": "ResourceParameter",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "isRequired",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "type",
          "type": "ItemDefinition",
          "association": "A_type_resourceParameter",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "CorrelationSubscription",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "correlationKeyRef",
          "type": "CorrelationKey",
          "association": "A_correlationKeyRef_correlationSubscription",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "correlationPropertyBinding",
          "type": "CorrelationPropertyBinding",
          "association": "A_correlationPropertyBinding_correlationSubscription",
          "isMany": true
        }
      ]
    },
    {
      "name": "MessageFlow",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "sourceRef",
          "type": "InteractionNode",
          "association": "A_sourceRef_messageFlow",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "targetRef",
          "type": "InteractionNode",
          "association": "A_targetRef_messageFlow",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "messageRef",
          "type": "Message",
          "association": "A_messageRef_messageFlow",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "MessageFlowAssociation",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "innerMessageFlowRef",
          "type": "MessageFlow",
          "association": "A_innerMessageFlowRef_messageFlowAssociation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "outerMessageFlowRef",
          "type": "MessageFlow",
          "association": "A_outerMessageFlowRef_messageFlowAssociation",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "InteractionNode",
      "isAbstract": true,
      "properties": [
        {
          "name": "incomingConversationLinks",
          "type": "ConversationLink",
          "association": "A_targetRef_incomingConversationLinks",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        },
        {
          "name": "outgoingConversationLinks",
          "type": "ConversationLink",
          "association": "A_sourceRef_outgoingConversationLinks",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Participant",
      "superClass": [
        "InteractionNode",
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "interfaceRefs",
          "type": "Interface",
          "association": "A_interfaceRefs_participant",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "participantMultiplicity",
          "type": "ParticipantMultiplicity",
          "association": "A_participantMultiplicity_participant"
        },
        {
          "name": "endPointRefs",
          "type": "EndPoint",
          "association": "A_endPointRefs_participant",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "processRef",
          "type": "Process",
          "association": "A_processRef_participant",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ParticipantAssociation",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "innerParticipantRef",
          "type": "Participant",
          "association": "A_innerParticipantRef_participantAssociation",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "outerParticipantRef",
          "type": "Participant",
          "association": "A_outerParticipantRef_participantAssociation",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ParticipantMultiplicity",
      "properties": [
        {
          "name": "minimum",
          "default": "0",
          "isAttr": true,
          "type": "Integer"
        },
        {
          "name": "maximum",
          "default": "1",
          "isAttr": true,
          "type": "Integer"
        }
      ]
    },
    {
      "name": "Collaboration",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "isClosed",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "choreographyRef",
          "type": "Choreography",
          "association": "A_choreographyRef_collaboration",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "artifacts",
          "type": "Artifact",
          "association": "A_artifacts_collaboration",
          "isMany": true
        },
        {
          "name": "participantAssociations",
          "type": "ParticipantAssociation",
          "association": "A_participantAssociations_collaboration",
          "isMany": true
        },
        {
          "name": "messageFlowAssociations",
          "type": "MessageFlowAssociation",
          "association": "A_messageFlowAssociations_collaboration",
          "isMany": true
        },
        {
          "name": "conversationAssociations",
          "type": "ConversationAssociation",
          "association": "A_conversationAssociations_converstaionAssociations"
        },
        {
          "name": "participants",
          "type": "Participant",
          "association": "A_participants_collaboration",
          "isMany": true
        },
        {
          "name": "messageFlows",
          "type": "MessageFlow",
          "association": "A_messageFlows_collaboration",
          "isMany": true
        },
        {
          "name": "correlationKeys",
          "type": "CorrelationKey",
          "association": "A_correlationKeys_collaboration",
          "isMany": true
        },
        {
          "name": "conversations",
          "type": "ConversationNode",
          "association": "A_conversations_collaboration",
          "isMany": true
        },
        {
          "name": "conversationLinks",
          "type": "ConversationLink",
          "association": "A_conversationLinks_collaboration",
          "isMany": true
        }
      ]
    },
    {
      "name": "ChoreographyActivity",
      "isAbstract": true,
      "superClass": [
        "FlowNode"
      ],
      "properties": [
        {
          "name": "participantRefs",
          "type": "Participant",
          "association": "A_participantRefs_choreographyActivity",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "initiatingParticipantRef",
          "type": "Participant",
          "association": "A_initiatingParticipantRef_choreographyActivity",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "correlationKeys",
          "type": "CorrelationKey",
          "association": "A_correlationKeys_choreographyActivity",
          "isMany": true
        },
        {
          "name": "loopType",
          "type": "ChoreographyLoopType",
          "default": "None",
          "isAttr": true
        }
      ]
    },
    {
      "name": "CallChoreography",
      "superClass": [
        "ChoreographyActivity"
      ],
      "properties": [
        {
          "name": "calledChoreographyRef",
          "type": "Choreography",
          "association": "A_calledChoreographyRef_callChoreographyActivity",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "participantAssociations",
          "type": "ParticipantAssociation",
          "association": "A_participantAssociations_callChoreographyActivity",
          "isMany": true
        }
      ]
    },
    {
      "name": "SubChoreography",
      "superClass": [
        "ChoreographyActivity",
        "FlowElementsContainer"
      ],
      "properties": [
        {
          "name": "artifacts",
          "type": "Artifact",
          "association": "A_artifacts_subChoreography",
          "isMany": true
        }
      ]
    },
    {
      "name": "ChoreographyTask",
      "superClass": [
        "ChoreographyActivity"
      ],
      "properties": [
        {
          "name": "messageFlowRef",
          "type": "MessageFlow",
          "association": "A_messageFlowRef_choreographyTask",
          "isMany": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Choreography",
      "superClass": [
        "FlowElementsContainer",
        "Collaboration"
      ]
    },
    {
      "name": "GlobalChoreographyTask",
      "superClass": [
        "Choreography"
      ],
      "properties": [
        {
          "name": "initiatingParticipantRef",
          "type": "Participant",
          "association": "A_initiatingParticipantRef_globalChoreographyTask",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "TextAnnotation",
      "superClass": [
        "Artifact"
      ],
      "properties": [
        {
          "name": "text",
          "type": "String"
        },
        {
          "name": "textFormat",
          "default": "text/plain",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Group",
      "superClass": [
        "Artifact"
      ],
      "properties": [
        {
          "name": "categoryValueRef",
          "type": "CategoryValue",
          "association": "A_categoryValueRef_categoryValueRef",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Association",
      "superClass": [
        "Artifact"
      ],
      "properties": [
        {
          "name": "associationDirection",
          "type": "AssociationDirection",
          "isAttr": true
        },
        {
          "name": "sourceRef",
          "type": "BaseElement",
          "association": "A_sourceRef_outgoing_association",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "targetRef",
          "type": "BaseElement",
          "association": "A_targetRef_incoming_association",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Category",
      "superClass": [
        "RootElement"
      ],
      "properties": [
        {
          "name": "categoryValue",
          "type": "CategoryValue",
          "association": "A_categoryValue_category",
          "isMany": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Artifact",
      "isAbstract": true,
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "CategoryValue",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "categorizedFlowElements",
          "type": "FlowElement",
          "association": "A_categorizedFlowElements_categoryValueRef",
          "isVirtual": true,
          "isMany": true,
          "isReference": true
        },
        {
          "name": "value",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Activity",
      "isAbstract": true,
      "superClass": [
        "FlowNode"
      ],
      "properties": [
        {
          "name": "isForCompensation",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "loopCharacteristics",
          "type": "LoopCharacteristics",
          "association": "A_loopCharacteristics_activity"
        },
        {
          "name": "resources",
          "type": "ResourceRole",
          "association": "A_resources_activity",
          "isMany": true
        },
        {
          "name": "default",
          "type": "SequenceFlow",
          "association": "A_default_activity",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "properties",
          "type": "Property",
          "association": "A_properties_activity",
          "isMany": true
        },
        {
          "name": "ioSpecification",
          "type": "InputOutputSpecification",
          "association": "A_ioSpecification_activity"
        },
        {
          "name": "boundaryEventRefs",
          "type": "BoundaryEvent",
          "association": "A_boundaryEventRefs_attachedToRef",
          "isMany": true,
          "isReference": true
        },
        {
          "name": "dataInputAssociations",
          "type": "DataInputAssociation",
          "association": "A_dataInputAssociations_activity",
          "isMany": true
        },
        {
          "name": "dataOutputAssociations",
          "type": "DataOutputAssociation",
          "association": "A_dataOutputAssociations_activity",
          "isMany": true
        },
        {
          "name": "startQuantity",
          "default": "1",
          "isAttr": true,
          "type": "Integer"
        },
        {
          "name": "completionQuantity",
          "default": "1",
          "isAttr": true,
          "type": "Integer"
        }
      ]
    },
    {
      "name": "ServiceTask",
      "superClass": [
        "Task"
      ],
      "properties": [
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "operationRef",
          "type": "Operation",
          "association": "A_operationRef_serviceTask",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "SubProcess",
      "superClass": [
        "Activity",
        "FlowElementsContainer"
      ],
      "properties": [
        {
          "name": "triggeredByEvent",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "artifacts",
          "type": "Artifact",
          "association": "A_artifacts_subProcess",
          "isMany": true
        }
      ]
    },
    {
      "name": "LoopCharacteristics",
      "isAbstract": true,
      "superClass": [
        "BaseElement"
      ]
    },
    {
      "name": "MultiInstanceLoopCharacteristics",
      "superClass": [
        "LoopCharacteristics"
      ],
      "properties": [
        {
          "name": "isSequential",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "behavior",
          "type": "MultiInstanceBehavior",
          "default": "All",
          "isAttr": true
        },
        {
          "name": "loopCardinality",
          "type": "Expression",
          "association": "A_loopCardinality_multiInstanceLoopCharacteristics"
        },
        {
          "name": "loopDataInputRef",
          "type": "ItemAwareElement",
          "association": "A_loopDataInputRef_multiInstanceLoopCharacteristics",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "loopDataOutputRef",
          "type": "ItemAwareElement",
          "association": "A_loopDataOutputRef_multiInstanceLoopCharacteristics",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "inputDataItem",
          "type": "DataInput",
          "association": "A_inputDataItem_multiInstanceLoopCharacteristics"
        },
        {
          "name": "outputDataItem",
          "type": "DataOutput",
          "association": "A_outputDataItem_multiInstanceLoopCharacteristics"
        },
        {
          "name": "completionCondition",
          "type": "Expression",
          "association": "A_completionCondition_multiInstanceLoopCharacteristics"
        },
        {
          "name": "complexBehaviorDefinition",
          "type": "ComplexBehaviorDefinition",
          "association": "A_complexBehaviorDefinition_multiInstanceLoopCharacteristics",
          "isMany": true
        },
        {
          "name": "oneBehaviorEventRef",
          "type": "EventDefinition",
          "association": "A_oneBehaviorEventRef_multiInstanceLoopCharacteristics",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "noneBehaviorEventRef",
          "type": "EventDefinition",
          "association": "A_noneBehaviorEventRef_multiInstanceLoopCharacteristics",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "StandardLoopCharacteristics",
      "superClass": [
        "LoopCharacteristics"
      ],
      "properties": [
        {
          "name": "testBefore",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "loopCondition",
          "type": "Expression",
          "association": "A_loopCondition_standardLoopCharacteristics"
        },
        {
          "name": "loopMaximum",
          "type": "Expression",
          "association": "A_loopMaximum_standardLoopCharacteristics"
        }
      ]
    },
    {
      "name": "CallActivity",
      "superClass": [
        "Activity"
      ],
      "properties": [
        {
          "name": "calledElementRef",
          "type": "CallableElement",
          "association": "A_calledElementRef_callActivity",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "Task",
      "superClass": [
        "Activity",
        "InteractionNode"
      ]
    },
    {
      "name": "SendTask",
      "superClass": [
        "Task"
      ],
      "properties": [
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "operationRef",
          "type": "Operation",
          "association": "A_operationRef_sendTask",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "messageRef",
          "type": "Message",
          "association": "A_messageRef_sendTask",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ReceiveTask",
      "superClass": [
        "Task"
      ],
      "properties": [
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "instantiate",
          "default": false,
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "operationRef",
          "type": "Operation",
          "association": "A_operationRef_receiveTask",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "messageRef",
          "type": "Message",
          "association": "A_messageRef_receiveTask",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ScriptTask",
      "superClass": [
        "Task"
      ],
      "properties": [
        {
          "name": "scriptFormat",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "script",
          "type": "String"
        }
      ]
    },
    {
      "name": "BusinessRuleTask",
      "superClass": [
        "Task"
      ],
      "properties": [
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "AdHocSubProcess",
      "superClass": [
        "SubProcess"
      ],
      "properties": [
        {
          "name": "completionCondition",
          "type": "Expression",
          "association": "A_completionCondition_adHocSubProcess"
        },
        {
          "name": "ordering",
          "type": "AdHocOrdering",
          "isAttr": true
        },
        {
          "name": "cancelRemainingInstances",
          "default": true,
          "isAttr": true,
          "type": "Boolean"
        }
      ]
    },
    {
      "name": "Transaction",
      "superClass": [
        "SubProcess"
      ],
      "properties": [
        {
          "name": "protocol",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "method",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "GlobalScriptTask",
      "superClass": [
        "GlobalTask"
      ],
      "properties": [
        {
          "name": "scriptLanguage",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "script",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "GlobalBusinessRuleTask",
      "superClass": [
        "GlobalTask"
      ],
      "properties": [
        {
          "name": "implementation",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "ComplexBehaviorDefinition",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "condition",
          "type": "FormalExpression",
          "association": "A_condition_complexBehaviorDefinition"
        },
        {
          "name": "event",
          "type": "ImplicitThrowEvent",
          "association": "A_event_complexBehaviorDefinition"
        }
      ]
    },
    {
      "name": "ResourceRole",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "resourceRef",
          "type": "Resource",
          "association": "A_resourceRef_activityResource",
          "isAttr": true,
          "isReference": true
        },
        {
          "name": "resourceParameterBindings",
          "type": "ResourceParameterBinding",
          "association": "A_resourceParameterBindings_activityResource",
          "isMany": true
        },
        {
          "name": "resourceAssignmentExpression",
          "type": "ResourceAssignmentExpression",
          "association": "A_resourceAssignmentExpression_activityResource"
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "ResourceParameterBinding",
      "properties": [
        {
          "name": "expression",
          "type": "Expression",
          "association": "A_expression_resourceParameterBinding"
        },
        {
          "name": "parameterRef",
          "type": "ResourceParameter",
          "association": "A_parameterRef_resourceParameterBinding",
          "isAttr": true,
          "isReference": true
        }
      ]
    },
    {
      "name": "ResourceAssignmentExpression",
      "properties": [
        {
          "name": "expression",
          "type": "Expression",
          "association": "A_expression_resourceAssignmentExpression"
        }
      ]
    },
    {
      "name": "Import",
      "properties": [
        {
          "name": "importType",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "location",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "namespace",
          "isAttr": true,
          "type": "String"
        }
      ]
    },
    {
      "name": "Definitions",
      "superClass": [
        "BaseElement"
      ],
      "properties": [
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "targetNamespace",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "expressionLanguage",
          "default": "http://www.w3.org/1999/XPath",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "typeLanguage",
          "default": "http://www.w3.org/2001/XMLSchema",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "imports",
          "type": "Import",
          "association": "A_imports_definition",
          "isMany": true
        },
        {
          "name": "extensions",
          "type": "Extension",
          "association": "A_extensions_definitions",
          "isMany": true
        },
        {
          "name": "relationships",
          "type": "Relationship",
          "association": "A_relationships_definition",
          "isMany": true
        },
        {
          "name": "rootElements",
          "type": "RootElement",
          "association": "A_rootElements_definition",
          "isMany": true
        },
        {
          "name": "diagrams",
          "association": "A_diagrams_definitions",
          "isMany": true,
          "type": "bpmndi:BPMNDiagram"
        },
        {
          "name": "exporter",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "exporterVersion",
          "isAttr": true,
          "type": "String"
        }
      ]
    }
  ],
  "emumerations": [
    {
      "name": "ProcessType",
      "literalValues": [
        {
          "name": "None"
        },
        {
          "name": "Public"
        },
        {
          "name": "Private"
        }
      ]
    },
    {
      "name": "GatewayDirection",
      "literalValues": [
        {
          "name": "Unspecified"
        },
        {
          "name": "Converging"
        },
        {
          "name": "Diverging"
        },
        {
          "name": "Mixed"
        }
      ]
    },
    {
      "name": "EventBasedGatewayType",
      "literalValues": [
        {
          "name": "Parallel"
        },
        {
          "name": "Exclusive"
        }
      ]
    },
    {
      "name": "RelationshipDirection",
      "literalValues": [
        {
          "name": "None"
        },
        {
          "name": "Forward"
        },
        {
          "name": "Backward"
        },
        {
          "name": "Both"
        }
      ]
    },
    {
      "name": "ItemKind",
      "literalValues": [
        {
          "name": "Physical"
        },
        {
          "name": "Information"
        }
      ]
    },
    {
      "name": "ChoreographyLoopType",
      "literalValues": [
        {
          "name": "None"
        },
        {
          "name": "Standard"
        },
        {
          "name": "MultiInstanceSequential"
        },
        {
          "name": "MultiInstanceParallel"
        }
      ]
    },
    {
      "name": "AssociationDirection",
      "literalValues": [
        {
          "name": "None"
        },
        {
          "name": "One"
        },
        {
          "name": "Both"
        }
      ]
    },
    {
      "name": "MultiInstanceBehavior",
      "literalValues": [
        {
          "name": "None"
        },
        {
          "name": "One"
        },
        {
          "name": "All"
        },
        {
          "name": "Complex"
        }
      ]
    },
    {
      "name": "AdHocOrdering",
      "literalValues": [
        {
          "name": "Parallel"
        },
        {
          "name": "Sequential"
        }
      ]
    }
  ],
  "prefix": "bpmn",
  "xml": {
    "alias": "lowerCase"
  }
}
},{}],32:[function(require,module,exports){
module.exports={
  "name": "BPMNDI",
  "uri": "http://www.omg.org/spec/BPMN/20100524/DI",
  "types": [
    {
      "name": "BPMNDiagram",
      "properties": [
        {
          "name": "plane",
          "type": "BPMNPlane",
          "association": "A_plane_diagram",
          "redefines": "di:Diagram#rootElement"
        },
        {
          "name": "labelStyle",
          "type": "BPMNLabelStyle",
          "association": "A_labelStyle_diagram",
          "isMany": true
        }
      ],
      "superClass": [
        "di:Diagram"
      ]
    },
    {
      "name": "BPMNPlane",
      "properties": [
        {
          "name": "bpmnElement",
          "association": "A_bpmnElement_plane",
          "isAttr": true,
          "isReference": true,
          "type": "bpmn:BaseElement",
          "redefines": "di:DiagramElement#modelElement"
        }
      ],
      "superClass": [
        "di:Plane"
      ]
    },
    {
      "name": "BPMNShape",
      "properties": [
        {
          "name": "bpmnElement",
          "association": "A_bpmnElement_shape",
          "isAttr": true,
          "isReference": true,
          "type": "bpmn:BaseElement",
          "redefines": "di:DiagramElement#modelElement"
        },
        {
          "name": "isHorizontal",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "isExpanded",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "isMarkerVisible",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "label",
          "type": "BPMNLabel",
          "association": "A_label_shape"
        },
        {
          "name": "isMessageVisible",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "participantBandKind",
          "type": "ParticipantBandKind",
          "isAttr": true
        },
        {
          "name": "choreographyActivityShape",
          "type": "BPMNShape",
          "association": "A_choreographyActivityShape_participantBandShape",
          "isAttr": true,
          "isReference": true
        }
      ],
      "superClass": [
        "di:LabeledShape"
      ]
    },
    {
      "name": "BPMNEdge",
      "properties": [
        {
          "name": "label",
          "type": "BPMNLabel",
          "association": "A_label_edge"
        },
        {
          "name": "bpmnElement",
          "association": "A_bpmnElement_edge",
          "isAttr": true,
          "isReference": true,
          "type": "bpmn:BaseElement",
          "redefines": "di:DiagramElement#modelElement"
        },
        {
          "name": "sourceElement",
          "association": "A_sourceElement_sourceEdge",
          "isAttr": true,
          "isReference": true,
          "type": "di:DiagramElement",
          "redefines": "di:Edge#source"
        },
        {
          "name": "targetElement",
          "association": "A_targetElement_targetEdge",
          "isAttr": true,
          "isReference": true,
          "type": "di:DiagramElement",
          "redefines": "di:Edge#target"
        },
        {
          "name": "messageVisibleKind",
          "type": "MessageVisibleKind",
          "isAttr": true
        }
      ],
      "superClass": [
        "di:LabeledEdge"
      ]
    },
    {
      "name": "BPMNLabel",
      "properties": [
        {
          "name": "labelStyle",
          "type": "BPMNLabelStyle",
          "association": "A_labelStyle_label",
          "isAttr": true,
          "isReference": true,
          "redefines": "di:DiagramElement#style"
        }
      ],
      "superClass": [
        "di:Label"
      ]
    },
    {
      "name": "BPMNLabelStyle",
      "properties": [
        {
          "name": "font",
          "type": "dc:Font"
        }
      ],
      "superClass": [
        "di:Style"
      ]
    }
  ],
  "emumerations": [
    {
      "name": "ParticipantBandKind",
      "literalValues": [
        {
          "name": "top_initiating"
        },
        {
          "name": "middle_initiating"
        },
        {
          "name": "bottom_initiating"
        },
        {
          "name": "top_non_initiating"
        },
        {
          "name": "middle_non_initiating"
        },
        {
          "name": "bottom_non_initiating"
        }
      ]
    },
    {
      "name": "MessageVisibleKind",
      "literalValues": [
        {
          "name": "initiating"
        },
        {
          "name": "non_initiating"
        }
      ]
    }
  ],
  "associations": [],
  "prefix": "bpmndi"
}
},{}],33:[function(require,module,exports){
module.exports={
  "name": "DC",
  "uri": "http://www.omg.org/spec/DD/20100524/DC",
  "types": [
    {
      "name": "Boolean"
    },
    {
      "name": "Integer"
    },
    {
      "name": "Real"
    },
    {
      "name": "String"
    },
    {
      "name": "Font",
      "properties": [
        {
          "name": "name",
          "type": "String",
          "isAttr": true
        },
        {
          "name": "size",
          "type": "Real",
          "isAttr": true
        },
        {
          "name": "isBold",
          "type": "Boolean",
          "isAttr": true
        },
        {
          "name": "isItalic",
          "type": "Boolean",
          "isAttr": true
        },
        {
          "name": "isUnderline",
          "type": "Boolean",
          "isAttr": true
        },
        {
          "name": "isStrikeThrough",
          "type": "Boolean",
          "isAttr": true
        }
      ]
    },
    {
      "name": "Point",
      "properties": [
        {
          "name": "x",
          "type": "Real",
          "default": "0",
          "isAttr": true
        },
        {
          "name": "y",
          "type": "Real",
          "default": "0",
          "isAttr": true
        }
      ]
    },
    {
      "name": "Bounds",
      "properties": [
        {
          "name": "x",
          "type": "Real",
          "default": "0",
          "isAttr": true
        },
        {
          "name": "y",
          "type": "Real",
          "default": "0",
          "isAttr": true
        },
        {
          "name": "width",
          "type": "Real",
          "isAttr": true
        },
        {
          "name": "height",
          "type": "Real",
          "isAttr": true
        }
      ]
    }
  ],
  "prefix": "dc",
  "associations": []
}
},{}],34:[function(require,module,exports){
module.exports={
  "name": "DI",
  "uri": "http://www.omg.org/spec/DD/20100524/DI",
  "types": [
    {
      "name": "DiagramElement",
      "isAbstract": true,
      "properties": [
        {
          "name": "owningDiagram",
          "type": "Diagram",
          "isReadOnly": true,
          "association": "A_rootElement_owningDiagram",
          "isVirtual": true,
          "isReference": true
        },
        {
          "name": "owningElement",
          "type": "DiagramElement",
          "isReadOnly": true,
          "association": "A_ownedElement_owningElement",
          "isVirtual": true,
          "isReference": true
        },
        {
          "name": "modelElement",
          "isReadOnly": true,
          "association": "A_modelElement_diagramElement",
          "isVirtual": true,
          "isReference": true,
          "type": "Element"
        },
        {
          "name": "style",
          "type": "Style",
          "isReadOnly": true,
          "association": "A_style_diagramElement",
          "isVirtual": true,
          "isReference": true
        },
        {
          "name": "ownedElement",
          "type": "DiagramElement",
          "isReadOnly": true,
          "association": "A_ownedElement_owningElement",
          "isVirtual": true,
          "isMany": true
        }
      ]
    },
    {
      "name": "Node",
      "isAbstract": true,
      "superClass": [
        "DiagramElement"
      ]
    },
    {
      "name": "Edge",
      "isAbstract": true,
      "superClass": [
        "DiagramElement"
      ],
      "properties": [
        {
          "name": "source",
          "type": "DiagramElement",
          "isReadOnly": true,
          "association": "A_source_sourceEdge",
          "isVirtual": true,
          "isReference": true
        },
        {
          "name": "target",
          "type": "DiagramElement",
          "isReadOnly": true,
          "association": "A_target_targetEdge",
          "isVirtual": true,
          "isReference": true
        },
        {
          "name": "waypoint",
          "isUnique": false,
          "isMany": true,
          "type": "dc:Point",
          "serialize": "xsi:type"
        }
      ]
    },
    {
      "name": "Diagram",
      "isAbstract": true,
      "properties": [
        {
          "name": "rootElement",
          "type": "DiagramElement",
          "isReadOnly": true,
          "association": "A_rootElement_owningDiagram",
          "isVirtual": true
        },
        {
          "name": "name",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "documentation",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "resolution",
          "isAttr": true,
          "type": "Real"
        },
        {
          "name": "ownedStyle",
          "type": "Style",
          "isReadOnly": true,
          "association": "A_ownedStyle_owningDiagram",
          "isVirtual": true,
          "isMany": true
        }
      ]
    },
    {
      "name": "Shape",
      "isAbstract": true,
      "superClass": [
        "Node"
      ],
      "properties": [
        {
          "name": "bounds",
          "type": "dc:Bounds"
        }
      ]
    },
    {
      "name": "Plane",
      "isAbstract": true,
      "superClass": [
        "Node"
      ],
      "properties": [
        {
          "name": "planeElement",
          "type": "DiagramElement",
          "subsettedProperty": "DiagramElement-ownedElement",
          "association": "A_planeElement_plane",
          "isMany": true
        }
      ]
    },
    {
      "name": "LabeledEdge",
      "isAbstract": true,
      "superClass": [
        "Edge"
      ],
      "properties": [
        {
          "name": "ownedLabel",
          "type": "Label",
          "isReadOnly": true,
          "subsettedProperty": "DiagramElement-ownedElement",
          "association": "A_ownedLabel_owningEdge",
          "isVirtual": true,
          "isMany": true
        }
      ]
    },
    {
      "name": "LabeledShape",
      "isAbstract": true,
      "superClass": [
        "Shape"
      ],
      "properties": [
        {
          "name": "ownedLabel",
          "type": "Label",
          "isReadOnly": true,
          "subsettedProperty": "DiagramElement-ownedElement",
          "association": "A_ownedLabel_owningShape",
          "isVirtual": true,
          "isMany": true
        }
      ]
    },
    {
      "name": "Label",
      "isAbstract": true,
      "superClass": [
        "Node"
      ],
      "properties": [
        {
          "name": "bounds",
          "type": "dc:Bounds"
        }
      ]
    },
    {
      "name": "Style",
      "isAbstract": true
    }
  ],
  "associations": [],
  "prefix": "di"
}
},{}],35:[function(require,module,exports){
module.exports = require('./lib/Diagram');
},{"./lib/Diagram":36}],36:[function(require,module,exports){
'use strict';

var di = require('didi');

/**
 * @namespace djs
 */

/**
 * Bootstrap an injector from a list of modules, instantiating a number of default components
 *
 * @param {Array<didi.Module>} bootstrapModules
 *
 * @return {didi.Injector} a injector to use to access the components
 */
function bootstrap(bootstrapModules) {

  var modules = [];
  var components = [];

  function hasModule(m) {
    return modules.indexOf(m) >= 0;
  }

  function addModule(m) {
    modules.push(m);
  }

  function visit(m) {
    if (hasModule(m)) {
      return;
    }

    (m.__depends__ || []).forEach(visit);

    if (hasModule(m)) {
      return;
    }

    addModule(m);

    (m.__init__ || []).forEach(function(c) {
      components.push(c);
    });
  }

  bootstrapModules.forEach(visit);

  var injector = new di.Injector(modules);

  components.forEach(function(c) {
    // eagerly resolve main components
    injector.get(c);
  });

  return injector;
}

/**
 * Creates an injector from passed options.
 *
 * @param  {Object} options
 * @return {didi.Injector}
 */
function createInjector(options) {

  options = options || {};

  var configModule = {
    'config': ['value', options]
  };

  var coreModule = require('./core');

  var modules = [ configModule, coreModule ].concat(options.modules || []);

  return bootstrap(modules);
}


/**
 * @class
 *
 * The main diagram-js entry point that bootstraps the diagram with the given
 * configuration.
 *
 *
 * To register extensions with the diagram, pass them as Array<didi.Module> to the constructor
 *
 * @example
 *
 * Given you would like to create a plug-in that logs whenever a shape
 * or connection was added to the canvas:
 *
 *   * Create the plug-in file:
 *
 *     ```javascript
 *     function MyLoggingPlugin(events) {
 *       events.on('shape.added', function(event) {
 *         console.log('shape ', event.shape, ' was added to the diagram');
 *       });
 *     }
 *
 *     module.exports = {
 *       __init__: [ 'myLoggingPlugin'],
 *       myLoggingPlugin: [ 'type', [ 'eventBus', MyLoggingPlugin ]]
 *     };
 *     ```
 *
 *   * Instantiate the diagram with the new plug-in
 *
 *     ```javascript
 *     var diagram = new Diagram({ modules: [ require('path-to-plugin-file') ] });
 *
 *     diagram.invoke([ 'canvas', function(canvas) {
 *       // add shape to drawing canvas
 *       canvas.addShape({ x: 10, y: 10 });
 *     });
 *
 *     // 'shape ... was added to the diagram' logged to console
 *     ```
 *
 * @param {Object} options
 * @param {Array<didi.Module>} [options.modules] external modules to instantiate with the diagram
 * @param {didi.Injector} [injector] an (optional) injector to bootstrap the diagram with
 */
function Diagram(options, injector) {

  // create injector unless explicitly specified
  this.injector = injector = injector || createInjector(options);

  // API

  /**
   * Resolves a diagram service
   *
   * @method Diagram#get
   *
   * @param {String} name the name of the diagram service to be retrieved
   * @param {Object} [locals] a number of locals to use to resolve certain dependencies
   */
  this.get = injector.get;

  /**
   * Executes a function into which diagram services are injected
   *
   * @method Diagram#invoke
   *
   * @param {Function|Object[]} fn the function to resolve
   * @param {Object} locals a number of locals to use to resolve certain dependencies
   */
  this.invoke = injector.invoke;

  // init

  // indicate via event


  /**
   * An event indicating that all plug-ins are loaded.
   *
   * Use this event to fire other events to interested plug-ins
   *
   * @memberOf Diagram
   *
   * @event diagram.init
   *
   * @example
   *
   * events.on('diagram.init', function() {
   *   events.fire('my-custom-event', { foo: 'BAR' });
   * });
   *
   * @type {Object}
   * @property {snapsvg.Paper} paper the initialized drawing paper
   */
  this.get('eventBus').fire('diagram.init');
}

module.exports = Diagram;


/**
 * Destroys the diagram
 *
 * @method  Diagram#destroy
 */
Diagram.prototype.destroy = function() {
  this.get('eventBus').fire('diagram.destroy');
};
},{"./core":44,"didi":61}],37:[function(require,module,exports){
'use strict';


var _ = (window._);

var AddShapeHandler = require('./cmd/AddShapeHandler'),
    AddConnectionHandler = require('./cmd/AddConnectionHandler');


/**
 * @type djs.ShapeDescriptor
 */

/**
 * Creates a HTML container element for a SVG element with
 * the given configuration
 *
 * @param  {Object} options
 * @return {DOMElement} the container element
 */
function createContainer(options) {

  options = _.extend({}, { width: '100%', height: '100%' }, options);

  var container = options.container || document.body;

  // create a <div> around the svg element with the respective size
  // this way we can always get the correct container size
  // (this is impossible for <svg> elements at the moment)
  var parent = document.createElement('div');
  parent.setAttribute('class', 'djs-container');

  parent.style.position = 'relative';
  parent.style.width = _.isNumber(options.width) ? options.width + 'px' : options.width;
  parent.style.height = _.isNumber(options.height) ? options.height + 'px' : options.height;

  container.appendChild(parent);

  return parent;
}


/**
 * @class
 *
 * @emits Canvas#canvas.init
 *
 * @param {Object} config
 * @param {EventBus} events
 * @param {CommandStack} commandStack
 * @param {GraphicsFactory} graphicsFactory
 * @param {ElementRegistry} elementRegistry
 */
function Canvas(config, events, commandStack, graphicsFactory, elementRegistry) {

  var options = _.extend(config.canvas || {});


  // Creates a <svg> element that is wrapped into a <div>.
  // This way we are always able to correctly figure out the size of the svg element
  // by querying the parent node.
  //
  // (It is not possible to get the size of a svg element cross browser @ 2014-04-01)
  //
  // <div class="djs-container" style="width: {desired-width}, height: {desired-height}">
  //   <svg width="100%" height="100%">
  //    ...
  //   </svg>
  // </div>

  var container = createContainer(options);
  var paper = createPaper(container);


  function createPaper(container) {
    return graphicsFactory.createPaper({ container: container, width: '100%', height: '100%' });
  }

  /**
   * Validate the id of an element, ensuring it is present and not yet assigned
   */
  function validateId(element) {

    if (!element.id) {
      throw new Error('element must have an id');
    }

    if (elementRegistry.getById(element.id)) {
      throw new Error('element with id ' + element.id + ' already exists');
    }
  }


  // register shape add handlers
  commandStack.registerHandler('shape.add', AddShapeHandler);

  // register connection add handlers
  commandStack.registerHandler('connection.add', AddConnectionHandler);



  /**
   * Adds a shape to the canvas
   *
   * @method Canvas#addShape
   *
   * @param {djs.ShapeDescriptor} shape a descriptor for the shape
   *
   * @return {Canvas} the canvas api
   */
  function addShape(shape) {

    validateId(shape);

    /**
     * An event indicating that a new shape has been added to the canvas.
     *
     * @memberOf Canvas
     *
     * @event shape.added
     * @type {Object}
     * @property {djs.ElementDescriptor} element the shape descriptor
     * @property {Object} gfx the graphical representation of the shape
     */

    commandStack.execute('shape.add', { shape: shape });

    /* jshint -W040 */
    return this;
  }


  /**
   * Adds a connection to the canvas
   *
   * @method Canvas#addConnection
   *
   * @param {djs.ElementDescriptor} connection a descriptor for the connection
   *
   * @return {Canvas} the canvas api
   */
  function addConnection(connection) {

    validateId(connection);

    /**
     * An event indicating that a new connection has been added to the canvas.
     *
     * @memberOf Canvas
     *
     * @event connection.added
     * @type {Object}
     * @property {djs.ElementDescriptor} element the connection descriptor
     * @property {Object} gfx the graphical representation of the connection
     */

    commandStack.execute('connection.add', { connection: connection });

    /* jshint -W040 */
    return this;
  }

  /**
   * Sends a shape to the front.
   *
   * This method takes parent / child relationships between shapes into account
   * and makes sure that children are properly handled, too.
   *
   * @method Canvas#sendToFront
   *
   * @param {djs.ElementDescriptor} shape descriptor of the shape to be sent to front
   * @param {boolean} bubble=true whether to send parent shapes to front, too
   */
  function sendToFront(shape, bubble) {

    if (bubble !== false) {
      bubble = true;
    }

    if (bubble && shape.parent) {
      sendToFront(shape.parent);
    }

    if (shape.children) {
      shape.children.forEach(function(child) {
        sendToFront(child, false);
      });
    }

    var gfx = getGraphics(shape),
        gfxParent = gfx.parent();

    gfx.remove().appendTo(gfxParent);
  }

  /**
   * Return the graphical object underlaying a certain diagram element
   *
   * @method Canvas#getGraphics
   *
   * @param {djs.ElementDescriptor} element descriptor of the element
   */
  function getGraphics(element) {
    return elementRegistry.getGraphicsByElement(element);
  }

  /**
   * Returns the underlaying graphics context.
   *
   * @method Canvas#getPaper
   *
   * @returns {snapsvg.Paper} the global paper object
   */
  function getPaper() {
    return paper;
  }

  /**
   * Returns the size of the canvas
   *
   * @return {Object} with x/y coordinates
   */
  function getSize() {

    return {
      width: container.clientWidth,
      height: container.clientHeight
    };
  }

  function parseViewBox(str) {
    if (!str) {
      return;
    }

    var value = str.split(/\s/);

    return {
      x: parseInt(value[0], 10),
      y: parseInt(value[1], 10),
      width: parseInt(value[2], 10),
      height: parseInt(value[3], 10),
    };
  }

  /**
   * Gets or sets the view box of the canvas, i.e. the area that is currently displayed
   *
   * @method Canvas#viewbox
   *
   * @param  {Object} [box] the new view box to set
   * @return {Object} the current view box
   */
  function viewbox(box) {

    var svg = paper.node,
        bbox = svg.getBBox();

    function round(i, accuracy) {
      if (!i) {
        return i;
      }

      accuracy = accuracy || 100;
      return Math.round(i * accuracy) / accuracy;
    }

    var inner = {
      width: round(bbox.width + bbox.x),
      height: round(bbox.height + bbox.y)
    };

    // returns the acutal embedded size of the SVG element
    // would be awesome to be able to use svg.client(Width|Height) or
    // svg.getBoundingClientRect(). Not supported in IE/Firefox though
    var outer = getSize(svg);

    if (box === undefined) {
      box = parseViewBox(svg.getAttribute('viewBox'));

      if (!box) {
        box = { x: 0, y: 0, width: outer.width, height: outer.height };
      }

      // calculate current scale based on svg bbox (inner) and viewbox (outer)
      box.scale = round(Math.min(outer.width / box.width, outer.height / box.height));

      box.inner = inner;
      box.outer = outer;
    } else {
      svg.setAttribute('viewBox', [ box.x, box.y, box.width, box.height ].join(' '));
      events.fire('canvas.viewbox.changed', { viewbox: viewbox() });
    }

    return box;
  }

  /**
   * Gets or sets the scroll of the canvas.
   *
   * @param {Object} [delta] the new scroll to apply.
   *
   * @param {Number} [delta.dx]
   * @param {Number} [delta.dy]
   *
   * @return {Point} the new scroll
   */
  function scroll(delta) {

    var vbox = viewbox();

    if (delta) {
      if (delta.dx) {
        vbox.x += delta.dx;
      }

      if (delta.dy) {
        vbox.y += delta.dy;
      }

      viewbox(vbox);
    }

    return { x: vbox.x, y: vbox.y };
  }

  /**
   * Gets or sets the current zoom of the canvas, optionally zooming to the specified position.
   *
   * @method Canvas#zoom
   *
   * @param {String|Number} [newScale] the new zoom level, either a number, i.e. 0.9,
   *                                   or `fit-viewport` to adjust the size to fit the current viewport
   * @param {String|Point} [center] the reference point { x: .., y: ..} to zoom to, 'auto' to zoom into mid or null
   *
   * @return {Number} the current scale
   */
  function zoom(newScale, center) {

    var vbox = viewbox(),
        inner = vbox.inner,
        outer = vbox.outer;

    if (newScale === undefined) {
      return vbox.scale;
    }

    if (newScale === 'fit-viewport') {
      newScale = Math.min(outer.width / inner.width, outer.height / inner.height, 1.0);

      // reset viewbox so that everything is visible
      _.extend(vbox, { x: 0, y: 0 });
    }

    if (center === 'auto') {
      center = {
        x: outer.width / 2 - 1,
        y: outer.height / 2 - 1
      };
    }

    if (center) {

      // zoom to center (i.e. simulate a maps like behavior)

      // center on old zoom
      var pox = center.x / vbox.scale + vbox.x;
      var poy = center.y / vbox.scale + vbox.y;

      // center on new zoom
      var pnx = center.x / newScale;
      var pny = center.y / newScale;

      // delta = new offset
      var px = pox - pnx;
      var py = poy - pny;

      var position = {
        x: px,
        y: py
      };

      _.extend(vbox, position);
    }

    _.extend(vbox, {
      width: outer.width / newScale,
      height: outer.height / newScale
    });

    viewbox(vbox);

    // return current scale
    return newScale;
  }

  events.on('diagram.init', function(event) {

    /**
     * An event indicating that the canvas is ready to be drawn on.
     *
     * @memberOf Canvas
     *
     * @event canvas.init
     *
     * @type {Object}
     * @property {snapsvg.Paper} paper the initialized drawing paper
     */
    events.fire('canvas.init', { paper: paper });
  });

  events.on('diagram.destroy', function() {

    if (container) {
      var parent = container.parentNode;
      parent.removeChild(container);
    }

    container = null;
    paper = null;
  });


  // redraw shapes / connections on change

  var self = this;

  events.on('element.changed', function(event) {

    if (event.element.waypoints) {
      events.fire('connection.changed', event);
    } else {
      events.fire('shape.changed', event);
    }
  });

  events.on('shape.changed', function(event) {
    var element = event.element;
    graphicsFactory.updateShape(element, event.gfx || self.getGraphics(element));
  });

  events.on('connection.changed', function(event) {
    var element = event.element;
    graphicsFactory.updateConnection(element, event.gfx || self.getGraphics(element));
  });


  this.zoom = zoom;
  this.scroll = scroll;

  this.viewbox = viewbox;
  this.addShape = addShape;

  this.addConnection = addConnection;
  this.getPaper = getPaper;

  this.getGraphics = getGraphics;

  this.sendToFront = sendToFront;
}

/**
 * Return the absolute bounding box for the given element
 *
 * The absolute bounding box may be used to display overlays in the
 * callers (browser) coordinate system rather than the zoomed in/out
 * canvas coordinates.
 *
 * @param  {ElementDescriptor} element
 * @return {Bounds} the absolute bounding box
 */
Canvas.prototype.getAbsoluteBBox = function(element) {
  var vbox = this.viewbox();

  var gfx = this.getGraphics(element);

  var transformBBox = gfx.getBBox(true);
  var bbox = gfx.getBBox();

  var x = (bbox.x - transformBBox.x) * vbox.scale - vbox.x * vbox.scale;
  var y = (bbox.y - transformBBox.y) * vbox.scale - vbox.y * vbox.scale;

  var width = (bbox.width + 2 * transformBBox.x) * vbox.scale;
  var height = (bbox.height + 2 * transformBBox.y) * vbox.scale;

  return {
    x: x,
    y: y,
    width: width,
    height: height
  };
};

Canvas.$inject = [
  'config',
  'eventBus',
  'commandStack',
  'graphicsFactory',
  'elementRegistry' ];

module.exports = Canvas;
},{"./cmd/AddConnectionHandler":42,"./cmd/AddShapeHandler":43}],38:[function(require,module,exports){
'use strict';

var _ = (window._);


/**
 * @namespace djs
 */

/**
 * @class
 *
 * This service offer an action history for the application.
 * So that the diagram can support undo/redo. All actions applied
 * to the diagram must be invoked through this Service.
 *
 * @param {Injector} injector
 * @param {EventBus} events
 */
function CommandStack(injector, events) {

  /**
   *
   * @type {Object} Key is the command id and value is a list of registered handler methods}
   */
  var handlerMap = {};

  /**
   * The stack containing all re/undoable actions on the diagram
   * @type {Array<Object>}
   */
  var stack = [];

  /**
   * The current index on the stack
   * @type {Number}
   */
  var stackIdx = -1;


  function redoAction() {
    return stack[stackIdx + 1];
  }

  function undoAction() {
    return stack[stackIdx];
  }

  /**
   * Execute all registered actions for this command id
   *
   * @param {String} id of the action
   * @param {Object} ctx is a parameter object for the executed action
   */
  function execute(id, ctx) {
    var action = { id: id, ctx: ctx };

    internalExecute(action);
  }

  /**
   * Execute all registered actions for this command id
   *
   * @param {String} id of the action
   * @param {Object} ctx is a parameter object for the executed action
   * @param {Boolean} saveRedoStack if true the redo stack is not reset.
   *                  This must be set when an redo action is applied.
   */
  function internalExecute(action) {
    var id = action.id,
        ctx = action.ctx;

    if (!action.id) {
      throw new Error('action has no id');
    }

    events.fire('commandStack.execute', { id: id });

    var handlers = getHandlers(id);

    if (!(handlers && handlers.length)) {
      console.warn('no command handler registered for ', id);
    }

    var executedHandlers = [];

    _.forEach(handlers, function(handler) {
      if (handler.execute(ctx)) {
        executedHandlers.push(handler);
      } else {
        // TODO(nre): handle revert case, i.e. the situation that one of a number of handlers fail
      }
    });

    executeFinished(action);
  }

  function executeFinished(action) {
    if (redoAction() !== action) {
      stack.splice(stackIdx + 1, stack.length, action);
    }

    stackIdx++;

    events.fire('commandStack.changed');
  }


  function undo() {

    var action = undoAction();
    if (!action) {
      return false;
    }

    events.fire('commandStack.revert', { id: action.id });

    var handlers = getHandlers(action.id);
    _.forEach(handlers, function(handler) {
      handler.revert(action.ctx);
    });

    revertFinished(action);
  }

  function revertFinished(action) {
    stackIdx--;

    events.fire('commandStack.changed');
  }

  function redo() {

    var action = redoAction();
    if (action) {
      internalExecute(action);
    }

    return action;
  }

  function getHandlers(id) {
    if (id) {
      return handlerMap[id];
    } else {
      return handlerMap;
    }
  }

  function addHandler(id, handler) {
    assertValidId(id);

    var handlers = handlerMap[id];
    if (!handlers) {
      handlerMap[id] = handlers = [];
    }

    handlers.push(handler);
  }

  function getStack() {
    return stack;
  }

  function getStackIndex() {
    return stackIdx;
  }

  function clear() {
    stack.length = 0;
    stackIdx = -1;

    events.fire('commandStack.changed');
  }


  ////// registration ////////////////////////////////////////

  function assertValidId(id) {
    if (!id) {
      throw new Error('no id specified');
    }
  }

  function register(id, handler) {
    addHandler(id, handler);
  }

  function registerHandler(command, handlerCls) {

    if (!command || !handlerCls) {
      throw new Error('command and handlerCls must be defined');
    }

    var handler = injector.instantiate(handlerCls);
    register(command, handler);
  }

  this.execute = execute;
  this.undo = undo;
  this.redo = redo;
  this.clear = clear;
  this.getStack = getStack;
  this.getStackIndex = getStackIndex;
  this.getHandlers = getHandlers;
  this.registerHandler = registerHandler;
  this.register = register;
}

CommandStack.$inject = [ 'injector', 'eventBus' ];

module.exports = CommandStack;
},{}],39:[function(require,module,exports){
'use strict';

var _ = (window._);


/**
 * @class
 *
 * A registry that keeps track of all shapes in the diagram.
 *
 * @param {EventBus} eventBus the event bus
 */
function ElementRegistry(eventBus) {

  // mapping shape.id -> container
  var shapeMap = {};

  // mapping gfx.id -> container
  var graphicsMap = {};

  function addShape(shape, gfx) {
    if (!shape.id) {
      throw new Error('[shapes] shape has no id');
    }

    if (!gfx.id) {
      throw new Error('[shapes] graphics has no id');
    }

    if (graphicsMap[gfx.id]) {
      throw new Error('graphics with id ' + gfx.id + ' already registered');
    }

    if (shapeMap[shape.id]) {
      throw new Error('shape with id ' + shape.id + ' already added');
    }

    shapeMap[shape.id] = graphicsMap[gfx.id] = { shape: shape, gfx: gfx };
  }

  function removeShape(shape) {
    var gfx = getGraphicsByElement(shape);

    if (shape.parent) {
      for(var i = 0; i < shape.parent.children.length;i++) {
        if(shape.parent.children[i].id === shape.id) {
          shape.parent.children.splice(i, 1);
        }
      }
    }
   // delete shape.parent.children[];
    delete shapeMap[shape.id];
    delete graphicsMap[gfx.id];
  }

  /**
   * @method ElementRegistry#getByGraphics
   */
  function getByGraphics(gfx) {
    var id = _.isString(gfx) ? gfx : gfx.id;

    var container = graphicsMap[id];
    if (container) {
      return container.shape;
    }
  }

  /**
   * @method ElementRegistry#getById
   */
  function getById(id) {
    var container = shapeMap[id];
    if (container) {
      return container.shape;
    }
  }

  /**
   * @method ElementRegistry#getGraphicsByElement
   */
  function getGraphicsByElement(shape) {
    var id = _.isString(shape) ? shape : shape.id;

    var container = shapeMap[id];
    if (container) {
      return container.gfx;
    }
  }

  eventBus.on('shape.added', function(event) {
    addShape(event.element, event.gfx);
  });

  eventBus.on('connection.added', function(event) {
    addShape(event.element, event.gfx);
  });

  eventBus.on('shape.removed', function(event) {
    removeShape(event.element);
  });

  eventBus.on('connection.removed', function(event) {
    removeShape(event.element);
  });

  return {
    getGraphicsByElement: getGraphicsByElement,
    getById: getById,
    getByGraphics: getByGraphics
  };
}

ElementRegistry.$inject = [ 'eventBus' ];

module.exports = ElementRegistry;
},{}],40:[function(require,module,exports){
'use strict';

var _ = (window._);

/**
 * @global
 * @type {Object}
 * @static
 */
var EventPriority = {
  standard: 1000,
  overwrite: 10000
};

/**
 * @class
 *
 * A general purpose event bus
 */
function EventBus() {
  var listenerMap = {};

  function getListeners(name) {
    var listeners = listenerMap[name];

    if (!listeners) {
      listeners = listenerMap[name] = [];
    }

    return listeners;
  }

  function extendEvent(event, type) {

    var propagationStopped,
        defaultPrevented;

    _.extend(event, {
      type: type,

      stopPropagation: function() {
        this.propagationStopped = true;
      },
      preventDefault: function() {
        this.defaultPrevented = true;
      },

      isPropagationStopped: function() {
        return !!this.propagationStopped;
      },

      isDefaultPrevented: function() {
        return !!this.defaultPrevented;
      }
    });

    return event;
  }

  /**
   * Register an event listener for events with the given name.
   *
   * The callback will be invoked with `event, ...additionalArguments`
   * that have been passed to the evented element.
   *
   * @method Events#on
   *
   * @param {String} event
   * @param {Function} callback
   * @param {Number} Set priority to influence the execution order of the callbacks.
   * The default priority is 1000. It should only set to higher values (> {@link EventPriority#overwrite}) if
   * there is real need for a changed execution priority.
   */
  function on(event, callback, priority) {
    if(priority && !_.isNumber(priority)) {
      console.error('Priority needs to be a number');
      priority = EventPriority.standard;
    }
    if(!priority) {
      priority = EventPriority.standard;
    }
    var listeners = getListeners(event);
    addEventToArray(listeners, callback, priority);
  }

  /**
   * Register an event listener that is executed only once.
   *
   * @method Events#once
   *
   * @param {String} event the event name to register for
   * @param {Function} callback the callback to execute
   *
   * @see Events#on
   */
  function once(event, callback) {

    /* jshint -W040 */

    var self = this;
    var wrappedCallback = function() {
      var eventType = arguments[0].type;
      callback.apply(this, arguments);
      self.off(eventType, wrappedCallback);
    };

    this.on(event, wrappedCallback);
  }

  /**
   * Removes event listeners by event and callback.
   *
   * If no callback is given, all listeners for a given event name are being removed.
   *
   * @method Events#off
   *
   * @param {String} event
   * @param {Function} [callback]
   */
  function off(event, callback) {
    var listeners, idx;

    listeners = getListeners(event);
    if (callback) {
      _.forEach(listeners, function(listener) {
        if(listener.callback === callback) {
          idx = listeners.indexOf(listener);
        }
      });

      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    } else {
      listeners.length = 0;
    }
  }

  /**
   * Fires a named event.
   *
   * @method Events#fire
   *
   * @example
   *
   * // fire event by name
   * events.fire('foo');
   *
   * // fire event object with nested type
   * var event = { type: 'foo' };
   * events.fire(event);
   *
   * // fire event with explicit type
   * var event = { x: 10, y: 20 };
   * events.fire('element.moved', event);
   *
   * // pass additional arguments to the event
   * events.on('foo', function(event, bar) {
   *   alert(bar);
   * });
   *
   * events.fire({ type: 'foo' }, 'I am bar!');
   *
   * @param {String} [name] the optional event name
   * @param {Object} [event] the event object
   * @param {...Object} additional arguments to be passed to the callback functions
   */
  function fire() {

    /* jshint -W040 */

    var event, eventType,
        listeners, i, l,
        args;

    args = Array.prototype.slice.call(arguments);

    eventType = args[0];

    if (_.isObject(eventType)) {
      event = eventType;

      // parse type from event
      eventType = event.type;
    } else {
      // remove name parameter
      args.shift();

      event = args[0] || {};
      event.type = eventType;
      if(args.length === 0) {
        args.push(event);
      }
    }

    listeners = getListeners(eventType);
    event = extendEvent(event, eventType);

    for (i = 0, l; !!(l = listeners[i]); i++) {
      if (event.isPropagationStopped()) {
        break;
      }
      l.callback.apply(this, args);
    }
  }

  function addEventToArray(array, callback, priority) {

    array.push({
      priority: priority,
      callback: callback
    });

    array.sort(function(a, b) {
      if(a.priority < b.priority) {
        return 1;
      } else if (a.priority > b.priority) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  this.on = on;
  this.once = once;
  this.off = off;
  this.fire = fire;
}


module.exports = EventBus;
},{}],41:[function(require,module,exports){
'use strict';

/**
 * Creates a gfx container for shapes and connections
 *
 * The layout is as follows:
 *
 * <g data-element-id="element-1" class="djs-group djs-(type=shape|connection)">
 *   <g class="djs-visual">
 *     <!-- the renderer draws in here -->
 *   </g>
 *
 *   <!-- extensions (overlays, click box, ...) goes here
 * </g>
 *
 * @param {Object} root
 * @param {String} type the type of the element, i.e. shape | connection
 */
function createContainer(root, type) {
  var gfxContainer = root.group();

  gfxContainer
    .addClass('djs-group')
    .addClass('djs-' + type);

  var gfxGroup = gfxContainer.group().addClass('djs-visual');

  return gfxContainer;
}

/**
 * Clears the graphical representation of the element and returns the
 * cleared result (the <g class="djs-visual" /> element).
 */
function clearVisual(gfx) {

  var oldVisual = gfx.select('.djs-visual');

  var newVisual = gfx.group().addClass('djs-visual').before(oldVisual);

  oldVisual.remove();

  return newVisual;
}


function createContainerFactory(type) {
  return function(root, data) {
    return createContainer(root, type).attr('data-element-id', data.id);
  };
}


/**
 * A factory that creates graphical elements
 *
 * @param {Renderer} renderer
 * @param {Snap} snap
 */
function GraphicsFactory(renderer, snap) {
  this._renderer = renderer;
  this._snap = snap;
}

GraphicsFactory.prototype.createShape = createContainerFactory('shape');

GraphicsFactory.prototype.createConnection = createContainerFactory('connection');

GraphicsFactory.prototype.createPaper = function(options) {
  return this._snap.createSnapAt(options.width, options.height, options.container);
};


GraphicsFactory.prototype.updateShape = function(element, gfx) {

  // clear visual
  var gfxGroup = clearVisual(gfx);

  // redraw
  this._renderer.drawShape(gfxGroup, element);

  // update positioning
  gfx.translate(element.x, element.y);

  if (element.hidden) {
    gfx.attr('visibility', 'hidden');
  }
};


GraphicsFactory.prototype.updateConnection = function(element, gfx) {

  // clear visual
  var gfxGroup = clearVisual(gfx);
  this._renderer.drawConnection(gfxGroup, element);

  if (element.hidden) {
    gfx.attr('visibility', 'hidden');
  }
};


GraphicsFactory.$inject = [ 'renderer', 'snap' ];

module.exports = GraphicsFactory;
},{}],42:[function(require,module,exports){
'use strict';


var _ = (window._);


/**
 * Implements re- and undoable addition of connections to the diagram
 *
 * @param {EventBus} events
 * @param {GraphicsFactory} graphicsFactory
 * @param {ElementRegistry} shapes
 */
function AddConnectionHandler(events, graphicsFactory, shapes) {

  var paper;

  /**
   * Execute add
   */
  function execute(ctx) {

    var connection = ctx.connection;

    var gfx = graphicsFactory.createConnection(paper, connection);

    events.fire('connection.changed', { element: connection, gfx: gfx });
    events.fire('connection.added', { element: connection, gfx: gfx });

    return gfx;
  }


  /**
   * Execute revert
   */
  function revert(ctx) {

    var connection = ctx.connection,
        gfx = shapes.getGraphicsByElement(connection);

    events.fire('connection.removed', { element: connection, gfx: gfx });

    gfx.remove();
  }


  function canExecute(ctx) {
    return true;
  }


  // load paper from canvas init event
  events.on('canvas.init', function(e) {
    paper = e.paper;
  });


  // API

  this.execute = execute;
  this.revert = revert;

  this.canExecute = canExecute;
}


AddConnectionHandler.$inject = ['eventBus', 'graphicsFactory', 'elementRegistry'];

// export
module.exports = AddConnectionHandler;
},{}],43:[function(require,module,exports){
'use strict';


var _ = (window._),
    setParent = require('../../util/ShapeUtil').setParent;


/**
 * Implements re- and undoable addition of shapes to the diagram
 *
 * @param {EventBus} events
 * @param {GraphicsFactory} graphicsFactory
 * @param {ElementRegistry} shapes
 */
function AddShapeHandler(events, graphicsFactory, shapes) {

  var paper;

  /**
   * Execute add
   */
  function execute(ctx) {

    var shape = ctx.shape,
        parent = ctx.parent || shape.parent;

    // remember parent outside shape
    ctx.parent = parent;

    // establish shape -> parent -> shape relationship
    setParent(shape, parent);

    var gfx = graphicsFactory.createShape(paper, shape);

    events.fire('shape.changed', { element: shape, gfx: gfx });

    events.fire('shape.added', { element: shape, gfx: gfx });

    return gfx;
  }


  /**
   * Execute revert
   */
  function revert(ctx) {

    var shape = ctx.shape,
        gfx = shapes.getGraphicsByElement(shape);

    setParent(shape, null);

    events.fire('shape.removed', { element: shape, gfx: gfx });

    gfx.remove();
  }


  function canExecute(ctx) {
    return true;
  }


  // load paper from canvas init event
  events.on('canvas.init', function(e) {
    paper = e.paper;
  });


  // API

  this.execute = execute;
  this.revert = revert;

  this.canExecute = canExecute;
}


AddShapeHandler.$inject = ['eventBus', 'graphicsFactory', 'elementRegistry'];

// export
module.exports = AddShapeHandler;
},{"../../util/ShapeUtil":59}],44:[function(require,module,exports){
'use strict';

module.exports = {
  __depends__: [ require('../draw') ],
  __init__: [ 'canvas' ],
  canvas: [ 'type', require('./Canvas') ],
  commandStack: [ 'type', require('./CommandStack') ],
  elementRegistry: [ 'type', require('./ElementRegistry') ],
  eventBus: [ 'type', require('./EventBus') ],
  graphicsFactory: [ 'type', require('./GraphicsFactory') ]
};
},{"../draw":48,"./Canvas":37,"./CommandStack":38,"./ElementRegistry":39,"./EventBus":40,"./GraphicsFactory":41}],45:[function(require,module,exports){
'use strict';

// required components

function flattenPoints(points) {
  var result = [];

  for (var i = 0, p; !!(p = points[i]); i++) {
    result.push(p.x);
    result.push(p.y);
  }

  return result;
}


/**
 * @class Renderer
 *
 * The default renderer used for shapes and connections.
 *
 * @param {Styles} styles
 */
function Renderer(styles) {
  this.CONNECTION_STYLE = styles.style([ 'no-fill' ]);
  this.SHAPE_STYLE = styles.style({ fill: 'fuchsia' });
}

Renderer.prototype.drawShape = function drawShape(gfxGroup, data) {
  if (!data.width || !data.height) {
    throw new Error('must specify width and height properties for new shape');
  }

  return gfxGroup.rect(0, 0, data.width, data.height, 10, 10).attr(this.SHAPE_STYLE);
};

Renderer.prototype.drawConnection = function drawConnection(gfxGroup, data) {
  var points = flattenPoints(data.waypoints);
  return gfxGroup.polyline(points).attr(this.CONNECTION_STYLE);
};


Renderer.$inject = ['styles'];


module.exports = Renderer;
module.exports.flattenPoints = flattenPoints;
},{}],46:[function(require,module,exports){
var snapsvg = (window.Snap);

// require snapsvg extensions
require('./snapsvg-extensions');

module.exports = snapsvg;
},{"./snapsvg-extensions":49}],47:[function(require,module,exports){
'use strict';

var _ = (window._);


/**
 * A component that manages shape styles
 */
function Styles() {

  var defaultTraits = {

    'no-fill': {
      fill: 'none'
    },
    'no-border': {
      strokeOpacity: 0.0
    },
    'no-events': {
      pointerEvents: 'none'
    }
  };

  /**
   * Builds a style definition from a className, a list of traits and an object of additional attributes.
   *
   * @param  {String} className
   * @param  {Array<String>} traits
   * @param  {Object} additionalAttrs
   *
   * @return {Object} the style defintion
   */
  this.cls = function(className, traits, additionalAttrs) {
    var attrs = this.style(traits, additionalAttrs);

    return _.extend(attrs, { 'class': className });
  };

  /**
   * Builds a style definition from a list of traits and an object of additional attributes.
   *
   * @param  {Array<String>} traits
   * @param  {Object} additionalAttrs
   *
   * @return {Object} the style defintion
   */
  this.style = function(traits, additionalAttrs) {

    if (!_.isArray(traits) && !additionalAttrs) {
      additionalAttrs = traits;
      traits = [];
    }

    var attrs = _.inject(traits, function(attrs, t) {
      return _.extend(attrs, defaultTraits[t] || {});
    }, {});

    return additionalAttrs ? _.extend(attrs, additionalAttrs) : attrs;
  };
}

module.exports = Styles;
},{}],48:[function(require,module,exports){
'use strict';

module.exports = {
  renderer: [ 'type', require('./Renderer') ],
  snap: [ 'value', require('./Snap') ],
  styles: [ 'type', require('./Styles') ]
};
},{"./Renderer":45,"./Snap":46,"./Styles":47}],49:[function(require,module,exports){
'use strict';

var Snap = (window.Snap);

/**
 * @module snapsvg/extensions
 */

/**
 * @namespace snapsvg
 */

/**
 * @class snapsvg.Element
 */

/**
 * @class ClassPlugin
 *
 * Extends snapsvg with methods to add and remove classes
 */
Snap.plugin(function (Snap, Element, Paper, global) {

  function split(str) {
    return str.split(/\s+/);
  }

  function join(array) {
    return array.join(' ');
  }

  function getClasses(e) {
    return split(e.attr('class') || '');
  }

  function setClasses(e, classes) {
    e.attr('class', join(classes));
  }

  /**
   * @method snapsvg.Element#addClass
   *
   * @example
   *
   * e.attr('class', 'selector');
   *
   * e.addClass('foo bar'); // adds classes foo and bar
   * e.attr('class'); // -> 'selector foo bar'
   *
   * e.addClass('fooBar');
   * e.attr('class'); // -> 'selector foo bar fooBar'
   *
   * @param {String} cls classes to be added to the element
   *
   * @return {snapsvg.Element} the element (this)
   */
  Element.prototype.addClass = function(cls) {
    var current = getClasses(this),
        add = split(cls),
        i, e;

    for (i = 0, e; !!(e = add[i]); i++) {
      if (current.indexOf(e) === -1) {
        current.push(e);
      }
    }

    setClasses(this, current);

    return this;
  };

  /**
   * @method snapsvg.Element#hasClass
   *
   * @param  {String}  cls the class to query for
   * @return {Boolean} returns true if the element has the given class
   */
  Element.prototype.hasClass = function(cls) {
    if (!cls) {
      throw new Error('[snapsvg] syntax: hasClass(clsStr)');
    }

    return getClasses(this).indexOf(cls) !== -1;
  };

  /**
   * @method snapsvg.Element#removeClass
   *
   * @example
   *
   * e.attr('class', 'foo bar');
   *
   * e.removeClass('foo');
   * e.attr('class'); // -> 'bar'
   *
   * e.removeClass('foo bar'); // removes classes foo and bar
   * e.attr('class'); // -> ''
   *
   * @param {String} cls classes to be removed from element
   *
   * @return {snapsvg.Element} the element (this)
   */
  Element.prototype.removeClass = function(cls) {
    var current = getClasses(this),
        remove = split(cls),
        i, e, idx;

    for (i = 0, e; !!(e = remove[i]); i++) {
      idx = current.indexOf(e);

      if (idx !== -1) {
        // remove element from array
        current.splice(idx, 1);
      }
    }

    setClasses(this, current);

    return this;
  };

});

/**
 * @class TranslatePlugin
 *
 * Extends snapsvg with methods to translate elements
 */
Snap.plugin(function (Snap, Element, Paper, global) {

  /*
   * @method snapsvg.Element#translate
   *
   * @example
   *
   * e.translate(10, 20);
   *
   * // sets transform matrix to translate(10, 20)
   *
   * @param {Number} x translation
   * @param {Number} y translation
   *
   * @return {snapsvg.Element} the element (this)
   */
  Element.prototype.translate = function(x, y) {
    var matrix = new Snap.Matrix();
    matrix.translate(x, y);
    this.transform(matrix);
  };
});

/**
 * @class CreatSnapAtPlugin
 *
 * Extends snap.svg with a method to create a SVG element
 * at a specific position in the DOM.
 */
Snap.plugin(function (Snap, Element, Paper, global) {

  /*
   * @method snapsvg.createSnapAt
   *
   * @example
   *
   * snapsvg.createSnapAt(parentNode, 200, 200);
   *
   * @param {Number} width of svg
   * @param {Number} height of svg
   * @param {Object} parentNode svg Element will be child of this
   *
   * @return {snapsvg.Element} the newly created wrapped SVG element instance
   */
  Snap.createSnapAt = function(width, height, parentNode) {

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    if (!parentNode) {
      parentNode = document.body;
    }
    parentNode.appendChild(svg);

    return new Snap(svg);
  };
});
},{}],50:[function(require,module,exports){
'use strict';


var _ = (window._);

var GraphicsUtil = require('../../util/GraphicsUtil');


/**
 * @class
 *
 * A plugin that provides interactivity in terms of events (mouse over and selection to a diagram).
 *
 * @param {EventBus} events the event bus to attach to
 */
function InteractionEvents(events, styles) {

  var HIT_STYLE = styles.cls('djs-hit', [ 'no-fill', 'no-border' ], {
    pointerEvents: 'stroke',
    stroke: 'white',
    strokeWidth: 10
  });

  function isCtxSwitch(e) {
    return !e.relatedTarget || e.target.parentNode !== e.relatedTarget.parentNode;
  }

  function fire(event, baseEvent, eventName) {
    var e = _.extend({}, baseEvent, event);
    events.fire(eventName, e);
  }

  function makeSelectable(element, gfx, options) {
    var dblclick = options.dblclick,
        type = options.type;

    var baseEvent = { element: element, gfx: gfx };

    var visual = GraphicsUtil.getVisual(gfx);

    var hit;

    if (type === 'shape') {
      var bbox = visual.getBBox();
      hit = gfx.rect(bbox.x, bbox.y, bbox.width, bbox.height);
    } else {
      hit = visual.select('*').clone().attr('style', '');
    }

    hit.attr(HIT_STYLE).prependTo(gfx);

    gfx.hover(function(e) {
      if (isCtxSwitch(e)) {
        /**
         * An event indicating that shape|connection has been hovered
         *
         * shape.hover, connection.hover
         */
        fire(e, baseEvent, type + '.hover');
      }
    }, function(e) {
      if (isCtxSwitch(e)) {
        fire(e, baseEvent, type + '.out');
      }
    });

    gfx.click(function(e) {
      fire(e, baseEvent, type + '.click');
    });

    gfx.dblclick(function(e) {
      fire(e, baseEvent, type + '.dblclick');
    });
  }

  function makeConnectionSelectable(connection, gfx) {
    makeSelectable(connection, gfx, { type: 'connection' });
  }

  function makeShapeSelectable(shape, gfx) {
    makeSelectable(shape, gfx, { type: 'shape' });
  }

  function registerEvents(events) {

    events.on('canvas.init', function(event) {
      var paper = event.paper;

      // implement direct canvas click
      paper.click(function(event) {

        /**
         * An event indicating that the canvas has been directly clicked
         *
         * @memberOf InteractionEvents
         *
         * @event canvas.click
         *
         * @type {Object}
         */
        events.fire('canvas.click', _.extend({}, event, { paper: paper }));
      });
    });

    events.on('shape.added', function(event) {
      makeShapeSelectable(event.element, event.gfx);
    });

    events.on('connection.added', function(event) {
      makeConnectionSelectable(event.element, event.gfx);
    });
  }

  registerEvents(events);
}


InteractionEvents.$inject = [ 'eventBus', 'styles' ];

module.exports = InteractionEvents;
},{"../../util/GraphicsUtil":57}],51:[function(require,module,exports){
'use strict';

module.exports = {
  __init__: [ 'interactionEvents' ],
  interactionEvents: [ 'type', require('./InteractionEvents') ]
};
},{"./InteractionEvents":50}],52:[function(require,module,exports){
'use strict';


var GraphicsUtil = require('../../util/GraphicsUtil');


/**
 * @class
 *
 * A plugin that adds an outline to shapes and connections that may be activated and styled
 * via CSS classes.
 *
 * @param {EventBus} events the event bus
 */
function Outline(events, styles) {

  var OUTLINE_OFFSET = 5;

  var OUTLINE_STYLE = styles.cls('djs-outline', [ 'no-fill' ]);

  function createOutline(gfx) {
    return gfx.rect(0, 0, 0, 0)
            .attr(OUTLINE_STYLE)
            .prependTo(gfx);
  }

  function updateOutline(outline, bbox) {

    outline.attr({
      x: bbox.x - OUTLINE_OFFSET,
      y: bbox.y - OUTLINE_OFFSET,
      width: bbox.width + OUTLINE_OFFSET * 2,
      height: bbox.height + OUTLINE_OFFSET * 2
    });
  }

  events.on('shape.added', function(event) {
    var element = event.element,
        gfx = event.gfx;

    var outline = createOutline(gfx);

    updateOutline(outline, GraphicsUtil.getVisual(gfx).getBBox());
  });

  events.on('connection.change', function(event) {
    // TODO: update connection outline box
  });

  events.on('shape.change', function(event) {
    // TODO: update shape outline box
  });
}


Outline.$inject = ['eventBus', 'styles'];

module.exports = Outline;
},{"../../util/GraphicsUtil":57}],53:[function(require,module,exports){
'use strict';

module.exports = {
  __init__: [ 'outline' ],
  outline: [ 'type', require('./Outline') ]
};
},{"./Outline":52}],54:[function(require,module,exports){
'use strict';

var _ = (window._);


/**
 * @class
 *
 * A service that offers the current selection in a diagram.
 * Offers the api to control the selection, too.
 *
 * @param {EventBus} events the event bus
 */
function Selection(events) {

  var selectedElements = [];

  function getSelection() {
    return selectedElements;
  }

  function isSelected(shape) {
    return selectedElements.indexOf(shape) !== -1;
  }

  /**
   * This method selects one or more elements on the diagram.
   *
   * By passing an additional add parameter you can decide whether or not the element(s)
   * should be added to the already existing selection or not.
   *
   * @method Selection#select
   *
   * @param  {Object|Object[]} elements element or array of elements to be selected
   * @param  {boolean} [add] whether the element(s) should be appended to the current selection, defaults to false
   */
  function select(elements, add) {
    var oldSelection = selectedElements.slice();

    if (!_.isArray(elements)) {
      elements = elements ? [ elements ] : [];
    }

    // selection may be cleared by passing an empty array or null
    // to the method
    if (elements.length && add) {
      _.forEach(elements, function(element) {
        if (selectedElements.indexOf(element) !== -1) {
          // already selected
          return;
        } else {
          selectedElements.push(element);
        }
      });
    } else {
      selectedElements = elements.slice();
    }

    events.fire('selection.changed', { oldSelection: oldSelection, newSelection: selectedElements });
  }

  function deselect(element) {
    throw new Error('not implemented');
  }

  return {
    getSelection: getSelection,
    isSelected: isSelected,
    select: select,
    deselect: deselect
  };
}

Selection.$inject = [ 'eventBus' ];

module.exports = Selection;
},{}],55:[function(require,module,exports){
'use strict';

var _ = (window._);


/**
 * @class
 *
 * A plugin that adds a visible selection UI to shapes and connections
 * by appending the <code>hover</code> and <code>selected</code> classes to them.
 *
 * Makes elements selectable, too.
 *
 * @param {EventBus} events
 * @param {SelectionService} selection
 * @param {ElementRegistry} elementRegistry
 */
function SelectionVisuals(events, selection, elementRegistry) {

  var HOVER_CLS = 'hover',
      SELECTED_CLS = 'selected';

  function addMarker(gfx, cls) {
    gfx.addClass(cls);
  }

  function removeMarker(gfx, cls) {
    gfx.removeClass(cls);
  }

  /**
   * Wire click on shape to select the shape
   *
   * @param  {Object} event the fired event
   */
  events.on('shape.click', function(event) {
    var add = event.shiftKey;
    selection.select(event.element, add);
  });

  events.on('shape.hover', function(event) {
    addMarker(event.gfx, HOVER_CLS);
  });

  events.on('shape.out', function(event) {
    removeMarker(event.gfx, HOVER_CLS);
  });

  events.on('selection.changed', function(event) {

    function deselect(s) {
      addMarker(elementRegistry.getGraphicsByElement(s), SELECTED_CLS);
    }

    function select(s) {
      removeMarker(elementRegistry.getGraphicsByElement(s), SELECTED_CLS);
    }

    var oldSelection = event.oldSelection,
        newSelection = event.newSelection;

    _.forEach(oldSelection, function(e) {
      if (newSelection.indexOf(e) === -1) {
        select(e);
      }
    });

    _.forEach(newSelection, function(e) {
      if (oldSelection.indexOf(e) === -1) {
        deselect(e);
      }
    });
  });

  // deselect all selected shapes on canvas click
  events.on('canvas.click', function(event) {
    if (event.srcElement === event.paper.node) {
      selection.select(null);
    }
  });
}

SelectionVisuals.$inject = [
  'eventBus',
  'selection',
  'elementRegistry'
];

module.exports = SelectionVisuals;
},{}],56:[function(require,module,exports){
'use strict';

module.exports = {
  __init__: [ 'selectionVisuals' ],
  __depends__: [
    require('../interaction-events'),
    require('../outline')
  ],
  selection: [ 'type', require('./Selection') ],
  selectionVisuals: [ 'type', require('./SelectionVisuals') ]
};
},{"../interaction-events":51,"../outline":53,"./Selection":54,"./SelectionVisuals":55}],57:[function(require,module,exports){
'use strict';

/**
 * @module util/GraphicsUtil
 */

function is(e, cls) {
  return e.hasClass(cls);
}


/**
 *
 * A note on how SVG elements are structured:
 *
 * Shape layout:
 *
 * [group.djs-group.djs-shape]
 *  |-> [rect.djs-hit]
 *  |-> [rect.djs-visual]
 *  |-> [rect.djs-outline]
 *  ...
 *
 * [group.djs-group.djs-connection]
 *  |-> [polyline.djs-hit]
 *  |-> [polyline.djs-visual]
 *  |-> [polyline.djs-outline]
 *  ...
 *
 */

/**
 * Returns the visual part of a diagram element
 *
 * @param  {snapsvg.Element} gfx
 * @return {snapsvg.Element}
 */
function getVisual(gfx) {
  return gfx.select('.djs-visual');
}

module.exports.getVisual = getVisual;
},{}],58:[function(require,module,exports){
var _ = (window._);

var DEFAULT_BOX_PADDING = 5;

var DEFAULT_LABEL_SIZE = {
  width: 150,
  height: 50
};


function parseAlign(align) {

  var parts = align.split('-');

  return {
    horizontal: parts[0] || 'center',
    vertical: parts[1] || 'top'
  };
}

function parsePadding(padding) {

  if (_.isObject(padding)) {
    return _.extend({ top: 0, left: 0, right: 0, bottom: 0 }, padding);
  } else {
    return {
      top: padding,
      left: padding,
      right: padding,
      bottom: padding
    };
  }
}


/**
 * Creates a new label utility
 *
 * @param {Object} config
 * @param {Dimensions} config.size
 * @param {Number} config.padding
 * @param {Object} config.style
 * @param {String} config.align
 */
function LabelUtil(config) {

  config = _.extend({}, {
    size: DEFAULT_LABEL_SIZE,
    padding: DEFAULT_BOX_PADDING,
    style: {},
    align: 'center-top'
  }, config || {});

  /**
   * Create a label in the parent node.
   *
   * @method LabelUtil#createLabel
   *
   * @param {SVGElement} parent the parent to draw the label on
   * @param {String} text the text to render on the label
   * @param {Object} options
   * @param {String} options.align how to align in the bounding box.
   *                             Any of { 'center-middle', 'center-top' }, defaults to 'center-top'.
   * @param {String} options.style style to be applied to the text
   *
   * @return {SVGText} the text element created
   */
  function createLabel(parent, text, options) {

    var box = _.merge({}, config.size, options.box || {}),
        style = _.merge({}, config.style, options.style || {}),
        align = parseAlign(options.align || config.align),
        padding = parsePadding(options.padding !== undefined ? options.padding : config.padding);

    var lines = text.split(/\r?\n/g),
        layouted = [];

    var maxWidth = box.width - padding.left - padding.right;

    /**
     * Layout the next line and return the layouted element.
     *
     * Alters the lines passed.
     *
     * @param  {Array<String>} lines
     * @return {Object} the line descriptor, an object { width, height, text }
     */
    function layoutNext(lines) {

      var originalLine = lines.shift(),
          fitLine = originalLine;

      var textBBox;

      function fit() {
        if (fitLine.length < originalLine.length) {
          var nextLine = lines[0] || '',
              remainder = originalLine.slice(fitLine.length);

          if (/-\s*$/.test(remainder)) {
            nextLine = remainder.replace(/-\s*$/, '') + nextLine.replace(/^\s+/, '');
          } else {
            nextLine = remainder + ' ' + nextLine;
          }

          lines[0] = nextLine;
        }
        return { width: textBBox.width, height: textBBox.height, text: fitLine };
      }

      function getTextBBox(text) {
        var textElement = parent.text(0, 0, fitLine).attr(style);

        var bbox = textElement.getBBox();

        textElement.remove();
        return bbox;
      }

      /**
       * Shortens a line based on spacing and hyphens.
       * Returns the shortened result on success.
       *
       * @param  {String} line
       * @param  {Number} maxLength the maximum characters of the string
       * @return {String} the shortened string
       */
      function semanticShorten(line, maxLength) {
        var parts = line.split(/(\s|-)/g),
            part,
            shortenedParts = [],
            length = 0;

        // try to shorten via spaces + hyphens
        if (parts.length > 1) {
          while ((part = parts.shift())) {

            if (part.length + length < maxLength) {
              shortenedParts.push(part);
              length += part.length;
            } else {
              // remove previous part, too if hyphen does not fit anymore
              if (part === '-') {
                shortenedParts.pop();
              }

              break;
            }
          }
        }

        return shortenedParts.join('');
      }

      function shortenLine(line, width, maxWidth) {
        var shortenedLine = '';

        var approximateLength = line.length * (maxWidth / width);

        // try to shorten semantically (i.e. based on spaces and hyphens)
        shortenedLine = semanticShorten(line, approximateLength);

        if (!shortenedLine) {

          // force shorten by cutting the long word
          shortenedLine = line.slice(0, Math.floor(approximateLength - 1));
        }

        return shortenedLine;
      }


      while (true) {

        textBBox = getTextBBox(fitLine);

        // try to fit
        if (textBBox.width < maxWidth) {
          return fit();
        }

        fitLine = shortenLine(fitLine, textBBox.width, maxWidth);
      }
    }

    while (lines.length) {
      layouted.push(layoutNext(lines));
    }

    var totalHeight = _.reduce(layouted, function(sum, line, idx) {
      return sum + line.height;
    }, 0);


    // the center x position to align against
    var cx = box.width / 2;

    // the y position of the next line
    var y, x;

    switch (align.vertical) {
      case 'middle':
        y = (box.height - totalHeight) / 2 - layouted[0].height / 4;
        break;

      default:
        y = padding.top;
    }

    var textElement = parent.group().attr(style);

    _.forEach(layouted, function(line) {
      y += line.height;

      switch (align.horizontal) {
        case 'left':
          x = padding.left;
          break;

        case 'right':
          x = (maxWidth - padding.right - line.width);
          break;

        default:
          // aka center
          x = (maxWidth - line.width) / 2 + padding.left;
      }


      parent.text(x, y, line.text).appendTo(textElement);
    });

    return textElement;
  }

  // API
  this.createLabel = createLabel;
}


module.exports = LabelUtil;
},{}],59:[function(require,module,exports){
var _ = (window._);

/**
 * Adds an element to a collection and returns true if the
 * element was added.
 *
 * @param {Object[]} elements
 * @param {Object} e
 * @param {Boolean} unique
 */
function add(elements, e, unique) {
  var canAdd = !unique || elements.indexOf(e) === -1;

  if (canAdd) {
    elements.push(e);
  }

  return canAdd;
}

function each(shapes, fn, depth) {

  depth = depth || 0;

  _.forEach(shapes, function(s, i) {
    var filter = fn(s, i, depth);

    if (_.isArray(filter) && filter.length) {
      each(filter, fn, depth + 1);
    }
  });
}

/**
 * Collects self + child shapes up to a given depth from a list of shapes.
 *
 * @param  {djs.ShapeDescriptor[]} shapes the shapes to select the children from
 * @param  {Boolean} unique whether to return a unique result set (no duplicates)
 * @param  {Number} maxDepth the depth to search through or -1 for infinite
 *
 * @return {djs.ShapeDescriptor[]} found shapes
 */
function selfAndChildren(shapes, unique, maxDepth) {
  var result = [],
      processedChildren = [];

  each(shapes, function(shape, i, depth) {
    add(result, shape, unique);

    var children = shape.children;

    // max traversal depth not reached yet
    if (maxDepth === -1 || depth < maxDepth) {

      // children exist && children not yet processed
      if (children && add(processedChildren, children, unique)) {
        return children;
      }
    }
  });

  return result;
}

/**
 * Return self + direct children for a number of shapes
 *
 * @param  {djs.ShapeDescriptor[]} shapes to query
 * @param  {Boolean} allowDuplicates to allow duplicates in the result set
 *
 * @return {djs.ShapeDescriptor[]} the collected shapes
 */
function selfAndDirectChildren(shapes, allowDuplicates) {
  return selfAndChildren(shapes, !allowDuplicates, 1);
}

/**
 * Return self + ALL children for a number of shapes
 *
 * @param  {djs.ShapeDescriptor[]} shapes to query
 * @param  {Boolean} allowDuplicates to allow duplicates in the result set
 *
 * @return {djs.ShapeDescriptor[]} the collected shapes
 */
function selfAndAllChildren(shapes, allowDuplicates) {
  return selfAndChildren(shapes, !allowDuplicates, -1);
}

/**
 * Translate a shape
 * Move shape to shape.x + x and shape.y + y
 */
function translateShape(shape, x, y) {
  'use strict';

  shape.x += x;
  shape.y += y;
}

function setParent(shape, newParent) {
  // TODO(nre): think about parent->child magic

  var old = shape.parent;
  if (old && old.children) {
    var idx = old.children.indexOf(shape);
    if (idx !== -1) {
      old.children.splice(idx, 1);
    }
  }

  if (newParent) {
    if (!newParent.children) {
      newParent.children = [];
    }

    newParent.children.push(shape);
  }

  shape.parent = newParent;

  return old;
}

module.exports.eachShape = each;
module.exports.selfAndDirectChildren = selfAndDirectChildren;
module.exports.selfAndAllChildren = selfAndAllChildren;
module.exports.translateShape = translateShape;
module.exports.setParent = setParent;
},{}],60:[function(require,module,exports){

var isArray = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

var annotate = function() {
  var args = Array.prototype.slice.call(arguments);
  
  if (args.length === 1 && isArray(args[0])) {
    args = args[0];
  }

  var fn = args.pop();

  fn.$inject = args;

  return fn;
};


// Current limitations:
// - can't put into "function arg" comments
// function /* (no parenthesis like this) */ (){}
// function abc( /* xx (no parenthesis like this) */ a, b) {}
//
// Just put the comment before function or inside:
// /* (((this is fine))) */ function(a, b) {}
// function abc(a) { /* (((this is fine))) */}

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /\/\*([^\*]*)\*\//m;

var parse = function(fn) {
  if (typeof fn !== 'function') {
    throw new Error('Cannot annotate "' + fn + '". Expected a function!');
  }

  var match = fn.toString().match(FN_ARGS);
  return match[1] && match[1].split(',').map(function(arg) {
    match = arg.match(FN_ARG);
    return match ? match[1].trim() : arg.trim();
  }) || [];
};


exports.annotate = annotate;
exports.parse = parse;
exports.isArray = isArray;

},{}],61:[function(require,module,exports){
module.exports = {
  annotate: require('./annotation').annotate,
  Module: require('./module'),
  Injector: require('./injector')
};

},{"./annotation":60,"./injector":62,"./module":63}],62:[function(require,module,exports){
var Module = require('./module');
var autoAnnotate = require('./annotation').parse;
var annotate = require('./annotation').annotate;
var isArray = require('./annotation').isArray;


var Injector = function(modules, parent) {
  parent = parent || {
    get: function(name) {
      currentlyResolving.push(name);
      throw error('No provider for "' + name + '"!');
    }
  };

  var currentlyResolving = [];
  var providers = this._providers = Object.create(parent._providers || null);
  var instances = this._instances = Object.create(null);

  var self = instances.injector = this;

  var error = function(msg) {
    var stack = currentlyResolving.join(' -> ');
    currentlyResolving.length = 0;
    return new Error(stack ? msg + ' (Resolving: ' + stack + ')' : msg);
  };

  var get = function(name) {
    if (!providers[name] && name.indexOf('.') !== -1) {
      var parts = name.split('.');
      var pivot = get(parts.shift());

      while(parts.length) {
        pivot = pivot[parts.shift()];
      }

      return pivot;
    }

    if (Object.hasOwnProperty.call(instances, name)) {
      return instances[name];
    }

    if (Object.hasOwnProperty.call(providers, name)) {
      if (currentlyResolving.indexOf(name) !== -1) {
        currentlyResolving.push(name);
        throw error('Cannot resolve circular dependency!');
      }

      currentlyResolving.push(name);
      instances[name] = providers[name][0](providers[name][1]);
      currentlyResolving.pop();

      return instances[name];
    }

    return parent.get(name);
  };

  var instantiate = function(Type) {
    var instance = Object.create(Type.prototype);
    var returned = invoke(Type, instance);

    return typeof returned === 'object' ? returned : instance;
  };

  var invoke = function(fn, context) {
    if (typeof fn !== 'function') {
      if (isArray(fn)) {
        fn = annotate(fn.slice());
      } else {
        throw new Error('Cannot invoke "' + fn + '". Expected a function!');
      }
    }

    var inject = fn.$inject && fn.$inject || autoAnnotate(fn);
    var dependencies = inject.map(function(dep) {
      return get(dep);
    });

    // TODO(vojta): optimize without apply
    return fn.apply(context, dependencies);
  };


  var createPrivateInjectorFactory = function(privateChildInjector) {
    return annotate(function(key) {
      return privateChildInjector.get(key);
    });
  };

  var createChild = function(modules, forceNewInstances) {
    if (forceNewInstances && forceNewInstances.length) {
      var fromParentModule = Object.create(null);
      var matchedScopes = Object.create(null);

      var privateInjectorsCache = [];
      var privateChildInjectors = [];
      var privateChildFactories = [];

      var provider;
      var cacheIdx;
      var privateChildInjector;
      var privateChildInjectorFactory;
      for (var name in providers) {
        provider = providers[name];

        if (forceNewInstances.indexOf(name) !== -1) {
          if (provider[2] === 'private') {
            cacheIdx = privateInjectorsCache.indexOf(provider[3]);
            if (cacheIdx === -1) {
              privateChildInjector = provider[3].createChild([], forceNewInstances);
              privateChildInjectorFactory = createPrivateInjectorFactory(privateChildInjector);
              privateInjectorsCache.push(provider[3]);
              privateChildInjectors.push(privateChildInjector);
              privateChildFactories.push(privateChildInjectorFactory);
              fromParentModule[name] = [privateChildInjectorFactory, name, 'private', privateChildInjector];
            } else {
              fromParentModule[name] = [privateChildFactories[cacheIdx], name, 'private', privateChildInjectors[cacheIdx]];
            }
          } else {
            fromParentModule[name] = [provider[2], provider[1]];
          }
          matchedScopes[name] = true;
        }

        if ((provider[2] === 'factory' || provider[2] === 'type') && provider[1].$scope) {
          forceNewInstances.forEach(function(scope) {
            if (provider[1].$scope.indexOf(scope) !== -1) {
              fromParentModule[name] = [provider[2], provider[1]];
              matchedScopes[scope] = true;
            }
          });
        }
      }

      forceNewInstances.forEach(function(scope) {
        if (!matchedScopes[scope]) {
          throw new Error('No provider for "' + scope + '". Cannot use provider from the parent!');
        }
      });

      modules.unshift(fromParentModule);
    }

    return new Injector(modules, self);
  };

  var factoryMap = {
    factory: invoke,
    type: instantiate,
    value: function(value) {
      return value;
    }
  };

  modules.forEach(function(module) {

    function arrayUnwrap(type, value) {
      if (type !== 'value' && isArray(value)) {
        value = annotate(value.slice());
      }

      return value;
    }

    // TODO(vojta): handle wrong inputs (modules)
    if (module instanceof Module) {
      module.forEach(function(provider) {
        var name = provider[0];
        var type = provider[1];
        var value = provider[2];

        providers[name] = [factoryMap[type], arrayUnwrap(type, value), type];
      });
    } else if (typeof module === 'object') {
      if (module.__exports__) {
        var clonedModule = Object.keys(module).reduce(function(m, key) {
          if (key.substring(0, 2) !== '__') {
            m[key] = module[key];
          }
          return m;
        }, Object.create(null));

        var privateInjector = new Injector((module.__modules__ || []).concat([clonedModule]), self);
        var getFromPrivateInjector = annotate(function(key) {
          return privateInjector.get(key);
        });
        module.__exports__.forEach(function(key) {
          providers[key] = [getFromPrivateInjector, key, 'private', privateInjector];
        });
      } else {
        Object.keys(module).forEach(function(name) {
          if (module[name][2] === 'private') {
            providers[name] = module[name];
            return;
          }

          var type = module[name][0];
          var value = module[name][1];

          providers[name] = [factoryMap[type], arrayUnwrap(type, value), type];
        });
      }
    }
  });

  // public API
  this.get = get;
  this.invoke = invoke;
  this.instantiate = instantiate;
  this.createChild = createChild;
};

module.exports = Injector;

},{"./annotation":60,"./module":63}],63:[function(require,module,exports){
var Module = function() {
  var providers = [];

  this.factory = function(name, factory) {
    providers.push([name, 'factory', factory]);
    return this;
  };

  this.value = function(name, value) {
    providers.push([name, 'value', value]);
    return this;
  };

  this.type = function(name, type) {
    providers.push([name, 'type', type]);
    return this;
  };

  this.forEach = function(iterator) {
    providers.forEach(iterator);
  };
};

module.exports = Module;

},{}]},{},[])
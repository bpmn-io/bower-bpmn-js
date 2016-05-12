var BpmnJS = window.BpmnJS;

var modeler = new BpmnJS({ container: '#modeler' }),
    viewer = new BpmnJS.Viewer({ container: '#viewer' }),
    navigatedViewer = new BpmnJS.NavigatedViewer({ container: '#navigated-viewer' });

function success() {
  $('body').removeClass('fail').addClass('success');
}

function fail(err) {
  $('body').addClass('fail');

  console.error('something went wrong!');
  console.error(err);
}

var bpmnjsInstances = [ modeler, viewer, navigatedViewer ];

var loadedCount = 0;

function loadInstances(instances) {
  return function(pizzaDiagram) {
    instances.forEach(function(instance) {
      instance.importXML(pizzaDiagram, function(err) {

        if (err) {
          return fail(err);
        }

        loadedCount++;

        if (loadedCount === bpmnjsInstances.length) {
          success();
        }

        try {
          instance.get('canvas').zoom('fit-viewport');
          return success();
        } catch (e) {
          return fail(e);
        }
      });
    });
  }
}

$.get('../resources/pizza-collaboration.bpmn', loadInstances(bpmnjsInstances), 'text');
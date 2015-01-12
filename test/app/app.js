var BpmnJS = window.BpmnJS;

var bpmnjs = new BpmnJS({ container: '#canvas' });

function success() {
  $('body').addClass('success');
}

function fail(err) {
  $('body').addClass('fail');

  console.error('something went wrong!');
  console.error(err);
}

$.get('../resources/pizza-collaboration.bpmn', function(pizzaDiagram) {

  bpmnjs.importXML(pizzaDiagram, function(err) {

    if (err) {
      return fail(err);
    }

    try {
      bpmnjs.get('canvas').zoom('fit-viewport');
      return success();
    } catch (e) {
      return fail(e);
    }
  });

}, 'text');
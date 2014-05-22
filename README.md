# bpmn-js Bower Package

This is a packaged version of [bpmn-js](https://github.com/bpmn-io/bpmn-js) for usage via [bower](http://bower.io/).


## Usage

Install the dependency via

```
bower install bpmn-js
```

Include the file into your project

```html
<html>

  <body>
    <!-- ... -->

    <script src="bower_components/bpmn-js/bpmn.min.js"></script>

    <script>
      // require is part of bundle file
      var BpmnViewer = require('bpmn/Viewer');

      var xml; // ADD BPMN 2.0 XML HERE
      var viewer = new BpmnViewer({ container: 'body' });

      viewer.importXML(xml, function(err) {

        if (err) {
          console.log('error rendering', err);
        } else {
          console.log('rendered');
        }
      });
    </script>

  </body>
</html>
```


## License

Use under the terms of the [bpmn-js license](http://bpmn.io/license).
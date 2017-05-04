# bower-bpmn-js integration tests

This project contains the integration tests for the bpmn-js bower bundle.

## Run tests

```
rm -rf bower_components
```

Link bpmn-js dependency to your local bower package.

```
cd ..
bower link
cd test
bower link bpmn-js
```

Serve this directory via a web server.

Inspect the test site at `http://localhost:9292/app/index.html`.

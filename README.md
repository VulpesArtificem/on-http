renasar-http
============

Renasar HTTP Server

## installation


    rm -rf node_modules
    npm install
    npm run apidoc

## running

Note: requires MongoDB and RabbitMQ to be running to start correctly.

    sudo node index.js

## debuging

To run in debug mode to debug routes and middleware:


    sudo DEBUG=express:* node --debug index.js

## CI/testing

To run tests from a developer console:


    npm test

To run tests and get coverage for CI:


    # verify hint/style
    ./node_modules/.bin/jshint -c .jshintrc --reporter=checkstyle lib index.js > checkstyle-result.xml || true
    ./node_modules/.bin/istanbul cover _mocha -- $(find spec -name '*-spec.js') -R xunit-file --require spec/helper.js
    ./node_modules/.bin/istanbul report cobertura
    ./node_modules/.bin/istanbul report text-summary

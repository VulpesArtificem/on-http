// Copyright 2014-2015, Renasar Technologies Inc.
/* jshint node: true */

'use strict';

var di = require('di'),
    _ = require('lodash'),
    express = require('express'),
    router = express.Router(),
    parser = require('body-parser');

module.exports = configRouterFactory;

di.annotate(configRouterFactory,
    new di.Inject(
        'Services.Configuration',
        'common-api-presenter',
        'Logger',
        'Tracer'
    )
);

function configRouterFactory (configuration, presenter) {
    /**
     * @api {get} /api/common/config/ GET /
     * @apiDescription get server configuration
     * @apiName config-get
     * @apiGroup config
     */

    //TODO(heckj) update to request configuration of specific services, not just HTTP
    router.get('/config', presenter.middleware(function () {
        return configuration.get();
    }));

    /**
     * @api {patch} /api/common/config/ PATCH /
     * @apiDescription patch specific configuration
     * @apiName config-patch
     * @apiGroup config
     */

    router.patch('/config', parser.json(), presenter.middleware(function (req) {
        _.forOwn(req.body, function (value, key) {
            configuration.set(key, value);
        });

        return configuration.get();
    }));

    return router;
}

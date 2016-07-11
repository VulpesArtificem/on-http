'use strict';
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
var amqp = require('amqp');
var dateFormat = require('dateformat');
var fs = require('fs');
var util = require('util');


/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
    backupPost: backupPost,
    backupGetStatus: backupGetStatus,
    backupGetFile: backupGetFile,
    restorePost: restorePost,
    restoreGetStatus: restoreGetStatus,
    upgradePost: upgradePost,
    upgradeGetStatus: upgradeGetStatus
};


var exchange = 'on.events';
var basePath = '/opt/onrack_upgrade/';

function getStatus(res, identifier) {
    try {
        var filename = basePath + identifier + '.status';
        var contents = JSON.parse(fs.readFileSync(filename, 'utf8'));
        return contents;
    } catch (err) {
        return null;
    }
}


function formatStatus(res, href, transaction_id) {
   try {
       var status = getStatus(res, transaction_id)
       if (status == null) {
           return {'message': 'Error reading file'};
       }
       var state = status['state']
       return {'transaction_id': transaction_id, 'href': href, 'state': state};
   } catch (err) {
       var errorString = util.format('Internal server error (%s)', err['message']);
       res.status(500).json({'message': errorString});
   }
}

function backupPost(req, res) {
    try {
        var routingKey = 'upgrade.backup';
        var href = req.path;

        var status = getStatus(res, 'system');
        if (status == null) {
            res.status(500).json({'message': 'No system state found'});
        }

        var state = status['state'];
        var transaction_id = status['transaction_id'];;

        if (state == 'READY') {
            var filename = 'backup.' + dateFormat(new Date, "yyyymmddhhMMss");
            var payload = {'backup': filename};

            var connection = amqp.createConnection();

            connection.on('ready', function () {
                var exchange = connection.exchange('on.events', {type: 'topic', durable: true, autoDelete: false});
                exchange.on('open', function(){
                    exchange.publish(routingKey, payload);
                    transaction_id = filename;
                    href = href + '/Status/' + transaction_id;
                    res.status(202).json({'transaction_id': transaction_id, 'href': href, 'state': state});
                })
            })
        } else {
            href = href + '/Status/' + transaction_id;
            res.status(429).json({'transaction_id': transaction_id, 'href': href, 'state': state});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}


function backupGetStatus(req, res) {
    try {
        var href = req.path;
        var transaction_id = req.swagger.params.transaction_id.value;

        if (transaction_id.lastIndexOf('backup.', 0) === 0) {
            var status = formatStatus(res, href, transaction_id);
            res.status(200).json(status);
        } else {
            res.status(404).json({'message': 'File not found'});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}

function backupGetFile(req, res) {
    var filename = basePath + 'backup/' + req.swagger.params.filename.value;
    res.sendFile(filename);
}

function restorePost(req, res) {
    try {
        var routingKey = 'upgrade.restore';
        var href = req.path;

        var status = getStatus(res, 'system');
        if (status == null) {
            res.status(500).json({'message': 'No system state found'});
        }

        var state = status['state'];
        var transaction_id = status['transaction_id'];
        var payload = req.swagger.params.payload.value;
        var image_url = payload.image_url;

        if (state == 'READY') {
            var timestamp = dateFormat(new Date, "yyyymmddhhMMss");
            var transaction_id = 'restore.' + timestamp;
            var payload = {'restore': {'image_url': image_url, 'timestamp': timestamp}};

            var connection = amqp.createConnection();

            connection.on('ready', function () {
                var exchange = connection.exchange('on.events', {type: 'topic', durable: true, autoDelete: false});
                exchange.on('open', function(){
                    exchange.publish(routingKey, payload);
                    href = href + '/Status/' + transaction_id;
                    res.status(202).json({'transaction_id': transaction_id, 'href': href, 'state': state});
                })
            })
        } else {
            href = href + '/Status/' + transaction_id;
            res.status(429).json({'transaction_id': transaction_id, 'href': href, 'state': state});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}

function restoreGetStatus(req, res) {
    try {
        var href = req.path;
        var transaction_id = req.swagger.params.transaction_id.value;

        if (transaction_id.lastIndexOf('restore.', 0) === 0) {
            var status = formatStatus(res, href, transaction_id);
            res.status(200).json(status);
        } else {
            res.status(404).json({'message': 'File not found'});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }

}


function upgradePost(req, res) {
    try {
        var href = req.path;
        var routingKey = 'upgrade.upgrade';

        var status = getStatus(res, 'system');
        if (status == null) {
            res.status(500).json({'message': 'No system state found'});
        }

        var state = status['state'];
        var transaction_id = status['transaction_id'];
        var payload = req.swagger.params.payload.value;
        var image_url = payload.image_url;

        if (state == 'READY') {
            var timestamp = dateFormat(new Date, "yyyymmddhhMMss");
            var transaction_id = 'upgrade.' + timestamp;
            var payload = {'upgrade': {'image_url': image_url, 'timestamp': timestamp}};

            var connection = amqp.createConnection();

            connection.on('ready', function () {
                var exchange = connection.exchange('on.events', {type: 'topic', durable: true, autoDelete: false});
                exchange.on('open', function() {
                    exchange.publish(routingKey, payload);
                    href = href + '/Status/' + transaction_id;
                    res.status(202).json({'transaction_id': transaction_id, 'href': href, 'state': state});
                })
            })
        } else {
            href = href + '/Status/' + transaction_id;
            res.status(429).json({'transaction_id': transaction_id, 'href': href, 'state': state});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}

function upgradeGetStatus(req, res) {
    try {
        var href = req.path;
        var transaction_id = req.swagger.params.transaction_id.value;

        if (transaction_id.lastIndexOf('upgrade.', 0) === 0) {
            var status = formatStatus(res, href, transaction_id);
            res.status(200).json(status);
        } else {
            res.status(404).json({'message': 'File not found'});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}



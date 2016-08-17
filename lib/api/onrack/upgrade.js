// Copyright 2016, EMC, Inc.

'use strict';

var amqp = require('amqp');
var dateFormat = require('dateformat');
var fs = require('fs');
var util = require('util');

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

function formatStatus(res, href, transactionId) {
   try {
       var status = getStatus(res, transactionId)
       if (status == null) {
           return {'message': 'Error reading file'};
       }
       var state = status['state']
       return {'transaction_id': transactionId, 'href': href, 'state': state};
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
        var transactionId = status['transaction_id'];;

        if (state == 'READY') {
            var filename = 'backup.' + dateFormat(new Date, "yyyymmddhhMMss");
            var payload = {'backup': filename};

            var connection = amqp.createConnection();

            connection.on('ready', function () {
                var exchange = connection.exchange('on.events', {type: 'topic', durable: true, autoDelete: false});
                exchange.on('open', function(){
                    exchange.publish(routingKey, payload);
                    transactionId = filename;
                    href = href + '/Status/' + transactionId;
                    res.status(202).json({'transaction_id': transactionId, 'href': href, 'state': state});
                })
            })
        } else {
            href = href + '/Status/' + transactionId;
            res.status(429).json({'transaction_id': transactionId, 'href': href, 'state': state});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}


function backupGetStatus(req, res) {
    try {
        var href = req.path;
        var transactionId = req.swagger.params.transaction_id.value;

        if (transactionId.lastIndexOf('backup.', 0) === 0) {
            var status = formatStatus(res, href, transactionId);
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
        var transactionId = status['transaction_id'];
        var payload = req.swagger.params.payload.value;

        // Check if URL scheme is present
        if (payload.image_url) {
            var image_url = payload.image_url;
        } else {
            res.status(400).json({'message': 'Invalid URL or file'});
        }

        if (state == 'READY') {
            var timestamp = dateFormat(new Date, "yyyymmddhhMMss");
            var transactionId = 'restore.' + timestamp;
            var payload = {'restore': {'image_url': image_url, 'timestamp': timestamp}};

            var connection = amqp.createConnection();

            connection.on('ready', function () {
                var exchange = connection.exchange('on.events', {type: 'topic', durable: true, autoDelete: false});
                exchange.on('open', function(){
                    exchange.publish(routingKey, payload);
                    href = href + '/Status/' + transactionId;
                    res.status(202).json({'transaction_id': transactionId, 'href': href, 'state': state});
                })
            })
        } else {
            href = href + '/Status/' + transactionId;
            res.status(429).json({'transaction_id': transactionId, 'href': href, 'state': state});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}

function restoreGetStatus(req, res) {
    try {
        var href = req.path;
        var transactionId = req.swagger.params.transaction_id.value;

        if (transactionId.lastIndexOf('restore.', 0) === 0) {
            var status = formatStatus(res, href, transactionId);
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
        var transactionId = status['transaction_id'];
        var payload = req.swagger.params.payload.value;

        // Check if URL scheme is present
        if (payload.image_url) {
            var image_url = payload.image_url;
        } else {
            res.status(400).json({'message': 'Invalid URL or file'});
        }

        if (state == 'READY') {
            var timestamp = dateFormat(new Date, "yyyymmddhhMMss");
            var transactionId = 'upgrade.' + timestamp;
            var payload = {'upgrade': {'image_url': image_url, 'timestamp': timestamp}};

            var connection = amqp.createConnection();

            connection.on('ready', function () {
                var exchange = connection.exchange('on.events', {type: 'topic', durable: true, autoDelete: false});
                exchange.on('open', function() {
                    exchange.publish(routingKey, payload);
                    href = href + '/Status/' + transactionId;
                    res.status(202).json({'transaction_id': transactionId, 'href': href, 'state': state});
                })
            })
        } else {
            href = href + '/Status/' + transactionId;
            res.status(429).json({'transaction_id': transactionId, 'href': href, 'state': state});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}

function upgradeGetStatus(req, res) {
    try {
        var href = req.path;
        var transactionId = req.swagger.params.transaction_id.value;

        if (transactionId.lastIndexOf('upgrade.', 0) === 0) {
            var status = formatStatus(res, href, transactionId);
            res.status(200).json(status);
        } else {
            res.status(404).json({'message': 'File not found'});
        }
    } catch (err) {
        var errorString = util.format('Internal server error (%s)', err['message']);
        res.status(500).json({'message': errorString});
    }
}

module.exports = {
    backupPost: backupPost,
    backupGetStatus: backupGetStatus,
    backupGetFile: backupGetFile,
    restorePost: restorePost,
    restoreGetStatus: restoreGetStatus,
    upgradePost: upgradePost,
    upgradeGetStatus: upgradeGetStatus
};

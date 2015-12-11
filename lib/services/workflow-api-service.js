// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di');

module.exports = workflowApiServiceFactory;
di.annotate(workflowApiServiceFactory, new di.Provide('Http.Services.Api.Workflows'));
di.annotate(workflowApiServiceFactory,
    new di.Inject(
        'Protocol.TaskGraphRunner',
        'TaskGraph.Store',
        'Services.Waterline',
        'TaskGraph.TaskGraph',
        'Constants'
    )
);
function workflowApiServiceFactory(
    taskGraphProtocol,
    taskGraphStore,
    waterline,
    TaskGraph,
    Constants
) {
    function WorkflowApiService() {
    }

    WorkflowApiService.prototype.findGraphDefinitionByName = function(graphName) {
        return waterline.graphdefinitions.needOne({ injectableName: graphName });
    };

    WorkflowApiService.prototype.createGraph = function(definition, options, context, domain) {
        domain = domain || Constants.DefaultTaskDomain;
        return TaskGraph.create(domain, {
            definition: definition,
            options: options || {},
            context: context
        })
        .then(function(graph) {
            return graph.persist();
        });
    };

    WorkflowApiService.prototype.runTaskGraph = function(domain, name, options, target) {
        return taskGraphProtocol.runTaskGraph(
                domain || Constants.DefaultTaskDomain, name, options || {}, target);
    };

    WorkflowApiService.prototype.defineTaskGraph = function(definition) {
        // Validation
        return this.createGraph(definition)
        .then(function() {
            return taskGraphStore.persistGraphDefinition(definition);
        });
    };

    WorkflowApiService.prototype.defineTaskGraph = function(definition) {
        return taskGraphStore.persistGraphDefinition(definition);
    };

    return new WorkflowApiService();
}

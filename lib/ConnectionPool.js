define([
    "elenajs/declare",
    "elenajs/_base/Mixin",
    "dojo/_base/lang",
    "dojo/Evented",
    "dojo/Deferred",
    "dojo/topic",
    "elenajs/node!cassandra-driver"
], function (declare,
             Mixin,
             lang,
             Evented,
             Deferred,
             topic,
             cassandra) {

    return declare("cassandra/ConnectionPool", [Mixin, Evented], {
        dbConfig: null,
        poolSize: 10,
        poolName: null,
        busyClients: 0,
        pool: null,
        _commandsQueue: null,
        /**
         * required
         * poolName: <String::required>,
         * poolSize: <Integer::default=10::less than 1 is inifinite>,
         * dbConfig <Object::{
         *      see: http://www.datastax.com/drivers/nodejs/1.0/global.html#QueryOptions
         * }>
         */
        constructor: declare.superCall(function (sup) {
            return function () {
                var self = this,
                    args = Array.prototype.slice.call(arguments);

                this.pool = [];
                this._commandsQueue = [];
                this.dbConfig = {
                    contactPoints: '127.0.0.1'
                };
                if (args.length > 0 && 'dbConfig' in args[0]) {
                    var paramDbConfig = args[0].dbConfig;
                    args[0].dbConfig = lang.mixin(self.dbConfig, paramDbConfig);
                }
                sup.apply(this, args);
                ['SIGTERM', 'SIGINT', 'exit'].forEach(function (signal) {
                    process.on(signal, function () {
                        self.disconnect();
                    });
                });
            };
        }),
        disconnect: function () {
            var self = this;
            setImmediate(function () {
                self.pool.forEach(function (client) {
                    client.shutdown();
                });
            });

        },
        query: function (text, values) {
            var self = this,
                deferred = new Deferred(),
                queryObject = {};
            if (typeof text === 'object') {
                queryObject = text;
            } else {
                queryObject.text = text;
                if (values)
                    queryObject.values = [].concat(values);
            }
            queryObject.dfd = deferred;
            this._commandsQueue.push(queryObject);
            setImmediate(function () {
                self.perform();
            });
            return deferred;
        },
        releaseClient: function (client, discard) {
            var self = this;
            this.busyClients -= 1;
            if (this.clientsNumber < this.poolSize) {
                !discard && this.pool.push(client);
                setImmediate(function () {
                    self.perform();
                });
            }
        },
        createClient: function () {
            var self = this,
                client = new cassandra.Client(self.dbConfig);

            client.connect(function (err) {
                if (err) {
                    topic.publish(self.poolName + '/error', err);
                    self.releaseClient(client, true);
                }
            });

            return client;
        },
        perform: function () { //<-------------------------------------------------------THE GAME --------------------------------------------
            if (this._commandsQueue.length < 1 || (this.poolSize > 0 && this.busyClients >= this.poolSize)) {
                return;
            }

            var self = this,
                cmdObj = this._commandsQueue.shift(),
                pool = this.pool,
                client = pool.shift();

            if (!client && (this.poolSize < 1 || this.clientsNumber < this.poolSize)) {
                client = this.createClient();
            }

            if (client) {
                client.commandDeferredResult = cmdObj.dfd;
                delete cmdObj.dfd;
                var qryArgs = [cmdObj.text];
                cmdObj.values && qryArgs.push(cmdObj.values);
                var self = this,
                    query = client.stream.apply(client, qryArgs),
                    releaseQuery = function (qry, discardClient) {
                        self.releaseClient(qry.client, discardClient);
                    };
                this.busyClients += 1;
                query.client = client;

                query.on('error', function (err) {
                    releaseQuery(query);
                    client.commandDeferredResult.reject(err);
                });
                query.on('readable', function () {
                    var row;
                    while (row = this.read()) {
                        client.commandDeferredResult.progress(row);
                    }
                });
                query.on('end', function () {
                    releaseQuery(query);
                    client.commandDeferredResult.resolve();
                });
                return client.commandDeferedResult;
            } else {
                this._commandsQueue.push(cmdObj);
            }
        }
    }, {
        clientsNumber: {
            get: function () {
                return this.pool.length + this.busyClients;
            }
        }
    });
});
define([
    "./ConnectionPool",
    'elenajs/logger!pg'
], function (ConnectionPool, logger) {
    var cache = {};

    return {
        module: 'cassandra',
        load: function (id, require, load) {
            var parts = id.split("!"),
                poolName = parts[0],
                result;

            if (poolName in cache) {
                result = cache[poolName];
            } else {
                try {
                    result = new ConnectionPool({poolName: poolName}); //<---- ClientConnection
                    cache[poolName] = result;
                } catch (err) {
                    logger.error(err);
                }
            }

            load(result);
        }
    };
});
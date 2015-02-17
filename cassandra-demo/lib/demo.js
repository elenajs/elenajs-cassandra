if (typeof process !== 'undefined' && typeof define === 'undefined') {
    var ejs = require('elenajs'),
        path = require('path');

    var amdConfig = ejs.createConfig({
        packages: [
            {
                name: 'cassandra',
                location: path.resolve(__dirname, '../../lib')
            }
        ]
    }, path.resolve(__dirname, '../package.json'));

    ejs.require(amdConfig, [__filename]);

} else {
    require([
        'cassandra!demo',
        'elenajs/logger!cassandraDemo',
        'elenajs/logging/ConsoleAppender',
    ], function (cassandra, logger, ConsoleAppender) {
        new ConsoleAppender({});

        var qry1 = 'SELECT * from cassdemo.sample3',
            qry2 = 'SELECT * from cassdemo.sample3 where id = 1 AND insertion_time >= ? AND insertion_time <= ?',
            result1 = {rowcount: 0},
            result2 = {rowcount: 0},
            first_row,
            last_row;

        cassandra.dbConfig = {poolSize: 1, contactPoints: ["127.0.0.1"], keyspace: 'cassdemo'};
        
        var performChek  = function () {
            cassandra.query(qry2, [first_row.insertion_time, last_row.insertion_time]).then(
                function() {
                    logger.log('QRY2 Extracted ' + result2.rowcount + ' rows');
                    cassandra.disconnect();
                    if (result1.rowcount === result2.rowcount) {
                        logger.log('Extracted the same number of rows');
                    } else {
                        logger.warn('Extracted a different number of rows. First query returned ' + result1.rowcount +
                        ' second query returned ' + result2.rowcount);
                    }
                },
                function(err) {
                    logger.log('QRY2 error: ' + JSON.stringify(err));
                    cassandra.disconnect();
                    return -1;
                },
                function(row) {
                    logger.log('QRY2 partial: ' + JSON.stringify(row));
                    result2.rowcount++;
                }
            );
        };

        cassandra.query(qry1).then(
            function() {
                logger.log('QRY1 Extracted ' + result1.rowcount + ' rows');
                setImmediate(performChek);
            },
            function(err) {
                logger.log('QRY1 error: ' + JSON.stringify(err));
                cassandra.disconnect();
                return -1;
            },
            function(row) {
                logger.log('QRY1 partial: ' + JSON.stringify(row));
                if (!first_row) {
                    first_row = row;
                }
                last_row = row;
                result1.rowcount++;
            }
        );


    });
}

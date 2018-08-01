const winston = require('winston');

module.exports = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            silent: process.env.NODE_ENV === 'test', // Do not print in case of Testing
            timestamp: true,
            colorize: true,
            prettyPrint: true,
            label: 'TI-CP',
        }),
    ],
});


const httpErrors = require('http-errors');

exports.error = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        if (err instanceof httpErrors.BadRequest) {
            const body = {
                type: 'Validation Error',
                message: err.message,
            };
            ctx.status = 400;
            ctx.body = body;
        } else {
            // some errors will have .status
            // however this is not a guarantee
            ctx.status = err.status || 500;
            ctx.body = err.message || 'something went wrong';

            // since we handled this manually we'll
            // want to delegate to the regular app
            // level error handling as well so that
            // centralized still functions correctly.
        }
        ctx.app.emit('error', err, ctx);
    }
};
const Joi = require('joi');


const rolesArray = [ 'Architect', 'Delivery', 'Sales'];

const deliveryCenterArray =  [ 'Bangalore', 'Chennai', 'Delhi', 'Hyderabad', 'Kochi', 'Kolkata', 'Mumbai', 'Pune', 'Europe', 'UK', 'US'];


exports.login = {
    body:{
        username: Joi.string().required(),
        password: Joi.string().required()
    }
};

exports.signup = {
    body:{
        username: Joi.string().required(),
        email: Joi.string().email().regex(new RegExp('[a-zA-Z0-9._]{2,}@tcs.com')).required(), // use regex here
        password: Joi.string().alphanum().required(),
        confirmPassword: Joi.string().alphanum().required(),
        deliveryCenter: Joi.string().only(deliveryCenterArray).required(),
        role: Joi.string().only(rolesArray).required(),
        employeeId: Joi.number().required()
    }
};

exports.changePassword = {
    body:{
        userId: Joi.string().required(),
        password: Joi.string().required(),
        newPassword: Joi.string().required(),
        newConfirmPassword: Joi.string().required()
    }
};

exports.favourites = {
    body:{
        userId : Joi.string().required(),
        docId: Joi.string().required()
    }
};

exports.getFavourites = {
    params:{
        userId: Joi.string().required()
    }
};


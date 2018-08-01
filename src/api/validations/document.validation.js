const Joi = require('joi');

const categoriesArray = [
    'Best Practices',
    'Case Studies',
    'Caselets',
    'Checklist',
    'Guidelines and Standards',
    'Lessons Learnt',
    'Proposals',
    'Success Stories',
    'Technology Offering'
  ];

exports.get = {
    query:{
        query: Joi.string().required(),
        size: Joi.number().required(),
        offset: Joi.number().required()
    }
};

exports.getOne = {
    params:{
        id: Joi.string().required()
    }
};

exports.post = {
    body:{
        title: Joi.string().required(),
        authorId: Joi.string().required(),
        authorName: Joi.string().required(),
        description: Joi.string().required(),
        category: Joi.string().only(categoriesArray).required(),
        searchTags: Joi.alternatives(
            Joi.array().items(Joi.string()).required(),
            Joi.string().required()
        ).required()
    }
};

exports.put = {
    body:{
        id: Joi.string().required(),
        title: Joi.string().required(),
        authorId: Joi.string().required(),
        authorName: Joi.string().required(),
        description: Joi.string().required(),
        category: Joi.string().required(),
        searchTags: Joi.alternatives(
            Joi.array().items(Joi.string()).required(),
            Joi.string().required()
        ).required()
    }
};

exports.delete = {
    params:{
        id: Joi.string().required()
    }
};

exports.claps = {
    body:{
        docId: Joi.string().required(),
        claps: Joi.number().min(0).max(50).required(),
        userId: Joi.string().required()
    }
};

exports.downloadFile = {
    query:{
        file: Joi.string().required()
    }
};
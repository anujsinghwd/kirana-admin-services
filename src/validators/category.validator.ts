import Joi from "joi";

export const createCategoryValidator = Joi.object({
    name: Joi.object({
        en: Joi.string().required(),
        hi: Joi.string().required(),
    }).required(),
    description: Joi.object({
        en: Joi.string(),
        hi: Joi.string(),
    }),
    image: Joi.string(),
    published: Joi.boolean(),
})

export const updateCategoryValidator = Joi.object({
    name: Joi.object({
        en: Joi.string().required(),
        hi: Joi.string().required(),
    }),
    description: Joi.object({
        en: Joi.string(),
        hi: Joi.string(),
    }),
    image: Joi.string(),
    published: Joi.boolean(),
})

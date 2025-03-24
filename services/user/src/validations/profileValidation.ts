/**
 * Validation schemas for profile-related data
 * Contains validation rules for user profile updates including biometrics
 */
import Joi from 'joi';
import { Gender } from '../constants/gender';
import { FitnessLevel } from '../constants/fitness';

/**
 * Schema for validating biometric measurements (weight and height)
 */
export const biometricsValidationSchema = Joi.object({
  weight: Joi.number().positive().required().messages({
    'number.base': 'Weight must be a number.',
    'number.positive': 'Weight must be a positive number.',
    'any.required': 'Weight is required.'
  }),
  height: Joi.number().positive().required().messages({
    'number.base': 'Height must be a number.',
    'number.positive': 'Height must be a positive number.',
    'any.required': 'Height is required.'
  }),
});

/**
 * Schema for validating gender
 */
export const genderValidationSchema = Joi.object({
  gender: Joi.string()
    .valid(...Object.values(Gender))
    .required()
    .messages({
      'any.only': `Gender must be one of: ${Object.values(Gender).join(', ')}`,
      'any.required': 'Gender is required.'
    })
});

/**
 * Schema for validating fitness level
 */
export const fitnessLevelValidationSchema = Joi.object({
  fitnessLevel: Joi.string()
    .valid(...Object.values(FitnessLevel))
    .required()
    .messages({
      'any.only': `Fitness level must be one of: ${Object.values(FitnessLevel).join(', ')}`,
      'any.required': 'Fitness level is required.'
    })
});

/**
 * Schema for validating date of birth
 */
export const dateOfBirthValidationSchema = Joi.object({
  dateOfBirth: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Date of birth must be a valid date.',
      'date.format': 'Date of birth must be in ISO format (YYYY-MM-DD).',
      'any.required': 'Date of birth is required.'
    })
});

/**
 * Complete profile validation schema - combines all relevant validations
 */
export const profileValidationSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100),
  lastName: Joi.string().trim().min(1).max(100),
  bio: Joi.string().trim().max(500).allow('', null),
  profilePicture: Joi.string().trim().uri().allow('', null),
  dateOfBirth: Joi.date().iso().allow(null),
  gender: Joi.string().valid(...Object.values(Gender)).allow(null),
  weight: Joi.number().positive().allow(null),
  height: Joi.number().positive().allow(null),
  fitnessLevel: Joi.string().valid(...Object.values(FitnessLevel)).allow(null),
  phoneNumber: Joi.string().trim().max(20).allow('', null)
});

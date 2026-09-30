import { Schema } from 'express-validator';

export const createEmployeeValidator: Schema = {
  firstName: {
    in: 'body',
    exists: { errorMessage: 'First name is required' },
    isString: { errorMessage: 'First name must be a string' }
  },
  lastName: {
    in: 'body',
    exists: { errorMessage: 'Last name is required' },
    isString: { errorMessage: 'Last name must be a string' }
  },
  email: {
    in: 'body',
    isEmail: { errorMessage: 'Valid email is required' },
    normalizeEmail: true
  },
  departmentId: {
    in: 'body',
    isInt: { errorMessage: 'Valid department ID is required' },
    toInt: true
  }
};

export const getEmployeesByDepartmentValidator: Schema = {
  departmentId: {
    in: 'params',
    isInt: { errorMessage: 'Department ID must be a valid integer' },
    toInt: true
  }
};

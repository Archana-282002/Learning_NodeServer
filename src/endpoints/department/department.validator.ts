import { Schema } from 'express-validator';

export const createDepartmentValidator: Schema = {
  name: {
    in: 'body',
    exists: { errorMessage: 'Name is required' },
    isString: { errorMessage: 'Name must be a string' }
  },
  code: {
    in: 'body',
    exists: { errorMessage: 'Code is required' },
    isString: { errorMessage: 'Code must be a string' }
  }
};

export const updateDepartmentValidator: Schema = {
  name: {
    in: 'body',
    optional: true,
    isString: { errorMessage: 'Name must be a string' }
  }
};

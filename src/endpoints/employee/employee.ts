import { Endpoint, EndpointAuthType, EndpointMethod, middleware } from 'node-server-engine';
import { createEmployeeValidator, getEmployeesByDepartmentValidator } from './employee.validator';
import {
  createEmployeeHandler,
  getEmployeesByDepartmentHandler,
  getAllEmployeesHandler
} from './employee.handler';

export const createEmployeeEndpoint = new Endpoint({
  path: '/employees',
  method: EndpointMethod.POST,
  handler: createEmployeeHandler,
  authType: EndpointAuthType.JWT,
  validator: createEmployeeValidator,
  middleware: [middleware.checkPermission('CreateDepartment')]
});

export const getEmployeesByDepartmentEndpoint = new Endpoint({
  path: '/departments/:departmentId/employees',
  method: EndpointMethod.GET,
  handler: getEmployeesByDepartmentHandler,
  authType: EndpointAuthType.JWT,
  validator: getEmployeesByDepartmentValidator,
  middleware: [middleware.checkPermission('GetDepartment')]
});

export const getAllEmployeesEndpoint = new Endpoint({
  path: '/employees',
  method: EndpointMethod.GET,
  handler: getAllEmployeesHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [middleware.checkPermission('GetDepartment')]
});

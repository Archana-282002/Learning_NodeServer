import { Endpoint, EndpointAuthType, EndpointMethod, middleware } from 'node-server-engine';
import { createDepartmentValidator, updateDepartmentValidator } from './department.validator';
import {
  createDepartmentHandler,
  getAllDepartmentsHandler,
  getDepartmentByIdHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler
} from './department.handler';

export const createDepartmentEndpoint = new Endpoint({
  path: '/departments',
  method: EndpointMethod.POST,
  handler: createDepartmentHandler,
  authType: EndpointAuthType.JWT,
  validator: createDepartmentValidator,
  middleware: [middleware.checkPermission('CreateDepartment')]
});

export const getAllDepartmentsEndpoint = new Endpoint({
  path: '/departments',
  method: EndpointMethod.GET,
  handler: getAllDepartmentsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [middleware.checkPermission('GetDepartment')]
});

export const getDepartmentByIdEndpoint = new Endpoint({
  path: '/departments/:id',
  method: EndpointMethod.GET,
  handler: getDepartmentByIdHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [middleware.checkPermission('GetDepartment')]
});

export const updateDepartmentEndpoint = new Endpoint({
  path: '/departments/:id',
  method: EndpointMethod.PUT,
  handler: updateDepartmentHandler,
  authType: EndpointAuthType.JWT,
  validator: updateDepartmentValidator,
  middleware: [middleware.checkPermission('UpdateDepartment')]
});

export const deleteDepartmentEndpoint = new Endpoint({
  path: '/departments/:id',
  method: EndpointMethod.DELETE,
  handler: deleteDepartmentHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [middleware.checkPermission('DeleteDepartment')]
});

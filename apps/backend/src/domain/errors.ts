export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND';
  constructor(resource: string, id: number | string) {
    super(`${resource} with id ${id} not found`);
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
  }
}

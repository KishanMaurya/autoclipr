import { Request } from 'express';

export type AutocliprRequest = Request & {
  correlationId?: string;
  user?: { sub?: string; id?: string };
};

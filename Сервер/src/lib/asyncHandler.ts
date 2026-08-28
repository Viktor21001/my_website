import type { Request, Response, NextFunction, RequestHandler } from 'express'

/*
  Оборачивает async-обработчик так, чтобы отклонённый промис
  попадал в errorHandler, а не падал необработанным исключением.
  Без этого каждый роут пришлось бы оборачивать в try/catch вручную.
*/
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

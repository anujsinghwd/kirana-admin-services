import { Request, Response, NextFunction } from "express";
import logger from "@config/logger";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { method, url, params, query, body } = req;
  console.log('worksss');
  // Log request
  logger.info(
    `Request => Method: ${method}, URL: ${url}, Params: ${JSON.stringify(
      params
    )}, Query: ${JSON.stringify(query)}, Body: ${JSON.stringify(body)}`
  );

  // Capture response data
  const oldSend = res.send;
  res.send = function (data: any) {
    logger.info(
      `Response => Method: ${method}, URL: ${url}, Status: ${res.statusCode}, Response: ${data}`
    );
    // @ts-ignore
    oldSend.apply(res, arguments);
    return res;
  };

  next();
};

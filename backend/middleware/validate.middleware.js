import { validateSchema } from "@crew-hive/shared";
import { Errors } from "./error.middleware.js";

/** validate(schema, "body"|"query") → req.valid contains the sanitised, typed input. */
export const validate = (schema, source = "body") => (req, res, next) => {
  const r = validateSchema(schema, req[source]);
  if (!r.ok) return next(Errors.badRequest("Invalid request", r.errors));
  req.valid = r.value;
  next();
};

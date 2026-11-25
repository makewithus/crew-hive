/** Canonical response envelope: { success, data, message } / { success:false, error:{code,message,details} } */
export function envelope(req, res, next) {
  res.ok = (data = {}, message = "OK", status = 200) => res.status(status).json({ success: true, data, message });
  res.created = (data = {}, message = "Created") => res.ok(data, message, 201);
  next();
}

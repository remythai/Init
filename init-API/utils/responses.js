
export const success = (res, data, message = null, statusCode = 200) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

export const created = (res, data, message = 'Created with success') => {
  return success(res, data, message, 201);
};

export const noContent = (res) => {
  return res.status(204).send();
};
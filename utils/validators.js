// Form Validation Utilities

/**
 * Validate phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - Is valid
 */
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid
 */
export const validateEmail = (email) => {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Is valid
 */
export const validateUrl = (url) => {
  if (!url) return true; // URL is optional
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {boolean} - Is valid
 */
export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} - Is valid
 */
export const validateMinLength = (value, minLength) => {
  return value && value.length >= minLength;
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} - Is valid
 */
export const validateMaxLength = (value, maxLength) => {
  return !value || value.length <= maxLength;
};

/**
 * Validate name (at least 2 characters, letters and spaces only)
 * @param {string} name - Name to validate
 * @returns {boolean} - Is valid
 */
export const validateName = (name) => {
  if (!name) return false;
  const nameRegex = /^[a-zA-Z\s]{2,}$/;
  return nameRegex.test(name.trim());
};

/**
 * Validate number
 * @param {any} value - Value to validate
 * @returns {boolean} - Is valid
 */
export const validateNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && num > 0;
};

/**
 * Validate date (not in past)
 * @param {string|Date} date - Date to validate
 * @returns {boolean} - Is valid
 */
export const validateFutureDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
};

/**
 * Get error message for validation
 * @param {string} field - Field name
 * @param {string} rule - Validation rule
 * @returns {string} - Error message
 */
export const getErrorMessage = (field, rule) => {
  const errorMessages = {
    required: `${field} is required`,
    email: `Please enter a valid email address`,
    phone: `Please enter a valid phone number`,
    url: `Please enter a valid URL`,
    minLength: `${field} must be at least {0} characters`,
    maxLength: `${field} must not exceed {0} characters`,
    number: `${field} must be a valid number`,
    futureDate: `${field} must be in the future`,
    name: `${field} must contain only letters and spaces`,
  };
  return errorMessages[rule] || `Invalid ${field}`;
};

export default {
  validatePhoneNumber,
  validateEmail,
  validateUrl,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateName,
  validateNumber,
  validateFutureDate,
  getErrorMessage,
};

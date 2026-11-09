// Formatting Utilities

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  return `+1${cleaned}`;
};

/**
 * Format date to readable format
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date and time
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date and time
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (!amount && amount !== 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert status to badge text
 * @param {string} status - Status value
 * @returns {string} - Readable status
 */
export const formatStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    accepted: 'Accepted',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || capitalize(status);
};

/**
 * Calculate days from now
 * @param {string|Date} date - Date to calculate from
 * @returns {number} - Days from now
 */
export const daysFromNow = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const today = new Date();
  const diffTime = d - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default {
  formatPhoneNumber,
  formatDate,
  formatDateTime,
  formatCurrency,
  truncateText,
  capitalize,
  formatStatus,
  daysFromNow,
};

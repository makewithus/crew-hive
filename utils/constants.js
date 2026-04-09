// Application Constants

export const USER_ROLES = {
  CREW: 'crew',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const CREW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const CREW_ROLES = [
  'Cinematographer',
  'Photographer',
  'Sound Engineer',
  'Lighting Technician',
  'Assistant Director',
  'Production Assistant',
  'Editor',
  'Drone Pilot',
  'Grip',
  'Gaffer',
];

export const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

export const AVAILABILITY_STATUSES = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
};

export const COLORS = {
  PRIMARY: '#F5A623',
  SECONDARY: '#0D0D0D',
  SUCCESS: '#10B981',
  ERROR: '#EF4444',
  WARNING: '#F59E0B',
  INFO: '#3B82F6',
  AVAILABLE: '#10B981',
  UNAVAILABLE: '#EF4444',
};

export const BOOKING_PAGE_SIZE = 10;
export const CREW_SEARCH_PAGE_SIZE = 20;

export const ROUTE_PATHS = {
  HOME: '/',
  AUTH_PHONE: '/auth/phone',
  AUTH_OTP: '/auth/verify-otp',
  AUTH_ROLE: '/auth/role-selection',
  CREW_SETUP: '/crew/setup',
  CREW_DASHBOARD: '/crew/dashboard',
  CREW_REQUESTS: '/crew/requests',
  CREW_VERIFY: '/crew/verify',
  ORGANIZER_SETUP: '/organizer/setup',
  ORGANIZER_DASHBOARD: '/organizer/dashboard',
  ORGANIZER_SEARCH: '/organizer/search',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_APPROVALS: '/admin/approvals',
  SUPER_ADMIN_DASHBOARD: '/super-admin/dashboard',
  SUPER_ADMIN_USERS: '/super-admin/users',
  PENDING_APPROVAL: '/pending-approval',
};

export default {
  USER_ROLES,
  CREW_STATUS,
  BOOKING_STATUS,
  CREW_ROLES,
  EXPERIENCE_LEVELS,
  AVAILABILITY_STATUSES,
  COLORS,
  ROUTE_PATHS,
};

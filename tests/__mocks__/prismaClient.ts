// Mock all Prisma-generated enum types used across the codebase
export enum UserType { employee = 'employee', employer = 'employer' }
export enum SocialProvider { none = 'none', google = 'google', facebook = 'facebook', instagram = 'instagram' }
export enum PriceType { fixed = 'fixed', hourly = 'hourly', daily = 'daily' }
export enum NotificationType {
  new_match = 'new_match',
  new_message = 'new_message',
  nearby_search = 'nearby_search',
  verification_success = 'verification_success',
}

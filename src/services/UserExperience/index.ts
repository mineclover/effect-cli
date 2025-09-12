/**
 * User Experience Module
 * 
 * Advanced user experience enhancements for the Effect CLI.
 * Provides intelligent feedback, progress tracking, and adaptive interface
 * based on user behavior and system performance.
 * 
 * Phase 3.4: User Experience Enhancement
 * 
 * @version 1.0.0
 * @created 2025-01-12
 */

// Core service
export {
  UserExperienceEnhancer,
  UserExperienceEnhancerLive,
  type ProgressTracker,
  type ProgressOptions,
  type ProgressStyle,
  type FeedbackContext,
  type UserLevel,
  type UserPattern,
  type PatternType
} from "./UserExperienceEnhancer.js"

// Utility functions
export {
  createProgressTracker,
  enhanceCommandWithProgress,
  adaptiveProgressStyle,
  getUserLevelFromPatterns
} from "./utils.js"
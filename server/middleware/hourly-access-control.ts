/**
 * Hourly Access Control Enforcement Middleware
 * Validates employee access based on:
 * - Current shift schedule
 * - Access level permissions
 * - Shift buffer times
 * - Department restrictions
 * - Time-based access windows
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

interface ShiftInfo {
  id: string;
  employee_id: string;
  shift_start: string;
  shift_end: string;
  shift_date: string;
  break_duration: number;
}

interface EmployeeAccessControl {
  id: string;
  employee_id: string;
  access_level: 'FULL' | 'LIMITED' | 'READ_ONLY' | 'NONE';
  can_access_at_home: boolean;
  shift_based_access: boolean;
  shift_buffer_minutes: number;
  allowed_modules: string[];
  access_restrictions: Record<string, any>;
}

interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  accessLevel?: string;
  allowedModules?: string[];
  restrictions?: Record<string, any>;
}

export class HourlyAccessControlEngine {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Check if employee can access system at current time
   */
  async checkEmployeeAccess(
    employeeId: string,
    orgId: string,
    requestedModule?: string
  ): Promise<AccessCheckResult> {
    try {
      // Get employee profile
      const { data: employee, error: empError } = await this.supabase
        .from('employee_profiles')
        .select('*')
        .eq('id', employeeId)
        .eq('org_id', orgId)
        .single();

      if (empError || !employee) {
        return {
          allowed: false,
          reason: 'Employee not found',
        };
      }

      // Check if employee is active
      if (employee.status !== 'ACTIVE') {
        return {
          allowed: false,
          reason: `Employee status is ${employee.status}`,
        };
      }

      // Check if employee can access system
      if (!employee.can_access_system) {
        return {
          allowed: false,
          reason: 'System access disabled',
        };
      }

      // Get access control settings
      const { data: accessControl, error: acError } = await this.supabase
        .from('employee_access_control')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (acError || !accessControl) {
        // Default to FULL access if no restrictions
        return {
          allowed: true,
          accessLevel: 'FULL',
          allowedModules: [],
        };
      }

      // Check access level
      if (accessControl.access_level === 'NONE') {
        return {
          allowed: false,
          reason: 'Access level is NONE',
        };
      }

      // Check shift-based access
      if (accessControl.shift_based_access) {
        const shiftCheck = await this.checkShiftAccess(
          employeeId,
          orgId,
          accessControl.shift_buffer_minutes
        );

        if (!shiftCheck.allowed) {
          return shiftCheck;
        }
      }

      // Check module access
      if (requestedModule && accessControl.allowed_modules?.length > 0) {
        if (!accessControl.allowed_modules.includes(requestedModule) && 
            accessControl.access_level !== 'FULL') {
          return {
            allowed: false,
            reason: `Access denied for module: ${requestedModule}`,
          };
        }
      }

      // Check time-based restrictions
      if (accessControl.access_restrictions) {
        const timeCheck = this.checkTimeRestrictions(accessControl.access_restrictions);
        if (!timeCheck.allowed) {
          return timeCheck;
        }
      }

      return {
        allowed: true,
        accessLevel: accessControl.access_level,
        allowedModules: accessControl.allowed_modules || [],
        restrictions: accessControl.access_restrictions,
      };
    } catch (error) {
      console.error('[Hourly Access Control] Check error:', error);
      return {
        allowed: false,
        reason: 'Access check failed',
      };
    }
  }

  /**
   * Check if employee's shift allows access
   */
  private async checkShiftAccess(
    employeeId: string,
    orgId: string,
    bufferMinutes: number = 15
  ): Promise<AccessCheckResult> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Get today's shift
      const { data: shift, error: shiftError } = await this.supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('org_id', orgId)
        .eq('shift_date', today)
        .single();

      if (shiftError || !shift) {
        return {
          allowed: false,
          reason: 'No shift scheduled for today',
        };
      }

      // Parse shift times
      const [shiftStartHour, shiftStartMin] = shift.shift_start.split(':').map(Number);
      const [shiftEndHour, shiftEndMin] = shift.shift_end.split(':').map(Number);

      const shiftStart = new Date(now);
      shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);

      const shiftEnd = new Date(now);
      shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

      // Add buffer time before shift start
      const bufferStart = new Date(shiftStart.getTime() - bufferMinutes * 60 * 1000);
      
      // Add break duration if applicable
      let effectiveEnd = shiftEnd;
      if (shift.break_duration) {
        effectiveEnd = new Date(shiftEnd.getTime() + shift.break_duration * 60 * 1000);
      }

      // Check if current time is within access window
      if (now >= bufferStart && now <= effectiveEnd) {
        return {
          allowed: true,
          reason: 'Within shift hours',
        };
      }

      // Calculate time until next shift
      const msUntilShift = shiftStart.getTime() - now.getTime();
      const minutesUntilShift = Math.ceil(msUntilShift / 60000);

      return {
        allowed: false,
        reason: `Shift not active. Next shift in ${minutesUntilShift} minutes`,
      };
    } catch (error) {
      console.error('[Hourly Access Control] Shift check error:', error);
      return {
        allowed: false,
        reason: 'Shift check failed',
      };
    }
  }

  /**
   * Check time-based access restrictions
   */
  private checkTimeRestrictions(restrictions: Record<string, any>): AccessCheckResult {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Check if access is blocked by time
    if (restrictions.blackout_hours) {
      const [startHour, endHour] = restrictions.blackout_hours;
      if (currentHour >= startHour && currentHour < endHour) {
        return {
          allowed: false,
          reason: `Access blocked during blackout hours (${startHour}:00 - ${endHour}:00)`,
        };
      }
    }

    // Check if access is only allowed on certain days
    if (restrictions.allowed_days) {
      if (!restrictions.allowed_days.includes(currentDay)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return {
          allowed: false,
          reason: `Access not allowed on ${dayNames[currentDay]}`,
        };
      }
    }

    // Check if access is only during business hours
    if (restrictions.business_hours_only) {
      if (currentHour < 8 || currentHour >= 18) {
        return {
          allowed: false,
          reason: 'Access only allowed during business hours (8:00 - 18:00)',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get remaining access time for employee
   */
  async getRemainingAccessTime(
    employeeId: string,
    orgId: string
  ): Promise<{ minutes: number; until: string } | null> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const { data: shift } = await this.supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('org_id', orgId)
        .eq('shift_date', today)
        .single();

      if (!shift) return null;

      const [shiftEndHour, shiftEndMin] = shift.shift_end.split(':').map(Number);
      const shiftEnd = new Date(now);
      shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

      const msRemaining = shiftEnd.getTime() - now.getTime();
      const minutesRemaining = Math.floor(msRemaining / 60000);

      return {
        minutes: Math.max(0, minutesRemaining),
        until: shiftEnd.toISOString(),
      };
    } catch (error) {
      console.error('[Hourly Access Control] Get remaining time error:', error);
      return null;
    }
  }
}

/**
 * Express middleware for hourly access control
 */
export const hourlyAccessControlMiddleware = (
  requiredModule?: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if not authenticated
      if (!req.user?.id || !req.user?.org_id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const engine = new HourlyAccessControlEngine(
        process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const result = await engine.checkEmployeeAccess(
        req.user.id,
        req.user.org_id,
        requiredModule
      );

      if (!result.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: result.reason,
        });
      }

      // Attach access info to request
      (req as any).accessLevel = result.accessLevel;
      (req as any).allowedModules = result.allowedModules;
      (req as any).restrictions = result.restrictions;

      next();
    } catch (error) {
      console.error('[Hourly Access Control Middleware] Error:', error);
      res.status(500).json({
        error: 'Access control check failed',
      });
    }
  };
};

export default HourlyAccessControlEngine;

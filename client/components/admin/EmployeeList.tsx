/**
 * Enterprise Employee List
 * High-performance pagination component for 50,000+ employees
 * Features: search, sort, filter, inline actions, bulk operations
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, ChevronDown, X, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  position_title: string;
  employment_type: 'SALARY' | 'HOURLY' | '1099_CONTRACTOR';
  status: 'ACTIVE' | 'INACTIVE' | 'ONBOARDING' | 'SUSPENDED' | 'TERMINATED';
  hire_date: string;
  outlet_id?: string;
  outlet_name?: string;
  last_login_at?: string;
}

interface EmployeeListProps {
  employees: Employee[];
  isLoading?: boolean;
  onSelectEmployee?: (employee: Employee) => void;
  onBulkAction?: (selectedIds: string[], action: string) => void;
  onExport?: (format: 'csv' | 'excel', selectedIds?: string[]) => void;
  pageSize?: number;
}

const statusColorMap: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  ONBOARDING: 'bg-blue-100 text-blue-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
};

const employmentTypeMap: Record<string, string> = {
  SALARY: 'Salaried',
  HOURLY: 'Hourly',
  '1099_CONTRACTOR': 'Contractor',
};

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  isLoading = false,
  onSelectEmployee,
  onBulkAction,
  onExport,
  pageSize = 50,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'hire_date' | 'department'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.first_name.toLowerCase().includes(query) ||
          emp.last_name.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.employee_number.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((emp) => emp.status === filterStatus);
    }

    // Employment type filter
    if (filterType !== 'all') {
      result = result.filter((emp) => emp.employment_type === filterType);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name}`;
          bVal = `${b.first_name} ${b.last_name}`;
          break;
        case 'hire_date':
          aVal = new Date(a.hire_date).getTime();
          bVal = new Date(b.hire_date).getTime();
          break;
        case 'department':
          aVal = a.department;
          bVal = b.department;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [employees, searchQuery, sortBy, sortOrder, filterStatus, filterType]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return filteredEmployees.slice(start, end);
  }, [filteredEmployees, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, sortBy, sortOrder, filterStatus, filterType]);

  // Handle select all on current page
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedEmployees.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set([...selectedIds, ...paginatedEmployees.map((emp) => emp.id)]);
      setSelectedIds(allIds);
    }
  }, [paginatedEmployees, selectedIds]);

  // Handle individual select
  const handleSelectEmployee = useCallback((employeeId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Clear all selections
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 border-b bg-gray-50 space-y-3">
        {/* Search and Actions */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or employee number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Export Button */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    onExport('csv', selectedIds.size > 0 ? Array.from(selectedIds) : undefined)
                  }
                >
                  CSV {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onExport('excel', selectedIds.size > 0 ? Array.from(selectedIds) : undefined)
                  }
                >
                  Excel {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ONBOARDING">Onboarding</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>

          {/* Employment Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SALARY">Salaried</SelectItem>
              <SelectItem value="HOURLY">Hourly</SelectItem>
              <SelectItem value="1099_CONTRACTOR">Contractor</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="hire_date">Hire Date</SelectItem>
              <SelectItem value="department">Department</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                sortOrder === 'desc' && 'rotate-180'
              )}
            />
          </Button>

          {/* Results Count */}
          <div className="text-gray-600 ml-auto text-xs">
            {filteredEmployees.length.toLocaleString()} employees
            {searchQuery && ` (filtered from ${employees.length})`}
          </div>
        </div>

        {/* Selection Toolbar */}
        {selectedIds.size > 0 && onBulkAction && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200 flex-wrap">
            <span className="text-sm text-gray-700 font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkAction(Array.from(selectedIds), 'grant_access')}
            >
              Grant Access
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkAction(Array.from(selectedIds), 'revoke_access')}
            >
              Revoke Access
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onBulkAction(Array.from(selectedIds), 'send_email')}
            >
              Send Email
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs ml-auto text-red-600 hover:text-red-700"
              onClick={handleClearSelection}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {/* Column Headers */}
        <div className="sticky top-0 flex items-center gap-3 px-4 py-3 bg-gray-100 border-b text-xs font-semibold text-gray-700 z-10">
          <Checkbox
            checked={
              paginatedEmployees.length > 0 &&
              paginatedEmployees.every((emp) => selectedIds.has(emp.id))
            }
            onCheckedChange={handleSelectAll}
            className="flex-shrink-0"
          />
          <div className="w-20 flex-shrink-0">ID</div>
          <div className="flex-1 min-w-0">Name</div>
          <div className="w-32 flex-shrink-0">Department</div>
          <div className="w-40 flex-shrink-0">Position</div>
          <div className="w-24 flex-shrink-0">Status</div>
          <div className="w-20 flex-shrink-0">Type</div>
          <div className="w-10 flex-shrink-0"></div>
        </div>

        {/* Table Rows */}
        {paginatedEmployees.length > 0 ? (
          <div className="divide-y">
            {paginatedEmployees.map((emp) => {
              const isSelected = selectedIds.has(emp.id);
              return (
                <div
                  key={emp.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50'
                  )}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectEmployee(emp.id)}
                    className="flex-shrink-0"
                  />

                  {/* Employee Number */}
                  <div className="w-20 flex-shrink-0 text-sm font-mono text-gray-600">
                    {emp.employee_number}
                  </div>

                  {/* Name */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelectEmployee?.(emp)}
                  >
                    <div className="font-medium text-gray-900 truncate">
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{emp.email}</div>
                  </div>

                  {/* Department */}
                  <div className="w-32 flex-shrink-0 text-sm text-gray-700 truncate">
                    {emp.department}
                  </div>

                  {/* Position */}
                  <div className="w-40 flex-shrink-0 text-sm text-gray-700 truncate">
                    {emp.position_title}
                  </div>

                  {/* Status */}
                  <div className="w-24 flex-shrink-0">
                    <Badge
                      className={cn(
                        'text-xs',
                        statusColorMap[emp.status] ||
                          'bg-gray-100 text-gray-800'
                      )}
                    >
                      {emp.status}
                    </Badge>
                  </div>

                  {/* Employment Type */}
                  <div className="w-20 flex-shrink-0 text-sm text-gray-600">
                    {employmentTypeMap[emp.employment_type]}
                  </div>

                  {/* Actions */}
                  <div className="w-10 flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectEmployee?.(emp)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Send Welcome Email</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {isLoading ? 'Loading employees...' : 'No employees found'}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredEmployees.length > 0 && (
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Showing {(currentPage * pageSize) + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, filteredEmployees.length)} of{' '}
            {filteredEmployees.length.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-gray-600 text-xs">
              Page {currentPage + 1} of {Math.max(1, totalPages)}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Page size selector */}
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                // Note: pageSize is fixed, this is for future enhancement
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25/page</SelectItem>
                <SelectItem value="50">50/page</SelectItem>
                <SelectItem value="100">100/page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;

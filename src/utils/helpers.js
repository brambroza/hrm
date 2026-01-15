
import { supabase } from '@/lib/customSupabaseClient';

// Format Thai date
export const formatThaiDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const thaiYear = d.getFullYear() + 543;
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${thaiYear}`;
};

// Encrypt sensitive data (simple base64 for demo - use proper encryption in production)
export const encryptSensitiveData = (data) => {
  if (!data) return null;
  return btoa(data);
};

// Decrypt sensitive data
export const decryptSensitiveData = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    return atob(encryptedData);
  } catch (e) {
    return null;
  }
};

// Generate employee ID
export const generateEmployeeId = async (employmentType, supabase) => {
  const prefix = employmentType === 'monthly' ? 'EMP' : 'DAY';
  
  const { data, error } = await supabase
    .from('employees')
    .select('employee_id')
    .like('employee_id', `${prefix}-%`)
    .order('employee_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error generating employee ID:', error);
    return `${prefix}-001`;
  }

  if (!data || data.length === 0) {
    return `${prefix}-001`;
  }

  const lastId = data[0].employee_id;
  const lastNumber = parseInt(lastId.split('-')[1]);
  const newNumber = (lastNumber + 1).toString().padStart(3, '0');
  
  return `${prefix}-${newNumber}`;
};

// Export to Excel
export const exportToExcel = async (data, filename) => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Calculate hours worked
export const calculateHoursWorked = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return (diff / (1000 * 60 * 60)).toFixed(2);
};

// Check document expiry alerts
export const getDocumentExpiryAlerts = (employees) => {
  const alerts = [];
  const today = new Date();
  
  employees.forEach(emp => {
    if (emp.visa_expiry) {
      const daysUntilExpiry = Math.ceil((new Date(emp.visa_expiry) - today) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
        alerts.push({
          employee: emp,
          document: 'Visa',
          expiryDate: emp.visa_expiry,
          daysRemaining: daysUntilExpiry
        });
      }
    }
    
    if (emp.ninety_day_report_date) {
      const daysUntilReport = Math.ceil((new Date(emp.ninety_day_report_date) - today) / (1000 * 60 * 60 * 24));
      if (daysUntilReport <= 30 && daysUntilReport > 0) {
        alerts.push({
          employee: emp,
          document: '90-Day Report',
          expiryDate: emp.ninety_day_report_date,
          daysRemaining: daysUntilReport
        });
      }
    }
  });
  
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

// Log Audit Trail
export const logAuditTrail = async (userId, action, tableName, recordId, oldValue, newValue) => {
  try {
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      timestamp: new Date().toISOString()
    }]);
  } catch (error) {
    console.error('Failed to log audit trail:', error);
  }
};

// Generate Random Password
export const generatePassword = (length = 8) => {
  const charset = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    number: '0123456789',
    symbol: '!@#$%^&*'
  };
  
  let password = '';
  // Ensure at least one of each type
  password += charset.upper.charAt(Math.floor(Math.random() * charset.upper.length));
  password += charset.lower.charAt(Math.floor(Math.random() * charset.lower.length));
  password += charset.number.charAt(Math.floor(Math.random() * charset.number.length));
  password += charset.symbol.charAt(Math.floor(Math.random() * charset.symbol.length));
  
  const allChars = charset.upper + charset.lower + charset.number + charset.symbol;
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

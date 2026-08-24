import { supabase } from "@/lib/customSupabaseClient";

// Format date as DD/MM/YYYY in Thailand timezone
export const formatThaiDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export const formatThaiTime = (date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(date));
};

export const formatThaiDateTime = (date) => {
  if (!date) return "";
  const datePart = formatThaiDate(date);
  const timePart = formatThaiTime(date);
  return `${datePart} ${timePart}`;
};

export const getThaiISODate = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

// Sensitive fields such as national IDs are protected by Row Level Security and
// database-side encryption, not in the browser. The previous base64 helpers here
// were named "encrypt"/"decrypt" but provided no protection at all, so they were
// removed rather than left to imply a safeguard that did not exist.

// Generate employee ID
export const generateEmployeeId = async (employmentType, supabase) => {
  const prefix = employmentType === "monthly" ? "EMP" : "DAY";

  const { data, error } = await supabase
    .from("employees")
    .select("employee_id")
    .like("employee_id", `${prefix}-%`)
    .order("employee_id", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error generating employee ID:", error);
    return `${prefix}-001`;
  }

  if (!data || data.length === 0) {
    return `${prefix}-001`;
  }

  const lastId = data[0].employee_id;
  const lastNumber = parseInt(lastId.split("-")[1]);
  const newNumber = (lastNumber + 1).toString().padStart(3, "0");

  return `${prefix}-${newNumber}`;
};

// Export to Excel
export const exportToExcel = async (data, filename) => {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Calculate hours worked
export const calculateHoursWorked = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return (diff / (1000 * 60 * 60)).toFixed(2);
};

/**
 * Documents that expire soon, soonest first.
 *
 * `work_permit_expiry` is the column the employee form actually writes; the
 * previous version only read `visa_expiry` and `ninety_day_report_date`, which
 * exist on no table, so it always returned an empty list. Those two are still
 * honoured for installations that add the columns.
 *
 * Work permits are flagged 90 days out because renewal at the labour office
 * takes weeks; the 90-day report gets 30 days since it is a same-week errand.
 *
 * @param {Array<object>} employees  employee rows
 * @returns {Array<{employee: object, document: string, expiryDate: string, daysRemaining: number}>}
 */
export const getDocumentExpiryAlerts = (employees = []) => {
  const alerts = [];
  const today = new Date();

  const daysUntil = (value) =>
    Math.ceil((new Date(value) - today) / (1000 * 60 * 60 * 24));

  const watchList = [
    { field: "work_permit_expiry", document: "workPermit", withinDays: 90 },
    { field: "visa_expiry", document: "visa", withinDays: 90 },
    { field: "ninety_day_report_date", document: "ninetyDayReport", withinDays: 30 },
  ];

  employees.forEach((emp) => {
    watchList.forEach(({ field, document, withinDays }) => {
      if (!emp[field]) return;

      const daysRemaining = daysUntil(emp[field]);
      // Already expired documents are surfaced too — a lapsed work permit is
      // more urgent than one expiring next week, not less.
      if (daysRemaining <= withinDays) {
        alerts.push({
          employee: emp,
          document,
          expiryDate: emp[field],
          daysRemaining,
        });
      }
    });
  });

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

/**
 * Record a change in the audit trail.
 *
 * The row's timestamp comes from the database default on `created_at` so the
 * clock of the user's machine cannot influence it. Writing to a `timestamp`
 * column, as this function used to, silently failed on every call and left the
 * audit log empty.
 *
 * `organization_id` is filled in by the set_organization_id trigger.
 *
 * @param {string} userId     the acting user (auth.users id)
 * @param {string} action     what happened, e.g. 'create' | 'update' | 'delete'
 * @param {string} tableName  the table that changed
 * @param {string} recordId   the row that changed
 * @param {object|null} oldValue  the row before the change
 * @param {object|null} newValue  the row after the change
 * @returns {Promise<{error: Error|null}>}
 */
export const logAuditTrail = async (
  userId,
  action,
  tableName,
  recordId,
  oldValue,
  newValue,
) => {
  const { error } = await supabase.from("audit_logs").insert([
    {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
    },
  ]);

  // An unwritable audit trail is a compliance problem, not a cosmetic one, so
  // it is reported rather than swallowed. It still does not throw: losing an
  // audit row must not roll back the business action the user just completed.
  if (error) {
    console.error("Failed to log audit trail:", error);
  }

  return { error: error ?? null };
};

// Generate Random Password
export const generatePassword = (length = 8) => {
  const charset = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    number: "0123456789",
    symbol: "!@#$%^&*",
  };

  let password = "";
  // Ensure at least one of each type
  password += charset.upper.charAt(
    Math.floor(Math.random() * charset.upper.length),
  );
  password += charset.lower.charAt(
    Math.floor(Math.random() * charset.lower.length),
  );
  password += charset.number.charAt(
    Math.floor(Math.random() * charset.number.length),
  );
  password += charset.symbol.charAt(
    Math.floor(Math.random() * charset.symbol.length),
  );

  const allChars =
    charset.upper + charset.lower + charset.number + charset.symbol;
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle password
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
};

export const ensureSession = async (supabase) => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("Session expired. Please sign in again.");
  }
  return data.session;
};

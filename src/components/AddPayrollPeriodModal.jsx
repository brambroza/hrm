
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { addPayrollPeriod } from '@/services/payrollPeriods';
import { normalizeStatus, VALID_STATUSES } from '@/utils/statusValidator';

const getThaiMonth = (monthIndex) => {
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return months[monthIndex - 1] || "";
};

const AddPayrollPeriodModal = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const initialFormData = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    status: VALID_STATUSES.DRAFT,
    name: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Auto-fill Name Logic
  useEffect(() => {
    if (isOpen) {
      const thaiMonth = getThaiMonth(formData.month);
      const thaiYear = parseInt(formData.year) + 543; // Thai Buddhist Year
      const generatedName = `งวดเดือน${thaiMonth} ${thaiYear}`;
      
      // Only auto-update if name is empty or looks like an auto-generated name
      if (!formData.name || formData.name.startsWith("งวดเดือน")) {
        setFormData(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.month, formData.year, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
        setFormErrors({});
        // Re-initialize mostly for status to be draft
        setFormData(prev => ({ ...prev, status: VALID_STATUSES.DRAFT }));
    } else {
        setFormData(initialFormData);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    // Clear error for this field
    if (formErrors[name]) {
        setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleValueChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
        setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name) errors.name = "กรุณาระบุชื่อรหัสงวด";
    if (!formData.start_date) errors.start_date = "กรุณาระบุวันที่เริ่มต้น";
    if (!formData.end_date) errors.end_date = "กรุณาระบุวันที่สิ้นสุด";
    if (!formData.status) errors.status = "กรุณาระบุสถานะ";
    
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      errors.end_date = "วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น";
    }

    if (!formData.year || formData.year < 2000 || formData.year > 2100) {
        errors.year = "กรุณาระบุปีให้ถูกต้อง";
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง"
        });
        return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    console.log('[AddModal] Submitting new period:', formData);
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedStatus = normalizeStatus(formData.status);
      
      // Prepare data to submit
      const dataToSubmit = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: normalizedStatus,
        // Helper fields (might be used for logic or ignored by service)
        month: formData.month,
        year: formData.year,
        description: formData.description
      };

      const { error } = await addPayrollPeriod(dataToSubmit);

      if (error) throw error;

      toast({ 
        title: "สำเร็จ", 
        description: "เพิ่มงวดการจ่ายสำเร็จ", 
        className: "bg-green-500 text-white" 
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('[AddModal] Error adding period:', err);
      toast({ 
        variant: "destructive", 
        title: "เกิดข้อผิดพลาด", 
        description: err.message || "ไม่สามารถเพิ่มงวดการจ่ายได้ กรุณาลองใหม่" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>เพิ่มงวดการจ่ายใหม่</DialogTitle>
          <DialogDescription>สร้างงวดการจ่ายเงินเดือนใหม่</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>เดือน</Label>
                  <Select 
                      value={formData.month.toString()} 
                      onValueChange={(v) => handleValueChange('month', parseInt(v))}
                  >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                          {Array.from({length: 12}, (_, i) => (
                              <SelectItem key={i+1} value={(i+1).toString()}>{getThaiMonth(i+1)}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label>ปี (ค.ศ.)</Label>
                  <Input 
                      type="number"
                      name="year" 
                      value={formData.year} 
                      onChange={(e) => handleValueChange('year', parseInt(e.target.value) || '')} 
                      className={formErrors.year ? "border-red-500" : ""}
                  />
                  {formErrors.year && <p className="text-xs text-red-500">{formErrors.year}</p>}
              </div>
            </div>
            <div className="space-y-2">
                <Label>ชื่อรหัสงวด <span className="text-red-500">*</span></Label>
                <Input 
                  name="name"
                  value={formData.name} 
                  onChange={handleChange}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>วันที่เริ่มต้น <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      name="start_date"
                      value={formData.start_date} 
                      onChange={handleChange}
                      className={formErrors.start_date ? "border-red-500" : ""}
                    />
                    {formErrors.start_date && <p className="text-xs text-red-500">{formErrors.start_date}</p>}
                </div>
                <div className="space-y-2">
                    <Label>วันที่สิ้นสุด <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      name="end_date"
                      value={formData.end_date} 
                      onChange={handleChange}
                      className={formErrors.end_date ? "border-red-500" : ""}
                    />
                    {formErrors.end_date && <p className="text-xs text-red-500">{formErrors.end_date}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label>สถานะ <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => handleValueChange('status', v)}
                >
                    <SelectTrigger className={formErrors.status ? "border-red-500" : ""}>
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={VALID_STATUSES.DRAFT}>ร่าง (Draft)</SelectItem>
                        <SelectItem value={VALID_STATUSES.OPEN}>เปิดใช้งาน (Open)</SelectItem>
                        <SelectItem value={VALID_STATUSES.CLOSED}>ปิด (Closed)</SelectItem>
                    </SelectContent>
                </Select>
                {formErrors.status && <p className="text-xs text-red-500">{formErrors.status}</p>}
            </div>
            <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                  className="resize-none"
                  rows={3}
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {loading ? "กำลังโหลด..." : "ยกเลิก"}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? "กำลังบันทึก..." : "เพิ่ม"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPayrollPeriodModal;

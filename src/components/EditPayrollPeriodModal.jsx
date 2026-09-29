
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { updatePayrollPeriod } from '@/services/payrollPeriods';
import { normalizeStatus, VALID_STATUSES } from '@/utils/statusValidator';

const EditPayrollPeriodModal = ({ isOpen, onClose, selectedPeriod, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: VALID_STATUSES.DRAFT
  });

  useEffect(() => {
    if (selectedPeriod) {
      setFormData({
        name: selectedPeriod.name || '',
        start_date: selectedPeriod.start_date || '',
        end_date: selectedPeriod.end_date || '',
        status: normalizeStatus(selectedPeriod.status)
      });
      setFormErrors({});
    }
  }, [selectedPeriod, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleValueChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name) errors.name = "กรุณาระบุชื่อรหัสงวด";
    if (!formData.start_date) errors.start_date = "กรุณาระบุวันที่เริ่มต้น";
    if (!formData.end_date) errors.end_date = "กรุณาระบุวันที่สิ้นสุด";
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
        errors.end_date = "วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[EditModal] Submitting update:', formData);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedStatus = normalizeStatus(formData.status);
      const updates = {
          ...formData,
          status: normalizedStatus
      };

      const { error } = await updatePayrollPeriod(selectedPeriod.id, updates);
      if (error) throw error;

      toast({ title: "สำเร็จ", description: "แก้ไขงวดการจ่ายสำเร็จ", className: "bg-green-500 text-white" });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditModal] Error updating period:', err);
      toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: err.message || "ไม่สามารถแก้ไขงวดการจ่ายได้" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไขงวดการจ่าย</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                     </SelectContent>
                 </Select>
                 {formErrors.status && <p className="text-xs text-red-500">{formErrors.status}</p>}
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>ยกเลิก</Button>
            <Button onClick={handleSubmit} disabled={loading}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};

export default EditPayrollPeriodModal;

/**
 * @file Documents an employer in Thailand has to keep, give or file.
 *
 * The list is what the screen shows; `status` says honestly what the system
 * can do about each one today.
 *
 * Section numbers refer to the Labour Protection Act B.E. 2541 unless another
 * law is named. Filing deadlines are the ordinary ones; extensions for
 * electronic filing change by announcement, so the screen tells the user to
 * check the current announcement. This list is general information and has
 * not been reviewed by a lawyer.
 */

export type DocumentStatus = 'available' | 'planned' | 'manual';

export interface LegalDocument {
  id: string;
  name: string;
  /** Who it is for or where it goes. */
  audience: string;
  /** The law that requires it. */
  basis: string;
  /** When it is due or how long it is kept. */
  timing: string;
  status: DocumentStatus;
  /** Why it is not available yet, or what the user has to do themselves. */
  note?: string;
  group: 'keep' | 'give' | 'file';
}

export const GROUP_LABELS: Record<LegalDocument['group'], string> = {
  keep: 'เอกสารที่ต้องจัดทำและเก็บไว้ที่สถานประกอบการ',
  give: 'เอกสารที่ต้องออกให้ลูกจ้าง',
  file: 'แบบที่ต้องยื่นหน่วยงานราชการ',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  available: 'ออกจากระบบได้',
  planned: 'อยู่ในแผนพัฒนา',
  manual: 'จัดทำเอง',
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'employee-register',
    group: 'keep',
    name: 'ทะเบียนลูกจ้าง',
    audience: 'เก็บไว้ที่สถานประกอบการ ให้พนักงานตรวจแรงงานตรวจได้',
    basis: 'มาตรา 112 และ 113 (นายจ้างที่มีลูกจ้างตั้งแต่ 10 คนขึ้นไป)',
    timing: 'จัดทำภายใน 15 วันนับแต่วันที่ลูกจ้างเข้าทำงาน เก็บไว้ไม่น้อยกว่า 2 ปีนับแต่วันสิ้นสุดการจ้าง (มาตรา 115)',
    status: 'available',
  },
  {
    id: 'wage-record',
    group: 'keep',
    name: 'เอกสารเกี่ยวกับการจ่ายค่าจ้าง ค่าล่วงเวลา ค่าทำงานในวันหยุด',
    audience: 'เก็บไว้ที่สถานประกอบการ ลูกจ้างลงลายมือชื่อรับเงิน',
    basis: 'มาตรา 114 (นายจ้างที่มีลูกจ้างตั้งแต่ 10 คนขึ้นไป)',
    timing: 'จัดทำทุกงวดการจ่าย เก็บไว้ไม่น้อยกว่า 2 ปีนับแต่วันจ่ายเงิน (มาตรา 115)',
    status: 'available',
    note: 'ระบบยังไม่คำนวณค่าล่วงเวลาและค่าทำงานในวันหยุด ช่องเหล่านี้จะว่างจนกว่าเครื่องคำนวณเฟส 1 จะเสร็จ',
  },
  {
    id: 'work-rules',
    group: 'keep',
    name: 'ข้อบังคับเกี่ยวกับการทำงาน',
    audience: 'ประกาศโดยเปิดเผย ณ สถานที่ทำงาน',
    basis: 'มาตรา 108 (นายจ้างที่มีลูกจ้างตั้งแต่ 10 คนขึ้นไป)',
    timing: 'ประกาศใช้ภายใน 15 วันนับแต่วันที่มีลูกจ้างครบ 10 คน',
    status: 'manual',
    note: 'เป็นเอกสารนโยบายของบริษัท ควรให้ที่ปรึกษากฎหมายตรวจ ค่าที่ตั้งในหน้าตั้งค่าเริ่มต้นควรตรงกับข้อบังคับนี้',
  },
  {
    id: 'work-certificate',
    group: 'give',
    name: 'หนังสือรับรองการทำงาน',
    audience: 'ลูกจ้างที่สิ้นสุดการจ้าง',
    basis: 'ประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 585',
    timing: 'ออกให้เมื่อการจ้างสิ้นสุดลง ระบุระยะเวลาและลักษณะงานที่ทำ',
    status: 'available',
  },
  {
    id: 'payslip',
    group: 'give',
    name: 'ใบแจ้งเงินเดือน (สลิป)',
    audience: 'ลูกจ้างทุกคน ทุกงวด',
    basis: 'ใช้เป็นหลักฐานประกอบเอกสารการจ่ายค่าจ้างตามมาตรา 114',
    timing: 'ทุกงวดการจ่าย',
    status: 'available',
    note: 'ออกได้ที่เมนูเงินเดือน สลิป ปัจจุบันแสดงเฉพาะเงินเดือนฐาน',
  },
  {
    id: 'withholding-certificate',
    group: 'give',
    name: 'หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)',
    audience: 'ลูกจ้างทุกคน',
    basis: 'ประมวลรัษฎากร มาตรา 50 ทวิ',
    timing: 'ภายในวันที่ 15 กุมภาพันธ์ของปีถัดไป หรือภายใน 1 เดือนนับแต่วันที่ออกจากงาน',
    status: 'planned',
    note: 'ต้องมีการคำนวณภาษีหัก ณ ที่จ่ายก่อน',
  },
  {
    id: 'sso-registration',
    group: 'file',
    name: 'แบบขึ้นทะเบียนผู้ประกันตน (สปส.1-03)',
    audience: 'สำนักงานประกันสังคม',
    basis: 'พระราชบัญญัติประกันสังคม พ.ศ. 2533',
    timing: 'ภายใน 30 วันนับแต่วันที่ลูกจ้างเข้าทำงาน',
    status: 'planned',
    note: 'ระบบยังไม่เก็บเลขประกันสังคมและข้อมูลที่แบบกำหนด',
  },
  {
    id: 'sso-termination',
    group: 'file',
    name: 'หนังสือแจ้งการสิ้นสุดความเป็นผู้ประกันตน (สปส.6-09)',
    audience: 'สำนักงานประกันสังคม',
    basis: 'พระราชบัญญัติประกันสังคม พ.ศ. 2533',
    timing: 'ภายในวันที่ 15 ของเดือนถัดจากเดือนที่ลูกจ้างออกจากงาน',
    status: 'planned',
  },
  {
    id: 'sso-contribution',
    group: 'file',
    name: 'แบบรายการแสดงการส่งเงินสมทบ (สปส.1-10)',
    audience: 'สำนักงานประกันสังคม',
    basis: 'พระราชบัญญัติประกันสังคม พ.ศ. 2533',
    timing: 'ภายในวันที่ 15 ของเดือนถัดไป',
    status: 'planned',
    note: 'ต้องมีการคำนวณเงินสมทบประกันสังคมก่อน',
  },
  {
    id: 'pnd1',
    group: 'file',
    name: 'แบบยื่นรายการภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1)',
    audience: 'กรมสรรพากร',
    basis: 'ประมวลรัษฎากร มาตรา 50 (1) และมาตรา 52',
    timing: 'ภายในวันที่ 7 ของเดือนถัดไป',
    status: 'planned',
    note: 'ต้องมีการคำนวณภาษีหัก ณ ที่จ่ายก่อน',
  },
  {
    id: 'pnd1-kor',
    group: 'file',
    name: 'แบบยื่นรายการภาษีเงินได้หัก ณ ที่จ่ายประจำปี (ภ.ง.ด.1ก)',
    audience: 'กรมสรรพากร',
    basis: 'ประมวลรัษฎากร มาตรา 58 (2)',
    timing: 'ภายในเดือนกุมภาพันธ์ของปีถัดไป',
    status: 'planned',
  },
  {
    id: 'wcf',
    group: 'file',
    name: 'แบบแสดงเงินค่าจ้างประจำปี กองทุนเงินทดแทน (กท.20 ก)',
    audience: 'สำนักงานประกันสังคม',
    basis: 'พระราชบัญญัติเงินทดแทน พ.ศ. 2537',
    timing: 'ภายในเดือนกุมภาพันธ์ของปีถัดไป',
    status: 'planned',
  },
];

/** Shown on the screen and printed under the list. */
export const LEGAL_DISCLAIMER =
  'รายการนี้เป็นข้อมูลทั่วไป ไม่ใช่คำปรึกษาทางกฎหมาย กำหนดยื่นแบบอาจขยายสำหรับการยื่นทางอิเล็กทรอนิกส์ตามประกาศของหน่วยงาน กรุณาตรวจสอบประกาศล่าสุดหรือปรึกษาที่ปรึกษากฎหมายก่อนนำไปใช้';

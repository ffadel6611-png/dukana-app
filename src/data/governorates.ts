import { IraqiGovernorate } from '../types';

export interface GovernorateDetail {
  id: IraqiGovernorate;
  nameAr: string;
  nameKu?: string;
  region: 'الوسط' | 'الجنوب' | 'الشمال' | 'الفرات الأوسط' | 'الغربية' | 'إقليم كردستان';
  deliveryFee: number; // In IQD (e.g. 3,000 to 7,000 IQD)
  avgDeliveryHours: string;
}

export const IRAQI_GOVERNORATES: GovernorateDetail[] = [
  { id: 'بغداد', nameAr: 'بغداد', nameKu: 'بەغدا', region: 'الوسط', deliveryFee: 5000, avgDeliveryHours: '24-48 ساعة' },
  { id: 'البصرة', nameAr: 'البصرة', nameKu: 'بەسرە', region: 'الجنوب', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'نينوى', nameAr: 'نينوى (الموصل)', nameKu: 'نەینەوا (مووسڵ)', region: 'الشمال', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'أربيل', nameAr: 'أربيل', nameKu: 'هەولێر', region: 'إقليم كردستان', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'الأنبار', nameAr: 'الأنبار (الرمادي)', nameKu: 'ئەنبار (ڕەمادی)', region: 'الغربية', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'كركوك', nameAr: 'كركوك', nameKu: 'کەرکووک', region: 'الشمال', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'النجف', nameAr: 'النجف الأشرف', nameKu: 'نەجەف', region: 'الفرات الأوسط', deliveryFee: 5000, avgDeliveryHours: '48 ساعة' },
  { id: 'كربلاء', nameAr: 'كربلاء المقدسة', nameKu: 'کەربەلا', region: 'الفرات الأوسط', deliveryFee: 5000, avgDeliveryHours: '48 ساعة' },
  { id: 'بابل', nameAr: 'بابل (الحلة)', nameKu: 'بابل (حلە)', region: 'الفرات الأوسط', deliveryFee: 5000, avgDeliveryHours: '48 ساعة' },
  { id: 'واسط', nameAr: 'واسط (الكوت)', nameKu: 'واسیت (کوت)', region: 'الوسط', deliveryFee: 5000, avgDeliveryHours: '48 ساعة' },
  { id: 'صلاح الدين', nameAr: 'صلاح الدين (تكريت)', nameKu: 'سەڵاحەدین (تکریت)', region: 'الوسط', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'ديالى', nameAr: 'ديالى (بعقوبة)', nameKu: 'دیالە (بەعقوبە)', region: 'الوسط', deliveryFee: 5000, avgDeliveryHours: '48 ساعة' },
  { id: 'ذي قار', nameAr: 'ذي قار (الناصرية)', nameKu: 'زیقار (ناسیریە)', region: 'الجنوب', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'ميسان', nameAr: 'ميسان (العمارة)', nameKu: 'مەیسان (عەمارە)', region: 'الجنوب', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'المثنى', nameAr: 'المثنى (السماوة)', nameKu: 'موسەننا (سەماوە)', region: 'الجنوب', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'القادسية', nameAr: 'القادسية (الديوانية)', nameKu: 'قادسیە (دیوانیە)', region: 'الفرات الأوسط', deliveryFee: 5000, avgDeliveryHours: '48 ساعة' },
  { id: 'دهوك', nameAr: 'دهوك', nameKu: 'دهۆک', region: 'إقليم كردستان', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'السليمانية', nameAr: 'السليمانية', nameKu: 'سلێمانی', region: 'إقليم كردستان', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
  { id: 'حلبجة', nameAr: 'حلبجة', nameKu: 'هەڵەبجە', region: 'إقليم كردستان', deliveryFee: 5000, avgDeliveryHours: '48-72 ساعة' },
];

export const GOVERNORATE_NAMES: IraqiGovernorate[] = IRAQI_GOVERNORATES.map(g => g.id);

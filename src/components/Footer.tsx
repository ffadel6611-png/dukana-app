import React from 'react';
import {
  ShieldCheck,
  Truck,
  Phone,
  MessageCircle,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { DukkanaLogo } from './DukkanaLogo';

interface FooterProps {
  onOpenCompliance: () => void;
  onOpenSupport: () => void;
  onNavigateHome: () => void;
  onNavigateCategories: () => void;
  onNavigateOrders: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenCompliance,
  onOpenSupport,
  onNavigateHome,
  onNavigateCategories,
  onNavigateOrders,
}) => {
  const { settings } = useMarket();

  return (
    <footer className="bg-white border-t border-zinc-200 mt-16 pb-20 md:pb-8 text-xs text-zinc-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div>
              <DukkanaLogo size="md" variant="full" />
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              المنصة والسوق الإلكتروني العراقي المتكامل لربط الزبائن بنخبة التجار المحليين في كافة محافظات العراق الـ 19، مع الدفع عند الاستلام ونظام تقييمات موثقة بالكامل.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold text-purple-900">
              <Truck className="w-3.5 h-3.5" />
              <span>تغطية 19 محافظة عراقية</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-900 text-xs">التصفح والخدمات</h4>
            <ul className="space-y-1.5 text-zinc-500">
              <li>
                <button
                  onClick={onNavigateHome}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  الرئيسية
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateCategories}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  الأقسام والخصومات
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateOrders}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  متابعة الطلبات
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenSupport}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  الأسئلة الشائعة
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Store Compliance (Apple & Google) */}
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-900 text-xs">السياسات والشروط المعتمدة</h4>
            <ul className="space-y-1.5 text-zinc-500">
              <li>
                <button
                  onClick={onOpenCompliance}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  سياسة الخصوصية
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCompliance}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  شروط الاستخدام
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCompliance}
                  className="hover:text-purple-700 transition cursor-pointer"
                >
                  شروط التجار والنزاهة
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCompliance}
                  className="hover:text-purple-700 transition cursor-pointer text-rose-600"
                >
                  سياسة المنتجات المحظورة
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCompliance}
                  className="hover:text-purple-700 transition cursor-pointer text-rose-600"
                >
                  حذف الحساب ومحو البيانات
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Support */}
          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 text-xs">الدعم وخدمة العملاء</h4>
            <p className="text-[11px] text-zinc-500">
              تواصل مع فريق الدعم الفني لحل أي استفسار أو مشكلة في الطلب:
            </p>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/80 space-y-1">
              <span className="text-[10px] text-purple-700 font-bold block">رقم واتساب الدعم المعتمد:</span>
              <span className="text-xs font-mono font-bold text-purple-950 block" dir="ltr">
                {settings.supportWhatsApp}
              </span>
            </div>
            <button
              onClick={onOpenSupport}
              className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>مركز المساعدة الكامل</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance Status */}
        <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-400">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} سوق دكانة (جمهورية العراق).
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>نظام مهيأ للنشر والتوافق مع متطلبات Apple App Store و Google Play</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

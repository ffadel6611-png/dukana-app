import React, { useState } from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  Home,
  UtensilsCrossed,
  Tag,
  Percent,
  Check,
  Shirt,
  Smartphone,
  Laptop,
  Tv,
  Car,
  Bike,
  Building2,
  PawPrint,
  Briefcase,
  Wrench,
  GraduationCap,
  Trophy,
  Factory,
  Search,
  Sparkles,
  Store,
  Key,
  Cpu,
  Gamepad2,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface CategoriesViewProps {
  onSelectProduct: (product: Product) => void;
  onOpenStore?: (merchantId: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ onSelectProduct, onOpenStore }) => {
  const {
    categories,
    products,
    selectedCategorySlug,
    setSelectedCategorySlug,
    selectedDiscount,
    setSelectedDiscount,
    getFilteredProductsForCustomer,
  } = useMarket();

  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const filteredProducts = getFilteredProductsForCustomer();

  const getCategoryDetails = (slug: string) => {
    switch (slug) {
      case 'stores':
        return {
          icon: <Store className="w-5 h-5" />,
          color: 'from-purple-500/10 to-indigo-500/10 text-purple-700 border-purple-200',
          badge: 'دليل المتاجر',
        };
      case 'clothing-fashion':
      case 'fashion-kids':
        return {
          icon: <Shirt className="w-5 h-5" />,
          color: 'from-pink-500/10 to-rose-500/10 text-pink-700 border-pink-200',
          badge: 'أزياء وأطفال',
        };
      case 'home-goods':
      case 'home-garden':
        return {
          icon: <Home className="w-5 h-5" />,
          color: 'from-amber-500/10 to-yellow-500/10 text-amber-700 border-amber-200',
          badge: 'منزل وحديقة',
        };
      case 'food-products':
      case 'food-groceries':
        return {
          icon: <ShoppingBag className="w-5 h-5" />,
          color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200',
          badge: 'طعام وغذاء',
        };
      case 'restaurants':
        return {
          icon: <UtensilsCrossed className="w-5 h-5" />,
          color: 'from-orange-500/10 to-red-500/10 text-orange-700 border-orange-200',
          badge: 'مشاوي ومطاعم',
        };
      case 'mobiles-electronics':
      case 'mobiles-tablets':
        return {
          icon: <Smartphone className="w-5 h-5" />,
          color: 'from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-200',
          badge: 'موبايل وتابلت',
        };
      case 'electronics':
        return {
          icon: <Cpu className="w-5 h-5" />,
          color: 'from-indigo-500/10 to-blue-500/10 text-indigo-700 border-indigo-200',
          badge: 'إلكترونيات',
        };
      case 'laptops-computers':
        return {
          icon: <Laptop className="w-5 h-5" />,
          color: 'from-indigo-500/10 to-violet-500/10 text-indigo-700 border-indigo-200',
          badge: 'لابتوب وكمبيوتر',
        };
      case 'gaming-video':
        return {
          icon: <Gamepad2 className="w-5 h-5" />,
          color: 'from-violet-500/10 to-fuchsia-500/10 text-violet-700 border-violet-200',
          badge: 'ألعاب وفيديو',
        };
      case 'home-appliances':
        return {
          icon: <Tv className="w-5 h-5" />,
          color: 'from-cyan-500/10 to-sky-500/10 text-cyan-700 border-cyan-200',
          badge: 'أجهزة منزلية',
        };
      case 'cars-vehicles':
        return {
          icon: <Car className="w-5 h-5" />,
          color: 'from-slate-500/10 to-zinc-500/10 text-slate-700 border-slate-200',
          badge: 'مركبات وسيارات',
        };
      case 'motorcycles':
        return {
          icon: <Bike className="w-5 h-5" />,
          color: 'from-red-500/10 to-orange-500/10 text-red-700 border-red-200',
          badge: 'دراجات نارية',
        };
      case 'real-estate':
      case 'real-estate-sale':
        return {
          icon: <Building2 className="w-5 h-5" />,
          color: 'from-emerald-500/10 to-green-500/10 text-emerald-800 border-emerald-200',
          badge: 'عقارات للبيع',
        };
      case 'real-estate-rent':
        return {
          icon: <Key className="w-5 h-5" />,
          color: 'from-teal-500/10 to-emerald-500/10 text-teal-800 border-teal-200',
          badge: 'عقارات للإيجار',
        };
      case 'beauty-health':
        return {
          icon: <Sparkles className="w-5 h-5" />,
          color: 'from-fuchsia-500/10 to-rose-500/10 text-fuchsia-700 border-fuchsia-200',
          badge: 'جمال وصحة',
        };
      case 'animals-pets':
        return {
          icon: <PawPrint className="w-5 h-5" />,
          color: 'from-lime-500/10 to-emerald-500/10 text-lime-800 border-lime-200',
          badge: 'حيوانات ومواشي',
        };
      case 'jobs-careers':
        return {
          icon: <Briefcase className="w-5 h-5" />,
          color: 'from-purple-500/10 to-indigo-500/10 text-purple-700 border-purple-200',
          badge: 'وظائف شاغرة',
        };
      case 'services-maintenance':
        return {
          icon: <Wrench className="w-5 h-5" />,
          color: 'from-amber-500/10 to-orange-500/10 text-amber-800 border-amber-200',
          badge: 'خدمات وصيانة',
        };
      case 'education-training':
        return {
          icon: <GraduationCap className="w-5 h-5" />,
          color: 'from-teal-500/10 to-cyan-500/10 text-teal-700 border-teal-200',
          badge: 'تعليم وتدريب',
        };
      case 'sports-entertainment':
      case 'sports-equipment':
        return {
          icon: <Trophy className="w-5 h-5" />,
          color: 'from-yellow-500/10 to-amber-500/10 text-yellow-800 border-yellow-200',
          badge: 'معدات ورياضة',
        };
      case 'business-industrial':
        return {
          icon: <Factory className="w-5 h-5" />,
          color: 'from-stone-500/10 to-neutral-500/10 text-stone-700 border-stone-200',
          badge: 'معدات ومصانع',
        };
      default:
        return {
          icon: <LayoutGrid className="w-5 h-5" />,
          color: 'from-purple-500/10 to-violet-500/10 text-purple-700 border-purple-200',
          badge: 'سوق دكانة',
        };
    }
  };

  const filteredCategories = categories.filter(c => {
    if (!categorySearchQuery.trim()) return true;
    const q = categorySearchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-purple-700" />
            <span>جميع أقسام سوق دكانة العراقي</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            تنظيم متكامل للأقسام والمنتجات لتغطية كافة احتياجات السوق المحلي العراقي في المحافظات الـ 19
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={categorySearchQuery}
            onChange={e => setCategorySearchQuery(e.target.value)}
            placeholder="بحث في أسماء الأقسام..."
            className="w-full pr-10 pl-3 py-2 bg-white rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 shadow-xs"
          />
        </div>
      </div>

      {/* Discount Tiers (10%, 30%, 50%) */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
          <Percent className="w-4 h-4 text-purple-700" />
          <span>عروض التخفيضات الخاصة في دكانة:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDiscount(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedDiscount === null
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            كافة الأسعار
          </button>
          <button
            onClick={() => setSelectedDiscount(10)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDiscount === 10
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span>خصومات 10% فأكثر</span>
            {selectedDiscount === 10 && <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setSelectedDiscount(30)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDiscount === 30
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span>خصومات 30% فأكثر</span>
            {selectedDiscount === 30 && <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setSelectedDiscount(50)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDiscount === 50
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span>خصومات كبرى 50% فأكثر</span>
            {selectedDiscount === 50 && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Category Cards Grid with Distinct Icons and Visual Hierarchy */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {filteredCategories.map(cat => {
          const isSelected = selectedCategorySlug === cat.slug;
          const details = getCategoryDetails(cat.slug);
          const count =
            cat.slug === 'all'
              ? products.length
              : products.filter(p => p.categoryId === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategorySlug(cat.slug)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between h-32 relative overflow-hidden group shadow-xs ${
                isSelected
                  ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-700/20'
                  : 'bg-white text-zinc-900 border-zinc-200 hover:border-purple-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : `bg-gradient-to-br ${details.color}`
                  }`}
                >
                  {details.icon}
                </div>

                {isSelected ? (
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">نشط</span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-bold tabular-nums">
                    {count} منتج
                  </span>
                )}
              </div>

              <div>
                <span className="font-black text-xs sm:text-sm block line-clamp-1 leading-snug">
                  {cat.name}
                </span>
                <span
                  className={`text-[10px] block line-clamp-1 mt-0.5 ${
                    isSelected ? 'text-purple-200' : 'text-zinc-500'
                  }`}
                >
                  {cat.description || details.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtered Products Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
            <span>المنتجات المعروضة</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              {filteredProducts.length} منتج
            </span>
          </h2>
          {(selectedCategorySlug !== 'all' || selectedDiscount !== null) && (
            <button
              onClick={() => {
                setSelectedCategorySlug('all');
                setSelectedDiscount(null);
              }}
              className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
            >
              إعادة ضبط الفلاتر وعرض الكل
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200 p-8 space-y-2">
            <Tag className="w-12 h-12 text-zinc-300 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-800">لا توجد منتجات تطابق هذا الفلتر حالياً</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              جرب تغيير القسم أو تخفيض نسبة الخصم لمشاهدة بقية منتجات سوق دكانة المعتمدة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onSelect={onSelectProduct}
                onOpenStore={onOpenStore}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
